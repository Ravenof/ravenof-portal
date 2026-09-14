@echo off
cd /d "%~dp0"
git add apps/digital/src/Splash.tsx apps/digital/src/main.tsx apps/desktop/package.json apps/desktop/main.js apps/desktop/build/icon.ico apps/desktop/build/icon.png capacitor.config.ts public/favicon.ico public/icons/apple-touch-icon.png public/icons/icon-192.png public/icons/icon-512.png public/icons/maskable-512.png public/brand/ravenof-logo.png public/brand/ravenof-gate.png android/app/src/main/res git-commit680.bat
git commit -m "Ravenof brand: app icons (Windows ico, Android adaptive + legacy, web/PWA), Android splash images, in-app splash screen with logo before main menu"
git push
pause
