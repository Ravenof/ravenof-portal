@echo off
cd /d "%~dp0"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
(
echo CWD: %CD%
git rev-parse --show-toplevel
git add src/lib/version.ts src/lib/gamepad/core.ts src/components/digital/gamepad/PadGlyph.tsx src/components/digital/gamepad/GamepadLayer.tsx src/app/digital/layout.tsx src/locales/lt/common.json src/locales/en/common.json git-commit781.bat
git commit -m "781: valdiklio (gamepad) palaikymas, 1 versija. Erdvine navigacija per visus meniu, langus ir kova; fokuso remelis; mygtuku uzuominos su Xbox arba PlayStation zenklais ir spalvomis pagal prijungta valdikli; kovoje A paima korta ar padara ir padeda ant taikinio (tas pats tempimas kaip pele), B atsaukia, X baigia ejima, Y apziuri, LB ranka, RB lenta; meniu LB ir RB keicia skiltis, desine svirtis slenka. Valdiklio rezimas issijungia pajudinus pele" -m "Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01MA1F2o25PZyna3vr72EaVN"
git push
git log -1 --oneline
) > commit781.log 2>&1
