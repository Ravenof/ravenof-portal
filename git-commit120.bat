@echo off
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
del /f /q ".git\index.lock" >nul 2>&1
(
git add src/components/admin/GameplayConfigEditor.tsx src/components/tutorial/TutorialGame.tsx src/lib/game/effectEngine.ts src/lib/game/targetResolver.ts src/lib/game/types.ts src/lib/tutorial/engine.ts
git commit -m "feat(game): mapping patobulinimai - (1) reakcijos kortos kaip spastai: mapping su trigeriu/puse/salyga/effektu, suveikia ivykus ivykiui ir sunaudojamos; (2) frakcijos pasirinkimas vietoj subtype mappinge/aurose (pvz. +1 atk tik tam tikros frakcijos padarams); (3) curse mapping aiskumas - imaiso N prakeiksmu i kalade, aktyvuojasi istraukus; (4) logas atsidaro ties naujausiu ivykiu + visu kortu (ir burtu) paveikslai; (5) kortu traukimo pop-up 2s rodo ka istraukei; burtu/prakeiksmu pop-up pailgintas iki 2s"
git push
git log -1 --oneline
) > commit120.log 2>&1
