@echo off
cd /d "%~dp0"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
del /f /q ".git\index.lock" >nul 2>&1
(
echo CWD: %CD%
git rev-parse --show-toplevel
git add src/components/digital/DeleteAccountModal.tsx src/components/profile/DeleteAccountSection.tsx src/lib/digital/account.ts src/app/account/delete/page.tsx src/app/privacy/page.tsx src/app/profile/settings/page.tsx src/lib/version.ts tsconfig.check.scene.json git-commit715.bat
git commit -m "715: BUILD FIX - itraukti neikomitinti paskyros trynimo failai (DeleteAccountModal, DeleteAccountSection, account.ts, /account/delete, /privacy), kuriuos importavo 714 SettingsModal" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01JMitPggicCjMqQoG7n1BWv"
git push
git log -1 --oneline
) > commit715.log 2>&1
