from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session

from app.database import get_session
from app.repository.log_repository import LogRepository, LogQuery

router = APIRouter(prefix="/logs", tags=["logs"])

def _get_log_repository(session: Session = Depends(get_session)) -> LogRepository:
    return LogRepository(session)

@router.get("", response_model=dict)
def query_logs(
    session_id: Optional[str] = Query(None, description="Filter by session ID"),
    agent_id: Optional[int] = Query(None, description="Filter by agent ID"),
    event_type: Optional[str] = Query(None, description="Filter by event type"),
    from_time: Optional[str] = Query(None, description="Start time (ISO format)"),
    to_time: Optional[str] = Query(None, description="End time (ISO format)"),
    limit: int = Query(100, ge=1, le=1000, description="Results per page"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
    repo: LogRepository = Depends(_get_log_repository),
) -> dict:
    try:
        # Parse times if provided
        from_dt = None
        to_dt = None
        
        if from_time:
            try:
                from_dt = datetime.fromisoformat(from_time.replace('Z', '+00:00'))
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid from_time format: {from_time}"
                )
        
        if to_time:
            try:
                to_dt = datetime.fromisoformat(to_time.replace('Z', '+00:00'))
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid to_time format: {to_time}"
                )
        
        # Query logs
        logs, total = repo.get_logs(
            session_id=session_id,
            agent_id=agent_id,
            event_type=event_type,
            from_time=from_dt,
            to_time=to_dt,
            limit=limit,
            offset=offset
        )
        
        return {
            "logs": [log.to_dict() for log in logs],
            "total": total,
            "count": len(logs),
            "limit": limit,
            "offset": offset
        }
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.get("/sessions/{session_id}", response_model=dict)
def get_session_logs(
    session_id: str,
    repo: LogRepository = Depends(_get_log_repository),
) -> dict:
    try:
        logs = repo.get_session_logs(session_id, order_asc=True)
        
        return {
            "session_id": session_id,
            "logs": [log.to_dict() for log in logs],
            "count": len(logs)
        }
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )

@router.get("/agents/{agent_id}", response_model=dict)
def get_agent_logs(
    agent_id: int,
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    repo: LogRepository = Depends(_get_log_repository),
) -> dict:
    logs, total = repo.get_agent_logs(agent_id=agent_id, limit=limit, offset=offset)
    
    return {
        "agent_id": agent_id,
        "logs": [log.to_dict() for log in logs],
        "total": total,
        "count": len(logs)
    }

@router.get("/event-types", response_model=dict)
def get_event_types(
    repo: LogRepository = Depends(_get_log_repository),
) -> dict:
    return {
        "event_types": sorted(list(repo.VALID_EVENT_TYPES))
    }

@router.get("/stats", response_model=dict)
def get_log_stats(
    session_id: Optional[str] = Query(None),
    repo: LogRepository = Depends(_get_log_repository),
) -> dict:
    total_sessions = repo.get_session_count()
    total_logs = repo.get_log_count(session_id=session_id)
    event_counts = repo.get_event_type_counts(session_id=session_id)
    
    return {
        "total_sessions": total_sessions,
        "total_logs": total_logs,
        "event_type_counts": event_counts
    }
