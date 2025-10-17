# Minebb Terminal Automated Verification

## Test Matrix

- [x] Unit tests (`pnpm --filter @minebb/terminal test:unit`) covering DTO contracts, finance codecs, IPC errors, and cache layers.
- [x] Integration tests (`pnpm --filter @minebb/terminal test:integration`) validating IPC round-trips between renderer and main.
- [x] End-to-end tests (`pnpm --filter @minebb/terminal test:e2e`) producing UI screenshots and smoke testing recovery flows *(requires Playwright system dependencies; install via `pnpm exec playwright install-deps` when running in CI).*.

## Artifacts

- [x] Screenshots captured under `reports/e2e-screenshots/01-no-token.png` – `04-network-error.png`.
- [x] Lixinger fixture payloads reused for deterministic rendering.
- [ ] CI coverage upload (reserved for pipeline integration).

## Usage Notes

1. Install dependencies: `pnpm install`
2. Build terminal bundle: `pnpm --filter @minebb/terminal build`
3. Execute full verification: `pnpm --filter @minebb/terminal test:all`

All tests respect the IPC contracts defined under `apps/terminal/common/ipc/` and the finance codecs in `apps/terminal/main/finance/`.
