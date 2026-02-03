from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app.database import get_session
from app import models
from app import schemas
from app.utils.schema_validator import validate_tool_schema

router = APIRouter(prefix="/tools", tags=["tools"])

@router.get("", response_model=List[schemas.ToolRead])
def list_tools(session: Session = Depends(get_session)) -> List[schemas.ToolRead]:
    tools = session.exec(select(models.Tool)).all()
    return tools

@router.get("/{tool_id}", response_model=schemas.ToolRead)
def get_tool(tool_id: int, session: Session = Depends(get_session)) -> schemas.ToolRead:
    tool = session.get(models.Tool, tool_id)
    if not tool:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tool not found")
    return tool

@router.post("/validate", response_model=schemas.ToolValidateResponse)
def validate_tool(
    request: schemas.ToolValidateRequest,
    session: Session = Depends(get_session)
) -> schemas.ToolValidateResponse:
    errors = []
    
    try:
        result = validate_tool_schema(
            name=request.name,
            description=request.description,
            input_schema=request.input_schema,
            output_schema=request.output_schema
        )
        
        return schemas.ToolValidateResponse(
            valid=True,
            name=result["name"],
            description=result["description"],
            input_schema=result["input_schema"],
            output_schema=result["output_schema"],
            errors=[]
        )
    
    except ValueError as e:
        return schemas.ToolValidateResponse(
            valid=False,
            name=request.name,
            description=request.description,
            input_schema={},
            output_schema={},
            errors=[str(e)]
        )

@router.post("", response_model=schemas.ToolRead, status_code=status.HTTP_201_CREATED)
def register_tool(
    tool_in: schemas.ToolCreate,
    session: Session = Depends(get_session)
) -> schemas.ToolRead:
    # Check if tool name already exists
    existing = session.exec(select(models.Tool).where(models.Tool.name == tool_in.name)).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Tool name '{tool_in.name}' already exists"
        )
    
    # Validate schemas
    try:
        validated = validate_tool_schema(
            name=tool_in.name,
            description=tool_in.description,
            input_schema=tool_in.input_schema,
            output_schema=tool_in.output_schema
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    
    # Create tool
    tool = models.Tool(
        name=tool_in.name,
        description=tool_in.description,
        input_schema=tool_in.input_schema,
        output_schema=tool_in.output_schema,
        usable=True
    )
    
    session.add(tool)
    session.commit()
    session.refresh(tool)
    
    return tool

@router.patch("/{tool_id}/usable", response_model=schemas.ToolRead)
def set_tool_usable(
    tool_id: int,
    usable: bool,
    session: Session = Depends(get_session)
) -> schemas.ToolRead:

    tool = session.get(models.Tool, tool_id)
    if not tool:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tool not found")
    
    tool.usable = usable
    session.add(tool)
    session.commit()
    session.refresh(tool)
    
    return tool
