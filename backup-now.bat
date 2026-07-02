@echo off
REM ── Ravenof pilnas backup: git branch + tag + zip kopija ──────────────────────
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
del /f /q ".git\index.lock" >nul 2>&1
for /f "tokens=2 delims==" %%a in ('wmic os get localdatetime /value') do set dt=%%a
set STAMP=%dt:~0,8%-%dt:~8,6%
(
echo === BACKUP %STAMP% ===
REM 1^) commitinam viska kas nepakomituota i backup commit (jei yra pakeitimu)
git add -A
git commit -m "backup: pilna busena pries optimizacijas %STAMP%" --no-verify
REM 2^) backup saka + tag ties dabartine busena
git branch backup/%STAMP%
git tag backup-%STAMP%
git push origin backup/%STAMP% --no-verify
git push origin backup-%STAMP% --no-verify
git log -1 --oneline
) > backup-%STAMP%.log 2>&1
REM 3^) zip kopija salia projekto (src/public/supabase be node_modules)
powershell -NoProfile -Command "Compress-Archive -Path 'src','public','supabase','package.json','next.config.*' -DestinationPath ('..\ravenof-backup-' + '%STAMP%' + '.zip') -Force" >> backup-%STAMP%.log 2>&1
echo BAIGTA >> backup-%STAMP%.log
