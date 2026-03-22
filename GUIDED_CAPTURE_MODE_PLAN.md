# Guided Capture Mode + Image Quality Gate

This document outlines a web-safe implementation plan for adding guided capture mode and an image quality gate to Pawsitive.

## Current state

The current scan flow is:

1. User opens the scan page in [PhotoUploader.tsx](C:/Users/darri/SMU/CS206/app/Pawsitive/pawsitive-mobile/components/healthAnalysis/PhotoUploader.tsx)
2. User taps `Take Photo` or `Gallery`
3. `expo-image-picker` returns an image URI
4. The image is accepted immediately
5. All images are sent to [camera.tsx](C:/Users/darri/SMU/CS206/app/Pawsitive/pawsitive-mobile/app/(tabs)/camera.tsx)
6. The backend analyzes the photos through [server.py](C:/Users/darri/SMU/CS206/app/Pawsitive/backend/src/server.py)

Current limitation:

- there is no guided live framing
- there is no quality gate before analysis
- wrong, dark, blurry, or badly framed images are accepted too early
- the web flow works for file capture, but not for a true guided camera experience

## Target architecture

The new flow should be:

1. User taps `Take Photo`
2. App opens a guided capture modal or screen
3. Camera preview shows:
   - scan-specific overlay
   - Doge sample image
   - short checklist
   - live guidance text
4. User captures a photo
5. App runs a local quality pre-check
6. App sends the image to a backend validation endpoint
7. Backend returns `pass`, `warn`, or `block`
8. If `pass`, save image immediately
9. If `warn`, show issues and let user choose `Use photo` or `Retake`
10. If `block`, require retake
11. Only accepted images are stored in `uploadedImages`
12. Analysis only runs after all accepted images are ready

## Recommended component structure

### Frontend

Add these files:

- `pawsitive-mobile/constants/scanGuides.ts`
- `pawsitive-mobile/components/healthAnalysis/GuidedCaptureModal.tsx`
- `pawsitive-mobile/utils/scanQuality.ts`

Update these files:

- [PhotoUploader.tsx](C:/Users/darri/SMU/CS206/app/Pawsitive/pawsitive-mobile/components/healthAnalysis/PhotoUploader.tsx)
- [camera.tsx](C:/Users/darri/SMU/CS206/app/Pawsitive/pawsitive-mobile/app/(tabs)/camera.tsx)

### Backend

Add:

- `backend/src/image_quality.py`

Update:

- [server.py](C:/Users/darri/SMU/CS206/app/Pawsitive/backend/src/server.py)

## Frontend design

### 1. Central scan guide config

Create `scanGuides.ts` as the single source of truth for each scan type.

Suggested shape:

```ts
export type AnalysisType =
  | 'mood_analysis'
  | 'coat_and_body_condition'
  | 'teeth_and_gums'
  | 'poop_analysis'
  | 'body_weight';

export type ScanGuide = {
  title: string;
  sampleImage: any;
  overlay: 'face' | 'bodySide' | 'mouthClose' | 'topDown' | 'fullBody';
  checklist: string[];
  liveHint: string;
  minWidth: number;
  minHeight: number;
};

export const SCAN_GUIDES: Record<AnalysisType, ScanGuide> = {
  mood_analysis: {
    title: 'Mood Scan',
    sampleImage: require('../doge_pics/doge_face.png'),
    overlay: 'face',
    checklist: ['Both eyes visible', 'Face centered', 'Good lighting'],
    liveHint: 'Hold the camera at eye level and keep the ears in frame.',
    minWidth: 900,
    minHeight: 700,
  },
};
```

This keeps `PhotoUploader` clean and prevents the scan rules from being duplicated.

### 2. GuidedCaptureModal

Create `GuidedCaptureModal.tsx` as a dedicated capture UI.

Responsibilities:

- render `CameraView` from `expo-camera`
- render scan overlay and guidance copy
- capture photo
- preview the captured image
- run quality validation
- return either an accepted image or nothing

Suggested props:

```ts
type GuidedCaptureModalProps = {
  visible: boolean;
  analysisType: AnalysisType | null;
  onClose: () => void;
  onAccept: (result: { uri: string; quality: QualityGateResult }) => void;
};
```

### 3. PhotoUploader changes

In [PhotoUploader.tsx](C:/Users/darri/SMU/CS206/app/Pawsitive/pawsitive-mobile/components/healthAnalysis/PhotoUploader.tsx):

- replace direct `launchCameraAsync()` calls for scan capture
- add local state:

```ts
const [captureTarget, setCaptureTarget] = useState<AnalysisType | null>(null);
const [captureVisible, setCaptureVisible] = useState(false);
const [qualityByAnalysis, setQualityByAnalysis] = useState<Record<string, QualityGateResult | null>>({});
```

- when user taps `Take Photo`, open `GuidedCaptureModal`
- when user taps `Gallery`, still allow it, but run the same quality gate before accepting the photo
- show a badge under each uploaded image:
  - `Quality approved`
  - `Accepted with warning`
  - `Retake needed`

### 4. Local quality pre-check

Create `scanQuality.ts` for quick frontend checks before hitting the backend.

Suggested checks:

- file exists
- width and height meet minimum resolution
- aspect ratio is not extreme
- file type is supported

Suggested interface:

```ts
export type QualityIssueCode =
  | 'low_resolution'
  | 'bad_aspect_ratio'
  | 'too_dark'
  | 'too_blurry'
  | 'framing_issue'
  | 'wrong_subject';

export type QualityGateResult = {
  status: 'pass' | 'warn' | 'block';
  score: number;
  issues: Array<{
    code: QualityIssueCode;
    message: string;
  }>;
};
```

Frontend should only do cheap checks. Real image analysis belongs on the backend.

## Backend design

### 1. Add a validation endpoint

Add this endpoint to [server.py](C:/Users/darri/SMU/CS206/app/Pawsitive/backend/src/server.py):

```py
@app.post("/validate-scan-image")
async def validate_scan_image(
    analysisType: str = Form(...),
    photo: UploadFile = File(...),
):
    ...
```

This endpoint should:

- verify MIME type
- inspect image dimensions
- compute brightness
- compute blur estimate
- run scan-specific framing heuristics
- return `pass`, `warn`, or `block`

### 2. Add `image_quality.py`

Suggested backend helper functions:

- `load_image_bytes(photo)`
- `get_image_dimensions(image)`
- `estimate_brightness(image)`
- `estimate_blur(image)`
- `validate_face_scan(image)`
- `validate_body_scan(image)`
- `validate_teeth_scan(image)`
- `validate_poop_scan(image)`
- `validate_scan_image(image, analysis_type)`

For MVP, this can be heuristic-based.

Example:

- brightness too low -> warn or block
- blur too high -> block
- very small face area in `mood_analysis` -> warn
- body not wide enough for `body_weight` -> warn
- mouth region unclear for `teeth_and_gums` -> warn or block

### 3. Enforce validation before analyze

There are two ways to enforce the gate:

1. Preferred:
   - frontend calls `/validate-scan-image`
   - only accepted images are later sent to `/analyze`

2. Defensive backend fallback:
   - `/analyze` rechecks quality
   - if image is too poor, return an error explaining which image failed and why

Use both. The frontend improves UX, and the backend protects integrity.

## Web-safe behavior

### What works on web

This feature is testable on the web app if implemented with `expo-camera` and a fallback path.

Use this strategy:

- primary path on web:
  - `CameraView` inside `GuidedCaptureModal`
- fallback path:
  - if camera permission is denied
  - or browser camera is unavailable
  - or app is not running in a supported context
  - then fall back to gallery or `launchCameraAsync()`

### Web constraints

On web:

- camera must be opened by direct user action
- browser permissions differ from native
- some browsers handle webcam capture inconsistently
- desktop webcams are fine for development, but final QA should still happen on a real phone

### Web detection strategy

Create a helper like:

```ts
const isWebCameraSupported =
  Platform.OS !== 'web' ||
  (typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === 'function');
```

If unsupported, show:

`Live guided camera is not available in this browser. Upload a photo instead.`

## UI behavior

### Capture screen layout

Suggested guided capture UI:

- top:
  - scan title
  - close button
- middle:
  - live camera preview
  - overlay mask
  - small reference image in a corner
- bottom:
  - scan-specific checklist
  - live guidance text
  - capture button

### Post-capture quality review

After taking a photo:

- show captured image
- show quality score
- show issue list
- show action buttons:
  - `Use photo`
  - `Retake`

Rules:

- `pass`: primary button is `Use photo`
- `warn`: show amber styling, still allow `Use photo`
- `block`: only allow `Retake`

## Suggested thresholds

Use these for MVP:

- `pass`: score >= 80
- `warn`: score 60-79
- `block`: score < 60

Suggested issue weights:

- low resolution: -20
- too dark: -20
- too blurry: -30
- framing issue: -20
- wrong subject or unusable composition: -40

Clamp final score to `0-100`.

## Recommended implementation order

### Phase 1: Foundation

- create `scanGuides.ts`
- create `GuidedCaptureModal.tsx`
- wire `PhotoUploader` to open the modal
- support capture and accept image without validation

### Phase 2: Local quality gate

- add `scanQuality.ts`
- validate dimensions and aspect ratio
- show preview and pass/warn/block states

### Phase 3: Backend validation

- add `/validate-scan-image`
- add image quality heuristics in `image_quality.py`
- call the endpoint after capture and after gallery selection

### Phase 4: Hardening

- revalidate inside `/analyze`
- add analytics for retakes and validation failures
- tune thresholds based on actual scan failures

## Minimal data contract

Frontend request:

```http
POST /validate-scan-image
Content-Type: multipart/form-data

analysisType=mood_analysis
photo=<file>
```

Backend response:

```json
{
  "status": "warn",
  "score": 72,
  "issues": [
    {
      "code": "too_dark",
      "message": "Image is a little dark. Try moving to brighter lighting."
    },
    {
      "code": "framing_issue",
      "message": "Keep the full face and both eyes inside the frame."
    }
  ]
}
```

## How it fits the existing repo

This architecture fits the current codebase because:

- [PhotoUploader.tsx](C:/Users/darri/SMU/CS206/app/Pawsitive/pawsitive-mobile/components/healthAnalysis/PhotoUploader.tsx) already owns the per-scan upload flow
- [camera.tsx](C:/Users/darri/SMU/CS206/app/Pawsitive/pawsitive-mobile/app/(tabs)/camera.tsx) already expects one accepted image per scan type
- [server.py](C:/Users/darri/SMU/CS206/app/Pawsitive/backend/src/server.py) already handles multipart image upload and scan dispatch

This means the cleanest change is:

- keep scan orchestration in `PhotoUploader`
- keep final analysis in `camera.tsx`
- add a validation layer between capture and upload acceptance

## Recommended MVP scope

If implementation time is limited, build this subset first:

1. `GuidedCaptureModal` with `CameraView`
2. scan-specific overlays and checklist text
3. local resolution and aspect-ratio checks
4. backend blur and brightness validation
5. pass/warn/block preview before image acceptance

That gives you a real guided capture mode and a meaningful image quality gate without needing a full computer-vision framing model on day one.
