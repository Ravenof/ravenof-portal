@echo off
cd /d "%~dp0"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
(
echo CWD: %CD%
git rev-parse --show-toplevel
git add src/lib/digital/iap.ts src/components/digital/shop/RubyPacks.tsx supabase/functions/verify-receipt/index.ts src/lib/version.ts git-commit833.bat
git commit -m "833: IAP - billing kvietimai po viena (atkurimas nebenulusta), verify-receipt klaidu zurnalas" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01MA1F2q4xKtxDCTMeqeaDnr"
git push
git log -1 --oneline
) > commit833.log 2>&1
