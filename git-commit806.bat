@echo off
cd /d "%~dp0"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
(
echo CWD: %CD%
git rev-parse --show-toplevel
git add src/components/digital/ui/RavenofKit.tsx src/components/digital/ActiveDeckSelectorModal.tsx src/components/digital/DeckSelect.tsx src/lib/version.ts studio/store-capture.spec.ts playwright.studio.config.ts git-commit806.bat
git commit -m "806: aktyvios kalades pasirinkime ir kaladziu sarasuose rodomi tikri frakciju zenklai (pagal frakcijos pavadinima, ne sena icon_url); studijos pataisymai" -m "Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01MA1F2oYWU2WAsACmgeB9Ak"
git push
git log -1 --oneline
) > commit806.log 2>&1
