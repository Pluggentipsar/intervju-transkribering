@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║              TystText - Transkribering                       ║
echo ║         Lokal backend för webbgränssnitt                     ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

:: Get the directory where this script is located
set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%"

:: Configuration
set "VENV_DIR=%SCRIPT_DIR%venv"
set "MARKER_FILE=%VENV_DIR%\.installed"
set "FRONTEND_URL=http://localhost:3000"
:: When deployed, change FRONTEND_URL to actual URL like:
:: set "FRONTEND_URL=https://tysttext.vercel.app"

:: Find Python 3.11 or 3.12 (PyTorch doesn't support 3.13+ yet)
echo [1/5] Letar efter Python 3.11 eller 3.12...
set "PYTHON_EXE="

:: Check common installation paths for Python 3.11
if exist "C:\Python311\python.exe" (
    set "PYTHON_EXE=C:\Python311\python.exe"
    goto :found_python
)
if exist "%LOCALAPPDATA%\Programs\Python\Python311\python.exe" (
    set "PYTHON_EXE=%LOCALAPPDATA%\Programs\Python\Python311\python.exe"
    goto :found_python
)
if exist "%PROGRAMFILES%\Python311\python.exe" (
    set "PYTHON_EXE=%PROGRAMFILES%\Python311\python.exe"
    goto :found_python
)

:: Check for Python 3.12
if exist "C:\Python312\python.exe" (
    set "PYTHON_EXE=C:\Python312\python.exe"
    goto :found_python
)
if exist "%LOCALAPPDATA%\Programs\Python\Python312\python.exe" (
    set "PYTHON_EXE=%LOCALAPPDATA%\Programs\Python\Python312\python.exe"
    goto :found_python
)
if exist "%PROGRAMFILES%\Python312\python.exe" (
    set "PYTHON_EXE=%PROGRAMFILES%\Python312\python.exe"
    goto :found_python
)

:: Try py launcher with specific version
where py >nul 2>&1
if not errorlevel 1 (
    py -3.11 --version >nul 2>&1
    if not errorlevel 1 (
        set "PYTHON_EXE=py -3.11"
        goto :found_python
    )
    py -3.12 --version >nul 2>&1
    if not errorlevel 1 (
        set "PYTHON_EXE=py -3.12"
        goto :found_python
    )
)

:: No compatible Python found
echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║  ERROR: Python 3.11 eller 3.12 hittades inte!                ║
echo ╠══════════════════════════════════════════════════════════════╣
echo ║                                                              ║
echo ║  TystText kräver Python 3.11 eller 3.12 för att fungera.    ║
echo ║  (Nyare versioner som 3.13/3.14 stöds inte av PyTorch ännu) ║
echo ║                                                              ║
echo ║  Ladda ned Python 3.11 från:                                 ║
echo ║  https://www.python.org/downloads/release/python-3119/       ║
echo ║                                                              ║
echo ║  VIKTIGT: Bocka i "Add Python to PATH" vid installation!     ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.
pause
exit /b 1

:found_python
:: Get and display Python version
for /f "tokens=*" %%v in ('%PYTHON_EXE% --version 2^>^&1') do set "PY_VERSION=%%v"
echo    Hittade: %PY_VERSION%
echo    Sökväg: %PYTHON_EXE%

:: Create venv if it doesn't exist
if not exist "%VENV_DIR%\Scripts\activate.bat" (
    echo.
    echo [2/5] Skapar virtuell miljö (första gången)...
    %PYTHON_EXE% -m venv "%VENV_DIR%"
    if errorlevel 1 (
        echo ERROR: Kunde inte skapa virtuell miljö.
        pause
        exit /b 1
    )
    echo    Virtuell miljö skapad.
) else (
    echo [2/5] Virtuell miljö finns redan.
)

:: Activate venv
echo [3/5] Aktiverar virtuell miljö...
call "%VENV_DIR%\Scripts\activate.bat"

:: Install dependencies if marker doesn't exist
if not exist "%MARKER_FILE%" (
    echo.
    echo [4/5] Installerar beroenden (detta tar några minuter första gången)...
    echo.

    :: Upgrade pip first
    echo    Uppgraderar pip...
    python -m pip install --upgrade pip --quiet

    :: Install main requirements first (this may install CPU torch)
    echo    Installerar Python-paket...
    pip install -r "%SCRIPT_DIR%requirements.txt"
    if errorlevel 1 (
        echo ERROR: Kunde inte installera beroenden.
        pause
        exit /b 1
    )

    :: Now upgrade PyTorch to CUDA version (overrides CPU version from requirements)
    echo    Uppgraderar PyTorch till CUDA-version for GPU-acceleration...
    pip install --upgrade torch torchaudio --index-url https://download.pytorch.org/whl/cu121 2>nul
    if errorlevel 1 (
        echo    OBS: CUDA-version kunde inte installeras, anvander CPU.
        echo    Transkribering fungerar men ar langsammare utan GPU.
    ) else (
        echo    CUDA-version installerad - GPU-acceleration aktiverad!
    )

    :: Create marker file
    echo Installation completed > "%MARKER_FILE%"
    echo.
    echo    Alla beroenden installerade!
) else (
    echo [4/5] Beroenden redan installerade.
)

:: Start the backend server
echo.
echo [5/5] Startar TystText-backend på http://localhost:8000
echo.
echo ══════════════════════════════════════════════════════════════
echo   Backend körs nu. Stäng inte detta fönster!
echo.
echo   Öppna webbgränssnittet: %FRONTEND_URL%
echo ══════════════════════════════════════════════════════════════
echo.

:: Open browser after a short delay (give server time to start)
start "" cmd /c "timeout /t 3 /nobreak >nul && start %FRONTEND_URL%"

:: Start uvicorn (this will keep the window open)
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000

:: If we get here, server stopped
echo.
echo Backend-servern har stoppats.
pause
