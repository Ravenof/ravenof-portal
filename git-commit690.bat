@echo off
cd /d "%~dp0"
git add src/components/digital/profile/ProfileCosmeticsModal.tsx src/components/digital/profile/ProfileOverviewScreen.tsx src/locales/lt/profile.json src/locales/en/profile.json git-commit690.bat
git commit -m "Profile: deck avatars tab in cosmetics modal (assign avatar per deck / use global) + button on overview"
git push
pause
