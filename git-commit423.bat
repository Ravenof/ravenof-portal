@echo off
chcp 65001 >nul
set GIT_LITERAL_PATHSPECS=1
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
git add src/components/digital/StoreModal.tsx
git add src/components/digital/ShopModal.tsx
git add git-commit423.bat
git commit -m "feat(landscape): abi parduotuves -> pilnaekranis landscape 3 zonu overlay. STOREMODAL (auksas): kaire vertikalus kategoriju tabai + Atplesti albume CTA; centras prekiu grid (auto-fill 118px, scroll tik jame); desine pasirinktos prekes preview (didelis vaizdas, aprasymas pagal kategorija, kaina) + PIRKTI/NAUDOTI CTA pinned apacioj - plyteles paspaudimas nebe perka, o pasirenka (saugiau + premium store UX). SHOPMODAL (sidabras/rubinai): kaire sekcijos, centras prekiu korteles su payload chips, desine pilnas prekes turinys (visi payload) + atskiri Pirkti uz sidabra / rubinus CTA pinned. Busy/error logika islaikyta. tsc svarus." > commit423.log 2>&1
git push >> commit423.log 2>&1
type commit423.log
echo ============= BAIGTA (landscape: parduotuves). =============
