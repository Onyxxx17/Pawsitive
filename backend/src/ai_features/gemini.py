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


def build_chat_system_prompt(mode="owner", context=None):
    if not context:
        return SYSTEM_PROMPTS["process_message"]

    base_prompt_key = "vet_context_chat" if mode == "vet" else "owner_context_chat"
    context_blob = json.dumps(context, default=str, ensure_ascii=True)
    context_summary = str(context.get("context_summary") or "").strip()
    pet_profile = context.get("pet_profile") or context.get("pet") or {}
    pet_name = (
        pet_profile.get("name")
        or context.get("active_pet_name")
        or "missing"
    )
    screenings = context.get("latest_health_screenings") or context.get("recent_checks") or []
    screening_types = []
    for screening in screenings[:5]:
        check_type = screening.get("check_type")
        if check_type:
            screening_types.append(str(check_type))

    summary_lines = [
        f"Current selected pet name: {pet_name}.",
        f"Completed screening count available in context: {len(screenings)}.",
    ]
    if screening_types:
        summary_lines.append(
            "Most recent screening types in context: " + ", ".join(screening_types) + "."
        )

    prompt_parts = [
        f"{SYSTEM_PROMPTS[base_prompt_key]}\n\n",
        "Context summary:\n",
        "\n".join(summary_lines),
    ]
    if context_summary:
        prompt_parts.extend([
            "\nPlain-English pet context summary:\n",
            context_summary,
        ])
    prompt_parts.extend([
        "\n\nLatest structured context JSON:\n",
        context_blob,
        "\n\nUse this context as the latest available state for the conversation. "
        "If something is absent from the JSON, explicitly say it is missing.",
    ])
    return "".join(prompt_parts)

def process_message(message, context=None, mode="owner"):
    """Use Gemini to process a chat message and generate a response."""
    try:
        system_prompt = build_chat_system_prompt(mode=mode, context=context)
        if context:
            context_summary = str(context.get("context_summary") or "").strip()
            pet_profile = context.get("pet_profile") or context.get("pet") or {}
            pet_name = (
                pet_profile.get("name")
                or context.get("active_pet_name")
                or "missing"
            )
            structured_message_parts = [
                f"Mode: {mode}\n",
                f"Question: {message}\n",
            ]
            if context_summary:
                structured_message_parts.append(
                    f"Plain-English pet context summary: {context_summary}\n"
                )
            structured_message_parts.append(
                "Answer using the latest structured context from the system instruction. "
                f"If the question asks for the pet's name and it exists in context, say the name directly: {pet_name}."
            )
            structured_message = "".join(structured_message_parts)
            response = _generate_with_fallback(
                [structured_message],
                system_prompt,
                models=["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-2.5-pro"]
            )
        else:
            response = _generate_with_fallback(
                [message],
                system_prompt,
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
    request_mode = (payload.get("request_mode") or ("question" if question else "summary")).strip().lower()
    if request_mode not in {"summary", "question"}:
        request_mode = "question" if question else "summary"

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
    mode_instruction = (
        "Return a broader health summary grounded in the saved data."
        if request_mode == "summary"
        else "Answer only the user's question. Do not prepend a snapshot summary unless the question explicitly asks for one."
    )
    user_message = (
        f"Request mode: {request_mode}\n"
        f"Pet name: {pet_name}\n"
        f"User question: {question_line}\n"
        f"Instruction: {mode_instruction}\n"
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
