@echo off
cd /d "%~dp0"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
del /f /q ".git\index.lock" >nul 2>&1
(
echo CWD: %CD%
git rev-parse --show-toplevel
git add src/components/digital/onboarding/StarterDeckOnboarding.tsx src/locales/lt/onboarding.json src/locales/en/onboarding.json tsconfig.check.scene.json src/lib/version.ts git-commit727.bat
git commit -m "727: Naujo zaidejo onboarding v2 - pradines kalades kaip 3D dezutes ant altoriaus (frakcijos nuotaika, svytintis diskas, raktines kortos veduokle, stiprybiu zymos) su booster lygio atidarymo scena (dangtis, blyksnis, banga, kibirkstys, kortu veduokle -> kalade); avataro zingsnis rodo TIK atrakintus (iki 2) kaip HUD medalionus su lore, pasirinktas nuskrenda i HUD vieta; tie patys RPC claim -> equip" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01JMitPggicCjMqQoG7n1BWv"
git push
git log -1 --oneline
) > commit727.log 2>&1
