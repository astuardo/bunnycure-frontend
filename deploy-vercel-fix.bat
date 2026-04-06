@echo off
cd C:\Users\alfre\IdeaProjects\bunnycure-frontend

echo === Adding vercel.json for SPA routing fix ===

git add vercel.json

git commit -m "fix: add vercel.json for SPA routing and PWA support

- Add rewrites to serve index.html for all routes
- Fixes 404 errors on direct route access (/install, /dashboard, etc.)
- Add Service-Worker-Allowed header for PWA scope
- Add security headers (X-Frame-Options, X-Content-Type-Options, X-XSS-Protection)
- Prevent service worker caching with must-revalidate

Fixes: Direct access to /install returns 404

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"

echo.
echo === Pushing to origin ===
git push origin main

echo.
echo Deployment will start automatically on Vercel...
echo Check: https://vercel.com/astuardos-projects

pause
