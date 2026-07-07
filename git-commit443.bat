@echo off
chcp 65001 >nul
set GIT_LITERAL_PATHSPECS=1
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
git add src/components/digital/DigitalDecks.tsx
git add src/components/digital/DigitalDeckBuilder.tsx
git add git-commit443.bat
git commit -m "fix(decks): dar daugiau vietos telefone. BUILDER: albumo kortos -20 proc. (minmax 92->72px, gap 2->1.5) - telpa daugiau stulpeliu ir eiliu; Albumas/Sarasas jungiklis PASALINTAS - lieka tik albumo grid (CardRow komponentas ir Eye importas isvalyti, -60 eil. dead code). MANO KALADES + BENDRUOMENE: pasalintas KALADES PageHero blokas (title+sub redundantiski - tabai ir taip pasako kur esi, ~70px atgauta), segment tabai kompaktesni (48->36px, ikonos 16->14). Visur turinys prasideda is karto po tabu. tsc+eslint svarus." > commit443.log 2>&1
git push >> commit443.log 2>&1
type commit443.log
echo ============= BAIGTA (decks kompaktizacija). =============
