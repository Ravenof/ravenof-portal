@echo off
cd /d "%~dp0"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
(
echo CWD: %CD%
git rev-parse --show-toplevel
git add src/components/digital/onboarding/StarterDeckOnboarding.tsx src/lib/digital/starterMeta.ts src/locales/en/onboarding.json src/components/tutorial/BattleLayout.tsx src/components/tutorial/DesktopBattleLayout.tsx src/components/tutorial/TutorialGame.tsx src/lib/version.ts git-commit798.bat
git commit -m "798: kalades pasirinkimas - dezutes be fono ir remelio (plaukia su svytejimu), EN frakcijos ir kalades pavadinimai, avataru vardai per content_translations, mygtukas i mokymus telpa; kovoje Kapinynas per i18n (EN Graveyard)" -m "Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01MA1F2oYWU2WAsACmgeB9Ak"
git push
git log -1 --oneline
) > commit798.log 2>&1
