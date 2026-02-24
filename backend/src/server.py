import sys
import os

from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import ai_features.gemini as Gemini # Assuming gemini.py has a function to process messages
from typing import List

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
async def analyze(analysisTypes: List[str] = Form(...), photos: List[UploadFile] = File(...)):
    if len(analysisTypes) != len(photos):
        raise HTTPException(status_code=400, detail="Mismatch between analysis types and photos.")

    results = []

    for analysisType, photo in zip(analysisTypes, photos):
        print(f"Analyzing {analysisType}")
        # Validate file type (optional but recommended)
        if photo.content_type not in ["image/jpeg", "image/png", "image/jpg", "image/webp"]:
            raise HTTPException(status_code=400, detail=f"Invalid file type for {photo.filename}. Only JPEG, PNG, and WebP are supported.")

        try:
            # Read the uploaded file
            contents = await photo.read()

            image_part = {
                "mime_type": photo.content_type,
                "data": contents
            }

            # Process the image using the AI logic
            response = Gemini.analyze_pet_photo(image_part, analysisType)
            # response = {"field": "VALUE"} # debug usage
            results.append({"analysisType": analysisType, "result": response})
        except Exception as e:
            print(e)
            raise HTTPException(status_code=500, detail=f"Error processing {photo.filename}: {str(e)}")
    print(results)
    return {"results": results}