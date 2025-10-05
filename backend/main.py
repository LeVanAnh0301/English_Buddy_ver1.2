from fastapi import FastAPI, HTTPException, Depends, status
from pydantic import BaseModel
from typing import Annotated
import backend.models as models
from fastapi.middleware.cors import CORSMiddleware
from backend.database import SessionLocal, engine, Base
from sqlalchemy.orm import Session
from backend.routers import exercises

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
models.Base.metadata.create_all(bind=engine)

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
