from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.database import get_db
from backend import models
import uuid
from backend.services.ai_service import generate_comprehension_questions

router = APIRouter()

@router.post("/generate_questions/{youtube_video_id}", summary="Generate questions for a YouTube video")
def generate_questions(youtube_video_id: str, db: Session = Depends(get_db)):
    # 🔍 Tìm video theo youtube_video_id
    video = db.query(models.ListeningSource).filter_by(youtube_video_id=youtube_video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")

    if not video.transcript:
        raise HTTPException(status_code=400, detail="Transcript not available")

    # 🧠 Gọi AI sinh câu hỏi
    question_list = generate_comprehension_questions(video.transcript, video.title)

    questions = []
    for q in question_list:
        if isinstance(q, str):
            import json
            try:
                q = json.loads(q)
            except Exception:
                continue
        q["id"] = str(uuid.uuid4())
        questions.append(q)

    exercise_content = {
        "title": f"Questions for: {video.title}",
        "questions": questions
    }

    exercise = models.ListeningExercise(
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
        "questions_generated": len(questions),
        "content_preview": exercise_content
    }
