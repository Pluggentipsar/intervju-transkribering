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

REM Aktivera virtuell miljo om den finns
if exist "backend\venv_py311\Scripts\activate.bat" (
    call "backend\venv_py311\Scripts\activate.bat"
    echo  Virtuell miljo: backend\venv_py311
) else if exist ".venv\Scripts\activate.bat" (
    call ".venv\Scripts\activate.bat"
    echo  Virtuell miljo: .venv
) else if exist "backend\venv\Scripts\activate.bat" (
    call "backend\venv\Scripts\activate.bat"
    echo  Virtuell miljo: backend\venv
) else (
    echo  [!] Ingen virtuell miljo hittad.
    echo      Kör TystText-Setup.bat foerst.
    echo.
    pause
    exit /b 1
)

echo.
echo  Startar TystText...
echo  (Webblasaren oeppnas automatiskt naer servern aer redo)
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
