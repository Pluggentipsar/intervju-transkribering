@echo off
setlocal EnableDelayedExpansion
title TystText - Installation
color 0A

REM Wrapper: kör setup och pausa ALLTID innan fönstret stängs
call :setup
echo.
echo  Tryck valfri tangent for att stanga detta fonster...
pause >nul
endlocal
exit /b

REM ===============================================================
:setup
REM ===============================================================

echo.
echo  ================================================================
echo    TystText - Automatisk Installation
echo  ================================================================
echo.
echo  Detta script installerar allt som behovs for att kora TystText.
echo  Det kan ta 5-15 minuter beroende pa din internetanslutning.
echo.

cd /d "%~dp0"

REM ---------------------------------------------------------------
REM  1. Hitta eller installera Python 3.11+
REM ---------------------------------------------------------------
echo  [1/4] Kontrollerar Python...

set PYTHON_OK=0
set PYTHON_CMD=python

REM Kolla om python finns i PATH
where python >nul 2>&1
if not errorlevel 1 (
    for /f "tokens=2 delims= " %%v in ('python --version 2^>^&1') do set PYVER=%%v
    for /f "tokens=1,2 delims=." %%a in ("!PYVER!") do (
        if %%a GEQ 3 if %%b GEQ 11 (
            set PYTHON_OK=1
            set PYTHON_CMD=python
            echo        Python !PYVER! hittad - OK!
        )
    )
)

REM Kolla om py launcher finns (vanligt pa Windows)
if !PYTHON_OK! EQU 0 (
    where py >nul 2>&1
    if not errorlevel 1 (
        for /f "tokens=2 delims= " %%v in ('py -3 --version 2^>^&1') do set PYVER=%%v
        for /f "tokens=1,2 delims=." %%a in ("!PYVER!") do (
            if %%a GEQ 3 if %%b GEQ 11 (
                set PYTHON_OK=1
                set PYTHON_CMD=py -3
                echo        Python !PYVER! hittad via py launcher - OK!
            )
        )
    )
)

REM Om Python saknas eller ar for gammal - ladda ned och installera
if !PYTHON_OK! EQU 0 (
    echo.
    echo        Python 3.11+ hittades inte.
    echo        Laddar ned och installerar Python automatiskt...
    echo.

    set PYTHON_URL=https://www.python.org/ftp/python/3.11.9/python-3.11.9-amd64.exe
    set PYTHON_INSTALLER=%TEMP%\python-3.11.9-amd64.exe

    REM Ladda ned
    echo        Laddar ned Python 3.11.9...
    powershell -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri '!PYTHON_URL!' -OutFile '!PYTHON_INSTALLER!'" 2>nul
    if not exist "!PYTHON_INSTALLER!" (
        echo.
        echo  [FEL] Kunde inte ladda ned Python.
        echo        Kontrollera din internetanslutning och forsok igen.
        echo        Eller installera Python 3.11 manuellt fran:
        echo        https://www.python.org/downloads/
        goto :eof
    )

    echo        Installerar Python 3.11.9 (detta kan ta en minut^)...
    echo.

    REM Installera tyst, lagg till i PATH, for aktuell anvandare
    "!PYTHON_INSTALLER!" /quiet InstallAllUsers=0 PrependPath=1 Include_pip=1 Include_launcher=1

    if errorlevel 1 (
        echo  [FEL] Python-installationen misslyckades.
        echo        Forsok installera Python 3.11 manuellt fran:
        echo        https://www.python.org/downloads/
        goto :eof
    )

    REM Rensa installationsfilen
    del "!PYTHON_INSTALLER!" >nul 2>&1

    REM Uppdatera PATH for denna session
    set "PATH=%LOCALAPPDATA%\Programs\Python\Python311;%LOCALAPPDATA%\Programs\Python\Python311\Scripts;%PATH%"

    REM Verifiera
    python --version >nul 2>&1
    if errorlevel 1 (
        echo.
        echo  [FEL] Python installerades men hittades inte i PATH.
        echo        Starta om datorn och kor TystText-Setup.bat igen.
        goto :eof
    )

    for /f "tokens=2 delims= " %%v in ('python --version 2^>^&1') do set PYVER=%%v
    set PYTHON_CMD=python
    echo        Python !PYVER! installerad!
)
echo.

REM ---------------------------------------------------------------
REM  2. Skapa virtuell miljo
REM ---------------------------------------------------------------
echo  [2/4] Skapar virtuell miljo...

if exist "venv\Scripts\activate.bat" (
    echo        Virtuell miljo finns redan - hoppar over.
) else (
    !PYTHON_CMD! -m venv venv
    if errorlevel 1 (
        echo  [FEL] Kunde inte skapa virtuell miljo.
        goto :eof
    )
    echo        Virtuell miljo skapad!
)
echo.

REM Aktivera
call venv\Scripts\activate.bat

REM ---------------------------------------------------------------
REM  3. Installera Python-paket
REM ---------------------------------------------------------------
echo  [3/4] Installerar Python-paket (detta tar en stund^)...
echo.
echo        Installerar grundpaket...

pip install --upgrade pip >nul 2>&1

pip install -r backend\requirements.txt
if errorlevel 1 (
    echo.
    echo  [FEL] Installationen misslyckades.
    echo  Forsok igen eller kontrollera din internetanslutning.
    goto :eof
)

echo.
echo        Grundpaket installerade!
echo.

REM Fraga om talaridentifiering
echo  ----------------------------------------------------------------
echo  Vill du installera talaridentifiering (pyannote^)?
echo  Detta kraver en HuggingFace-token och ~1 GB extra nedladdning.
echo  Du kan alltid installera detta senare genom att kora Setup igen.
echo  ----------------------------------------------------------------
echo.
set /p INSTALL_DIARIZATION="  Installera talaridentifiering? (j/n): "

if /i "!INSTALL_DIARIZATION!"=="j" (
    echo.
    echo        Installerar whisperx och pyannote...
    pip install "whisperx>=3.1.0" "pyannote.audio>=3.1.0"
    if errorlevel 1 (
        echo  [VARNING] Talaridentifiering kunde inte installeras.
        echo            Du kan forsoka igen senare.
    ) else (
        echo        Talaridentifiering installerad!
    )
)
echo.

REM ---------------------------------------------------------------
REM  4. Skapa konfigurationsfil
REM ---------------------------------------------------------------
echo  [4/4] Konfigurerar...

if not exist "backend\.env" (
    copy "backend\.env.example" "backend\.env" >nul
    echo        Konfigurationsfil skapad: backend\.env
) else (
    echo        Konfigurationsfil finns redan.
)

REM Skapa mappar
if not exist "backend\uploads" mkdir "backend\uploads"
if not exist "backend\models" mkdir "backend\models"

echo.
echo  ================================================================
echo    Installation klar!
echo  ================================================================
echo.
echo  Starta TystText genom att dubbelklicka pa:
echo    TystText-Start.bat
echo.
echo  ----------------------------------------------------------------
echo  VALFRITT: For talaridentifiering (vem som sager vad^):
echo    1. Skapa konto pa https://huggingface.co
echo    2. Skapa en token: https://huggingface.co/settings/tokens
echo    3. Godkann modellerna:
echo       - https://huggingface.co/pyannote/speaker-diarization-3.1
echo       - https://huggingface.co/pyannote/segmentation-3.0
echo    4. Lagg in din token i backend\.env (HF_TOKEN=din_token^)
echo  ----------------------------------------------------------------
echo.
goto :eof
