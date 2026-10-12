# ▦ promptly.

A browser-local workshop for people who repeatedly use AI to write customer-facing content. No account, API key, AI calls, or content analytics. The green-and-cream and midnight palettes remain available.

## Build and reuse a brief

Choose **Launch email**, **Homepage introduction**, or **Customer reply** before composing, or start a blank brief with Task. Replace template placeholders with verified facts. Context, Constraints, and Output format are under **Add details**; Role, Tone, Examples, and Success criteria are optional. Suggestions explain missing tasks and bracketed placeholders without blocking copying.

Switch between **Edit your brief** and **Preview prompt**. Copy from the top controls or the bottom of the brief, or export Markdown. Clipboard denial switches to selected Markdown for manual copying. Controls stay in the document flow, with 44px touch targets, visible keyboard focus, labeled fields, and reduced-motion support.

**Save a copy to collection** captures a named snapshot. Open an entry as an editable working copy, rename, duplicate, archive, or restore it. Later edits save to the working brief; save another collection copy when ready. Archiving retains content. Undo restores up to 20 previous briefs after block removal, clearing, template replacement, opening a saved prompt, or starting a new brief. Undo history is in memory and resets on reload or conflict resolution; it does not undo typing or collection changes.

## Keeping your work

- The working brief and collection persist in `promptly-workspace-v1` in this origin's `localStorage`, after a 400ms debounce. Pending edits also flush on page hide and when the page becomes hidden. Unsaved work requests a browser exit warning where supported; browsers may terminate a page before an asynchronous flush completes. Wait for **Saved in this browser** before closing important work.
- Valid `promptly-draft` data migrates automatically. The original legacy key is retained. Unreadable or invalid data pauses persistence and exposes **Download original data**. It is never silently replaced. Temporary edits can still be copied or backed up. To recover, keep the original download, repair the JSON outside the app, and restore it through a valid backup; advanced users may repair the affected key in developer tools. Removing a damaged key after making a backup allows a fresh workspace on reload.
- Writers share an origin-wide Web Lock and compare the complete stored revision before writing. Another tab's storage changes pause saves. **Keep both** preserves the latest workspace and adds this tab's entire collection and working brief as copies. **Load latest** discards local changes after confirmation. Download a backup first if needed. Conflict resolution resets Undo.
- Safe persistence needs Web Locks and browser storage on HTTPS or localhost. Unsupported browsers, denied storage, lock errors, or quota errors keep work in memory and show **Storage unavailable**. Copy and downloads still work. Reload after addressing the problem.
- Storage is local to the browser profile and origin, including the port. It does not sync across devices, subdomains, or browsers. Private browsing, clearing site data, browser eviction, and quota limits can remove saved work. Browser-local does not mean encrypted.

Use **Saved prompts & backups → Download JSON backup** regularly. The versioned `promptly-backup` JSON includes editable blocks, the working brief, and active and archived collection entries. Import validates the entire file before changing anything and adds copies to the collection, including the imported working brief. It leaves the current brief and existing collection intact. Markdown export preserves text but is not an editable backup format.

Limits: 500 collection entries, 100 blocks per brief, 100 characters per name, 100,000 characters per block, and 10 MB of serialized workspace/import data, subject to the browser's usually smaller quota. Keep both/import rejects operations that exceed these limits; export local work for manual recovery instead.

## Local development and verification

Use Node.js 18 or newer (CI uses 22). There are no runtime dependencies or build step.

```sh
git clone https://github.com/Matthew-Hawk/Promptly.git
cd Promptly
npm start
```

Open http://127.0.0.1:5173/#builder. For an isolated origin, run `node serve.cjs 5174`. Stop with Ctrl+C. ES modules require an HTTP server; do not open the HTML as a file URL.

```sh
npm run check
npm test
```

The dependency-free Node suite covers validation/recovery, migration, concurrent writes, explicit conflict resolution, quota and lock failures, debounce/flush, Undo, collection snapshots, imports, and Markdown. GitHub Actions runs syntax checks and this suite on pushes and pull requests.

For actual browser integration checks:

```sh
node scripts/browser-checks.cjs
```

Open http://127.0.0.1:5175/checks.html and verify every row says PASS. This fixture uses disposable storage on port 5175, simulates clipboard permission denial, checks recovery/migration/reopening, destructive Undo, collection operations, validated backup imports, phone and desktop overflow, and real storage events across two embedded browsing contexts. Keep test servers and `tests/` out of hosting. Also check keyboard Tab/Shift+Tab, Enter/Space controls, palette contrast, copying, and editor/preview at narrow and desktop widths. Automated viewport checks do not simulate a physical phone keyboard or screen reader.

## Source and hosting

| File | Responsibility |
| --- | --- |
| `dist/index.html` | Home, concise explanation, and builder markup |
| `dist/style.css` | Palettes, responsive layout, focus, and motion |
| `dist/core.js` | Validation, migration, collection operations, Undo, templates, backups, Markdown |
| `dist/persistence.js` | Debounce, revision checks, Web Locks, and conflict resolution |
| `dist/app.js` | DOM rendering, event handling, accessible focus, clipboard, downloads |
| `serve.cjs` | Loopback static development server |

The deployable artifact is the complete `dist/` directory, including all three JavaScript modules. A reproducible artifact package can be made from the repository root:

```sh
npm run check
npm test
tar -czf promptly-static.tar.gz -C dist .
```

Upload that directory or unpacked artifact to an HTTPS static host using its existing deployment procedure. `.openai/hosting.json` records a static project with `dist` as its directory. This repository contains no Wrangler configuration, Cloudflare deployment workflow, or credentials, so it cannot reproduce the existing workers.dev site's exact deployment by itself. Obtain the actual hosting configuration before deploying there. No deployment is performed by tests or checks.

Existing `ReadME_Assets` screenshots depict the earlier interface; they are historical, not current feature documentation.
