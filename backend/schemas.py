from pydantic import BaseModel, HttpUrl
from typing import List, Optional
from datetime import datetime
import uuid


# -----------------------------
# Common Base Schema
# -----------------------------
class BaseSchema(BaseModel):
    id: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# -----------------------------
# Video Schema
# -----------------------------
class VideoBase(BaseModel):
    title: str
    url: HttpUrl
    youtube_video_id: Optional[str] = None
    transcript: Optional[str] = None


class VideoCreate(VideoBase):
    pass


class VideoResponse(BaseModel):
    id: str
    url: str
    title: str
    youtube_video_id: str
    transcript: str | None = None
    class Config:
        from_attributes = True

class VideoListResponse(BaseModel):
    videos: List[VideoResponse]

# -----------------------------
# Listening Schema
# -----------------------------
class ListeningQuestionBase(BaseModel):
    question_type: str  
    question_text: str
    correct_answer: str


class ListeningQuestionCreate(ListeningQuestionBase):
    video_id: str


class ListeningQuestionResponse(ListeningQuestionBase, BaseSchema):
    video_id: str


# -----------------------------
# Speaking Schema
# -----------------------------
class SpeakingQuestionBase(BaseModel):
    question_type: str  # e.g. 'paraphrase', 'roleplay'
    question_text: str
    hint: Optional[str] = None


class SpeakingQuestionCreate(SpeakingQuestionBase):
    video_id: str


class SpeakingQuestionResponse(SpeakingQuestionBase, BaseSchema):
    video_id: str


# -----------------------------
# Exercise (Listening + Speaking Group)
# -----------------------------
class ExerciseBase(BaseModel):
    video_id: str
    exercise_type: str  # e.g. 'listening' or 'speaking'


class ExerciseCreate(ExerciseBase):
    questions: List[str]  # list of question_id


class ExerciseResponse(ExerciseBase, BaseSchema):
    questions: List[str]


# -----------------------------
# AI-generated Question Schema
# -----------------------------
class AIQuestionRequest(BaseModel):
    video_url: HttpUrl
    transcript: str
    question_type: str  # "listening" or "speaking"


class AIQuestionResponse(BaseModel):
    questions: List[str]
    source_video_id: Optional[str] = None


# -----------------------------
# AI Evaluation Schema
# -----------------------------
class AIEvalRequest(BaseModel):
    question_id: str
    user_answer: str  # can be text or audio transcription
    mode: str  # "listening" | "speaking"


class AIEvalResponse(BaseModel):
    score: float
    feedback: str
    corrections: Optional[List[str]] = None


# -----------------------------
# Generic Message (use for DELETE/UPDATE)
# -----------------------------
class MessageResponse(BaseModel):
    message: str
