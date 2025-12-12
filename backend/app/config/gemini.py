import os
from typing import TYPE_CHECKING, Any, Optional

from langchain_core.language_models.chat_models import BaseChatModel
from langchain_google_genai import ChatGoogleGenerativeAI

if TYPE_CHECKING:
    from app import models

DEFAULT_GEMINI_MODEL = "gemini-2.5-flash"
_GEMINI_PREFIX = "gemini-"

def _get_api_key() -> str:
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise RuntimeError("GOOGLE_API_KEY not set; required for Gemini chat models")
    return api_key

def is_gemini_model_name(model_name: str) -> bool:
    return model_name.lower().startswith(_GEMINI_PREFIX)

def _normalize_model_name(model_name: str) -> str:
    name = model_name.strip()
    if name.endswith("-latest"):
        name = name[: -len("-latest")]
    return name

def build_gemini_chat_model(
    model_name: Optional[str] = None,
    *,
    temperature: Optional[float] = None,
    **kwargs: Any,
) -> ChatGoogleGenerativeAI:
    resolved_model = _normalize_model_name((model_name or DEFAULT_GEMINI_MODEL).strip())
    init_kwargs: dict[str, Any] = {
        "model": resolved_model,
        "api_key": _get_api_key(),
        "max_retries": kwargs.pop("max_retries", 3),
    }
    if temperature is not None:
        init_kwargs["temperature"] = temperature
    init_kwargs.update(kwargs)
    return ChatGoogleGenerativeAI(**init_kwargs)

def get_agent_chat_model(
    agent: "models.Agent",
    *,
    temperature: Optional[float] = None,
    **kwargs: Any,
) -> BaseChatModel:
    model_name = (agent.model or "").strip()
    if not model_name or not is_gemini_model_name(model_name):
        model_name = DEFAULT_GEMINI_MODEL
    return build_gemini_chat_model(model_name=model_name, temperature=temperature, **kwargs)
