@echo off
echo Starting Email Verifier Locally...
echo.
echo [1/2] Starting Backend Server...
start "Backend" cmd /k "cd backend && call venv\Scripts\activate && uvicorn main:app --host 0.0.0.0 --port 8000 --reload"
echo Backend started on port 8000.
echo.
echo [2/2] Starting Frontend Server...
start "Frontend" cmd /k "cd frontend && npm run dev"
echo Frontend started.
echo.
echo ===================================================
echo  Your App is Running!
echo  Local Access: http://localhost:5173
echo  Network Access: Check the Frontend window for "Network" URL
echo ===================================================
pause
