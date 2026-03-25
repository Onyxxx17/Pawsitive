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

MAX_TEXT_FIELD_CHARS = 240
MAX_LONG_TEXT_FIELD_CHARS = 800
MAX_CONTEXT_SUMMARY_CHARS = 1200
MAX_CHAT_CHECKS = 6
MAX_CHAT_LOGS = 6
MAX_VET_CHECKS = 12
MAX_VET_LOGS = 16
MAX_INSIGHT_CHECKS = 24
MAX_INSIGHT_LOGS = 30
MAX_USER_MESSAGE_CHARS = 2000

PREFERRED_MODELS = [
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
    "gemini-2.5-pro",
    "gemini-3.1-pro-preview",
    "gemini-3-flash-preview",
    "gemini-3-pro-preview",
]


def _truncate_text(value, limit=MAX_TEXT_FIELD_CHARS):
    if value is None:
        return None

    text = str(value).strip()
    if len(text) <= limit:
        return text

    if limit <= 18:
        return text[:limit]

    omitted = len(text) - (limit - 18)
    return f"{text[:limit - 18].rstrip()}... [{omitted} chars]"


def _compact_value(value, *, depth=0, max_depth=2, max_items=6, max_str_len=MAX_TEXT_FIELD_CHARS):
    if value is None or isinstance(value, (bool, int, float)):
        return value

    if isinstance(value, str):
        return _truncate_text(value, max_str_len)

    if isinstance(value, dict):
        if depth >= max_depth:
            keys = [str(key) for key in list(value.keys())[:max_items]]
            return {"summary": f"object with keys: {', '.join(keys)}"}

        compact = {}
        for key in list(value.keys())[:max_items]:
            compact[str(key)] = _compact_value(
                value[key],
                depth=depth + 1,
                max_depth=max_depth,
                max_items=max(3, max_items - 1),
                max_str_len=max(80, max_str_len),
            )
        if len(value) > max_items:
            compact["_truncated_keys"] = len(value) - max_items
        return compact

    if isinstance(value, (list, tuple, set)):
        items = list(value)
        if depth >= max_depth:
            return f"{len(items)} items omitted"

        compact = [
            _compact_value(
                item,
                depth=depth + 1,
                max_depth=max_depth,
                max_items=max(3, max_items - 1),
                max_str_len=max(80, max_str_len),
            )
            for item in items[:max_items]
        ]
        if len(items) > max_items:
            compact.append(f"... {len(items) - max_items} more items omitted")
        return compact

    return _truncate_text(value, max_str_len)


def _clean_dict(values):
    return {
        key: value
        for key, value in values.items()
        if value not in (None, "", [], {})
    }


def _compact_check_record(check):
    if not isinstance(check, dict):
        return _compact_value(check, max_depth=1)

    compact = {
        "check_type": check.get("check_type"),
        "score": check.get("score"),
        "confidence": check.get("confidence"),
        "status": check.get("status"),
        "created_at": check.get("created_at"),
    }

    analysis_json = check.get("analysis_json")
    if analysis_json not in (None, "", [], {}):
        compact["analysis"] = _compact_value(
            analysis_json,
            max_depth=2,
            max_items=6,
            max_str_len=180,
        )

    return _clean_dict(compact)


def _compact_log_record(log):
    if not isinstance(log, dict):
        return _compact_value(log, max_depth=1)

    compact = {
        "log_type": log.get("log_type"),
        "logged_at": log.get("logged_at"),
    }

    log_data = log.get("log_data")
    if log_data not in (None, "", [], {}):
        compact["details"] = _compact_value(
            log_data,
            max_depth=2,
            max_items=6,
            max_str_len=180,
        )

    return _clean_dict(compact)


def _compact_pet_profile(profile):
    if not isinstance(profile, dict):
        return _compact_value(profile, max_depth=1)

    compact = {
        "name": profile.get("name"),
        "species": profile.get("species"),
        "breed": profile.get("breed"),
        "gender": profile.get("gender"),
        "date_of_birth": profile.get("date_of_birth"),
        "weight_kg": profile.get("weight_kg"),
        "is_neutered": profile.get("is_neutered"),
        "existing_conditions": _compact_value(
            profile.get("existing_conditions"),
            max_depth=1,
            max_items=6,
            max_str_len=120,
        ),
        "notes": _truncate_text(profile.get("notes"), MAX_LONG_TEXT_FIELD_CHARS),
    }
    return _clean_dict(compact)


def _compact_owner_profile(owner):
    if not isinstance(owner, dict):
        return _compact_value(owner, max_depth=1)

    compact = {
        "name": owner.get("name"),
        "phone_number": owner.get("phone_number"),
        "timezone": owner.get("timezone"),
    }
    return _clean_dict(compact)


def _compact_record_list(records, limit, formatter):
    if not isinstance(records, list):
        return []

    return [formatter(record) for record in records[:limit]]


def _compact_chat_context(context, mode="owner"):
    if not isinstance(context, dict):
        return {}

    screenings = context.get("latest_health_screenings") or context.get("recent_checks") or []
    logs = context.get("latest_health_logs") or context.get("recent_logs") or []
    screening_limit = MAX_VET_CHECKS if mode == "vet" else MAX_CHAT_CHECKS
    log_limit = MAX_VET_LOGS if mode == "vet" else MAX_CHAT_LOGS

    compact = {
        "context_summary": _truncate_text(
            context.get("context_summary"),
            MAX_CONTEXT_SUMMARY_CHARS,
        ),
    }

    if mode == "vet":
        compact.update(
            {
                "veterinarian": _compact_value(
                    context.get("veterinarian"),
                    max_depth=1,
                    max_items=6,
                    max_str_len=140,
                ),
                "appointment": _compact_value(
                    context.get("appointment"),
                    max_depth=1,
                    max_items=8,
                    max_str_len=140,
                ),
                "owner": _compact_owner_profile(context.get("owner")),
                "pet": _compact_pet_profile(context.get("pet") or context.get("pet_profile") or {}),
                "pet_snapshot": _compact_value(
                    context.get("pet_snapshot"),
                    max_depth=2,
                    max_items=8,
                    max_str_len=140,
                ),
                "consultation_notes": _compact_value(
                    context.get("consultation_notes"),
                    max_depth=1,
                    max_items=4,
                    max_str_len=220,
                ),
            }
        )
    else:
        compact.update(
            {
                "active_pet_name": context.get("active_pet_name"),
                "context_note": _truncate_text(
                    context.get("context_note"),
                    MAX_TEXT_FIELD_CHARS,
                ),
                "pet_profile": _compact_pet_profile(
                    context.get("pet_profile") or context.get("pet") or {}
                ),
            }
        )

    if screenings:
        compact["recent_checks"] = _compact_record_list(
            screenings,
            screening_limit,
            _compact_check_record,
        )
        if len(screenings) > screening_limit:
            compact["recent_checks_truncated"] = len(screenings) - screening_limit

    if logs:
        compact["recent_logs"] = _compact_record_list(
            logs,
            log_limit,
            _compact_log_record,
        )
        if len(logs) > log_limit:
            compact["recent_logs_truncated"] = len(logs) - log_limit

    return _clean_dict(compact)


def _compact_health_history_payload(payload):
    checks = payload.get("checks") or []
    logs = payload.get("logs") or []

    compact = {
        "pet_name": _truncate_text(payload.get("pet_name") or "your pet", 120) or "your pet",
        "checks_count": len(checks) if isinstance(checks, list) else 0,
        "logs_count": len(logs) if isinstance(logs, list) else 0,
        "checks": _compact_record_list(checks, MAX_INSIGHT_CHECKS, _compact_check_record),
        "logs": _compact_record_list(logs, MAX_INSIGHT_LOGS, _compact_log_record),
    }

    if isinstance(checks, list) and len(checks) > MAX_INSIGHT_CHECKS:
        compact["checks_truncated"] = len(checks) - MAX_INSIGHT_CHECKS

    if isinstance(logs, list) and len(logs) > MAX_INSIGHT_LOGS:
        compact["logs_truncated"] = len(logs) - MAX_INSIGHT_LOGS

    return compact


def _normalize_user_message(message, mode="owner"):
    text = str(message or "").strip()
    if not text:
        return ""

    if mode == "owner":
        owner_question_marker = "Owner question:"
        if owner_question_marker in text:
            _, question = text.rsplit(owner_question_marker, 1)
            normalized = question.strip()
            if normalized:
                return _truncate_text(normalized, MAX_USER_MESSAGE_CHARS) or ""

    return _truncate_text(text, MAX_USER_MESSAGE_CHARS) or ""


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
    compact_context = _compact_chat_context(context, mode=mode)
    context_blob = json.dumps(compact_context, default=str, ensure_ascii=True)
    context_summary = str(compact_context.get("context_summary") or "").strip()
    pet_profile = compact_context.get("pet_profile") or compact_context.get("pet") or {}
    pet_name = (
        pet_profile.get("name")
        or compact_context.get("active_pet_name")
        or "missing"
    )
    screenings = compact_context.get("recent_checks") or []
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
        normalized_message = _normalize_user_message(message, mode=mode)
        if context:
            compact_context = _compact_chat_context(context, mode=mode)
            context_summary = str(compact_context.get("context_summary") or "").strip()
            pet_profile = compact_context.get("pet_profile") or compact_context.get("pet") or {}
            pet_name = (
                pet_profile.get("name")
                or compact_context.get("active_pet_name")
                or "missing"
            )
            structured_message_parts = [
                f"Mode: {mode}\n",
                f"Question: {normalized_message}\n",
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
                [normalized_message or _truncate_text(message, MAX_USER_MESSAGE_CHARS) or ""],
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

    compact_payload = _compact_health_history_payload(
        {
            "pet_name": pet_name,
            "checks": checks,
            "logs": logs,
        }
    )
    data_blob = json.dumps(compact_payload, default=str, ensure_ascii=True)

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
