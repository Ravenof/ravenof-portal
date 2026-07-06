@echo off
chcp 65001 >nul
set GIT_LITERAL_PATHSPECS=1
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
git add src/components/tutorial/BattleLayout.tsx
git add src/components/tutorial/TutorialGame.tsx
git add git-commit419.bat
git commit -m "fix(combat H): artefaktai/reakcijos PERKELTI i kairi stulpeli (ne center row'ai) - pagal pataisyta prasyma. Kaire: emote+zurnalo skleidiklis, priesio artefaktai+reakcijos (virsuj), suskleidziamas zurnalas (mini strip / pilnas), tavo reakcijos+artefaktai (apacioj). Center lenta dabar TIK: priesio avataras, priesio padarai, divideris, tavo padarai -> maziau row'u, padarai dideli ir MATOMI. Laukas perkeltas i DESINI lentos krasta (nemaiso su kairej art/react). Art/react slotai 42/56 (telpa kairej stulpely), padarai lieka +30% (unitW 57). tsc svarus." > commit419.log 2>&1
git push >> commit419.log 2>&1
type commit419.log
echo ============= BAIGTA (art/react i kaire). =============
