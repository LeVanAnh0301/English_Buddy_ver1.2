from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import traceback
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
    # 1. Lưu Video trước
    video_data = video_create.model_dump()
    video = models.ListeningSource(**video_data)
    
    db.add(video)
    db.commit()
    db.refresh(video)
    
    print(f"✅ Video created: {video.id}")

    if not video.transcript:
        print(f"⚠️ Video {video.id} has no transcript. Skipping AI generation.")
        return video

    try:
        print(f"🤖 Generating questions for video {video.id}...")
        ai_response = generate_comprehension_questions(video.transcript, video.title)

        if isinstance(ai_response, dict) and "error" in ai_response:
            print(f"❌ AI Service Error: {ai_response['error']}")
            return video

        if not isinstance(ai_response, list):
            print(f"❌ Invalid AI response format (expected list, got {type(ai_response)})")
            return video

        valid_questions = []
        for q in ai_response:
            if isinstance(q, dict):
                q["id"] = str(uuid.uuid4()) # Gán ID duy nhất cho từng câu hỏi
                valid_questions.append(q)
            else:
                print(f"⚠️ Skipping invalid question item: {q}")

        if not valid_questions:
            print(f"⚠️ No valid questions extracted for video {video.id}.")
            return video

        exercise_content = {
            "title": f"Questions for: {video.title}",
            "questions": valid_questions
        }

        new_exercise = models.ListeningExercise(
            source_id=video.id, 
            exercise_type="comprehension",
            content=exercise_content
        )
        
        db.add(new_exercise)
        db.commit()
        db.refresh(new_exercise)
        print(f"✅ Successfully created Exercise {new_exercise.id} with {len(valid_questions)} questions.")
        
    except Exception as e:
        print(f"🔥 CRITICAL ERROR generating exercise: {str(e)}")
        traceback.print_exc() 
        db.rollback()

    return video

@router.delete("/{video_id}", summary="Delete a video")
def delete_video(video_id: str, db: Session = Depends(get_db)):
    video = db.query(models.ListeningSource).filter_by(id=video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(video)
    db.commit()
    return {"message": "Deleted successfully"}
