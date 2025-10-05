from sqlalchemy import Column, Integer, String, Boolean, Text, ForeignKey, DateTime, JSON
from sqlalchemy.dialects.mysql import LONGTEXT 
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from backend.database import Base 

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), index=True)         
    email = Column(String(255), unique=True, index=True)  
    is_active = Column(Boolean, default=True)

class ListeningSource(Base):
    __tablename__ = "listening_sources"
    id = Column(Integer, primary_key=True)
    url = Column(String(512)) 
    title = Column(String(255))
    youtube_video_id = Column(String(32), unique=True, index=True)
    transcript = Column(LONGTEXT, nullable=True)
    
    exercises = relationship("ListeningExercise", back_populates="source")

class ListeningExercise(Base):
    __tablename__ = "listening_exercises"
    id = Column(Integer, primary_key=True)
    source_id = Column(Integer, ForeignKey("listening_sources.id"))
    exercise_type = Column(String(50), default="lesson") 
    content = Column(JSON) 
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    source = relationship("ListeningSource", back_populates="exercises")
    progresses = relationship("UserListeningProgress", back_populates="exercise")

class UserListeningProgress(Base):
    __tablename__ = "user_listening_progress"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    exercise_id = Column(Integer, ForeignKey("listening_exercises.id"))
    score = Column(Integer) 
    results = Column(JSON) 
    ai_feedback = Column(JSON, nullable=True) 
    submitted_at = Column(DateTime(timezone=True), server_default=func.now())
    
    exercise = relationship("ListeningExercise", back_populates="progresses")