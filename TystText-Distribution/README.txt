╔═══════════════════════════════════════════════════════════════════════╗
║                                                                       ║
║              TystText - Lokal Transkribering av Intervjuer            ║
║                                                                       ║
╚═══════════════════════════════════════════════════════════════════════╝

INNEHÅLL
========
- TystText-Backend.exe  : Backend-server (API + transkribering)
- STARTA.bat            : Dubbelklicka för att starta


SÅ HÄR ANVÄNDER DU TYSTTEXT
============================

1. Dubbelklicka på STARTA.bat
2. Vänta tills servern har startat
3. Öppna http://localhost:3000 i din webbläsare
   (du behöver köra frontend separat för nu)


FÖRSTA GÅNGEN
=============
Första transkriberingen laddar automatiskt ned AI-modellen
(KB Whisper). Detta tar några minuter och cirka 500 MB.
Modellen sparas lokalt och återanvänds.


SÄKERHET & INTEGRITET
=====================
✓ All bearbetning sker på DIN dator
✓ Inga filer skickas någonstans
✓ Fungerar offline (efter första nedladdningen)


FELSÖKNING
==========
"Servern startar inte"
→ Kontrollera att port 8000 inte används av annat program

"Transkriberingen är långsam"
→ Första gången laddas modellen ned. Efterföljande körningar
  är mycket snabbare.
