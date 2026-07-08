@echo off
chcp 65001 >nul
set GIT_LITERAL_PATHSPECS=1
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
git add src/components/digital/DigitalDeckBuilder.tsx
git add git-commit450.bat
git commit -m "feat(deck-builder v5): Hearthstone-stiliaus vardu sarasai. KAIRE: vietoj kortu grid - kompaktiskos kortu VARDU plyteles su retumo spalvomis (fonas gradientas + kairysis 3px remas pagal rarity, aukso kastu zenkliukas, star cempionams, Lock neturimoms, xN kai kaladeje, zalias [+] greitam pridejimui); PELES HOVER = plaukiojantis kortos paveikslo preview (210px, seka kursoriu); TAP = didele perziura su Prideti; PALAIKYK+TEMPK = drag i kalade (ghost su kortos pav.). DESINE: statistika (aukso kreive + vid./cempionai/suma) perkelta PO kalades saraso. CardTile+Thumb isvalyti. tsc+eslint svarus. PASTABA: perrasytas CRLF - pirmasis bat del LF endings cmd prarijo g raide (it commit) ir commit neivyko." > commit450.log 2>&1
git push >> commit450.log 2>&1
type commit450.log
echo ============= BAIGTA (deck builder v5). =============
pause
