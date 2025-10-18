import os
import json
from typing import Dict, Any, List
from dotenv import load_dotenv
from openai import OpenAI, BadRequestError
from pydantic import ValidationError
from backend.schemas import ComprehensionExercise
# --------------------------
# 🔹 Load environment & init client
# --------------------------
load_dotenv()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")


# --------------------------
# 🔹 Generate exercises from transcript
# --------------------------
def generate_comprehension_questions(transcript: str, title: str) -> List[Dict[str, Any]]:
    """
    Sinh 10-15 câu hỏi comprehension dựa vào transcript, từ cấp độ A1 -> C1
    Trả về list các câu hỏi hợp lệ (dict)
    """
    prompt = f"""
    You are an expert English comprehension exercise generator.
    Generate 10-15 questions from transcript below.
    Questions must have CEFR levels from A1 to C1 and use JSON keys:
    'difficulty' -> level, 'answer' -> expected_answer_points.

    Title: "{title}"
    Transcript: {transcript[:15000]}

    Output strictly valid JSON like:
    {{
        "title": "{title}",
        "questions": [
            {{
                "difficulty": "A1",
                "question": "Example question?",
                "answer": ["point1", "point2"],
                "question_type": "open_ended"
            }}
        ]
    }}
    """
    try:
        resp = client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": "You are an AI generating comprehension questions. Output ONLY JSON."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.4,
            max_tokens=2000
        )

        text = resp.choices[0].message.content.strip()

        # parse JSON
        raw_data = json.loads(text)

        # unwrap nếu có key 'ComprehensionExercise', còn không dùng luôn
        data_to_validate = raw_data.get("ComprehensionExercise", raw_data)

        # validate với Pydantic
        validated_exercise = ComprehensionExercise.model_validate(data_to_validate)

        # trả về danh sách question dict
        return [q.model_dump() for q in validated_exercise.questions]

    except BadRequestError as e:
        return {"error": f"OpenAI Request Error: {e.status_code} - {e.response.text}"}
    except (json.JSONDecodeError, ValidationError) as e:
        return {"error": "pydantic_validation_failed", "raw_output": text, "details": str(e)}
    except Exception as e:
        return {"error": f"Generation failed: {type(e).__name__} - {str(e)}"}
    
# --------------------------
# 🔹 AI evaluation for listening
# --------------------------
def ai_evaluate_listening(correct_answer: str, user_answer: str) -> Dict[str, Any]:
    """
    Evaluate user's answer for a single listening question.
    
    correct_answer: string, expected answer
    user_answer: string, student's answer

    Returns JSON:
    {
      "general": "correct"|"incorrect",
      "score": 0-100,
      "details": {"fluency": int, "pronunciation": int, "vocabulary": int},
      "feedback": str,
      "suggestion": str (optional)
    }
    """
    prompt = f"""
    You are an English listening evaluator.
    Compare student's answer to the correct answer.

    Correct answer: "{correct_answer}"
    Student's answer: "{user_answer}"

    Return strictly valid JSON with keys:
    - general: "correct" if correct, otherwise "incorrect"
    - score: 0-100
    - details: {{ "fluency": 0-100, "pronunciation": 0-100, "vocabulary": 0-100 }}
    - feedback: one short sentence
    - suggestion: optional, short advice if answer is incorrect
    """

    try:
        resp = client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": "You are a professional English listening evaluator."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3
        )

        text = resp.choices[0].message.content.strip()
        result = json.loads(text)

        # đảm bảo tất cả key có
        result.setdefault("general", "incorrect")
        result.setdefault("score", 0)
        result.setdefault("details", {"fluency": 0, "pronunciation": 0, "vocabulary": 0})
        result.setdefault("feedback", "")
        if "suggestion" not in result or not result["suggestion"]:
            result["suggestion"] = "" if result["general"] == "correct" else f"Expected answer: {correct_answer}"

        return result

    except json.JSONDecodeError:
        return {"error": "invalid_json", "raw": text}
    except Exception as e:
        return {"error": f"AI evaluation failed: {str(e)}"}
# --------------------------
# 🔹 AI evaluation for speaking
# --------------------------
def ai_evaluate_speaking(transcript: str) -> Dict[str, Any]:
    """
    Evaluate user's speaking transcript for fluency, pronunciation, vocabulary.
    """
    prompt = f"""
    You are an English speaking examiner.
    Evaluate this transcript and return JSON:
    {{
        "score": int,
        "fluency": int,
        "pronunciation": int,
        "vocabulary": int,
        "feedback": "string"
    }}

    Transcript:
    "{transcript}"
    """

    try:
        resp = client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": "You are a professional English speaking evaluator."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3
        )
        text = resp.choices[0].message.content.strip()
        return json.loads(text)
    except json.JSONDecodeError:
        return {"error": "invalid_json", "raw": text}
    except Exception as e:
        return {"error": f"AI evaluation failed: {str(e)}"}
