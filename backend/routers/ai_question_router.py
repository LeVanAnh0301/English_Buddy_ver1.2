from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.database import get_db
from backend import models
import uuid
from backend.services.ai_service import generate_comprehension_questions

router = APIRouter()

@router.post("/generate_questions/{video_id}", summary="Generate questions for a video")
def generate_questions(video_id: str, db: Session = Depends(get_db)):
    video = db.query(models.ListeningSource).filter_by(id=video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")

    if not video.transcript:
        raise HTTPException(status_code=400, detail="Transcript not available")

    question_list = generate_comprehension_questions(video.transcript, video.title)

    questions = []
    for q in question_list:
        # Nếu q là str (trường hợp parse chưa đúng), convert thành dict
        if isinstance(q, str):
            import json
            try:
                q = json.loads(q)
            except Exception:
                continue  # bỏ qua nếu parse fail
        q["id"] = str(uuid.uuid4())
        questions.append(q)

    exercise_content = {
        "title": f"Questions for: {video.title}",
        "questions": questions
    }
    exercise = models.exercise = models.ListeningExercise(
        source_id=video.id,
        exercise_type="comprehension", 
        content=exercise_content       
    )
    db.add(exercise)
    db.commit()
    db.refresh(exercise)

    return {
            "exercise_id": exercise.id,
            "source_id": video.id,
            "exercise_type": exercise.exercise_type,
            "title": exercise_content["title"],
            "questions_generated": len(question_list),
            "content_preview": exercise_content 
        }