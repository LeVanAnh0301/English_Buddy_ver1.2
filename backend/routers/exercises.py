from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.database import get_db
from backend import models
from backend.services.ai_service import generate_exercise_from_transcript
from backend.services.transcript_service import fetch_transcript
import re

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