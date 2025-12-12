import json
from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app.database import get_session
from app import models
from app import schemas
from app.agents.qa_graph import build_qa_graph
from app.config import get_agent_chat_model
from langchain_core.messages import AIMessage, HumanMessage

router = APIRouter(prefix="/agents", tags=["agents"])


def _get_agent_or_404(agent_id: int, session: Session) -> models.Agent:
    agent = session.get(models.Agent, agent_id)
    if not agent:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agent not found")
    return agent


@router.post("", response_model=schemas.AgentRead, status_code=status.HTTP_201_CREATED)
def create_agent(agent_in: schemas.AgentCreate, session: Session = Depends(get_session)) -> schemas.AgentRead:
    existing = session.exec(select(models.Agent).where(models.Agent.name == agent_in.name)).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Agent name must be unique")

    agent = models.Agent(**agent_in.dict())
    session.add(agent)
    session.commit()
    session.refresh(agent)
    return agent


@router.get("/{agent_id}", response_model=schemas.AgentRead)
def get_agent(agent_id: int, session: Session = Depends(get_session)) -> schemas.AgentRead:
    agent = _get_agent_or_404(agent_id, session)
    return agent


@router.patch("/{agent_id}", response_model=schemas.AgentRead)
def update_agent(
    agent_id: int,
    agent_update: schemas.AgentUpdate,
    session: Session = Depends(get_session),
) -> schemas.AgentRead:
    agent = _get_agent_or_404(agent_id, session)
    update_data = agent_update.dict(exclude_unset=True)

    if "name" in update_data:
        name_conflict = session.exec(
            select(models.Agent).where(models.Agent.name == update_data["name"], models.Agent.id != agent_id)
        ).first()
        if name_conflict:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Agent name must be unique")

    for field, value in update_data.items():
        setattr(agent, field, value)
    agent.updated_at = datetime.utcnow()

    session.add(agent)
    session.commit()
    session.refresh(agent)
    return agent


@router.post("/{agent_id}/tools", response_model=List[schemas.ToolRead])
def set_agent_tools(
    agent_id: int,
    tools_update: schemas.ToolsUpdate,
    session: Session = Depends(get_session),
) -> List[schemas.ToolRead]:
    agent = _get_agent_or_404(agent_id, session)
    tool_ids = list(set(tools_update.tool_ids))

    if tool_ids:
        tools = session.exec(select(models.Tool).where(models.Tool.id.in_(tool_ids))).all()
        found_ids = {tool.id for tool in tools}
        missing = set(tool_ids) - found_ids
        if missing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Tools not found: {sorted(list(missing))}",
            )
    else:
        tools = []

    existing_links = session.exec(select(models.AgentTool).where(models.AgentTool.agent_id == agent.id)).all()
    for link in existing_links:
        session.delete(link)

    for tool_id in tool_ids:
        session.add(models.AgentTool(agent_id=agent.id, tool_id=tool_id))

    agent.updated_at = datetime.utcnow()
    session.commit()

    return tools


@router.get("/{agent_id}/tools", response_model=List[schemas.ToolRead])
def list_agent_tools(agent_id: int, session: Session = Depends(get_session)) -> List[schemas.ToolRead]:
    _get_agent_or_404(agent_id, session)
    tools = session.exec(
        select(models.Tool)
        .join(models.AgentTool)
        .where(models.AgentTool.agent_id == agent_id)
    ).all()
    return tools


@router.post("/{agent_id}/policy", response_model=schemas.PolicyRead)
def set_policy(
    agent_id: int,
    policy_in: schemas.PolicyCreate,
    session: Session = Depends(get_session),
) -> schemas.PolicyRead:
    agent = _get_agent_or_404(agent_id, session)

    selected_tools = session.exec(
        select(models.Tool.id)
        .join(models.AgentTool)
        .where(models.AgentTool.agent_id == agent.id)
    ).all()
    selected_tool_ids = list(selected_tools)

    if policy_in.require_approval_for_all_tool_calls and not selected_tool_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Agent has no tools and all tool calls require approval – this agent will be unusable.",
        )

    policy = session.exec(select(models.Policy).where(models.Policy.agent_id == agent.id)).first()
    if not policy:
        policy = models.Policy(agent_id=agent.id)

    if policy_in.frequency_limit is not None:
        if policy_in.frequency_limit <= 0:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="frequency_limit must be positive")
        policy.frequency_limit = policy_in.frequency_limit
    else:
        policy.frequency_limit = None

    policy.require_approval_for_all_tool_calls = policy_in.require_approval_for_all_tool_calls

    agent.updated_at = datetime.utcnow()
    session.add(policy)
    session.commit()
    session.refresh(policy)
    return policy


@router.get("/{agent_id}/policy", response_model=schemas.PolicyRead)
def get_policy(agent_id: int, session: Session = Depends(get_session)) -> schemas.PolicyRead:
    _get_agent_or_404(agent_id, session)
    policy = session.exec(select(models.Policy).where(models.Policy.agent_id == agent_id)).first()
    if not policy:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Policy not found")
    return policy


@router.get("/{agent_id}/definition", response_model=schemas.AgentDefinition)
def get_definition(agent_id: int, session: Session = Depends(get_session)) -> schemas.AgentDefinition:
    agent = _get_agent_or_404(agent_id, session)
    policy = session.exec(select(models.Policy).where(models.Policy.agent_id == agent.id)).first()
    if not policy:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Policy not configured for agent")

    tools = session.exec(
        select(models.Tool).join(models.AgentTool, models.AgentTool.tool_id == models.Tool.id).where(
            models.AgentTool.agent_id == agent.id
        )
    ).all()

    tools_payload = []
    for tool in tools:
        try:
            input_schema = json.loads(tool.input_schema)
        except json.JSONDecodeError:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Invalid tool input_schema JSON")
        try:
            output_schema = json.loads(tool.output_schema)
        except json.JSONDecodeError:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Invalid tool output_schema JSON")

        tools_payload.append(
            schemas.AgentDefinitionTool(
                id=tool.id,
                name=tool.name,
                description=tool.description,
                input_schema=input_schema,
                output_schema=output_schema,
            )
        )

    policy_payload = schemas.AgentDefinitionPolicy(
        allowed_tool_ids=[tool.id for tool in tools],
        frequency_limit=policy.frequency_limit,
        require_approval_for_all_tool_calls=policy.require_approval_for_all_tool_calls,
    )

    return schemas.AgentDefinition(
        agent_id=agent.id,
        name=agent.name,
        description=agent.description,
        purpose=agent.purpose,
        model=agent.model,
        tools=tools_payload,
        policy=policy_payload,
    )


@router.post("/{agent_id}/qa", response_model=schemas.AgentQAResponse)
def run_agent_qa(
    agent_id: int,
    request: schemas.AgentQARequest,
    session: Session = Depends(get_session),
) -> schemas.AgentQAResponse:
    agent = _get_agent_or_404(agent_id, session)

    try:
        chat_model = get_agent_chat_model(agent)
    except Exception as exc:  # keeping minimal handling for now
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    graph = build_qa_graph(chat_model)

    initial_state = {"messages": [HumanMessage(content=request.question)]}
    final_state = graph.invoke(initial_state)

    messages = final_state.get("messages", []) if isinstance(final_state, dict) else []
    assistant_messages = [m for m in messages if isinstance(m, AIMessage)]

    if not assistant_messages:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="No answer returned by model")

    answer_message = assistant_messages[-1]

    return schemas.AgentQAResponse(
        question=request.question,
        answer=getattr(answer_message, "content", ""),
        session_id=request.session_id,
    )
