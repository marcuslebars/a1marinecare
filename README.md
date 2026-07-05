# A1 Marine Care (a1marinecare.ca)

Next.js 15 (App Router) site: per-foot quote tool, booking flow, and lead capture.

## Develop

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # vitest — includes the pricing golden suite (src/test/golden)
npm run build
```

## Shared pricing engine (`@a1/pricing-engine`)

All quote pricing comes from the shared engine, pinned in `package.json` to a Git tag:

```json
"@a1/pricing-engine": "git+https://github.com/marcuslebars/a1-pricing-engine.git#v1.0.0"
```

Deploys install this exact tag — reproducible, nothing else to set up. **Consistency across the two A1 sites comes from the pinned version, not from copied files.** Bumping the price requires cutting a new engine tag and updating this pin (the golden suite enforces exact-match on the Care side).

### Local engine development (sibling-clone layout)

To edit prices/logic in the engine and see them here *before* cutting a tag, clone the repos so the engine sits **two directories above this app's `package.json`** — i.e. so `../../a1-pricing-engine` resolves to it:

```
<workspace>/
├── a1-pricing-engine/                 # git clone https://github.com/marcuslebars/a1-pricing-engine
├── a1marinecare-main (1)/
│   └── a1marinecare-main/             # ← this app (package.json lives here)
└── a1marinestorage-main/
    └── a1marinestorage-main/          # the storage app (same engine)
```

Then:

1. Point the dependency at the local clone: `"@a1/pricing-engine": "file:../../a1-pricing-engine"`
2. `npm install`
3. After editing the engine's `src/`, run `npm run build` inside `a1-pricing-engine` (its `dist/` is committed and is what gets consumed).
4. To release: commit + push + tag the engine (e.g. `v1.1.0`), then switch this dependency back to the pinned `git+https://…#<tag>` form and `npm install`.

Do **not** commit the `file:` form — it only works with the sibling layout above. (If your checkout isn't double-nested like the download, adjust the `../` count so it points at the engine clone.)
