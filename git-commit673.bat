@echo off
cd /d "%~dp0"
git add src/components/digital/DigitalPvE.tsx src/components/tutorial2/TutorialHub.tsx git-commit673.bat
git commit -m "Desktop layout: Kova su DI (3 fixed columns, compact 2x2 modes, per-mode right panel) + tutorial hub (2 columns, bigger lesson rows)"
git push
pause
