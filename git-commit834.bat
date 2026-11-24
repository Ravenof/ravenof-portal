@echo off
cd /d "%~dp0"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
(
echo CWD: %CD%
git rev-parse --show-toplevel
git add apps/desktop/steam.js apps/desktop/main.js apps/desktop/preload.js apps/desktop/package.json apps/desktop/README.md apps/desktop/steam/app_build.vdf supabase/functions/steam-auth/index.ts supabase/migrations/20261124_steam_accounts.sql src/lib/digital/steam.ts src/components/digital/onboarding/OAuthButtons.tsx src/locales/lt/auth.json src/locales/en/auth.json build-steam.bat .env.steam.local.example .gitignore src/lib/version.ts git-commit834.bat
git commit -m "834: Steam - prisijungimas per Steam (auth ticket + steam-auth funkcija + steam_accounts), SteamPipe build-steam.bat, testinis App ID 480" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01MA1F2q4xKtxDCTMeqeaDnr"
git push
git log -1 --oneline
) > commit834.log 2>&1
