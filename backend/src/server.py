import sys
import os
import time

from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import ai_features.gemini as Gemini # Assuming gemini.py has a function to process messages
from typing import Any, Dict, List, Optional

from agora_token_builder import RtcTokenBuilder

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
    mode: str = "owner"
    context: Optional[Dict[str, Any]] = None


class HealthInsightsRequest(BaseModel):
    pet_name: Optional[str] = None
    checks: List[Dict[str, Any]] = Field(default_factory=list)
    logs: List[Dict[str, Any]] = Field(default_factory=list)
    question: Optional[str] = None
    request_mode: str = "summary"


class AgoraTokenRequest(BaseModel):
    channel_name: str
    uid: int = 0
    role: str = "broadcaster"
    expire_seconds: int = 3600


def _resolve_agora_role(role: str) -> int:
    normalized = (role or "").strip().lower()
    if normalized in {"audience", "subscriber", "sub"}:
        return 2
    return 1

@app.get("/")
def index():
    return {"response": "ok"}

@app.post("/chat")
async def chat(message: Message):
    try:
        # Process the user message using the AI logic
        response = Gemini.process_message(
            message.message,
            context=message.context,
            mode=message.mode,
        )
        return {"response": response}
    except Gemini.AIConfigurationError as e:
        raise HTTPException(status_code=503, detail=str(e))
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
        except Gemini.AIConfigurationError as e:
            raise HTTPException(status_code=503, detail=str(e))
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
    except Gemini.AIConfigurationError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        print(e)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/agora-token")
async def agora_token(payload: AgoraTokenRequest):
    app_id = os.getenv("AGORA_APP_ID")
    app_certificate = os.getenv("AGORA_APP_CERTIFICATE")
    temp_token = os.getenv("AGORA_TEMP_TOKEN", "")

    channel_name = (payload.channel_name or "").strip()
    if not channel_name:
        raise HTTPException(status_code=400, detail="channel_name is required.")

    if not app_id:
        raise HTTPException(
            status_code=500,
            detail="Missing AGORA_APP_ID in backend environment.",
        )

    if not app_certificate:
        if not temp_token:
            raise HTTPException(
                status_code=500,
                detail="Missing AGORA_APP_CERTIFICATE (or AGORA_TEMP_TOKEN fallback) in backend environment.",
            )

        return {
            "app_id": app_id,
            "token": temp_token,
            "channel_name": channel_name,
            "uid": payload.uid,
            "expires_in": payload.expire_seconds,
            "source": "temp_token_fallback",
        }

    if RtcTokenBuilder is None:
        raise HTTPException(
            status_code=500,
            detail="agora-token-builder is not installed on backend.",
        )

    expire_seconds = max(60, min(int(payload.expire_seconds), 24 * 60 * 60))
    current_ts = int(time.time())
    privilege_expire_ts = current_ts + expire_seconds
    role_value = _resolve_agora_role(payload.role)

    try:
        if hasattr(RtcTokenBuilder, "build_token_with_uid"):
            token = RtcTokenBuilder.build_token_with_uid(
                app_id,
                app_certificate,
                channel_name,
                int(payload.uid),
                role_value,
                privilege_expire_ts,
                privilege_expire_ts,
            )
        else:
            token = RtcTokenBuilder.buildTokenWithUid(
                app_id,
                app_certificate,
                channel_name,
                int(payload.uid),
                role_value,
                privilege_expire_ts,
            )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate Agora token: {str(e)}")

    return {
        "app_id": app_id,
        "token": token,
        "channel_name": channel_name,
        "uid": int(payload.uid),
        "expires_in": expire_seconds,
        "source": "generated",
    }
