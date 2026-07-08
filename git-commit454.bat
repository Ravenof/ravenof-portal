@echo off
chcp 65001 >nul
set GIT_LITERAL_PATHSPECS=1
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
git add src/components/digital/DigitalDeckBuilder.tsx
git add src/lib/version.ts
git add git-commit454.bat
git commit -m "fix(deck-builder v5.3): Issaugoti nebepasislepia su pilna kalade. v5.2 sarasui daves minHeight:96 netycia iseme min-h-0 klase - flex item min-height tapo auto (turinio dydis), 30 kortu sarasas nustojo trauktis ir isstume validacija+Issaugoti uz overflow-hidden paneles (matesi tik mygtuko virsus). Fix: min-h-0 grazintas + inline minHeight:96 (inline laimi pries klase) - sarasas traukiasi iki 96px ir scrollinasi, mygtukas VISADA matomas." > commit454.log 2>&1
git push >> commit454.log 2>&1
type commit454.log
echo ============= BAIGTA (v5.3 Issaugoti fix). =============
pause
