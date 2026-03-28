# Secrets Management Policy

**Created:** 2026-03-28
**Story:** TD-3 (Auth Enforcement & Security Hardening)

---

## Pre-commit Hook Protection

A pre-commit hook (`.husky/pre-commit`) blocks commits that contain:

1. **Environment files**: Any `.env`, `.env.local`, `.env.*` (except `.env.example`)
2. **Hardcoded secrets**: Lines matching patterns like `API_KEY=sk-...`, `SECRET_KEY=eyJ...`
3. **Certificate/key files**: `.pem`, `.key`, `.p12`, `.pfx`, `.cer`, `.crt`

### Bypass

If a detection is a false positive (e.g., test fixtures or documentation), bypass with:

```bash
git commit --no-verify
```

Use this sparingly and only when you are confident no real secrets are being committed.

### Setup

The hook requires `husky` (installed as devDependency):

```bash
npm install   # runs `husky` via prepare script
```

---

## Environment Variable Management

### Required Variables

Store in `.env.local` (never committed):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY`
- `QSTASH_TOKEN`
- `MASTER_PASSWORD`
- `SMARTZAP_API_KEY`
- `SMARTZAP_ADMIN_KEY`

### Template

`.env.example` is the committed template with placeholder values. Keep it updated when adding new required variables.

### Production

Use Vercel environment variables (or equivalent) for production deployments. Never hardcode secrets in source code.

---

## CI/CD Security Audit

### npm audit

Added to `.github/workflows/test.yml`:

```yaml
- name: Security audit (npm audit)
  run: npm audit --audit-level=high
  continue-on-error: false
```

This fails the build on HIGH or CRITICAL vulnerabilities.

### Current Vulnerability State (2026-03-28)

| Severity | Count | Notes |
|----------|-------|-------|
| High | 9 | Mostly transitive deps (swagger-ui-react, minimatch, picomatch) |
| Moderate | 4 | next.js, dompurify, brace-expansion |
| Low | 2 | Minor issues |

Most high-severity vulnerabilities are in transitive dependencies of dev/optional packages. Production-critical ones (next.js, hono) have fixes available via `npm audit fix`.

### Future Enhancement

Snyk integration for deeper SAST analysis is out of scope for this story but recommended as a future enhancement.

---

## API Route Authentication

See `docs/architecture/api-auth-matrix.md` for the full route classification and auth enforcement details.
