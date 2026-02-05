@echo off
echo Building TystText Backend Distribution
echo =======================================
echo.

set "SOURCE_DIR=%~dp0backend"
set "DIST_DIR=%~dp0dist-backend"

echo Source: %SOURCE_DIR%
echo Destination: %DIST_DIR%
echo.

:: Create dist-backend folder if it doesn't exist
if not exist "%DIST_DIR%" mkdir "%DIST_DIR%"

:: Copy app folder
echo Copying app folder...
if exist "%DIST_DIR%\app" rmdir /s /q "%DIST_DIR%\app"
xcopy "%SOURCE_DIR%\app" "%DIST_DIR%\app" /E /I /Q

:: Copy essential files
echo Copying configuration files...
copy "%SOURCE_DIR%\pyproject.toml" "%DIST_DIR%\" >nul 2>&1

echo.
echo Distribution created in: %DIST_DIR%
echo.
echo Contents:
echo   - Starta-TystText.bat  (double-click to start)
echo   - requirements.txt     (dependencies)
echo   - .env.example         (configuration template)
echo   - app/                 (backend code)
echo.
echo To create a ZIP for distribution:
echo   1. Copy .env.example to .env
echo   2. Edit .env with your HuggingFace token
echo   3. ZIP the entire dist-backend folder
echo.
pause
