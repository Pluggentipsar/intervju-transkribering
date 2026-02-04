@echo off
setlocal enabledelayedexpansion
title TystText - Installation och Start
color 0B

echo.
echo  ╔══════════════════════════════════════════════════════════════╗
echo  ║                                                              ║
echo  ║              TystText - Lokal Transkribering                 ║
echo  ║                                                              ║
echo  ║   Transkribera intervjuer helt lokalt pa din dator           ║
echo  ║   med KB Whisper - optimerad for svenska                     ║
echo  ║                                                              ║
echo  ╚══════════════════════════════════════════════════════════════╝
echo.

REM Spara nuvarande mapp
set "TYSTTEXT_DIR=%~dp0"
cd /d "%TYSTTEXT_DIR%"

echo  [1/5] Kontrollerar Python...
python --version >nul 2>&1
if errorlevel 1 (
    echo.
    echo  [!] Python ar inte installerat.
    echo      Ladda ned Python fran: https://python.org/downloads/
    echo      Se till att bocka for "Add Python to PATH" vid installation.
    echo.
    pause
    exit /b 1
)
echo        Python hittad!

echo  [2/5] Kontrollerar Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo.
    echo  [!] Node.js ar inte installerat.
    echo      Ladda ned Node.js fran: https://nodejs.org/
    echo.
    pause
    exit /b 1
)
echo        Node.js hittad!

echo  [3/5] Installerar/uppdaterar Python-beroenden...
cd backend
if not exist "..\.venv" (
    echo        Skapar virtuell miljo...
    python -m venv ..\.venv
)
call "..\.venv\Scripts\activate.bat"
pip install -q -e . 2>nul
if errorlevel 1 (
    echo        Forsta installationen - detta kan ta en stund...
    pip install -e .
)
cd ..
echo        Python-beroenden installerade!

echo  [4/5] Installerar/uppdaterar frontend-beroenden...
cd frontend
if not exist "node_modules" (
    echo        Forsta installationen - detta kan ta en stund...
    call npm install
) else (
    echo        Frontend redan installerat!
)
cd ..

echo  [5/5] Startar TystText...
echo.
echo  ═══════════════════════════════════════════════════════════════
echo.
echo    TystText startar nu!
echo.
echo    - Backend-server: http://localhost:8000
echo    - Frontend:       http://localhost:3000
echo.
echo    En webblasare oppnas automatiskt.
echo    Stang detta fonster for att avsluta TystText.
echo.
echo  ═══════════════════════════════════════════════════════════════
echo.

REM Starta backend i bakgrunden
cd backend
start /B cmd /c "..\.venv\Scripts\activate.bat && python -m uvicorn app.main:app --host 127.0.0.1 --port 8000"
cd ..

REM Vänta på backend
echo  Vantar pa backend...
timeout /t 4 /nobreak >nul

REM Öppna webbläsaren
start http://localhost:3000

REM Starta frontend (blockerar)
cd frontend
call npm run dev

REM Rensa upp när användaren stänger
echo.
echo  Stangar TystText...
taskkill /f /im python.exe 2>nul
