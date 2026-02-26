@echo off
setlocal
title TystText - Lokal Transkribering
color 0A

echo.
echo  ========================================
echo       TystText - Lokal Transkribering
echo  ========================================
echo.

cd /d "%~dp0"

REM Aktivera virtuell miljö om den finns
if exist "backend\venv_py311\Scripts\activate.bat" (
    call "backend\venv_py311\Scripts\activate.bat"
    echo  Virtuell miljö: backend\venv_py311
) else if exist ".venv\Scripts\activate.bat" (
    call ".venv\Scripts\activate.bat"
    echo  Virtuell miljö: .venv
) else if exist "backend\venv\Scripts\activate.bat" (
    call "backend\venv\Scripts\activate.bat"
    echo  Virtuell miljö: backend\venv
) else (
    echo  [!] Ingen virtuell miljö hittad.
    echo      Kör TystText-Setup.bat först.
    echo.
    pause
    exit /b 1
)

echo.
echo  Startar TystText...
echo  (Webbläsaren öppnas automatiskt när servern är redo)
echo.

python start.py
if errorlevel 1 (
    echo.
    echo  [!] TystText kraschade. Se felmeddelandet ovan.
    echo.
    pause
    exit /b 1
)

echo.
echo  TystText stoppad.
pause
endlocal
