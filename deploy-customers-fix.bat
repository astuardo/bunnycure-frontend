@echo off
cd C:\Users\alfre\IdeaProjects\bunnycure-frontend

echo === Fixing customers page race condition ===

git add src\pages\customers\CustomersPage.tsx
git add src\stores\customersStore.ts
git add src\api\client.ts

git commit -m "fix: prevent race condition in CustomersPage auth check

- Wait for isAuthenticated AND user before fetching customers
- Prevents 401 errors from fetching before session is ready
- Add detailed logging for debugging mobile session issues
- Don't show duplicate toast on 401 (interceptor handles it)

Fixes: Session expired only on /customers in mobile

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"

echo.
echo === Pushing to origin ===
git push origin main

echo.
echo Deployment will start automatically on Vercel...
echo Check logs in mobile DevTools after deploy

pause
