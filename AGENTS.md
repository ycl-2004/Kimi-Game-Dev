# POP ISLAND — Agent & Project Guide

3D clay-style parcel-tossing timing game above drifting clouds (`pop-island` v1.0.0; formerly `CLOUD POST!`).

## Commands

- `npm run dev` — start Vite dev server
- `npm run build` — run `tsc --noEmit && vite build` into `dist/`
- `npm run preview` — preview production `dist/` locally

## Stack & Deployment

- **Frontend**: TypeScript (`strict: true`), Vite (`base: './'`), Three.js, procedural SVG tutorial art (`public/tutorial/*.svg`)
- **Optional API**: [api/review.ts](api/review.ts) (`POST`, Moonshot completion via `KIMI_API_KEY`); static hosts fall back cleanly to `src/services/review.ts` local reviews
- **CI/CD**: `.github/workflows/deploy.yml` builds and deploys `dist/` to GitHub Pages on pushes to `main`

## Structure & Conventions

- `src/config/gameConfig.ts` — single source of truth for palette, 5 islands (`Cake Isle`, `Cat Harbor`, `Volcano Spa`, Stage 3 chord `Berry Farm` & `Star Observatory`), level durations (`20s`/`25s`/`30s`), Power Bar tolerances, Fever (`4` streak, `8s`, `2x`), and 4-card tutorial text
- `src/game/` — `GameEngine.ts`, `PowerBar.ts`, `InputController.ts`, `types.ts`; tutorial and level transitions require explicit button/key confirmation; aim trajectory dots stay disabled
- `src/scene/DioramaScene.ts` — manages 3D clay diorama, `PORTRAIT_TARGET` / `shortLandscape` framing, and staggered Stage 3 chord island labels on compact screens
- `src/ui/` & `src/styles.css` — Power Bar uses `#FF9F1C` Orange (`GOOD`) and `#FF6B4A` Cat-Red (`PERFECT`); mobile disables `.island-label` touch events to avoid sky mis-taps, places Stage 3 `1+2`/`2+3` chord buttons in an unoverlapped upper grid row, switches modal CTA labels to `START` at `<= 700px`, and switches landscape phones (`max-height: 520px and min-width: 540px`) to a compact handheld layout
- **Local storage keys**: `LEADERBOARD.storageKey` (`cloud-post-local-v1`) and `cloud-post-best-*-v1` in `src/services/leaderboard.ts` keep legacy keys intentionally so existing local scores remain intact

## Current State & Verification

- **Current branch**: `main` deployed via GitHub Pages; legacy branch `new-scene` remains in repo/remote (merged ancestor check needed before deleting)
- **Verification**: always run `npm run build` after source changes; visually verify `desktop`, `mobile portrait (320/375/390)`, and `mobile landscape (667/844)` views plus live GitHub Pages deployment after push
