@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
(
git add src/components/tutorial/SummonBurst.tsx git-commit169.bat
git commit -m "feat(fx): pasalinti pigiai atrodantys linijiniai simboliai - centrines kaukoles/akys, sakraline geometrija (pentagramos/zvaigzdes/heksagramos) is rato, hellfire pentagrama; magijos rato ziedai/zymes/runos liko"
git push
) > commit169.log 2>&1
