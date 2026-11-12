@echo off
cd /d "%~dp0"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
(
echo CWD: %CD%
git rev-parse --show-toplevel
git add src/lib/version.ts src/lib/digital/novice.ts src/components/digital/NoviceRankedNotice.tsx src/components/digital/DigitalHub.tsx src/components/digital/onboarding/StarterDeckOnboarding.tsx src/components/digital/ranked/RankedClient.tsx src/components/tutorial2/TutorialDirector.tsx src/locales/lt/home.json src/locales/en/home.json git-commit780.bat
git commit -m "780: naujoko kelias. Pradzios Kas toliau naujokui veda i kita pagrindu pamoka, po ju i mokymu kova, tada i pirma kova su DI, ir tik tada i Reitinga; po kalades pasirinkimo iskart pasileidzia 1 pamoka; kol neiveikta 1 pamoka, nenukreipiama i kasdienius atlygius ir nerodoma pasveikinimo dovana; Reitingo ekrane naujokui neikyrus priminimas pirma iveikti pagrindus. Veteranu (10+ kovu) tai nelieciama" -m "Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01MA1F2o25PZyna3vr72EaVN"
git push
git log -1 --oneline
) > commit780.log 2>&1
