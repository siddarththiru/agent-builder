from datetime import datetime
from typing import Optional, List

from sqlmodel import Field, Relationship, SQLModel, UniqueConstraint


class AgentTool(SQLModel, table=True):
    __tablename__ = "agent_tools"
    id: Optional[int] = Field(default=None, primary_key=True)
    agent_id: int = Field(foreign_key="agents.id")
    tool_id: int = Field(foreign_key="tools.id")
    # Link back to parent records; no cascade from AgentTool to Agent (only Agent → AgentTool)
    agent: "Agent" = Relationship(back_populates="tools")
    tool: "Tool" = Relationship(back_populates="agents")


class Agent(SQLModel, table=True):
    __tablename__ = "agents"
    __table_args__ = (UniqueConstraint("name", name="uq_agent_name"),)

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True)
    description: str
    purpose: str
    model: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    tools: List[AgentTool] = Relationship(back_populates="agent", sa_relationship_kwargs={"cascade": "all, delete"})
    policy: Optional["Policy"] = Relationship(back_populates="agent")


class Tool(SQLModel, table=True):
    __tablename__ = "tools"
    __table_args__ = (UniqueConstraint("name", name="uq_tool_name"),)

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    description: str
    input_schema: str
    output_schema: str

    agents: List[AgentTool] = Relationship(back_populates="tool")


class Policy(SQLModel, table=True):
    __tablename__ = "policies"

    id: Optional[int] = Field(default=None, primary_key=True)
    agent_id: int = Field(foreign_key="agents.id", unique=True)
    frequency_limit: Optional[int] = None
    require_approval_for_all_tool_calls: bool = Field(default=False)

    agent: Agent = Relationship(back_populates="policy")
