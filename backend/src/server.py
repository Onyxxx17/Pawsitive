import sys
import os

from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from ai_features.gemini import process_message, process_image  # Assuming gemini.py has a function to process messages

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
        response = process_message(message.message)
        return {"response": response}
    except Exception as e:
        print(e)
        raise HTTPException(status_code=500, detail=str(e))
    
@app.post("/analyze")
async def analyze(photo: UploadFile = File(...)):
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

        # Process the image using the AI logic
        response = process_image(image_part)
        return {"response": response}
    except Exception as e:
        print(e)
        raise HTTPException(status_code=500, detail=str(e))