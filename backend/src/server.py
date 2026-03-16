import sys
import os

from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import ai_features.gemini as Gemini # Assuming gemini.py has a function to process messages
from typing import Any, Dict, List, Optional

app = FastAPI()

SUPPORTED_IMAGE_MIME_TYPES = {
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
}

MIME_BY_EXTENSION = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
}


def resolve_image_mime_type(photo: UploadFile):
    content_type = (photo.content_type or "").lower().strip()
    if content_type in SUPPORTED_IMAGE_MIME_TYPES:
        return content_type

    filename = (photo.filename or "").lower().strip()
    _, extension = os.path.splitext(filename)
    if extension in MIME_BY_EXTENSION:
        return MIME_BY_EXTENSION[extension]

    if content_type in {"application/octet-stream", "binary/octet-stream"}:
        return "image/jpeg"

    return None

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


class HealthInsightsRequest(BaseModel):
    pet_name: Optional[str] = None
    checks: List[Dict[str, Any]] = Field(default_factory=list)
    logs: List[Dict[str, Any]] = Field(default_factory=list)
    question: Optional[str] = None

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
        resolved_mime_type = resolve_image_mime_type(photo)
        if not resolved_mime_type:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Invalid file type for {photo.filename or 'uploaded file'} "
                    f"(received: {photo.content_type}). Only JPEG, PNG, and WebP are supported."
                ),
            )

        try:
            # Read the uploaded file
            contents = await photo.read()

            image_part = {
                "mime_type": resolved_mime_type,
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


@app.post("/health-insights")
async def health_insights(payload: HealthInsightsRequest):
    if not payload.checks and not payload.logs:
        raise HTTPException(status_code=400, detail="No historical health data provided.")

    try:
        response = Gemini.generate_health_history_insights(payload.model_dump())
        return {
            "response": response,
            "meta": {
                "checks_count": len(payload.checks),
                "logs_count": len(payload.logs),
                "has_question": bool((payload.question or "").strip()),
            },
        }
    except Exception as e:
        print(e)
        raise HTTPException(status_code=500, detail=str(e))
