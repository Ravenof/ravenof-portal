@echo off
cd /d "%~dp0"
git add supabase/migrations/20260915_avatar_emotions.sql src/lib/cosmetics.ts src/app/admin/shop/AdminShopClient.tsx src/components/tutorial/TutorialGame.tsx src/components/tutorial/BattleFxLayer.tsx git-commit688.bat
git commit -m "Battle avatars: emotion portraits (angry/happy/sad/shock) switch on events with frame FX; portrait fitted to frame window (zoomed out); admin emotion uploads + zoom<100"
git push
pause
