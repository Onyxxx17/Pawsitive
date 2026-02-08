from google import genai
from google.genai import types
import PIL.Image
import os
import dotenv
from prompts_config import SYSTEM_PROMPTS

dotenv.load_dotenv()

# 1. Initialize the Client with your API Key
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

# 2. Load your image (using PIL)
image = PIL.Image.open('assets/images/pet_photo.jpg')

# 3. Select a System Prompt from config
system_instruction = SYSTEM_PROMPTS["vet_analysis"]

# 4. Generate Content with Multimodal Input
response = client.models.generate_content(
    model="gemini-2.0-flash", # Use a multimodal model
    contents=[
        image, 
        "Analyze this dog's coat health and body condition."
    ],
    config=types.GenerateContentConfig(
        system_instruction=system_instruction
    )
)

print(response.text)