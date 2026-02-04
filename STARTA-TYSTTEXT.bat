@echo off
title TystText - Startar...
color 0A

echo.
echo  ╔══════════════════════════════════════════════════════════════╗
echo  ║                                                              ║
echo  ║              TystText - Lokal Transkribering                 ║
echo  ║                                                              ║
echo  ╚══════════════════════════════════════════════════════════════╝
echo.
echo  Startar TystText med Docker...
echo.
echo  (Forsta gangen kan det ta 5-10 minuter att ladda ned)
echo.

docker compose up -d

echo.
echo  ═══════════════════════════════════════════════════════════════
echo.
echo    TystText ar redo!
echo.
echo    Oppna din webblasare och ga till:
echo.
echo        http://localhost:3000
echo.
echo  ═══════════════════════════════════════════════════════════════
echo.

start http://localhost:3000

echo  Tryck valfri tangent for att visa loggar (eller stang detta fonster)
pause >nul

docker compose logs -f
