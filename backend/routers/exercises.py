from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from backend.database import get_db
from backend import models
from backend.services.ai_service import generate_exercise_from_transcript
from backend.services.transcript_service import fetch_transcript
import re
import os
import tempfile
import speech_recognition as sr
from pydantic import BaseModel
from typing import Optional

router = APIRouter()

def extract_youtube_id(url: str) -> str:
    match = re.search(r"(?:v=|youtu\.be/)([a-zA-Z0-9_-]{11})(?:[?&]|$)", url)
    if not match:
        raise HTTPException(status_code=400, detail="Invalid YouTube URL")
    return match.group(1)


@router.post("/generate_by_url/")
def generate_exercise_by_url(youtube_url: str, db: Session = Depends(get_db)):
    youtube_id = extract_youtube_id(youtube_url)

    # check DB
    source = db.query(models.ListeningSource).filter_by(youtube_video_id=youtube_id).first()
    if not source:
        try:
            print("Fetching transcript...","*"*100)
            print(youtube_id)
            print("*"*100)
            transcript = fetch_transcript(youtube_id, lang="en")
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

        source = models.ListeningSource(
            youtube_video_id=youtube_id,
            url=youtube_url,
            title=f"Video {youtube_id}",
            transcript=transcript
        )
        db.add(source)
        db.commit()
        db.refresh(source)

    exercise_payload = generate_exercise_from_transcript(source.transcript, source.title)
    ex = models.Exercise(source_id=source.id, title=source.title, content=exercise_payload)
    db.add(ex)
    db.commit()
    db.refresh(ex)

    return {
        "exercise_id": ex.id,
        "source_id": source.id,
        "youtube_video_id": source.youtube_video_id,
        "title": source.title,
        "content": exercise_payload
    }

@router.get("/sources/")
def list_sources(db: Session = Depends(get_db)):
    sources = db.query(models.ListeningSource).all()
    return [
        {
            "id": s.id,
            "title": s.title,
            "youtube_video_id": s.youtube_video_id,
            "url": s.url
        }
        for s in sources
    ]

class ExerciseResponse(BaseModel):
    id: int
    source_id: int
    exercise_type: str
    content: dict
    created_at: str
    source: dict

@router.get("/listening_exercises/", response_model=list[ExerciseResponse])
def get_listening_exercises(
    source_id: Optional[int] = None,
    exercise_type: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get listening exercises from database with optional filters."""
    
    query = db.query(models.ListeningExercise)
    
    # Apply filters if provided
    if source_id:
        query = query.filter(models.ListeningExercise.source_id == source_id)
    
    if exercise_type:
        query = query.filter(models.ListeningExercise.exercise_type == exercise_type)
    
    exercises = query.all()
    
    return [
        ExerciseResponse(
            id=exercise.id,
            source_id=exercise.source_id,
            exercise_type=exercise.exercise_type,
            content=exercise.content or {},
            created_at=exercise.created_at.isoformat() if exercise.created_at else "",
            source={
                "id": exercise.source.id,
                "title": exercise.source.title,
                "youtube_video_id": exercise.source.youtube_video_id,
                "url": exercise.source.url
            } if exercise.source else {}
        )
        for exercise in exercises
    ]

@router.get("/listening_exercises/{exercise_id}", response_model=ExerciseResponse)
def get_listening_exercise(exercise_id: int, db: Session = Depends(get_db)):
    """Get a specific listening exercise by ID."""
    
    exercise = db.query(models.ListeningExercise).filter(
        models.ListeningExercise.id == exercise_id
    ).first()
    
    if not exercise:
        raise HTTPException(status_code=404, detail="Exercise not found")
    
    return ExerciseResponse(
        id=exercise.id,
        source_id=exercise.source_id,
        exercise_type=exercise.exercise_type,
        content=exercise.content or {},
        created_at=exercise.created_at.isoformat() if exercise.created_at else "",
        source={
            "id": exercise.source.id,
            "title": exercise.source.title,
            "youtube_video_id": exercise.source.youtube_video_id,
            "url": exercise.source.url
        } if exercise.source else {}
    )

@router.get("/exercises_by_video/{youtube_video_id}")
def get_exercises_by_video(youtube_video_id: str, db: Session = Depends(get_db)):
    """Get all exercises for a specific YouTube video."""
    
    # First find the source by YouTube video ID
    source = db.query(models.ListeningSource).filter(
        models.ListeningSource.youtube_video_id == youtube_video_id
    ).first()
    
    if not source:
        return []
    
    # Get all exercises for this source
    exercises = db.query(models.ListeningExercise).filter(
        models.ListeningExercise.source_id == source.id
    ).all()
    
    return [
        {
            "id": exercise.id,
            "source_id": exercise.source_id,
            "exercise_type": exercise.exercise_type,
            "content": exercise.content or {},
            "created_at": exercise.created_at.isoformat() if exercise.created_at else "",
            "source": {
                "id": source.id,
                "title": source.title,
                "youtube_video_id": source.youtube_video_id,
                "url": source.url
            }
        }
        for exercise in exercises
    ]

class SpeakingScoreResponse(BaseModel):
    score: int
    feedback: str
    transcript: str
    pronunciation_score: Optional[int] = None
    fluency_score: Optional[int] = None
    vocabulary_score: Optional[int] = None

@router.post("/score_speaking/", response_model=SpeakingScoreResponse)
async def score_speaking_exercise(
    audio: UploadFile = File(...),
    exercise_id: int = Form(...),
    user_id: int = Form(...),
    db: Session = Depends(get_db)
):
    """Score a speaking exercise based on uploaded audio file."""
    
    try:
        # Save uploaded audio to temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as temp_file:
            content = await audio.read()
            temp_file.write(content)
            temp_file_path = temp_file.name
        
        # Initialize speech recognition
        recognizer = sr.Recognizer()
        
        # Convert audio to text using Google Speech Recognition
        with sr.AudioFile(temp_file_path) as source:
            audio_data = recognizer.record(source)
            try:
                transcript = recognizer.recognize_google(audio_data, language="en-US")
            except sr.UnknownValueError:
                transcript = "Could not understand audio"
            except sr.RequestError as e:
                transcript = f"Error with speech recognition: {e}"
        
        # Clean up temporary file
        os.unlink(temp_file_path)
        
        # Simple scoring algorithm (replace with more sophisticated AI scoring)
        score = calculate_speaking_score(transcript, exercise_id)
        
        # Generate feedback
        feedback = generate_speaking_feedback(score, transcript)
        
        # Save progress to database
        progress = models.UserListeningProgress(
            user_id=user_id,
            exercise_id=exercise_id,
            score=score,
            results={"transcript": transcript, "feedback": feedback},
            ai_feedback={"score": score, "feedback": feedback}
        )
        db.add(progress)
        db.commit()
        
        return SpeakingScoreResponse(
            score=score,
            feedback=feedback,
            transcript=transcript,
            pronunciation_score=min(score + 10, 100),
            fluency_score=min(score - 5, 100),
            vocabulary_score=min(score + 5, 100)
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing audio: {str(e)}")

def calculate_speaking_score(transcript: str, exercise_id: int) -> int:
    """Simple scoring algorithm - replace with AI-powered scoring."""
    
    if not transcript or transcript == "Could not understand audio":
        return 0
    
    # Basic scoring based on transcript length and content
    word_count = len(transcript.split())
    
    # Minimum score based on word count
    base_score = min(word_count * 2, 60)
    
    # Bonus for common English words
    common_words = ["the", "and", "is", "in", "to", "of", "a", "that", "it", "with"]
    word_bonus = sum(1 for word in transcript.lower().split() if word in common_words) * 2
    
    # Final score (0-100)
    final_score = min(base_score + word_bonus, 100)
    
    return max(final_score, 20)  # Minimum score of 20

def generate_speaking_feedback(score: int, transcript: str) -> str:
    """Generate feedback based on score and transcript."""
    
    if score >= 80:
        return f"Excellent! Your pronunciation is clear and you used good vocabulary. Keep practicing to maintain this level. Transcript: '{transcript}'"
    elif score >= 60:
        return f"Good job! You're making progress. Try to speak more clearly and use a wider range of vocabulary. Transcript: '{transcript}'"
    elif score >= 40:
        return f"Not bad! Keep practicing. Focus on speaking more slowly and clearly. Transcript: '{transcript}'"
    else:
        return f"Keep practicing! Try to speak more clearly and use complete sentences. Transcript: '{transcript}'"