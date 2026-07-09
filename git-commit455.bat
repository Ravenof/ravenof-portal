@echo off
chcp 65001 >nul
set GIT_LITERAL_PATHSPECS=1
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
git add src/components/digital/PackOpen.tsx
git add src/lib/version.ts
git add git-commit455.bat
git commit -m "fix(pack-open): atidarius booster korta nebeuzdengia bottom nav. Priezastis - stacking context: PackOpen renderinosi main viduje (relative z-10), o tab bar shell e turi z-20, tad nav VISADA virs overlay nepriklausomai nuo vidinio z-index. Fix: visas PackOpen overlay per createPortal(document.body) + zoom kortos plotis ribojamas ir pagal auksti (min(300px,74vw,60vh) - landscape telefone korta telpa visa su efekto tekstu). APP_VERSION=455." > commit455.log 2>&1
git push >> commit455.log 2>&1
type commit455.log
echo ============= BAIGTA (pack open z-fix, v455). =============
pause
