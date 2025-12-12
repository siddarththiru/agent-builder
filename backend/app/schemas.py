from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field, validator


class AgentBase(BaseModel):
    name: str = Field(..., min_length=1)
    description: str = Field(..., min_length=10)
    purpose: str = Field(..., min_length=5)
    model: str = Field(..., min_length=1)


class AgentCreate(AgentBase):
    pass


class AgentUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1)
    description: Optional[str] = Field(None, min_length=10)
    purpose: Optional[str] = Field(None, min_length=5)
    model: Optional[str] = Field(None, min_length=1)


class AgentRead(AgentBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True


class ToolRead(BaseModel):
    id: int
    name: str
    description: str
    input_schema: str
    output_schema: str

    class Config:
        orm_mode = True


class ToolsUpdate(BaseModel):
    tool_ids: List[int]

    @validator("tool_ids")
    def unique_tools(cls, v: List[int]) -> List[int]:
        if len(v) != len(set(v)):
            raise ValueError("tool_ids must be unique")
        return v


class PolicyBase(BaseModel):
    frequency_limit: Optional[int] = Field(None, gt=0)
    require_approval_for_all_tool_calls: bool = False


class PolicyCreate(PolicyBase):
    pass


class PolicyRead(PolicyBase):
    id: int
    agent_id: int

    class Config:
        orm_mode = True


class AgentDefinitionTool(BaseModel):
    id: int
    name: str
    description: str
    input_schema: dict
    output_schema: dict


class AgentDefinitionPolicy(BaseModel):
    allowed_tool_ids: List[int]
    frequency_limit: Optional[int]
    require_approval_for_all_tool_calls: bool


class AgentDefinition(BaseModel):
    agent_id: int
    name: str
    description: str
    purpose: str
    model: str
    tools: List[AgentDefinitionTool]
    policy: AgentDefinitionPolicy


class AgentQARequest(BaseModel):
    question: str = Field(..., min_length=1)
    session_id: Optional[str] = None


class AgentQAResponse(BaseModel):
    question: str
    answer: str
    session_id: Optional[str] = None
