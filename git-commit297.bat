@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
(
git add src/components/tutorial/TutorialGame.tsx git-commit297.bat
git commit -m "feat(desktop): pilnas grid layout (areas) + premium slotai + zonu etiketes. Outer CSS grid grid-template-areas left/board/right/hand/command (NE absolute). Centrine lenta = vidinis grid 8 sluoksniu su etiketemis (Priesininko ranka/reakcijos/artefaktai/padarai -> Lauko korta -> Tavo padarai/artefaktai/reakcijos). Tusti slotai dabar premium (stone inset + bronze/violet border + faint rune), NE debug staciakampiai. Lauko slotas = ornate horizontali panele su etikete (kortos thumb + vardas / 'tuscias'). Didesnes kortos (hand 124, creature 96). Desine rail: priesininko info+pile'ai + visada matomas Veiksmu zurnalas (zalia=tu, raudona=priesas). Komandu panele (auksas/+100/Baigti ejima) viena panele. Compact log strip paslepta desktop'e (palikta mobile). Mobile NEPALIESTAS. tsc svarus."
git push
) > commit297.log 2>&1
