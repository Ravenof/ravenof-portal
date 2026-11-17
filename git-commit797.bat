@echo off
cd /d "%~dp0"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
(
echo CWD: %CD%
git rev-parse --show-toplevel
git add src/lib/digital/guest.ts src/components/digital/GuestUpgradeCard.tsx src/components/digital/onboarding/DigitalAuthScreen.tsx src/components/digital/SettingsModal.tsx src/components/digital/MoreScreen.tsx src/locales/lt/auth.json src/locales/en/auth.json src/app/privacy/page.tsx src/lib/version.ts git-commit797.bat
git commit -m "797: svecio rezimas - Zaisti kaip svecias (anonimine paskyra), nustatymuose svecio paskyros pavertimas nuolatine (el. pastas + slaptazodis), ispejimas atsijungiant sveciui; privatumo politikoje duomenu valdytojas MB Daiktu dezute ir svecio paskyros aprasymas" -m "Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01MA1F2oYWU2WAsACmgeB9Ak"
git push
git log -1 --oneline
) > commit797.log 2>&1
