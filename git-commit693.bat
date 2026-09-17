@echo off
cd /d "%~dp0"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
del /f /q ".git\index.lock" >nul 2>&1
(
echo CWD: %CD%
git rev-parse --show-toplevel
git add supabase/migrations/20260918_app_releases.sql tools/publish-bundle.mjs release.bat build-apk-local.bat RELEASE-HANDOFF.md .gitignore package.json capacitor.config.ts src/lib/version.ts src/lib/updater/types.ts src/lib/updater/core.ts src/lib/updater/capgoAdapter.ts src/lib/updater/electronAdapter.ts src/app/admin/releases/page.tsx src/app/admin/releases/ReleasesAdminClient.tsx src/app/admin/page.tsx apps/digital/vite.config.ts apps/digital/src/main.tsx apps/digital/src/ErrorBoundary.tsx apps/digital/src/UpdateLayer.tsx apps/desktop/updater.js apps/desktop/main.js apps/desktop/preload.js apps/desktop/package.json git-commit693.bat
git commit -m "693: live release sistema - kanalai admin/tester/stable, rollback, OTA client updater (Capgo manual + Electron), /admin/releases, publish-bundle"
git push
git log -1 --oneline
) > commit693.log 2>&1
