@echo off
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
del /f /q ".git\index.lock" >nul 2>&1
(
git add src/lib/game/types.ts src/lib/game/effectEngine.ts src/lib/tutorial/engine.ts src/lib/tutorial/ai.ts src/components/admin/GameplayConfigEditor.tsx src/components/tutorial/TutorialGame.tsx
git commit -m "feat(game): nauji efektu mapping variantai - zalos -%% aura, nemirtingumo aura (lieka 1 HP), atakos taikinio apribojimas, monetos metimas (zalia/raudona -> 2 efektai) su animacija, globalus onAnyCast/onAnyArtifact/onAnyChampion trigeriai, burtu zalos +X aura pagal tipa, priesas netenka aukso kito ejimo pradzioje (loseGoldNextTurn)"
git push
git log -1 --oneline
) > commit113.log 2>&1
