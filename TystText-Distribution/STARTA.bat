@echo off
title TystText - Lokal Transkribering
color 0A

echo.
echo  ╔══════════════════════════════════════════════════════════════╗
echo  ║                                                              ║
echo  ║              TystText - Lokal Transkribering                 ║
echo  ║                                                              ║
echo  ║   All bearbetning sker lokalt pa din dator                   ║
echo  ║                                                              ║
echo  ╚══════════════════════════════════════════════════════════════╝
echo.

echo  Startar backend-server...
start "" "%~dp0TystText-Backend.exe"

echo  Vantar pa att servern ska starta...
timeout /t 5 /nobreak >nul

echo.
echo  ═══════════════════════════════════════════════════════════════
echo.
echo    Backend kors pa: http://127.0.0.1:8000
echo.
echo    Oppna webblasaren och ga till frontend-adressen
echo    (om du kor frontend separat)
echo.
echo    Forsta transkriberingen laddar ned AI-modellen (~500 MB)
echo.
echo  ═══════════════════════════════════════════════════════════════
echo.

echo  Tryck valfri tangent for att stanga servern...
pause >nul

echo.
echo  Stangar TystText...
taskkill /f /im TystText-Backend.exe 2>nul
