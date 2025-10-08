from fastapi import FastAPI, HTTPException, Depends, status
from pydantic import BaseModel
from typing import Annotated
from backend import models
from fastapi.middleware.cors import CORSMiddleware
from backend.database import SessionLocal, engine, Base, DATABASE_URL
from sqlalchemy.orm import Session
from backend.routers import exercises
from sqlalchemy import text
from sqlalchemy.exc import OperationalError
import time
from sqlalchemy.engine.url import make_url, URL
from sqlalchemy import create_engine as sa_create_engine

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
@app.on_event("startup")
async def run_migrations_on_startup() -> None:
    """Create tables from models after DB is reachable.

    Retries for a short period to avoid race conditions on container startup.
    """
    max_attempts = 10
    # Ensure target schema/database exists (MySQL: schema == database)
    try:
        parsed_url = make_url(DATABASE_URL)
        server_url = URL.create(
            drivername=parsed_url.drivername,
            username=parsed_url.username,
            password=parsed_url.password,
            host=parsed_url.host,
            port=parsed_url.port,
        )
        schema_name = parsed_url.database
        if schema_name:
            with sa_create_engine(server_url).connect() as server_conn:
                server_conn.execute(text(
                    f"CREATE DATABASE IF NOT EXISTS `{schema_name}` \
                    DEFAULT CHARACTER SET utf8mb4 \
                    COLLATE utf8mb4_unicode_ci"
                ))
    except Exception:
        # If we fail to ensure DB, let the retry loop handle connectivity
        pass

    for attempt in range(1, max_attempts + 1):
        try:
            # Ensure connection is alive before creating tables
            with engine.connect() as connection:
                connection.execute(text("SELECT 1"))
            models.Base.metadata.create_all(bind=engine)
            break
        except OperationalError:
            if attempt == max_attempts:
                raise
            time.sleep(2)

# app.include_router(sources.router, prefix="/sources", tags=["sources"])
app.include_router(exercises.router, prefix="/exercises", tags=["exercises"])
# app.include_router(submissions.router, prefix="/submissions", tags=["submissions"]) 

class PostBase(BaseModel):
    title: str
    content: str
    user_id: int

class UserBase(BaseModel):
    name: str
    email: str
    is_active: bool = True

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# db_dependency = Annotated[Session, Depends(get_db)]
