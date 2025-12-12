from typing import Callable, List, TypedDict

from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import BaseMessage
from langgraph.graph import END, StateGraph


class QAState(TypedDict):
    messages: List[BaseMessage]


def _make_llm_node(chat_model: BaseChatModel) -> Callable[[QAState], QAState]:
    def llm_node(state: QAState) -> QAState:
        response = chat_model.invoke(state["messages"])
        next_messages = list(state["messages"])
        next_messages.append(response)
        return {"messages": next_messages}

    return llm_node


def build_qa_graph(chat_model: BaseChatModel):
    graph = StateGraph(QAState)
    graph.add_node("llm", _make_llm_node(chat_model))
    graph.set_entry_point("llm")
    graph.add_edge("llm", END)
    return graph.compile()
