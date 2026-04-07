import json
from typing import Any, Dict

from jsonschema import ValidationError as JSONSchemaValidationError
from jsonschema.validators import validator_for

def validate_json_schema(schema_str: str) -> Dict[str, Any]:
    try:
        schema = json.loads(schema_str)
    except json.JSONDecodeError as e:
        raise ValueError(f"Invalid JSON: {str(e)}")
    
    if not isinstance(schema, dict):
        raise ValueError("Schema must be a JSON object (dict)")
    
    # Validate schema semantics against the declared JSON Schema draft.
    # This catches malformed keyword usage early (e.g. minimum on strings).
    try:
        validator_cls = validator_for(schema)
        validator_cls.check_schema(schema)
    except Exception as e:
        raise ValueError(f"Invalid JSON Schema: {str(e)}")
    
    return schema


def validate_payload_against_schema(schema: Dict[str, Any], payload: Dict[str, Any]) -> None:
    try:
        validator_cls = validator_for(schema)
        validator_cls.check_schema(schema)
        validator = validator_cls(schema)
        errors = sorted(validator.iter_errors(payload), key=lambda e: list(e.path))
    except JSONSchemaValidationError as e:
        raise ValueError(f"Invalid payload: {e.message}")
    except Exception as e:
        raise ValueError(f"Schema validation error: {str(e)}")

    if not errors:
        return

    messages = []
    for err in errors[:5]:
        field = ".".join(str(part) for part in err.path)
        location = field if field else "<root>"
        messages.append(f"{location}: {err.message}")

    raise ValueError("; ".join(messages))

def validate_tool_schema(name: str, description: str, input_schema: str, output_schema: str) -> Dict[str, Any]:
    errors = []
    
    # Validate name
    if not name or len(name) < 1:
        errors.append("Tool name is required and must be non-empty")
    
    # Validate description
    if not description or len(description) < 10:
        errors.append("Tool description is required and must be at least 10 characters")
    
    # Validate input schema
    try:
        input_parsed = validate_json_schema(input_schema)
    except ValueError as e:
        errors.append(f"Invalid input_schema: {str(e)}")
        input_parsed = None
    
    # Validate output schema
    try:
        output_parsed = validate_json_schema(output_schema)
    except ValueError as e:
        errors.append(f"Invalid output_schema: {str(e)}")
        output_parsed = None
    
    if errors:
        raise ValueError("; ".join(errors))
    
    return {
        "name": name,
        "description": description,
        "input_schema": input_parsed,
        "output_schema": output_parsed,
        "valid": True
    }
