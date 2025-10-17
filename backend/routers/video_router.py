from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from backend.database import get_db
from backend import models
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

@router.post("/", summary="Add new video manually", response_model=VideoResponse)
def add_video(video_create: VideoCreate, db: Session = Depends(get_db)):
    # Convert Pydantic schema -> SQLAlchemy model
    video = models.ListeningSource(**video_create.dict())
    db.add(video)
    db.commit()
    db.refresh(video)
    return video

@router.delete("/{video_id}", summary="Delete a video")
def delete_video(video_id: str, db: Session = Depends(get_db)):
    video = db.query(models.ListeningSource).filter_by(id=video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(video)
    db.commit()
    return {"message": "Deleted successfully"}
