import json
from sqlmodel import Session, select

from app import models


DEFAULT_TOOLS = [
    {
        "name": "Weather API",
        "description": "Fetches current weather data for a given city.",
        "input_schema": {"type": "object", "properties": {"city": {"type": "string"}}, "required": ["city"]},
        "output_schema": {
            "type": "object",
            "properties": {
                "temperature_c": {"type": "number"},
                "condition": {"type": "string"},
            },
            "required": ["temperature_c", "condition"],
        },
    },
    {
        "name": "News API",
        "description": "Retrieves latest headlines for a topic.",
        "input_schema": {"type": "object", "properties": {"topic": {"type": "string"}}, "required": ["topic"]},
        "output_schema": {
            "type": "object",
            "properties": {
                "headlines": {"type": "array", "items": {"type": "string"}},
            },
            "required": ["headlines"],
        },
    },
]


def seed_tools(session: Session) -> None:
    for tool_data in DEFAULT_TOOLS:
        existing = session.exec(select(models.Tool).where(models.Tool.name == tool_data["name"])).first()
        if existing:
            continue
        tool = models.Tool(
            name=tool_data["name"],
            description=tool_data["description"],
            input_schema=json.dumps(tool_data["input_schema"]),
            output_schema=json.dumps(tool_data["output_schema"]),
        )
        session.add(tool)
    session.commit()
