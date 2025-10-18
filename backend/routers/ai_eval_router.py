from fastapi import APIRouter, Depends
from pydantic import BaseModel
from backend.services.ai_service import ai_evaluate_listening, ai_evaluate_speaking

router = APIRouter()

class ListeningRequest(BaseModel):
    answer: str
    expected_answer: str

@router.post("/listening")
def eval_listening(req: ListeningRequest):
    return ai_evaluate_listening(req.answer, req.expected_answer)

class SpeakingRequest(BaseModel):
    transcript: str

@router.post("/speaking")
def eval_speaking(req: SpeakingRequest):
    return ai_evaluate_speaking(req.transcript)
