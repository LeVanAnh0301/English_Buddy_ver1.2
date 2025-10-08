import uuid
from sqlalchemy import Column, String, Boolean, ForeignKey, DateTime, JSON, Integer
from sqlalchemy.dialects.mysql import LONGTEXT
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from backend.database import Base


# -------------------------------
# USER TABLE
# -------------------------------
class User(Base):
    __tablename__ = "users"
    __table_args__ = {'extend_existing': True}

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))  # UUID as PK
    name = Column(String(255), index=True)
    email = Column(String(255), unique=True, index=True)
    is_active = Column(Boolean, default=True)


# -------------------------------
# LISTENING SOURCE TABLE
# -------------------------------
class ListeningSource(Base):
    __tablename__ = "listening_sources"
    __table_args__ = {'extend_existing': True}

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    url = Column(String(512))
    title = Column(String(255))
    youtube_video_id = Column(String(32), unique=True, index=True)
    transcript = Column(LONGTEXT, nullable=True)

    # Relationship
    exercises = relationship("ListeningExercise", back_populates="source", cascade="all, delete")


# -------------------------------
# LISTENING EXERCISE TABLE
# -------------------------------
class ListeningExercise(Base):
    __tablename__ = "listening_exercises"
    __table_args__ = {'extend_existing': True}

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    source_id = Column(String(36), ForeignKey("listening_sources.id"))
    exercise_type = Column(String(50), default="lesson")
    content = Column(JSON)
    created_by = Column(String(36), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationship
    source = relationship("ListeningSource", back_populates="exercises")
    progresses = relationship("UserListeningProgress", back_populates="exercise", cascade="all, delete")


# -------------------------------
# USER LISTENING PROGRESS TABLE
# -------------------------------
class UserListeningProgress(Base):
    __tablename__ = "user_listening_progress"
    __table_args__ = {'extend_existing': True}

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"))
    exercise_id = Column(String(36), ForeignKey("listening_exercises.id"))
    score = Column(Integer)
    results = Column(JSON)
    ai_feedback = Column(JSON, nullable=True)
    submitted_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationship
    exercise = relationship("ListeningExercise", back_populates="progresses")
