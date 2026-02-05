@echo off
setlocal enabledelayedexpansion

:: Set UTF-8 codepage for Swedish characters
chcp 65001 >nul 2>&1

:: Get script directory FIRST (before any output)
set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%"
if errorlevel 1 (
    echo FEL: Kunde inte byta till skriptets katalog: %SCRIPT_DIR%
    pause
    exit /b 1
)

echo.
echo ================================================================
echo              TystText - Transkribering
echo          Lokal backend for webbgranssnitt
echo ================================================================
echo.

:: Configuration
set "VENV_DIR=%SCRIPT_DIR%venv"
set "MARKER_FILE=%VENV_DIR%\.installed"
set "FRONTEND_URL=http://localhost:3000"

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
echo ================================================================
echo   FEL: Python 3.11 eller 3.12 hittades inte!
echo ================================================================
echo.
echo   TystText kraver Python 3.11 eller 3.12 for att fungera.
echo   (Nyare versioner som 3.13/3.14 stods inte av PyTorch annu)
echo.
echo   Ladda ned Python 3.11 fran:
echo   https://www.python.org/downloads/release/python-3119/
echo.
echo   VIKTIGT: Bocka i "Add Python to PATH" vid installation!
echo.
echo ================================================================
echo.
echo Tryck valfri tangent for att stanga...
pause >nul
exit /b 1

:found_python
:: Get and display Python version
for /f "tokens=*" %%v in ('%PYTHON_EXE% --version 2^>^&1') do set "PY_VERSION=%%v"
echo    Hittade: %PY_VERSION%
echo    Sokvag: %PYTHON_EXE%

:: Create venv if it doesn't exist
set "VENV_ACTIVATE=%VENV_DIR%\Scripts\activate.bat"
if exist "%VENV_ACTIVATE%" goto :venv_exists

echo.
echo [2/5] Skapar virtuell miljo (forsta gangen)...
%PYTHON_EXE% -m venv "%VENV_DIR%"
if errorlevel 1 (
    echo FEL: Kunde inte skapa virtuell miljo.
    pause
    exit /b 1
)
echo    Virtuell miljo skapad.
goto :venv_ready

:venv_exists
echo [2/5] Virtuell miljo finns redan.

:venv_ready

:: Activate venv
echo [3/5] Aktiverar virtuell miljo...
call "%VENV_DIR%\Scripts\activate.bat"

:: Install dependencies if marker doesn't exist
if exist "%MARKER_FILE%" goto :deps_installed

echo.
echo [4/5] Installerar beroenden (detta tar nagra minuter forsta gangen)...
echo.

:: Upgrade pip first
echo    Uppgraderar pip...
python -m pip install --upgrade pip --quiet

:: Install main requirements
echo    Installerar Python-paket (detta tar ett tag)...
pip install -r "%SCRIPT_DIR%requirements.txt"
if errorlevel 1 (
    echo FEL: Kunde inte installera beroenden.
    pause
    exit /b 1
)

:: Try CUDA version of PyTorch
echo    Uppgraderar PyTorch till CUDA-version for GPU-acceleration...
pip install --upgrade torch torchaudio --index-url https://download.pytorch.org/whl/cu121 2>nul
if errorlevel 1 (
    echo    OBS: CUDA-version kunde inte installeras, anvander CPU.
) else (
    echo    CUDA-version installerad - GPU-acceleration aktiverad!
)

:: Create marker file
echo Installation completed > "%MARKER_FILE%"
echo.
echo    Alla beroenden installerade!
goto :start_server

:deps_installed
echo [4/5] Beroenden redan installerade.

:start_server

:: Start the backend server
echo.
echo [5/5] Startar TystText-backend pa http://localhost:8000
echo.
echo ================================================================
echo   Backend kors nu. STANG INTE DETTA FONSTER!
echo.
echo   Oppna webbgranssnittet: %FRONTEND_URL%
echo ================================================================
echo.

:: Open browser after a short delay (give server time to start)
start "" cmd /c "timeout /t 3 /nobreak >nul && start %FRONTEND_URL%"

:: Start uvicorn (this will keep the window open)
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000

:: If we get here, server stopped
echo.
echo Backend-servern har stoppats.
pause
