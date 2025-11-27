from fastapi import APIRouter, UploadFile, Form, HTTPException, Depends
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from backend.database import get_db
from backend.models import ListeningExercise
from backend.services.ai_service import ai_evaluate_listening
import tempfile
import os
import logging
import traceback

logger = logging.getLogger("api_debug")
logging.basicConfig(level=logging.INFO)

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
    """
    try:
        try:
            exercise = db.query(ListeningExercise).filter_by(id=exercise_id).first()
        except SQLAlchemyError as db_err:
            logger.error(f"❌ Database Error: {str(db_err)}")
            raise HTTPException(status_code=500, detail="Database connection failed")

        if not exercise:
            raise HTTPException(status_code=404, detail="Exercise not found")

        content = exercise.content
        if not content or "questions" not in content:
            raise HTTPException(status_code=400, detail="Exercise content invalid")

        try:
            question_data = next((q for q in content["questions"] if str(q.get("id")) == str(question_id)), None)
        except Exception as e:
            logger.error(f"❌ Error filtering questions: {e}")
            raise HTTPException(status_code=500, detail="Error processing questions list")

        if not question_data:
            raise HTTPException(status_code=404, detail="Question not found")

        expected_points = question_data.get("expected_answer_points", [])
        if not isinstance(expected_points, list):
             expected_points = [str(expected_points)]
             
        correct_answer = ", ".join(expected_points)
        
        logger.info(f"🤖 Calling AI for Question {question_id} | User Answer: {user_answer}")
        
        try:
            ai_result = ai_evaluate_listening(correct_answer, user_answer)
        except Exception as ai_crash:
            logger.error(f"❌ AI Service CRASHED: {traceback.format_exc()}")
            raise HTTPException(status_code=500, detail=f"AI Service Internal Error: {str(ai_crash)}")

        if "error" in ai_result:
            logger.error(f"❌ AI returned error: {ai_result['error']}")
            raise HTTPException(status_code=500, detail=f"AI evaluation failed: {ai_result['error']}")

        final_score = ai_result.get("overall_score", 0)

        general = ai_result.get("general", "incorrect")
        
        if final_score < 40:
            general = "incorrect"

        raw_details = ai_result.get("details", {})
        
        formatted_details = {
            "fluency": raw_details.get("fluency", {}).get("score", 0),
            "vocabulary": raw_details.get("vocabulary", {}).get("score", 0),
            "pronunciation": raw_details.get("grammar", {}).get("score", 0), 
            "grammar": raw_details.get("grammar", {}).get("score", 0)
        }

        feedback = ai_result.get("feedback", "")
        suggestion = ai_result.get("suggestion", "")
        
        if general == "incorrect" and not suggestion:
            suggestion = f"Key points needed: {correct_answer}"

        return {
            "general": general,
            "score": final_score,
            "details": formatted_details,
            "feedback": feedback,
            "suggestion": suggestion
        }

    except HTTPException as http_ex:
        raise http_ex
    except Exception as e:
        error_msg = traceback.format_exc()
        logger.error(f"🔥 UNEXPECTED SERVER ERROR 🔥\n{error_msg}")
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")


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
