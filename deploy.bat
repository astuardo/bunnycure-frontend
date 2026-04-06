@echo off
cd C:\Users\alfre\IdeaProjects\bunnycure-frontend

git add .

git commit -m "feat: complete PWA mobile UX improvements + TypeScript fixes

Mobile UX:
- Sidebar with hamburger menu (Offcanvas for mobile)
- Responsive customer cards (<768px breakpoint)
- Mobile-optimized dashboard layout

PWA:
- Service worker skipWaiting: false (protects session cookies)
- Prevents session loss during SW updates
- /install page with platform detection

Session Management:
- Session expiration message on login page
- 8h cookie persistence (backend already deployed)
- JSON 401 responses (backend already deployed)

Code Quality:
- Fixed all ESLint errors (9 errors, 2 warnings)
- Fixed TypeScript build errors (type assertions)
- Replaced 'any' types with specific TypeScript types
- Fixed React hooks dependencies

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"

git push origin main

pause
