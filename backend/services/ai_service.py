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
    Evaluate user's answer for a single listening question with detailed grammar, vocabulary, and fluency scoring.
    """
    prompt = f"""
    You are an ESL Teacher checking a student's listening answer.
    
    Task 1: Compare the semantic meaning. Does the Student's Answer convey the same meaning as the Correct Answer?
    Task 2: Check grammar and vocabulary accuracy.
    
    Correct Answer: "{correct_answer}"
    Student Answer: "{user_answer}"
    
    Output strictly valid JSON format:
    {{
        "general": "correct" (meaning matches) | "partially_correct" | "incorrect" (meaning wrong),
        "overall_score": 0-100 (If incorrect meaning, max score is 40. If correct meaning but bad grammar, score 60-90),
        "details": {{
            "grammar": {{ "score": 0-100, "errors": [], "strengths": [] }},
            "vocabulary": {{ "score": 0-100, "errors": [], "strengths": [] }},
            "fluency": {{ "score": 0-100, "issues": [], "strengths": [] }}
        }},
        "feedback": "Short feedback focusing on why it is correct/incorrect.",
        "suggestion": "How to improve the answer or the correct phrasing."
    }}
    """
    
    try:
        resp = client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": "You are a professional English listening evaluator. You output ONLY valid JSON. Do not use Markdown formatting."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3,
            max_tokens=1000,
            response_format={"type": "json_object"} 
        )
        
        text = resp.choices[0].message.content.strip()
        
        if text.startswith("```json"):
            text = text.replace("```json", "").replace("```", "").strip()
        elif text.startswith("```"):
            text = text.replace("```", "").strip()

        result = json.loads(text)
        
        result.setdefault("general", "incorrect")
        result.setdefault("overall_score", 0)
        
        if "details" not in result:
            result["details"] = {}
        
        # Ensure each detail category has proper structure
        for category in ["grammar", "vocabulary", "fluency"]:
            if category not in result["details"]:
                result["details"][category] = {
                    "score": 0,
                    "errors": [],
                    "strengths": []
                }
        
        result.setdefault("feedback", "")
        result.setdefault("suggestion", "")
        
        return result
        
    except json.JSONDecodeError:
        # In ra raw text để debug nếu vẫn lỗi
        print(f"❌ JSON Decode Error. Raw text from AI: {text}")
        return {"error": "invalid_json", "raw": text}
    except Exception as e:
        return {"error": f"AI evaluation failed: {str(e)}"}

# --------------------------
# 🔹 AI evaluation for speaking
# --------------------------
def ai_evaluate_speaking(transcript: str, question: str = "") -> Dict[str, Any]:
    """
    Evaluate user's speaking transcript with detailed grammar, vocabulary, and fluency analysis.
    
    Args:
        transcript: The student's spoken response (transcribed to text)
        question: Optional - the question being answered for context
        
    Returns:
        JSON with comprehensive evaluation
    """
    question_context = f"\nQuestion being answered: {question}" if question else ""
    
    prompt = f"""
    You are an expert English speaking examiner specializing in ESL evaluation.
    
    Evaluate this spoken transcript comprehensively across multiple dimensions.{question_context}
    
    Transcript:
    "{transcript}"
    
    Provide detailed evaluation in these areas:
    
    1. **Grammar (0-100)**:
       - Sentence structure complexity and accuracy
       - Verb tense consistency
       - Subject-verb agreement
       - Use of articles, prepositions, conjunctions
       - Identify specific errors and strengths
    
    2. **Vocabulary (0-100)**:
       - Range (variety of words used)
       - Precision (appropriate word choice)
       - Sophistication (use of advanced vocabulary)
       - Collocations and idioms
       - Identify specific errors and strengths
    
    3. **Fluency (0-100)**:
       - Coherence and logical flow
       - Use of linking words
       - Natural speech patterns
       - Completeness of ideas
       - Identify any issues and strengths
    
    4. **Pronunciation hints** (based on written patterns that suggest pronunciation issues)
    
    5. **Content quality** (relevance, depth, elaboration)
    
    Return strictly valid JSON:
    {{
        "overall_score": 0-100,
        "cefr_level": "A1" | "A2" | "B1" | "B2" | "C1" | "C2",
        "grammar": {{
            "score": 0-100,
            "errors": [
                {{"type": "tense", "example": "I go yesterday", "correction": "I went yesterday"}},
                {{"type": "article", "example": "I am teacher", "correction": "I am a teacher"}}
            ],
            "strengths": ["Uses complex sentences effectively", "Good control of past tense"],
            "analysis": "Brief overall assessment"
        }},
        "vocabulary": {{
            "score": 0-100,
            "range_score": 0-100,
            "precision_score": 0-100,
            "errors": [
                {{"word": "do homework", "context": "I do my homework", "suggestion": "complete/finish homework"}},
                {{"word": "very good", "context": "It was very good", "suggestion": "excellent/outstanding"}}
            ],
            "strengths": ["Uses topic-specific vocabulary", "Good use of collocations"],
            "advanced_words_used": ["sophisticated", "furthermore", "consequently"],
            "analysis": "Brief overall assessment"
        }},
        "fluency": {{
            "score": 0-100,
            "coherence_score": 0-100,
            "cohesion_score": 0-100,
            "issues": ["Lacks transition between ideas", "Incomplete sentence at the end"],
            "strengths": ["Logical progression", "Clear main idea"],
            "linking_words_used": ["however", "therefore", "additionally"],
            "analysis": "Brief overall assessment"
        }},
        "pronunciation_hints": [
            "Possible issue with 'th' sounds based on spelling patterns",
            "May need to work on word stress for multi-syllable words"
        ],
        "content": {{
            "score": 0-100,
            "relevance": "Addresses the question directly/partially/not at all",
            "depth": "Superficial/Adequate/Detailed analysis",
            "comments": "Brief assessment of content quality"
        }},
        "overall_feedback": "Comprehensive 2-3 sentence summary of performance",
        "strengths_summary": ["Main strength 1", "Main strength 2"],
        "areas_for_improvement": ["Priority area 1", "Priority area 2"],
        "actionable_suggestions": [
            "Practice using past perfect tense for completed actions",
            "Expand vocabulary by learning synonyms for common words",
            "Use more linking words to connect ideas smoothly"
        ]
    }}
    
    SCORING RUBRIC:
    - 90-100: Near-native or C2 level
    - 80-89: Advanced (C1)
    - 70-79: Upper-intermediate (B2)
    - 60-69: Intermediate (B1)
    - 50-59: Pre-intermediate (A2)
    - 0-49: Beginner (A1)
    """
    
    try:
        resp = client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": "You are a professional English speaking evaluator with expertise in detailed linguistic analysis and ESL assessment."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3,
            max_tokens=2000
        )
        
        text = resp.choices[0].message.content.strip()
        result = json.loads(text)
        
        # Ensure all required top-level keys exist
        result.setdefault("overall_score", 0)
        result.setdefault("cefr_level", "A1")
        result.setdefault("overall_feedback", "")
        result.setdefault("strengths_summary", [])
        result.setdefault("areas_for_improvement", [])
        result.setdefault("actionable_suggestions", [])
        result.setdefault("pronunciation_hints", [])
        
        # Ensure grammar structure
        if "grammar" not in result:
            result["grammar"] = {}
        result["grammar"].setdefault("score", 0)
        result["grammar"].setdefault("errors", [])
        result["grammar"].setdefault("strengths", [])
        result["grammar"].setdefault("analysis", "")
        
        # Ensure vocabulary structure
        if "vocabulary" not in result:
            result["vocabulary"] = {}
        result["vocabulary"].setdefault("score", 0)
        result["vocabulary"].setdefault("range_score", 0)
        result["vocabulary"].setdefault("precision_score", 0)
        result["vocabulary"].setdefault("errors", [])
        result["vocabulary"].setdefault("strengths", [])
        result["vocabulary"].setdefault("advanced_words_used", [])
        result["vocabulary"].setdefault("analysis", "")
        
        # Ensure fluency structure
        if "fluency" not in result:
            result["fluency"] = {}
        result["fluency"].setdefault("score", 0)
        result["fluency"].setdefault("coherence_score", 0)
        result["fluency"].setdefault("cohesion_score", 0)
        result["fluency"].setdefault("issues", [])
        result["fluency"].setdefault("strengths", [])
        result["fluency"].setdefault("linking_words_used", [])
        result["fluency"].setdefault("analysis", "")
        
        # Ensure content structure
        if "content" not in result:
            result["content"] = {}
        result["content"].setdefault("score", 0)
        result["content"].setdefault("relevance", "")
        result["content"].setdefault("depth", "")
        result["content"].setdefault("comments", "")
        
        return result
        
    except json.JSONDecodeError:
        return {"error": "invalid_json", "raw": text}
    except Exception as e:
        return {"error": f"AI evaluation failed: {str(e)}"}

# --------------------------
# 🔹 Helper function to get simple scores
# --------------------------
def get_simple_scores(evaluation_result: Dict[str, Any]) -> Dict[str, int]:
    """
    Extract simple numeric scores from detailed evaluation result.
    Useful for displaying basic scores in UI.
    
    Returns:
        {
            "grammar": int,
            "vocabulary": int,
            "fluency": int,
            "overall": int
        }
    """
    try:
        return {
            "grammar": evaluation_result.get("grammar", {}).get("score", 0),
            "vocabulary": evaluation_result.get("vocabulary", {}).get("score", 0),
            "fluency": evaluation_result.get("fluency", {}).get("score", 0),
            "overall": evaluation_result.get("overall_score", 0)
        }
    except Exception:
        return {"grammar": 0, "vocabulary": 0, "fluency": 0, "overall": 0}