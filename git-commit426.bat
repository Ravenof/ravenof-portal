@echo off
chcp 65001 >nul
set GIT_LITERAL_PATHSPECS=1
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
git add src/components/digital/MoreScreen.tsx
git add src/components/social/FriendsClient.tsx
git add src/app/digital/friends/page.tsx
git add src/components/digital/DigitalDeckBuilder.tsx
git add git-commit426.bat
git commit -m "feat(landscape): More + Draugai + Deck Builder v4 (albumas+kalade viename). MORE: vertikalus sarasas -> 3 sekciju stulpeliai (Zaidimas/Bendruomene/Paskyra) su didelemis kortelemis, telpa be scroll. DRAUGAI: 3 zonos - kaire Prideti drauga + draugystes uzklausos, centras draugu sarasas (chat/issukis/mainai/salinti), desine issukiai tau + mainu pasiulymai (auto-refresh 5s); chat/trade modalai islaikyti. DECK BUILDER v4: 2 zonos - KAIRE = kortu ALBUMAS per visa ploti (kompaktiska filtru juosta virsuje: paieska/frakcijos select su confirm/tik turimos/universalios/albumas-sarasas switch), DESINE = kalades drop zona (nekeista); frakcijos pasirinkimas albumo vietoje kai nepasirinkta; drag&drop is albumo i kalade islaikytas; pasalintas nebereikalingas kairysis filtru stulpelis + SideToggle. tsc svarus." > commit426.log 2>&1
git push >> commit426.log 2>&1
type commit426.log
echo ============= BAIGTA (landscape: more + draugai + deck builder v4). =============
