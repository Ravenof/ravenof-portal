@echo off
cd /d "%~dp0"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
del /f /q ".git\index.lock" >nul 2>&1
( git add src/components/tutorial/TutorialGame.tsx & git commit -m "fix(game): mapping-based battlecry taikinio pasirinkimas - kortos su 'Zaidejas renkasi' mapping (onSummon/onPlay/onCast) dabar parodo taikinio pasirinkima zaidime (anksciau tikrino tik sena c.effect.targeted, tad nieko nevykdavo); target highlight pagal mapping taikini; jei nera taikiniu - auto suzaidzia" & git push ) > commit91.log 2>&1
