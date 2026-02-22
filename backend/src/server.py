import sys
import os

from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import ai_features.gemini as Gemini # Assuming gemini.py has a function to process messages

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Replace "*" with specific origins if needed
    allow_credentials=True,
    allow_methods=["*"],  # Allow all HTTP methods
    allow_headers=["*"],  # Allow all headers
)

class Message(BaseModel):
    message: str

@app.get("/")
def index():
    return {"response": "ok"}

@app.post("/chat")
async def chat(message: Message):
    try:
        # Process the user message using the AI logic
        response = Gemini.process_message(message.message)
        return {"response": response}
    except Exception as e:
        print(e)
        raise HTTPException(status_code=500, detail=str(e))
    
@app.post("/analyze")
async def analyze(analysisType: str = Form(...), photo: UploadFile = File(...)):
    print("Got it")
    # Validate file type (optional but recommended)
    if photo.content_type not in ["image/jpeg", "image/png", "image/jpg", "image/webp"]:
        raise HTTPException(status_code=400, detail="Invalid file type. Only JPEG, PNG, and WebP are supported.")
    
    try:
        # Read the uploaded file
        contents = await photo.read()

        image_part = {
            "mime_type": photo.content_type,
            "data": contents
        }

        response = Gemini.analyze_pet_photo(image_part, analysisType)

        # Process the image using the AI logic
        # match analysisType:
        #     case "poop_analysis":
        #         response = Gemini.analyze_pet_poop(image_part)
        #     case "body_weight":
        #         response = Gemini.analyze_body_weight(image_part)
        #     case _:
        #         return HTTPException(status_code=400, detail="Invalid analysis type.")
        # print(response)
        return response
    except Exception as e:
        print(e)
        raise HTTPException(status_code=500, detail=str(e))