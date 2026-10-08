@echo off
REM ============================================================
REM AuditPulse — Local Development Startup Script (Windows)
REM ============================================================
echo.
echo  ========================================
echo    AuditPulse Local Dev Startup
echo  ========================================
echo.

REM Check if .env exists
if not exist "auditpulse\.env" (
    echo  [INFO] Copying .env.example to auditpulse\.env
    copy "auditpulse\.env.example" "auditpulse\.env" >nul
    echo  [INFO] Edit auditpulse\.env to set your AI_PROVIDER and API key.
    echo.
)

REM Activate virtual environment if present
if exist ".venv\Scripts\activate.bat" (
    echo  [INFO] Activating virtual environment (.venv)...
    call .venv\Scripts\activate.bat
) else if exist "auditpulse\.venv\Scripts\activate.bat" (
    echo  [INFO] Activating virtual environment (auditpulse\.venv)...
    call auditpulse\.venv\Scripts\activate.bat
)

REM Start backend
echo  [1/2] Starting AuditPulse backend on http://localhost:8000 ...
start "AuditPulse Backend" cmd /k "cd auditpulse\backend && python -m uvicorn app.main:app --reload --port 8000"
timeout /t 3 /nobreak >nul

REM Start frontend
echo  [2/2] Starting AuditPulse frontend on http://localhost:5173 ...
start "AuditPulse Frontend" cmd /k "cd auditpulse\frontend && npm run dev"
timeout /t 2 /nobreak >nul

echo.
echo  ========================================
echo    AuditPulse is starting up!
echo  ========================================
echo.
echo    Frontend:  http://localhost:5173
echo    Backend:   http://localhost:8000
echo    API Docs:  http://localhost:8000/docs
echo.
echo  Close the two terminal windows to stop.
echo.
pause
