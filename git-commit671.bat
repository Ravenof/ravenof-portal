@echo off
cd /d "%~dp0"
git add src/components/digital/ui/useDesktopUi.ts src/components/digital/ui/desktop-ui.css src/components/digital/DigitalHub.tsx src/app/digital/layout.tsx git-commit671.bat
git status --short | findstr /R "^[AM]"
git commit -m "Desktop hub: full-width layout, scaled typography, larger rail/header, fixed-height quest rows"
git push
pause
