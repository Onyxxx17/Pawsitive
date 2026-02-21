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

def analyze_pet_photo(photo_path, prompt_key):
    image = PIL.Image.open(photo_path)
    system_instruction = SYSTEM_PROMPTS[prompt_key]
    response = client.models.generate_content(
        model="gemini-2.0-flash",
        contents=[image, system_instruction],
        config=types.GenerateContentConfig(system_instruction=system_instruction)
    )
    return response.text

def analyze_pet_poop(poop_photo_path):
    result = analyze_pet_photo(poop_photo_path, "poop_analysis")
    return result

def analyze_body_weight(photo_path):
    result = analyze_pet_photo(photo_path, "body_weight")
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

def process_message():
    return "Processed"

# def main():
#     poop_photo_path = "assets/images/pet_poop.jpg"
#     result = analyze_pet_poop(poop_photo_path)
#     formatted_result = format_json(result)
#     print(formatted_result)

# if __name__ == "__main__":
#     main()