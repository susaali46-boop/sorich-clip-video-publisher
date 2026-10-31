# Security policy

Do not commit API secrets, service-role keys, OAuth client secrets, access tokens or passwords. Report vulnerabilities privately to the repository owner rather than opening a public issue.

Sorich uses Supabase Auth for password verification and password hashing. The application does not store passwords. Auth is handled through server-side Supabase SSR cookies with HttpOnly, Secure in production, SameSite=Lax and Path=/ options. The browser does not receive a service-role key.

Production release requires HTTPS, verified cookie behavior, cross-workspace RLS tests, private storage checks, dependency scanning and a successful staging restore exercise. GitHub Pages is not a supported host for authenticated server routes.
