@echo off
cd /d "%~dp0"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
del /f /q ".git\index.lock" >nul 2>&1
(
echo CWD: %CD%
git rev-parse --show-toplevel
git add src/lib/game/fxStage.ts src/components/tutorial/TutorialGame.tsx src/components/tutorial/CardStatusVfxLayer.tsx src/lib/version.ts git-commit767.bat
git commit -m "767: FX v4 - (1) nuolatiniai statusai: degimas, isalimas (serksno pluta be smaigaliu), apsvaigimas, nuodai, nutildymas, palaiminimas, skydas, pasisaipymas, selinimas, nemirtingumas ir kt. piesiami fxStage (statusOn) - seka kortos pozicija kiekviena kadra, kortos DOM nelieciamas; CardStatusVfxLayer juos ijungia/isjungia pagal ta pacia logika (idle limitas 2, sulaikymas iki skrydzio nusileidimo), zemos kokybes ir reduced-motion rezime lieka ankstesnis vaizdas; (2) reakcija: prie esamos grandines prideti v4 akcentai - blyksnis ant reakcijos kortos (detect) ir kontrsmugis grandinei sutrukus (effect); grandines eiga ir vartai nepakeisti. APP_VERSION 767" -m "Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01MA1F2o25PZyna3vr72EaVN"
git push
git log -1 --oneline
) > commit767.log 2>&1
