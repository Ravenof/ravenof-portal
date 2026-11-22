@echo off
cd /d "%~dp0"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
(
echo CWD: %CD%
git rev-parse --show-toplevel
git add src/lib/tutorial/engine.ts src/lib/game/effectEngine.ts src/components/tutorial/TutorialGame.tsx src/components/admin/GameplayConfigEditor.tsx src/locales/lt/battleLog.json src/locales/en/battleLog.json src/lib/version.ts scripts/simulate-grave-to-deck.ts package.json git-commit826.bat
git commit -m "826: returnGraveyardToDeck - kortos tipo filtras ir zaidejo pasirinkimas (Elvira Melvija: 2 burtai is kapinyno i kalade), pasirinkimo scenos pavadinimas per i18n" -m "Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01MA1F2pquWqjVVw7HiXJktG"
git push
git log -1 --oneline
) > commit826.log 2>&1
