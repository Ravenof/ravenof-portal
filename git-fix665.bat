@echo off
cd /d "%~dp0"
echo === Isitikinam, kad paskutinis commit yra 665 ===
git log --oneline -1
git log --oneline -1 > fix665-before.txt
echo.
echo === Atsaukiam commit 665 (failai lieka diske) ===
git reset --soft HEAD~1
git reset -q
echo.
echo === Pridedam tik reikalingus failus ===
git add .gitignore
git add apps/desktop/main.js apps/desktop/preload.js apps/desktop/package.json apps/desktop/package-lock.json apps/desktop/README.md apps/desktop/.gitignore
git add apps/digital/src/App.tsx
git add src/app/digital/auth/callback/page.tsx src/app/digital/layout.tsx
git add src/components/digital/onboarding/DigitalAuthScreen.tsx src/components/digital/onboarding/OAuthButtons.tsx
git add src/components/tutorial/StatGem.tsx src/components/tutorial/TutorialGame.tsx
git add src/lib/supabase/client.ts src/lib/digital/oauth.ts
git add src/locales/lt/auth.json src/locales/en/auth.json
git add android/app/capacitor.build.gradle android/app/src/main/AndroidManifest.xml android/capacitor.settings.gradle
git add git-commit665.bat git-fix665.bat
echo.
git status --short
echo.
git commit -m "Desktop installer (NSIS), OAuth Google/Facebook (web + Electron deep link + Capacitor), localStorage auth session for app bundle, StatGem ATK/HP badges, hover preview card-only on desktop"
git push --force-with-lease
pause
