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
    You are an expert ESL (English as a Second Language) curriculum designer.
    Your goal is to create questions that not only test comprehension but also
    promote CRITICAL THINKING and SPEAKING PRACTICE.

    Generate 15-20 questions based on the transcript below.

    RULES:
    1.  **Question Count:** Strictly generate 15-20 questions.
    2.  **Difficulty Range:** Must cover all levels from A1 (simple facts) to C1 (complex analysis).
    3.  **Question Types (THIS IS CRITICAL):**
        * **Avoid simple, low-effort questions** (e.g., "Who is Peppa?") unless they are for A1 level.
        * Include "Why" and "How" questions.
        * Include **open-ended, analytical, and personal opinion questions** that require the student to elaborate.
        * For B2-C1 levels, questions should ask the student to *infer*, *evaluate*, or *relate the topic to their own personal experience*. These questions are designed to be "speaking prompts".

    Title: "{title}"
    Transcript: {transcript[:15000]}

    Output strictly valid JSON.
    * For fact-based questions, 'answer' should list key points.
    * For opinion/speaking prompts, 'answer' can be an empty list [] or ["Student's personal opinion"].

    JSON FORMAT:
    {{
        "title": "{title}",
        "questions": [
            {{
                "difficulty": "A1",
                "question": "What is the name of Peppa's little brother?",
                "answer": ["George"],
                "question_type": "factual"
            }},
            {{
                "difficulty": "B1",
                "question": "Why did Daddy Pig initially think the party was just a game?",
                "answer": ["He didn't realize it was a real party", "He thought it was just make-believe"],
                "question_type": "inference"
            }},
            {{
                "difficulty": "B2",
                "question": "How did Miss Rabbit manage to create the entire 'undersea world' in just one night?",
                "answer": ["The transcript doesn't say, but it shows she is very efficient and resourceful"],
                "question_type": "analysis"
            }},
            {{
                "difficulty": "C1",
                "question": "The party theme was 'undersea' and required a lot of imagination. In your opinion, why is imaginative play important for people (not just children)?",
                "answer": ["Student's personal opinion"],
                "question_type": "opinion"
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
