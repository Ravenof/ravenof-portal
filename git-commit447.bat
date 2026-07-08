@echo off
chcp 65001 >nul
set GIT_LITERAL_PATHSPECS=1
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
git add src/components/digital/ContentDownloadGate.tsx
git add src/app/digital/layout.tsx
git add git-commit447.bat
git commit -m "feat(offline): PRIVALOMAS turinio atsisiuntimo popup paleidziant zaidima (kaip mobile TCG). Naujas ContentDownloadGate (mount'inamas /digital layout'e, z-500): paleidus app'a tikrina manifesta vs rvn-media-v1 cache; jei truksta DAUG core failu (tier<=2 kortos/garsai, >=10) - BLOKUOJANTIS popup: failu skaicius + MB, ATSISIUSTI mygtukas, progress baras (failai+MB), pabaigoje PRADETI ZAISTI; jei truksta MAZAI (<10, delta po nauju kortu) - siuncia tyliai fone be popup; jei nieko netruksta - gate nesirodo. Video (tier3) lieka neprivalomas per Nustatymus. Anti-softlock saugikliai: manifestas nepasiekiamas/offline/be Cache API -> gate praleidziamas; siuntimo klaidos -> 'Bandyti dar karta' + 'Testi be atsisiuntimo' (failai keliaus per SW zaidziant). tsc+eslint svarus." > commit447.log 2>&1
git push >> commit447.log 2>&1
type commit447.log
echo ============= BAIGTA (privalomas download gate). =============
