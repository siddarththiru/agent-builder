from collections.abc import Iterator
from sqlmodel import Session, SQLModel, create_engine

DATABASE_URL = "sqlite:///./agent_builder.db"
engine = create_engine(
    DATABASE_URL,
    echo=False,
    connect_args={"check_same_thread": False},
)

def get_db_url() -> str:
    return DATABASE_URL


def get_session() -> Iterator[Session]:
    with Session(engine) as session:
        yield session


def init_db() -> None:
    SQLModel.metadata.create_all(engine)
