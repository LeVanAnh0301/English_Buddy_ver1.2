from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.database import get_db
from backend import models

router = APIRouter()

@router.get("/exercises", summary="List all listening exercises")
def list_exercises(db: Session = Depends(get_db)):
    exercises = db.query(models.ListeningExercise).all()
    return exercises

@router.get("/exercises/{exercise_id}", summary="Get a specific listening exercise")
def get_exercise(exercise_id: str, db: Session = Depends(get_db)):
    exercise = db.query(models.ListeningExercise).filter_by(id=exercise_id).first()
    if not exercise:
        raise HTTPException(status_code=404, detail="Exercise not found")
    return exercise
