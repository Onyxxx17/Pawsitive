import sys
import os
import io

# Add the path of ai_features to sys.path
current_dir = os.path.dirname(os.path.abspath(__file__))
ai_features_path = os.path.abspath(os.path.join(current_dir))
if ai_features_path not in sys.path:
    sys.path.append(ai_features_path)

from google import genai
from google.genai import types
import PIL.Image
import os
import dotenv
from prompts_config import SYSTEM_PROMPTS
import json

dotenv.load_dotenv()

# 1. Initialize the Client with your API Key
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

PREFERRED_MODELS = [
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
    "gemini-2.5-pro",
    "gemini-3.1-pro-preview",
    "gemini-3-flash-preview",
    "gemini-3-pro-preview",
]


def _generate_with_fallback(contents, system_instruction, models=None):
    candidate_models = models or PREFERRED_MODELS
    last_error = None

    for model in candidate_models:
        try:
            response = client.models.generate_content(
                model=model,
                contents=contents,
                config=types.GenerateContentConfig(system_instruction=system_instruction)
            )
            if getattr(response, "text", None):
                return response.text
        except Exception as e:
            last_error = e
            print(f"Model {model} failed with error: {e}")

    if last_error:
        raise RuntimeError(f"All models failed to process the request: {last_error}")
    raise RuntimeError("All models failed to process the request.")

def analyze_pet_photo(image_parts, prompt_key):
    image = types.Part.from_bytes(
            data=image_parts['data'],
            mime_type=image_parts['mime_type']
        )
    system_instruction = SYSTEM_PROMPTS[prompt_key]
    response_text = _generate_with_fallback([image, system_instruction], system_instruction)
    return format_json(response_text)

def analyze_pet_poop(image_parts):
    result = analyze_pet_photo(image_parts, "poop_analysis")
    return result

def analyze_body_weight(image_parts):
    result = analyze_pet_photo(image_parts, "body_weight")
    return result

def format_json(result):
    try:
        result = clean_json(result)
        data = json.loads(result)
        return data
    except json.JSONDecodeError:
        result = reformat_json(result)
        try:
            data = json.loads(result)
            return data
        except json.JSONDecodeError:
            return None
    return None

def clean_json(result):
    return result.replace("```json", "").replace("```", "")

def reformat_json(result):
    """Use Gemini to fix malformed JSON so it can be parsed by json.loads()."""
    response = client.models.generate_content(
        model="gemini-2.0-flash",
        contents=[result],
        config=types.GenerateContentConfig(
            system_instruction=SYSTEM_PROMPTS["reformat_json"]
        )
    )
    repaired = clean_json(response.text)
    return repaired

def process_message(message):
    """Use Gemini to process user message and generate response"""
    try:
        response = _generate_with_fallback(
            [message],
            SYSTEM_PROMPTS["process_message"],
            models=["gemini-2.5-flash-lite", "gemini-2.5-flash", "gemini-2.5-pro"]
        )
    except Exception as e:
        response = str(e)

    return response


def generate_health_history_insights(payload):
    """
    Generate historical health insights and Q&A from saved checks/logs.
    Expected payload keys: pet_name, checks, logs, question.
    """
    pet_name = (payload.get("pet_name") or "your pet").strip() or "your pet"
    checks = payload.get("checks") or []
    logs = payload.get("logs") or []
    question = (payload.get("question") or "").strip()

    data_blob = json.dumps(
        {
            "pet_name": pet_name,
            "checks": checks,
            "logs": logs,
        },
        default=str,
        ensure_ascii=True,
    )

    question_line = question if question else "No direct question provided. Summarize key trends and action items."
    user_message = (
        f"Pet name: {pet_name}\n"
        f"User question: {question_line}\n"
        "Historical health data (JSON):\n"
        f"{data_blob}\n"
        "Write clear plain text for a pet owner. Avoid medical diagnosis."
    )

    return _generate_with_fallback(
        [user_message],
        SYSTEM_PROMPTS["health_history_insights"],
        models=["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-2.5-pro"],
    )

# def main():
#     poop_photo_path = "assets/images/pet_poop.jpg"
#     result = analyze_pet_poop(poop_photo_path)
#     formatted_result = format_json(result)
#     print(formatted_result)

# if __name__ == "__main__":
#     main()
