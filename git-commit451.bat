@echo off
chcp 65001 >nul
set GIT_LITERAL_PATHSPECS=1
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
git add src/components/digital/DigitalDeckBuilder.tsx
git add git-commit451.bat
git commit -m "fix(deck-builder v5.1): touch UX pataisos (playtest feedback). (1) UZSTRINGANTIS POPUP: hover preview rodomas TIK irenginiams su tikra pele (matchMedia hover+pointer:fine) - telefone touch emuliuoja mouse eventus be mouseleave, tad plaukiojantis preview likdavo ekrane ir glitchindavosi kartu su BuilderPreview; papildomai hover slepiamas pradedant drag/pointerdown ir kai atidaryta perziura. (2) DRAG BE LAIKYMO: touch drag startuoja ISKART tempiant horizontaliai (adx>10 ir adx>ady*1.15 = drag; vertikaliai = scroll) - hold 160ms lieka kaip fallback; nebereikia palaikyt kad nutemptum. (3) DRAG-OUT IS KALADES: kalades eilutes velkamos - paleidus UZ kalades panelio ribu isimama 1 kopija (fromDeck flag onUp sakoje, zustand getState pries stale closure); +/- mygtukai lieka. (4) Kalades eilutes dabar tos pacios rarity plyteles kaip pool (gradientas + remas pagal retuma) + dragging opacity. tsc+eslint svarus." > commit451.log 2>&1
git push >> commit451.log 2>&1
type commit451.log
echo ============= BAIGTA (builder v5.1 touch fix). =============
pause
