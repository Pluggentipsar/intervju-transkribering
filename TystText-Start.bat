@echo off
setlocal
title TystText - Transkribering
color 0A

REM Wrapper: pausa ALLTID innan fönstret stängs
call :start
echo.
echo  Tryck valfri tangent for att stanga detta fonster...
pause >nul
endlocal
exit /b

REM ===============================================================
:start
REM ===============================================================

echo.
echo  ========================================
echo    TystText - Lokal Transkribering
echo  ========================================
echo.

cd /d "%~dp0"

REM Kontrollera att setup har korts
if not exist "venv\Scripts\activate.bat" (
    echo  [!] TystText ar inte installerat an.
    echo      Kor TystText-Setup.bat forst!
    echo.
    goto :eof
)

REM Aktivera virtuell miljo
call venv\Scripts\activate.bat

echo  Startar TystText-motorn pa http://localhost:8000
echo  Tryck Ctrl+C for att stoppa.
echo.

REM Oppna webblasaren efter kort fordrojning
start "" cmd /c "timeout /t 4 /nobreak >nul && start http://localhost:8000"

REM Starta servern
cd backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000

echo.
echo  TystText stoppad.
goto :eof
