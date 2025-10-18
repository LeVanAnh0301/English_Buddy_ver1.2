from fastapi import APIRouter, Depends
from pydantic import BaseModel
from backend.services.ai_service import  ai_evaluate_speaking

router = APIRouter()

class SpeakingRequest(BaseModel):
    transcript: str

@router.post("/speaking")
def eval_speaking(req: SpeakingRequest):
    return ai_evaluate_speaking(req.transcript)
