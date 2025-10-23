from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.database import get_db
from backend import models
from backend.schemas import ListeningExerciseSchema

router = APIRouter()

@router.get("/exercises", summary="List all listening exercises")
def list_exercises(db: Session = Depends(get_db)):
    exercises = db.query(models.ListeningExercise).all()
    return exercises

@router.get("/exercises/{exercise_id}", response_model=ListeningExerciseSchema, summary="Get a specific listening exercise")
def get_exercise(exercise_id: str, db: Session = Depends(get_db)):
    exercise = db.query(models.ListeningExercise) \
             .join(models.ListeningSource) \
             .filter(models.ListeningExercise.source_id == exercise_id) \
             .first()
    if not exercise:
        raise HTTPException(status_code=404, detail="Exercise not found")
    return exercise
