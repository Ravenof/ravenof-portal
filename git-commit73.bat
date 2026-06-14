@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
(
git add src/lib/game/types.ts src/lib/tutorial/engine.ts src/lib/tutorial/ai.ts src/components/tutorial/TutorialGame.tsx src/components/admin/GameplayConfigEditor.tsx src/components/admin/CardForm.tsx git-commit73.bat
git commit -m "feat(champions): 3 fazes + 3 skills sistema - tribute is board(1tsk)/rankos(2tsk), evoliucija reikia cempiono board (phase+1), skills atrakinami pagal faze, paspaudus cempiona popup su skills (1/ejima), AI naudoja auksciausia; admin 3-skill mapinimas (Skill1/2/3 skirtukai + pavadinimai)"
git push
) > commit73.log 2>&1
