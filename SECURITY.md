# Security policy

## Supported deployment

The public GitHub Pages site is a static frontend and is not an approved location for credentials, OAuth tokens, or privileged server operations. Production publishing must run through the trusted backend described in `docs/SECURITY-ARCHITECTURE.md`.

## Reporting a vulnerability

Do not publish secrets, personal data, or exploit details in a public issue. Use GitHub's private vulnerability reporting feature if enabled for this repository, or contact the repository owner through a private channel. Include the affected page/component, impact, and safe reproduction steps. Do not access data belonging to other users.

## Credential exposure

If a credential is exposed, revoke/rotate it at the provider immediately. Removing it from the latest commit does not invalidate the credential or erase repository history.

## Security commitments

Security fixes are prioritized. Production release requires passing the security gates documented in `GATES.md`. This policy does not claim that the current static prototype is production-secure.
