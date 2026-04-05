# Pawsitive

Pawsitive is a pet health care app with:

- An Expo React Native frontend in `pawsitive-mobile/`
- A FastAPI backend in `backend/`
- A Supabase Postgres database schema in `database/`

## 1. Prerequisites

Install these first:

- Git
- Node.js 20+ and npm
- Python 3.11+ and pip
- An Expo runtime target:
	- Expo Go app (physical iOS/Android device), or
	- Android Studio emulator / iOS Simulator
- A Supabase project (for Auth, Database, and Storage)

Optional (for video call flow):

- Agora credentials (`AGORA_APP_ID` and `AGORA_APP_CERTIFICATE`)

## 2. Download the Project

### Option A: Clone with Git

```bash
git clone <your-repository-url>
cd Pawsitive
```

### Option B: Download ZIP

1. Download the repository ZIP from your Git host.
2. Extract it.
3. Open a terminal in the extracted `Pawsitive` folder.

## 3. Backend Setup (FastAPI)

From the repository root:

```bash
cd backend
python3 -m venv venv
# macOS/Linux
source venv/bin/activate
# Windows (PowerShell)
# venv\Scripts\activate
pip install -r requirements.txt
```

Create `backend/.env`:

```env
GEMINI_API_KEY=your_gemini_api_key

# Optional for Agora token generation endpoint
AGORA_APP_ID=your_agora_app_id
AGORA_APP_CERTIFICATE=your_agora_app_certificate

# Optional fallback if you do not use APP_CERTIFICATE
AGORA_TEMP_TOKEN=
```

Run backend:

```bash
python -m uvicorn server:app --app-dir src --host 0.0.0.0 --port 8000
```

Backend health check:

- `http://127.0.0.1:8000/`
- Swagger docs: `http://127.0.0.1:8000/docs`

## 4. Mobile App Setup (Expo)

Open a second terminal from repository root:

```bash
cd pawsitive-mobile
npm install
```

Create or update `pawsitive-mobile/.env`:

```env
EXPO_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>

# Use your machine IP (same network as phone/emulator)
EXPO_PUBLIC_BACKEND_API_URL=http://<your-local-ip>:8000

# Optional dev autofill helpers
EXPO_PUBLIC_DEV_LOGIN_EMAIL=
EXPO_PUBLIC_DEV_LOGIN_PW=
EXPO_PUBLIC_DEV_VET_LOGIN_EMAIL=
EXPO_PUBLIC_DEV_VET_LOGIN_PW=

# Optional Agora fallback for frontend
EXPO_PUBLIC_AGORA_APP_ID=
EXPO_PUBLIC_AGORA_TEMP_TOKEN=
```

Start Expo:

```bash
# either command works
npm start
# or
npx expo start
```

Then choose:

- `i` for iOS simulator
- `a` for Android emulator
- Scan QR in Expo Go for physical device

## 5. Database Setup (Supabase)

Create a Supabase project, then apply SQL in this order:

1. `database/schema.sql`
2. Each file in `database/migrations/` (in filename order)

Also ensure the storage bucket expected by the app exists:

- `images`

Note: some vet profile upload flows may reference other bucket paths. Standardizing buckets is recommended if you expand the app.

## 6. Run Everything Together

You should have two active terminals:

1. Backend running on port 8000
2. Expo app running in `pawsitive-mobile`

If you use a physical phone:

- Phone and computer must be on the same Wi-Fi
- `EXPO_PUBLIC_BACKEND_API_URL` must use your computer's LAN IP (not `localhost`)
- Restart Expo if you change `.env` values

Helpful ways to find your local IP:

- macOS: `ipconfig getifaddr en0` (Wi-Fi) or `ifconfig`
- Windows: `ipconfig`

## 7. Windows Helper Script

For Windows PowerShell, you can start frontend and backend together from repo root:

```powershell
.\start-dev.ps1
```

Install deps while starting:

```powershell
.\start-dev.ps1 -InstallDeps
```

## 8. Common Issues

### "Missing EXPO_PUBLIC_SUPABASE_URL" or "Missing EXPO_PUBLIC_SUPABASE_ANON_KEY"

- Confirm `pawsitive-mobile/.env` exists and variable names are exact.
- Restart Expo after changing `.env`.

### Backend won't start / module import issues

- Confirm the virtual environment is activated before running `uvicorn`.
- Reinstall dependencies with `pip install -r requirements.txt` inside `backend/`.

### "Backend URL is missing" or request failed

- Ensure backend is running on port 8000.
- Set `EXPO_PUBLIC_BACKEND_API_URL` to your LAN IP, for example:
	- `http://192.168.1.10:8000`

### CORS/network issues on device

- Verify same network between phone and development machine.
- Avoid VPN/proxy split networking while testing local APIs.

### Gemini/AI endpoint returns configuration error

- Confirm `GEMINI_API_KEY` is present in `backend/.env`.
- Restart backend after `.env` changes.

## 9. Project Structure

```text
Pawsitive/
	backend/            # FastAPI server
	pawsitive-mobile/   # Expo React Native app
	database/           # Schema and migrations
	ai-features/        # Legacy duplicated AI folder at repo root
```
