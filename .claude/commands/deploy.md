---
description: Deploy the project to Vercel (preview or production)
argument-hint: [preview|production]
---

# Deploy to Vercel

Target: $ARGUMENTS (default: preview)

---

## Step 0: Pre-flight checks

1. Run `git status` — if there are uncommitted changes, **stop** and ask the user to commit or stash first.
2. If `$ARGUMENTS` is `production` or `prod`, check the current branch:
   - If NOT on `main`, **warn** the user and ask for confirmation before proceeding.

---

## Step 1: Pre-deploy checks

Run lint and tests in parallel. **Both must pass before proceeding.**

1. `npm run lint` — ESLint + Prettier
2. `npm run test` — Vitest unit/integration tests

Then run the build:

3. `npm run build` — production build

If any check fails, stop and report the errors. Do NOT proceed to deploy.

---

## Step 2: Determine deploy target

- If `$ARGUMENTS` is `production` or `prod`: deploy to **production**
- Otherwise (blank, `preview`, or any other value): deploy to **preview**

---

## Step 3: Deploy

### Preview deploy

```bash
npx vercel
```

### Production deploy

```bash
npx vercel --prod
```

If the user has a `VERCEL_TOKEN` env var set, append `--token=$VERCEL_TOKEN` to the command.

---

## Step 4: Report

After deploy completes, display:

| Field  | Value                                 |
| ------ | ------------------------------------- |
| Target | preview / production                  |
| URL    | the deployment URL from Vercel output |
| Lint   | ✅ passed                             |
| Tests  | ✅ passed                             |
| Build  | ✅ passed                             |

If the deploy target was `production`, remind the user:

> Production deploy complete. Verify the live site and check Sentry for any new errors.
