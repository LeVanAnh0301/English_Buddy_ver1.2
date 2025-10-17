from fastapi import FastAPI, HTTPException, Depends, status
from pydantic import BaseModel
from typing import Annotated
from backend import models
from fastapi.middleware.cors import CORSMiddleware
from backend.database import SessionLocal, engine, Base, DATABASE_URL
from sqlalchemy.orm import Session
from backend.routers import exercises, video_router, speaking_router, ai_question_router, listening_router, ai_eval_router
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

def init_db_data():
    """Initialize fake data for ListeningSource table if empty"""
    db = SessionLocal()
    try:
        # Check if table has data
        if not db.query(models.ListeningSource).first():
            sample_data = [
                models.ListeningSource(
                    url="https://www.youtube.com/watch?v=dQw4w9WgXcQ",  # full YouTube URL
                    title="English Listening - Daily Conversation",
                    youtube_video_id="dQw4w9WgXcQ",
                    transcript="""
                    A: Hi, how are you today?
                    B: I'm good, thanks! How about you?
                    A: Not bad. What are your plans for the weekend?
                    B: I'm going to visit my parents.
                    """
                ),
                models.ListeningSource(
                    url="https://www.youtube.com/watch?v=_DmYA7OzyRE",
                    title="Speaking Practice - Travel Roleplay",
                    youtube_video_id="_DmYA7OzyRE",
                    transcript="""
                    A: Excuse me, where is the nearest train station?
                    B: It's just two blocks away on the left.
                    A: Thank you very much!
                    B: You're welcome!
                    """
                ),
                models.ListeningSource(
                    url="https://www.youtube.com/watch?v=M7lc1UVf-VE",
                    title="Learn Loops in Computer Science",
                    youtube_video_id="M7lc1UVf-VE",
                    transcript="""
                    for i in range(5):
                        print("Hello, world!")
                    # This loop prints the message five times.
                    """
                )
            ]

            db.add_all(sample_data)
            db.commit()
            print("Dữ liệu mẫu ListeningSource đã được thêm vào database.")
        else:
            print("ℹDữ liệu mẫu ListeningSource đã tồn tại, bỏ qua thêm mới.")
    except Exception as e:
        db.rollback()
        print(f"Lỗi khi khởi tạo dữ liệu mẫu: {e}")
    finally:
        db.close()

@app.on_event("startup")
def on_startup():
    init_db_data()

app.include_router(video_router.router, prefix="/api/videos", tags=["Videos"])
# app.include_router(exercises.router, prefix="/api/exercises", tags=["Exercises"])
app.include_router(speaking_router.router, prefix="/api/speaking", tags=["Speaking"])
app.include_router(listening_router.router, prefix="/api/listening", tags=["Listening"])
app.include_router(ai_question_router.router, prefix="/api/ai/questions", tags=["AI Question Generator"])
app.include_router(ai_eval_router.router, prefix="/api/ai/eval", tags=["AI Evaluation"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# db_dependency = Annotated[Session, Depends(get_db)]
