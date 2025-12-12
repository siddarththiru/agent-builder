from typing import List

from fastapi import APIRouter, Depends
from sqlmodel import Session, select

from app.database import get_session
from app import models
from app import schemas

router = APIRouter(prefix="/tools", tags=["tools"])

@router.get("", response_model=List[schemas.ToolRead])
def list_tools(session: Session = Depends(get_session)) -> List[schemas.ToolRead]:
    tools = session.exec(select(models.Tool)).all()
    return tools
