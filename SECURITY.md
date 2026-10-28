# Security policy

## Reporting a vulnerability

Please **do not** open a public issue for security problems. Report them privately through
[GitHub Security Advisories](https://github.com/Harish-venkat84/icon-studio/security/advisories/new).

Include what you found, how to reproduce it, and the impact you expect. You should get a reply
within a week. Fixes are released as soon as possible, and reporters are credited unless they
prefer otherwise.

## Supported versions

Only the latest release and the `main` branch receive security fixes.

## Deployment notes

- The studio uses HTTP basic auth. Always serve it over HTTPS and set strong `STUDIO_USERS`
  passwords. With `STUDIO_USERS` empty, the production server answers every request with 503.
- Give `ICONS_GITHUB_TOKEN` access to the icon repository only, with **Contents: read/write** and
  nothing else.
- Uploaded SVGs are sanitized (scripts, event handlers, `foreignObject`, external links and
  `url()` references are removed). If you find a way around that, please report it.
