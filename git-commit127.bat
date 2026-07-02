@echo off
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
del /f /q ".git\index.lock" >nul 2>&1
(
git add supabase/migrations/20260617_admin_grant.sql src/app/admin/users/actions.ts src/components/admin/UserGrantForm.tsx src/app/admin/users/page.tsx
git commit -m "feat(admin): skirti auksa ir pakuotes vartotojams is admin panel (Vartotojai lentele). RPC rvn_admin_grant (admin-only, SECURITY DEFINER), server actions adminGiveGold/adminGivePacks, UserGrantForm"
git push
git log -1 --oneline
) > commit127.log 2>&1
