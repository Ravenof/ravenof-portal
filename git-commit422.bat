@echo off
chcp 65001 >nul
set GIT_LITERAL_PATHSPECS=1
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
git add src/components/digital/DigitalCollection.tsx
git add src/components/digital/DigitalDeckBuilder.tsx
git add src/components/digital/DigitalDecks.tsx
git add git-commit422.bat
git commit -m "feat(landscape): Kolekcija + Deck Builder perdaryti i landscape 3 zonu layout. KOLEKCIJA: kaire filtrai (paieska/rikiavimas/retumas/tipas/frakciju sarasas/tik turimos) visada matomi be popup; centras dinaminis kortu grid (ResizeObserver parenka stulpelius/eiles, kortos didesnes, puslapiavimas <- -> + swipe, be scroll); desine pasirinktos kortos detales inline (craft/disenchant, nebe modalas) + paku CTA pinned apacioj. DECK BUILDER: kaire paieska+toggles+frakcijos keitimas; centras kortu pool grid/sarasas (scroll tik paneleje), frakcijos pasirinkimas dideliame centre kai nepasirinkta; desine = DROP ZONA + kalades sarasas +/- + mini aukso kreive + pavadinimas/matomumas/aprasymas + validacija + ISSAUGOTI pinned (nebe sticky bottom bar / bottom sheet). Drag&drop fizika islaikyta (ghost, spyruokles, haptika). DigitalDecks wrapper h-full. tsc svarus." > commit422.log 2>&1
git push >> commit422.log 2>&1
type commit422.log
echo ============= BAIGTA (landscape: kolekcija + deck builder). =============
