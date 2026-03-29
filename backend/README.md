# Setting Up and Running the Backend

Follow these steps to set up the virtual environment, install dependencies, and run the FastAPI server.

## 1. Create a Virtual Environment

1. Open a terminal and navigate to the `backend` directory:
   ```bash
   cd backend
   ```
2. Create a virtual environment named `venv`:
   ```bash
   python -m venv venv
   ```
3. Activate the virtual environment:
   - On Windows:
     ```bash
     venv\Scripts\activate
     ```
   - On macOS/Linux:
     ```bash
     source venv/bin/activate
     ```

## 2. Install Dependencies

1. Ensure the virtual environment is activated.
2. Install the required packages from `requirements.txt`:
   ```bash
   pip install -r requirements.txt
   ```

## 3. Run the FastAPI Server

1. Ensure the virtual environment is activated.
2. Start the FastAPI server:
   ```bash
   python -m uvicorn server:app --app-dir src --host 0.0.0.0 --port 8000
   ```
3. Open your browser and navigate to the FastAPI documentation:
   - Swagger UI: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

## 4. .env file
1. At the <i>backend</i> directory, create an .env file containing <i>GEMINI_API_KEY</i> for AI features.

## Notes
- Always activate the virtual environment before running the server or installing packages.
- If you encounter issues, ensure Python and `pip` are installed and added to your system's PATH.
