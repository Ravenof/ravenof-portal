@echo off
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
del /f /q ".git\index.lock" >nul 2>&1
del /f /q ".git\index" >nul 2>&1
del /f /q "tsconfig.sim.json" >nul 2>&1
(
git read-tree HEAD
git add src/lib/game/types.ts src/lib/tutorial/engine.ts src/lib/game/effectEngine.ts src/components/admin/GameplayConfigEditor.tsx src/data/rules.ts src/lib/tutorial/script.ts src/components/rules/DamageModifierDeckBlock.tsx src/components/rules/RulesPageClient.tsx src/components/rules/ChampionRulesBlock.tsx
git status
git commit -m "feat(game): burtu tipai + busenu trukmes (silence=visam laikui) + advantage/disadvantage ZMK auros + burto nuolaida/+zala/vampyrizmas; 'kruva'->'kapinynas' visur; admin editorius (Batch 1)"
git push
git log -1 --oneline
) > commit97.log 2>&1
