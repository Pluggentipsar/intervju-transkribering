@echo off
REM TystText Backend Launcher
REM This script starts the Python backend server

cd /d "%~dp0..\..\..\..\backend"

REM Try to activate virtual environment if it exists
if exist "..\..\.venv\Scripts\activate.bat" (
    call "..\..\.venv\Scripts\activate.bat"
)

REM Start the uvicorn server
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
