# TystText - Installation

## Steg 1: Installera Docker Desktop (en gång)

1. Gå till: https://www.docker.com/products/docker-desktop/
2. Klicka "Download for Windows"
3. Kör installationsfilen
4. Starta om datorn när installationen är klar

## Steg 2: Starta TystText

**Dubbelklicka på:** `STARTA-TYSTTEXT.bat`

Det är allt!

---

## Första gången

Första gången tar det 5-10 minuter eftersom:
- Docker laddar ner grundsystemet
- AI-modellerna (KB Whisper) laddas ner

**Efterföljande starter tar bara några sekunder.**

---

## Stoppa TystText

**Dubbelklicka på:** `STOPPA-TYSTTEXT.bat`

---

## Vanliga frågor

### "Docker is not running"
Starta Docker Desktop från Start-menyn och vänta tills ikonen i aktivitetsfältet blir grön.

### "Kan inte ansluta till localhost:3000"
Vänta en minut - backend kanske fortfarande startar. Ladda om sidan.

### "Första transkriberingen tar lång tid"
Det är normalt! AI-modellen laddas ner första gången (~500 MB - 3 GB). Sparas lokalt för framtida användning.

---

## Säkerhet & Integritet

- **100% lokalt** - Allt körs på din dator
- **Inget internet krävs** - Efter första nedladdningen fungerar det offline
- **Din data stannar hos dig** - Inga filer skickas någonstans
