@echo off
chcp 65001 >nul
set GIT_LITERAL_PATHSPECS=1
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
git add supabase/migrations/20260819_daily_tasks_genfix.sql
git add tools/run-migrations.mjs
git add src/lib/useEscClose.ts
git add src/components/digital/DigitalHub.tsx
git add src/components/digital/DigitalCollection.tsx
git add src/components/digital/StoreModal.tsx
git add src/components/digital/ShopModal.tsx
git add src/components/digital/QuestsModal.tsx
git add src/components/digital/SeasonPassModal.tsx
git add src/components/digital/SeasonPathModal.tsx
git add src/components/digital/DailyTasksModal.tsx
git add src/components/digital/MonthlyLoginModal.tsx
git add src/components/digital/CosmeticsModal.tsx
git add src/components/digital/SettingsModal.tsx
git add git-commit428.bat
git commit -m "fix+feat(QA round2): dienos uzduociu generacijos fix + UX pagerinimai. (1) BACKEND: migr 20260819_daily_tasks_genfix - prod'e uzduotys nesigeneruodavo (completion eilutes kurdavosi, tasks ne -> UI 'Siandien uzduociu nera'); rvn_get_daily_tasks perkurta su FOUND pattern + galutinis saugiklis (jei 0 -> irasomi 3 aktyvus sablonai); run-migrations.mjs regex prapletas iki 20260819 - REIKIA PALEISTI run-migrations.bat. (2) HOME: kaire panele be uzduociu neberodo tuscio ploto - login serija + Menesio dovanos CTA (loginClaimable pulsas); desineje po 'Kita pakopa' rodomi kito lygio atlygio chips (rewardChip); naujienu 'when' nebekerpa krasto. (3) KOLEKCIJA tankesne: cardW cap 150->116, rows nuo 300px - daugiau kortu puslapy. (4) ESC uzdaro visus 9 overlay (naujas useEscClose hook). (5) StoreModal CTA: 'Pirkti - 250' / 'Paimti nemokamai' vietoj plikos kainos. tsc svarus." > commit428.log 2>&1
git push >> commit428.log 2>&1
type commit428.log
echo ============= BAIGTA (QA round 2). =============
