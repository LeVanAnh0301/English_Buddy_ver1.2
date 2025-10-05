
import os, json
from openai import OpenAI
from typing import Dict, Any
from dotenv import load_dotenv

# load env
load_dotenv()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
MODEL = os.getenv("OPENAI_MODEL", "gpt-3.5-turbo")

def generate_exercise_from_transcript(transcript: str, title: str) -> Dict[str,Any]:
    """
    Prompt GPT to generate:
      - listening tasks: dictation segments + blanks + answers + timestamps (if available)
      - speaking tasks: prompts + expected_points + hints
    Returns JSON ready to store.
    """
    prompt = f"""
        You are content generator for English listening + speaking practice.
        Input: a transcript of a short video titled "{title}".
        Produce JSON with:
        - listening: list of {{"id","type" ("dictation" or "fill_in"), "segment_text","start_time","end_time","blanks":[{{index, start_char, end_char, answer}}]}}
        - speaking: list of {{"id","prompt","task_type","expected_points","example_answer","hints"}}
        - meta: difficulty level (1-5)
        Return ONLY valid JSON.
        Transcript:
        {transcript[:15000]}
    """
    resp = client.chat.completions.create(
        model=MODEL,
        messages=[{"role":"system","content":"You generate exercise JSON."},
                  {"role":"user","content":prompt}],
        temperature=0.2,
        max_tokens=1200
    )
    text = resp['choices'][0]['message']['content']
    # try to parse JSON
    import json
    try:
        payload = json.loads(text)
    except Exception:
        # fallback: ask GPT to output valid JSON (in prod add retries)
        payload = {"error":"invalid_json","raw":text}
    return payload
