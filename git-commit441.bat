@echo off
chcp 65001 >nul
set GIT_LITERAL_PATHSPECS=1
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
git add supabase/migrations/20260824_shop_real_cosmetics.sql
git add src/components/digital/ShopModal.tsx
git add git-commit441.bat
git commit -m "feat(shop): parduotuve pardavineja TIKRA kosmetika (feedback: home kosmetika unrelated to shop). PROBLEMA: tikri avatarai (Frildas Murvas, Kapralas Prazaras ir kt., visi su art) ir tikros nugareles gyveno TIK Kosmetikos kataloge, o parduotuve pardavinejo beveidus placeholder'ius (Bazinis/Retas/Premium/Legendinis avataras be jokio vaizdo). Migr 20260824: visos tikros perkamos kosmetikos (su art/css/emoji, price_gold>0) auto-generuojamos i shop_items su silver kaina = cosmetics.price_gold (idempotentiska, slug=cosmetic id); placeholder prekes BE vizualo isjungiamos is parduotuves. SHOPMODAL: nugareliu/avataru prekes dabar rodo TIKRA vizuala (apvalus avataras / nugareles kortele) plytelese ir dideli showcase desineje; jau turimi daiktai zymimi 'Turima' (plytele pritemdyta, vietoj pirkimo mygtuku - 'Jau turi - uzsidek Kosmetikoje'). Dabar Home kosmetika ir parduotuve = tas pats katalogas tomis paciomis kainomis. REIKIA run-migrations.bat (20260824). tsc+eslint svarus." > commit441.log 2>&1
git push >> commit441.log 2>&1
type commit441.log
echo ============= BAIGTA (shop = tikra kosmetika). =============
