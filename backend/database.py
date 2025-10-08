from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv


# Load environment variables from .env if present
load_dotenv()

def _build_database_url() -> str:
    """Return SQLAlchemy database URL.

    Priority:
    1) DATABASE_URL (full SQLAlchemy URL)
    2) Compose from DB_USER, DB_PASSWORD, DB_HOST, DB_PORT, DB_NAME
    Defaults target a local MySQL running on 127.0.0.1:3306 with
    database name 'english_buddy' and user 'root' with no password.
    """
    url = os.getenv("DATABASE_URL")
    if url:
        return url


DATABASE_URL = _build_database_url()

if not DATABASE_URL or DATABASE_URL.strip() == "":
    raise RuntimeError(
        "Database configuration missing. Set DATABASE_URL or DB_* env vars."
    )

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# db_dependency = Annotated[Session, Depends(get_db)]