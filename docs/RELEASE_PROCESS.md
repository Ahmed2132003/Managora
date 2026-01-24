# Release Process (Production-ish)

## Branching
- `develop` is the integration branch.
- `main` is release-ready and deployable.

## Tagging
- Use semantic-ish tags for release candidates and betas.
- Example: `v0.9.0-beta`

## Release Steps (Human)
1. Merge `develop` → `main`.
2. Update `APP_VERSION` (and optionally `BUILD_SHA`) in `.env.prod`.
3. Tag and push:
   - `git tag v0.9.0-beta`
   - `git push origin v0.9.0-beta`
4. GitHub Actions will build and test, then (optionally) push images.

## GitHub Actions Pipeline
- Trigger: push of tag `v*` or manual dispatch.
- Stages:
  - Run backend + frontend tests.
  - Build Docker images.
  - Optional image push when registry secrets are provided.

## Rollback
- Re-deploy a previous tag:
  - `git checkout v0.9.0-beta`
  - Build/pull the previous images and redeploy.

## Notes
- Secrets are managed outside Git via `.env.prod`.
- Rotate `DJANGO_SECRET_KEY` for every production release.