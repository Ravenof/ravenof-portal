@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
(
git add src/lib/game/effectEngine.ts src/lib/game/types.ts git-commit196.bat
git commit -m "fix(spells): burtu zalos priedas = TIK pasyvi aura (auraSpellDamage, kol kurinys kovos lauke) + ZMK per taikini; pasalintas nuolatinis kaupiamas buffSpellDamage skaitiklis is zalos skaiciavimo (jis dvigubai pridedavo prie kiekvieno AoE taikinio); buffSpellDamage efektas pasalintas is redaktoriaus dropdown (naudoti pasyvia aura)"
git push
) > commit196.log 2>&1
