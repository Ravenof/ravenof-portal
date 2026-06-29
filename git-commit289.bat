@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
(
git add src/lib/game/types.ts src/lib/game/effectEngine.ts src/lib/tutorial/engine.ts src/components/admin/GameplayConfigEditor.tsx git-commit289.bat
git commit -m "feat(mappings): gold efektai (1/11). gainGold/loseGold gauna goldAppliesTo (Sau/Priesininkui) - visos kombinacijos pridet/atimt auksa sau ar priesui. Naujas efektas cardCostMod: sekanti korta kainuoja +/- (costModDelta), gali but pagal tipa (any/unit/spell/artifact/reaction/field) ir kam (Sau/Priesininkui); PlayerState.nextCardCostMods, effectiveCost prideda, suvartojama suzaidus tinkama korta. Naujas globalus trigeris onOpponentGoldEmpty - fire'inamas priesininko kortoms kai zaidejas isleidzia visa auksa (playCard wrapper + fireGlobalListeners). Trigeriai onPlay/onTurnStart/onTurnEnd jau buvo. Admin: appliesTo selectai + cardCostMod laukai. tsc svarus."
git push
) > commit289.log 2>&1
