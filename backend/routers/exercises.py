from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from backend.database import get_db
from backend import models
from backend.services.ai_service import generate_exercise_from_transcript
from backend.services.transcript_service import fetch_transcript
import re
import os
import tempfile
import speech_recognition as sr
from pydantic import BaseModel
from typing import Optional
from difflib import SequenceMatcher

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

class ExerciseResponse(BaseModel):
    id: int
    source_id: int
    exercise_type: str
    content: dict
    created_at: str
    source: dict

@router.get("/listening_exercises/", response_model=list[ExerciseResponse])
def get_listening_exercises(
    source_id: Optional[int] = None,
    exercise_type: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get listening exercises from database with optional filters."""
    
    query = db.query(models.ListeningExercise)
    
    # Apply filters if provided
    if source_id:
        query = query.filter(models.ListeningExercise.source_id == source_id)
    
    if exercise_type:
        query = query.filter(models.ListeningExercise.exercise_type == exercise_type)
    
    exercises = query.all()
    
    return [
        ExerciseResponse(
            id=exercise.id,
            source_id=exercise.source_id,
            exercise_type=exercise.exercise_type,
            content=exercise.content or {},
            created_at=exercise.created_at.isoformat() if exercise.created_at else "",
            source={
                "id": exercise.source.id,
                "title": exercise.source.title,
                "youtube_video_id": exercise.source.youtube_video_id,
                "url": exercise.source.url
            } if exercise.source else {}
        )
        for exercise in exercises
    ]

@router.get("/listening_exercises/{exercise_id}", response_model=ExerciseResponse)
def get_listening_exercise(exercise_id: int, db: Session = Depends(get_db)):
    """Get a specific listening exercise by ID."""
    
    exercise = db.query(models.ListeningExercise).filter(
        models.ListeningExercise.id == exercise_id
    ).first()
    
    if not exercise:
        raise HTTPException(status_code=404, detail="Exercise not found")
    
    return ExerciseResponse(
        id=exercise.id,
        source_id=exercise.source_id,
        exercise_type=exercise.exercise_type,
        content=exercise.content or {},
        created_at=exercise.created_at.isoformat() if exercise.created_at else "",
        source={
            "id": exercise.source.id,
            "title": exercise.source.title,
            "youtube_video_id": exercise.source.youtube_video_id,
            "url": exercise.source.url
        } if exercise.source else {}
    )

@router.get("/exercises_by_video/{youtube_video_id}")
def get_exercises_by_video(youtube_video_id: str, db: Session = Depends(get_db)):
    """Get all exercises for a specific YouTube video."""
    
    # First find the source by YouTube video ID
    source = db.query(models.ListeningSource).filter(
        models.ListeningSource.youtube_video_id == youtube_video_id
    ).first()
    
    if not source:
        return []
    
    # Get all exercises for this source
    exercises = db.query(models.ListeningExercise).filter(
        models.ListeningExercise.source_id == source.id
    ).all()
    
    return [
        {
            "id": exercise.id,
            "source_id": exercise.source_id,
            "exercise_type": exercise.exercise_type,
            "content": exercise.content or {},
            "created_at": exercise.created_at.isoformat() if exercise.created_at else "",
            "source": {
                "id": source.id,
                "title": source.title,
                "youtube_video_id": source.youtube_video_id,
                "url": source.url
            }
        }
        for exercise in exercises
    ]

class SpeakingScoreResponse(BaseModel):
    score: int
    feedback: str
    transcript: str
    pronunciation_score: Optional[int] = None
    fluency_score: Optional[int] = None
    vocabulary_score: Optional[int] = None

@router.post("/score_speaking/", response_model=SpeakingScoreResponse)
async def score_speaking_exercise(
    audio: UploadFile = File(...),
    exercise_id: int = Form(...),
    user_id: int = Form(...),
    db: Session = Depends(get_db)
):
    """Score a speaking exercise based on uploaded audio file."""
    
    try:
        # Save uploaded audio to temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as temp_file:
            content = await audio.read()
            temp_file.write(content)
            temp_file_path = temp_file.name
        
        # Initialize speech recognition
        recognizer = sr.Recognizer()
        
        # Convert audio to text using Google Speech Recognition
        with sr.AudioFile(temp_file_path) as source:
            audio_data = recognizer.record(source)
            try:
                transcript = recognizer.recognize_google(audio_data, language="en-US")
            except sr.UnknownValueError:
                transcript = "Could not understand audio"
            except sr.RequestError as e:
                transcript = f"Error with speech recognition: {e}"
        
        # Clean up temporary file
        os.unlink(temp_file_path)
        
        # Simple scoring algorithm (replace with more sophisticated AI scoring)
        score = calculate_speaking_score(transcript, exercise_id)
        
        # Generate feedback
        feedback = generate_speaking_feedback(score, transcript)
        
        # Save progress to database
        progress = models.UserListeningProgress(
            user_id=user_id,
            exercise_id=exercise_id,
            score=score,
            results={"transcript": transcript, "feedback": feedback},
            ai_feedback={"score": score, "feedback": feedback}
        )
        db.add(progress)
        db.commit()
        
        return SpeakingScoreResponse(
            score=score,
            feedback=feedback,
            transcript=transcript,
            pronunciation_score=min(score + 10, 100),
            fluency_score=min(score - 5, 100),
            vocabulary_score=min(score + 5, 100)
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing audio: {str(e)}")

def calculate_speaking_score(transcript: str, exercise_id: int) -> int:
    """Simple scoring algorithm - replace with AI-powered scoring."""
    
    if not transcript or transcript == "Could not understand audio":
        return 0
    
    # Basic scoring based on transcript length and content
    word_count = len(transcript.split())
    
    # Minimum score based on word count
    base_score = min(word_count * 2, 60)
    
    # Bonus for common English words
    common_words = ["the", "and", "is", "in", "to", "of", "a", "that", "it", "with"]
    word_bonus = sum(1 for word in transcript.lower().split() if word in common_words) * 2
    
    # Final score (0-100)
    final_score = min(base_score + word_bonus, 100)
    
    return max(final_score, 20)  # Minimum score of 20

def generate_speaking_feedback(score: int, transcript: str) -> str:
    """Generate feedback based on score and transcript."""
    
    if score >= 80:
        return f"Excellent! Your pronunciation is clear and you used good vocabulary. Keep practicing to maintain this level. Transcript: '{transcript}'"
    elif score >= 60:
        return f"Good job! You're making progress. Try to speak more clearly and use a wider range of vocabulary. Transcript: '{transcript}'"
    elif score >= 40:
        return f"Not bad! Keep practicing. Focus on speaking more slowly and clearly. Transcript: '{transcript}'"
    else:
        return f"Keep practicing! Try to speak more clearly and use complete sentences. Transcript: '{transcript}'"


# =====================
# Word-level speaking practice
# =====================

class WordSpeakingRequest(BaseModel):
    target_word: str

class WordSpeakingResponse(BaseModel):
    target_word: str
    recognized_text: str
    similarity: float
    score: int
    feedback: str
    alignment: list[dict]  # [{op, target, recog} per step]
    mistakes: list[dict]   # compact mistake spans for UI

class SpeakingAnswerRequest(BaseModel):
    question: str
    expected_keywords: list[str]
    user_answer: str

class SpeakingAnswerResponse(BaseModel):
    score: int
    feedback: str
    keyword_matches: list[str]
    missing_keywords: list[str]
    grammar_score: int
    fluency_score: int
    suggestions: list[str]

def _similarity(a: str, b: str) -> float:
    return SequenceMatcher(None, a.lower().strip(), b.lower().strip()).ratio()

@router.post("/word_speaking_score/", response_model=WordSpeakingResponse)
async def word_speaking_score(
    audio: UploadFile = File(...),
    target_word: str = Form(...),
):
    """Accepts short audio of a single word and scores pronunciation similarity.

    Frontend may upload webm/ogg; we convert to wav if necessary before ASR.
    """
    try:
        # Save uploaded audio
        with tempfile.NamedTemporaryFile(delete=False) as temp_in:
            content = await audio.read()
            temp_in.write(content)
            temp_in_path = temp_in.name

        # Convert to wav when not wav
        input_filename = getattr(audio, 'filename', '') or ''
        needs_convert = not (input_filename.lower().endswith('.wav'))

        temp_wav_path = None
        if needs_convert:
            # Lazy import to avoid hard dependency if not used
            from pydub import AudioSegment
            temp_wav = tempfile.NamedTemporaryFile(delete=False, suffix='.wav')
            temp_wav_path = temp_wav.name
            temp_wav.close()
            seg = AudioSegment.from_file(temp_in_path)
            seg.export(temp_wav_path, format='wav')
            source_path = temp_wav_path
        else:
            source_path = temp_in_path

        recognizer = sr.Recognizer()
        with sr.AudioFile(source_path) as src:
            audio_data = recognizer.record(src)
            try:
                recognized = recognizer.recognize_google(audio_data, language="en-US")
            except sr.UnknownValueError:
                recognized = ""
            except sr.RequestError:
                recognized = ""

        # Cleanup temp files
        try:
            os.unlink(temp_in_path)
        except Exception:
            pass
        if temp_wav_path:
            try:
                os.unlink(temp_wav_path)
            except Exception:
                pass

        sim = _similarity(recognized, target_word) if recognized else 0.0
        score = int(round(sim * 100))
        if score >= 85:
            fb = "Phát âm rất tốt!" \
                 " Tiếp tục duy trì."
        elif score >= 65:
            fb = "Khá ổn! Cố gắng nhấn âm và kéo dài nguyên âm rõ hơn."
        elif score >= 40:
            fb = "Cần cải thiện. Hãy nói chậm hơn và tách rõ âm đầu/cuối."
        else:
            fb = "Hãy thử lại. Hãy nghe mẫu và bắt chước nhấn âm chính."

        # Build per-character alignment to indicate mistakes
        sm = SequenceMatcher(None, target_word.strip(), (recognized or "").strip())
        opcodes = sm.get_opcodes()
        alignment = []
        mistakes = []
        for tag, i1, i2, j1, j2 in opcodes:
            tgt_seg = target_word[i1:i2]
            rec_seg = (recognized or "")[j1:j2]
            alignment.append({
                "op": tag,  # equal, replace, insert (in recog), delete (in target)
                "target": tgt_seg,
                "recog": rec_seg,
            })
            if tag != "equal":
                mistakes.append({
                    "op": tag,
                    "target_segment": tgt_seg,
                    "recognized_segment": rec_seg,
                    "target_range": [i1, i2],
                    "recognized_range": [j1, j2]
                })

        return WordSpeakingResponse(
            target_word=target_word,
            recognized_text=recognized,
            similarity=round(sim, 3),
            score=score,
            feedback=fb,
            alignment=alignment,
            mistakes=mistakes,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error scoring word speaking: {str(e)}")


@router.post("/score_speaking_answer/", response_model=SpeakingAnswerResponse)
async def score_speaking_answer(request: SpeakingAnswerRequest):
    """Score a speaking answer based on question, expected keywords, and user response.
    
    Uses free algorithms: keyword matching, text similarity, basic grammar checks.
    No external API calls to minimize costs.
    """
    try:
        question = request.question.lower().strip()
        expected_keywords = [kw.lower().strip() for kw in request.expected_keywords]
        user_answer = request.user_answer.lower().strip()
        
        if not user_answer or len(user_answer) < 3:
            return SpeakingAnswerResponse(
                score=0,
                feedback="Câu trả lời quá ngắn. Hãy cố gắng nói dài hơn và chi tiết hơn.",
                keyword_matches=[],
                missing_keywords=expected_keywords,
                grammar_score=0,
                fluency_score=0,
                suggestions=["Nói chậm hơn", "Sử dụng câu đầy đủ", "Thêm chi tiết"]
            )
        
        # 1. Keyword matching (40% of score)
        found_keywords = []
        missing_keywords = []
        for keyword in expected_keywords:
            if keyword in user_answer:
                found_keywords.append(keyword)
            else:
                missing_keywords.append(keyword)
        
        keyword_score = (len(found_keywords) / len(expected_keywords)) * 40 if expected_keywords else 0
        
        # 2. Text length and structure (30% of score)
        word_count = len(user_answer.split())
        if word_count < 5:
            length_score = 10
        elif word_count < 10:
            length_score = 20
        elif word_count < 20:
            length_score = 25
        else:
            length_score = 30
        
        # 3. Basic grammar indicators (20% of score)
        grammar_indicators = [
            user_answer.count('.') > 0,  # Has sentences
            any(word in user_answer for word in ['the', 'a', 'an']),  # Articles
            any(word in user_answer for word in ['is', 'are', 'was', 'were']),  # Verbs
            user_answer.count(',') > 0,  # Has commas
        ]
        grammar_score = sum(grammar_indicators) * 5  # 0-20 points
        
        # 4. Fluency indicators (10% of score)
        fluency_indicators = [
            len(user_answer.split()) > 8,  # Sufficient length
            not any(word * 3 in user_answer for word in ['um', 'uh', 'er']),  # No excessive fillers
            user_answer.count(' ') > 3,  # Multiple words
        ]
        fluency_score = sum(fluency_indicators) * 3.33  # 0-10 points
        
        # Calculate total score
        total_score = int(keyword_score + length_score + grammar_score + fluency_score)
        total_score = min(total_score, 100)  # Cap at 100
        
        # Generate feedback
        feedback_parts = []
        
        if total_score >= 80:
            feedback_parts.append("Tuyệt vời! Câu trả lời của bạn rất tốt.")
        elif total_score >= 60:
            feedback_parts.append("Tốt! Bạn đã trả lời khá ổn.")
        elif total_score >= 40:
            feedback_parts.append("Khá ổn, nhưng cần cải thiện thêm.")
        else:
            feedback_parts.append("Cần cải thiện nhiều hơn.")
        
        if found_keywords:
            feedback_parts.append(f"Bạn đã sử dụng các từ khóa: {', '.join(found_keywords)}.")
        
        if missing_keywords:
            feedback_parts.append(f"Hãy thử sử dụng: {', '.join(missing_keywords[:3])}.")
        
        if word_count < 10:
            feedback_parts.append("Hãy cố gắng nói dài hơn và chi tiết hơn.")
        
        if grammar_score < 10:
            feedback_parts.append("Cố gắng sử dụng câu đầy đủ với chủ ngữ và vị ngữ.")
        
        # Generate suggestions
        suggestions = []
        if len(found_keywords) < len(expected_keywords) * 0.5:
            suggestions.append("Sử dụng nhiều từ khóa liên quan hơn")
        if word_count < 15:
            suggestions.append("Mở rộng câu trả lời với nhiều chi tiết")
        if grammar_score < 15:
            suggestions.append("Chú ý ngữ pháp và cấu trúc câu")
        if fluency_score < 7:
            suggestions.append("Nói chậm và rõ ràng hơn")
        
        feedback = " ".join(feedback_parts)
        
        return SpeakingAnswerResponse(
            score=total_score,
            feedback=feedback,
            keyword_matches=found_keywords,
            missing_keywords=missing_keywords,
            grammar_score=int(grammar_score),
            fluency_score=int(fluency_score),
            suggestions=suggestions
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error scoring speaking answer: {str(e)}")