@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
(
git add src/components/admin/GameplayConfigEditor.tsx git-commit290.bat
git commit -m "feat(mappings): 'Arba padaryk' OR-branch + dynamic value sekundariniams (2/11). Salia '+ Tada padaryk dar' pridetas '+ Arba padaryk' - sukuria chooseEffect then-irasa su 2 variantais (A/B), kiekvienas su efektu/taikiniu/reiksme; pop-up renkasi Tu arba Priesininkas (chooseBy). Engine chooseEffect runtime jau veike. Kiekvienas 'tada padaryk' then-irasas dabar turi 'Dinamine' reiksme (baze + perEach x metrika, pvz. lastDamageDealt) - chainDamage jau propaguojamas i then. Pvz.: skill AoE 1 visiem creature, tada +ATK self = padaryta zala. tsc svarus."
git push
) > commit290.log 2>&1
