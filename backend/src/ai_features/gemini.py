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

def analyze_pet_photo(image_parts, prompt_key):
    image = types.Part.from_bytes(
            data=image_parts['data'],
            mime_type=image_parts['mime_type']
        )
    system_instruction = SYSTEM_PROMPTS[prompt_key]
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=[image, system_instruction],
        config=types.GenerateContentConfig(system_instruction=system_instruction)
    )
    return format_json(response.text)

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
        response = client.models.generate_content(
            model="gemini-2.5-flash-lite",
            contents=[message],
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_PROMPTS["process_message"]
            )
        ).text
    except Exception as e:
        response = str(e)

    return response

# def main():
#     poop_photo_path = "assets/images/pet_poop.jpg"
#     result = analyze_pet_poop(poop_photo_path)
#     formatted_result = format_json(result)
#     print(formatted_result)

# if __name__ == "__main__":
#     main()