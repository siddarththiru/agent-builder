import json
from typing import Any, Dict, List

from pydantic import ValidationError

def validate_json_schema(schema_str: str) -> Dict[str, Any]:
    try:
        schema = json.loads(schema_str)
    except json.JSONDecodeError as e:
        raise ValueError(f"Invalid JSON: {str(e)}")
    
    if not isinstance(schema, dict):
        raise ValueError("Schema must be a JSON object (dict)")
    
    # Basic JSON Schema validation
    # At minimum, should have type or properties
    has_type = "type" in schema
    has_properties = "properties" in schema
    has_ref = "$ref" in schema
    
    if not (has_type or has_properties or has_ref):
        raise ValueError(
            "Schema must have 'type', 'properties', or '$ref' field"
        )
    
    return schema

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
