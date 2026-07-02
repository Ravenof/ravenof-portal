@echo off
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
del /f /q ".git\index.lock" >nul 2>&1
(
git add src/components/digital/PackOpen.tsx
git commit -m "feat(digital): pakuotes atplesimas - kortos verciamos po viena (flip), tikro paveikslo fallback (vardas+retumas vietoj broken img), retumo efektai sparkles+garsai (didesni unikalioms/episkoms/legendinems)"
git push
git log -1 --oneline
) > commit131.log 2>&1
