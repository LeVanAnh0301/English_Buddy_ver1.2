from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from backend.database import get_db
from backend import models
import uuid
import json
from backend.services.ai_service import generate_comprehension_questions
from backend.schemas import VideoResponse, VideoCreate
router = APIRouter()

@router.get("/", summary="List all videos", response_model=List[VideoResponse])
def list_videos(db: Session = Depends(get_db)):
    videos = db.query(models.ListeningSource).all()
    return videos

@router.get("/{video_id}", summary="Get video by ID")
def get_video(video_id: str, db: Session = Depends(get_db)):
    video = db.query(models.ListeningSource).filter_by(id=video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    return video

@router.post("/", summary="Add new video and auto-generate questions", response_model=VideoResponse)
def add_video(video_create: VideoCreate, db: Session = Depends(get_db)):
    """
    Thêm một video mới. API này sẽ:
    1. Lưu video (ListeningSource) vào DB.
    2. TỰ ĐỘNG gọi AI để sinh câu hỏi nếu có transcript.
    3. Lưu bài tập (ListeningExercise) liên kết với video đó.
    """
    video_data = video_create.model_dump()
    video = models.ListeningSource(**video_data)
    
    db.add(video)
    db.commit()
    db.refresh(video)
 
    if not video.transcript:
        print(f"Video {video.id} created without transcript. Skipping question generation.")
        return video

    try:
        print(f"Generating questions for new video {video.id}...")
        question_list = generate_comprehension_questions(video.transcript, video.title)

        questions = []
        for q in question_list:
            if isinstance(q, str):
                try:
                    q = json.loads(q) 
                except Exception:
                    print(f"Skipping invalid question format: {q}")
                    continue  
            
            q["id"] = str(uuid.uuid4())
            questions.append(q)

        if not questions:
            print(f"AI returned no valid questions for video {video.id}.")
            return video

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
        print(f"Successfully created exercise {exercise.id} for video {video.id}.")
        
    except Exception as e:
        print(f"CRITICAL: Error generating questions or new video {video.id}: {e}")

        pass 
    return video

@router.delete("/{video_id}", summary="Delete a video")
def delete_video(video_id: str, db: Session = Depends(get_db)):
    video = db.query(models.ListeningSource).filter_by(id=video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(video)
    db.commit()
    return {"message": "Deleted successfully"}
