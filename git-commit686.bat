@echo off
cd /d "%~dp0"
git add supabase/migrations/20260915_roles_tester_guard.sql supabase/migrations/20260915_bug_reports.sql supabase/migrations/20260915_admin_player_overview.sql src/lib/social.ts src/lib/digital/native.ts src/lib/digital/accountStore.ts src/lib/digital/bugReport.ts src/app/digital/layout.tsx src/locales/lt/common.json src/locales/en/common.json src/locales/lt/bug.json src/locales/en/bug.json src/lib/i18n/resources.ts src/app/admin/users/page.tsx src/app/admin/users/[id]/page.tsx src/components/admin/AdminPlayerProfile.tsx src/components/admin/BugStatusForm.tsx src/app/admin/bugs/page.tsx src/app/admin/bugs/actions.ts src/app/admin/page.tsx src/components/digital/BugReportModal.tsx src/components/digital/MoreScreen.tsx src/components/digital/SettingsModal.tsx src/components/tutorial/TutorialGame.tsx git-commit686.bat
git commit -m "Tester role fix (DB role check + profile guard trigger), admin player profile (/admin/users/[id]: stats, matches, collection, decks, economy), bug reports (in-game modal, my reports, /admin/bugs), last platform/version heartbeat"
git push
pause
