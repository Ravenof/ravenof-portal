@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"

echo === 1. Salinamas stale git lock (jei yra) ===
if exist ".git\index.lock" del /f /q ".git\index.lock"

echo === 2. Stage'inami pakeitimai ===
git add src/components/rules/CardLightbox.tsx
git add src/components/rules/ZmkSimulator.tsx
git add src/components/rules/CoinFlipDemo.tsx
git add -u

echo === 3. Commit ===
git commit -m "feat(rules): gameifikuotas taisykliu puslapis - scroll progress, skaitymo sekimas su Taisykliu zinovo apdovanojimu, interaktyvi kortos anatomija su hotspot taskais, kortu apziura is arti (lightbox + GameCard), ZMK traukimo simuliatorius, monetos metimo demo, back-to-top"

echo === 4. Push ===
git push

echo.
echo === BAIGTA. Spauskite bet kuri klavisa. ===
pause
