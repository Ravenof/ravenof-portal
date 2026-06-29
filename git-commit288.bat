@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
(
git add src/components/tutorial/TutorialGame.tsx git-commit288.bat
git commit -m "feat(ui): burtu target select su patvirtinimu. Bakstelejus taikini uzsidega zalias checkmark (✓) ant padaro/artefakto/zaidejo + zalias ringas; dar kartas bakstelejus ta pati - atzymi (deselect). Naujas 'Gerai' patvirtinimo mygtukas (su 'X' atsaukti) apacioje; burtas suzaidziamas tik patvirtinus, nebe is karto pirmu bakstelejimu. Veikia ir single ('spell' dabar laiko picked) ir multi ('spellMulti' toggle vietoj auto-fire pasiekus need; confirm reikalauja need). Drag&drop greitas kelias nepakeistas. tsc svarus."
git push
) > commit288.log 2>&1
