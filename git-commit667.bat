@echo off
cd /d "%~dp0"
git add src/components/digital/ContentDownloadGate.tsx src/locales/lt/onboarding.json src/locales/en/onboarding.json git-commit667.bat
git status --short | findstr /R "^[AM]"
git commit -m "Content gate: skip in local-first app bundle, restyle with Ravenof UI kit"
git push
pause
