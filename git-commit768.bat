@echo off
cd /d "%~dp0"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
del /f /q ".git\index.lock" >nul 2>&1
(
echo CWD: %CD%
git rev-parse --show-toplevel
git add src/lib/game/fxStage.ts src/lib/game/fxCatalog.ts src/lib/game/types.ts src/lib/game/effectEngine.ts src/lib/tutorial/engine.ts src/components/tutorial/TutorialGame.tsx src/components/tutorial/CardStatusVfxLayer.tsx src/components/admin/GameplayConfigEditor.tsx src/lib/version.ts git-commit767.bat git-commit768.bat
git commit -m "768: FX v4 - (1) AoE efektas ne zalos efektams: kai sustiprinimas, skydas, uzsaldymas, apsvaiginimas, nuodai, nutildymas, susilpninimas, selinimas ar sunaikinimas taiko visa zona, variklis raso FX zyme (aoeKind, aoeFx, aoeUids) ir groja viena zonos choreografija per padaru eile vietoj atskiru skrydziu kiekvienam; statusu vaizdas ir sustiprinimo skaiciai atsiranda zonos smugio momentu; (2) admine prie efekto naujas laukas AoE efektas (automatinis / be efekto / 8 variantai), galioja ir AoE zalai bei gydymui; (3) skrydziai i avatara groja v4 choreografija (virtuali scena, avataro DOM nelieciamas); (4) efekto zala be elemento is Sviesos pulko, Plesiku nakties ir Ryto vejo korto nebekrenta i sena kirti - skrenda frakcijos spalvos rutulys. APP_VERSION 768" -m "Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01MA1F2o25PZyna3vr72EaVN"
git push
git log -1 --oneline
) > commit768.log 2>&1
