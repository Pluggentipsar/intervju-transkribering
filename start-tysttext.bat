@echo off
title TystText - Lokal Transkribering
color 0A

echo.
echo  ========================================
echo       TystText - Lokal Transkribering
echo  ========================================
echo.
echo  Startar backend-server...
echo.

REM Gå till backend-mappen
cd /d "%~dp0backend"

REM Aktivera virtuell miljö om den finns
if exist "..\\.venv\\Scripts\\activate.bat" (
    call "..\\.venv\\Scripts\\activate.bat"
)

REM Starta backend i bakgrunden
start /B python -m uvicorn app.main:app --host 127.0.0.1 --port 8000

REM Vänta lite så backend hinner starta
echo  Vantar pa att backend ska starta...
timeout /t 3 /nobreak >nul

REM Öppna webbläsaren
echo  Oppnar webblasaren...
start http://localhost:3000

REM Gå till frontend-mappen och starta
cd /d "%~dp0frontend"

echo.
echo  Startar frontend...
echo  (Stang detta fonster for att stoppa TystText)
echo.

REM Starta frontend (detta blockerar tills användaren stänger)
call npm run dev

REM När användaren stänger, rensa upp
echo.
echo  Stangar TystText...
taskkill /f /im python.exe 2>nul
