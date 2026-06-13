@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
(
git add src/lib/tutorial/engine.ts src/lib/game/types.ts src/lib/game/targetResolver.ts src/lib/game/effectEngine.ts src/components/admin/GameplayConfigEditor.tsx src/components/tutorial/TutorialGame.tsx src/app/admin/cards/actions.ts "src/app/admin/cards/[cardId]/page.tsx" src/components/admin/CardForm.tsx supabase/migrations/20260613_card_subtype.sql git-commit57.bat
git commit -m "feat(gameplay): padaru potipiai (subtype) - cards.subtype DB laukas, admin CardForm input, targetSubtype filtras effect engine'e (buffai/targeting pagal ZOMBIE/GOBLIN/DEMON)"
git push
) > commit57.log 2>&1
