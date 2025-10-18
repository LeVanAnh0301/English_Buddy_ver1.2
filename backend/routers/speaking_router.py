from fastapi import APIRouter, UploadFile, Form, HTTPException, Depends
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import ListeningExercise
from backend.services.ai_service import ai_evaluate_listening
import tempfile
import os

router = APIRouter()


@router.post("/evaluate")
def evaluate_listening(
    question_id: str = Form(...),
    user_answer: str = Form(...),
    exercise_id: str = Form(...),
    db: Session = Depends(get_db)
):
    """
    Evaluate a student's answer for a specific listening question.

    Parameters:
    - question_id: The ID of the question within the exercise's content.questions list.
    - user_answer: The student's answer as text.
    - exercise_id: The ID of the ListeningExercise in the database.

    Returns:
    - A JSON object containing:
        - general: "correct" or "incorrect"
        - score: overall score (0-100)
        - details: breakdown of fluency, pronunciation, vocabulary (0-100 each)
        - feedback: short feedback sentence from AI
        - suggestion: optional advice if the answer is incorrect
    """

    exercise: ListeningExercise = db.query(ListeningExercise).filter_by(id=exercise_id).first()
    if not exercise:
        raise HTTPException(status_code=404, detail="Exercise not found")

    content = exercise.content
    if "questions" not in content:
        raise HTTPException(status_code=400, detail="Exercise content invalid")

    question_data = next((q for q in content["questions"] if q.get("id") == question_id), None)
    if not question_data:
        raise HTTPException(status_code=404, detail="Question not found")

    correct_answer = ", ".join(question_data.get("expected_answer_points", []))
    ai_result = ai_evaluate_listening(correct_answer, user_answer)

    if "error" in ai_result:
        raise HTTPException(status_code=500, detail=f"AI evaluation failed: {ai_result['error']}")

    general = "correct" if ai_result.get("score", 0) >= 70 else "incorrect"
    details = {
        "fluency": ai_result.get("fluency", 100),
        "pronunciation": ai_result.get("pronunciation", 100),
        "vocabulary": ai_result.get("vocabulary", 100),
    }
    feedback = ai_result.get("feedback", "")
    suggestion = None
    if general == "incorrect":
        suggestion = f"Expected points: {correct_answer}"

    return {
        "general": general,
        "score": ai_result.get("score", 0),
        "details": details,
        "feedback": feedback,
        "suggestion": suggestion
    }



@router.post("/upload-audio")
async def upload_audio(file: UploadFile):
    """
    Upload user's speaking audio (e.g., for ASR or storage)
    """
    try:
        temp_dir = tempfile.mkdtemp()
        file_path = os.path.join(temp_dir, file.filename)
        with open(file_path, "wb") as f:
            f.write(await file.read())
        return {"filename": file.filename, "path": file_path, "message": "Audio uploaded successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Audio upload failed: {str(e)}")
