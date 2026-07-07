@echo off
chcp 65001 >nul
set GIT_LITERAL_PATHSPECS=1
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
git add supabase/migrations/20260821_media_manifest.sql
git add src/lib/digital/mediaDownloader.ts
git add src/components/digital/SettingsModal.tsx
git add git-commit435.bat
git commit -m "feat(offline): media cache F2+F3 - 'Atsisiusti zaidimo turini'. F2: migr 20260821 rvn_media_manifest() -> (url,kind,tier,bytes) visa zaidimo medija (kortu art, voiceLines, summon/skill kino webm+mp4+poster, kosmetika, avatar video/balsai, paku virseliai, frakciju ikonos); bytes is storage.objects.metadata (tikslus MB progress); tier 1 core / 2 collection / 3 heavy video. F3: lib/digital/mediaDownloader.ts (manifest -> diff su rvn-media-v1 cache.keys -> queue concurrency 4 -> cache.put; progresas baitais; cancel; clearMediaCache; fmtMB) + SETTINGS nauja kategorija 'Zaidimo turinys': atsisiusta failu/uzimta vieta (storage.estimate), mygtukai 'Kortos ir garsai X MB' (tier<=2) ir 'Viskas + video Y MB', progress baras su Stabdyti, 'Isvalyti atsisiusta turini'. Rasoma i TA PATI rvn-media-v1 kuri skaito SW v4 - rankinis ir automatinis cache dalinasi saugykla. REIKIA: run-migrations.bat (20260821) arba SQL editor. tsc+eslint svarus." > commit435.log 2>&1
git push >> commit435.log 2>&1
type commit435.log
echo ============= BAIGTA (offline F2+F3: download ekranas). =============
