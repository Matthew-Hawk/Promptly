# ▦ promptly.

A browser-local workshop for reusable AI briefs across common workplace tasks. No account, API key, AI calls, or content analytics. The green-and-cream and midnight palettes remain available.

## Build and reuse a brief

Choose a task template or blank brief. Browse five categories with optional role filters and search. Guided values replace named variables consistently; the advanced section editor remains independent and fully editable. Add, remove, collapse or navigate sections, and optionally show a live preview beside the editor on wide screens. Copy/export stays available; intentional unfinished exports require a clear confirmation. See the workplace update below for editing and collection behavior.

**My prompts** contains completed prompts and reusable templates. Save as new creates a snapshot; Update adds a saved version. Preview, search, tag, favorite, rename, duplicate, archive or restore entries. Templates create separate working briefs. Version restore preserves unrelated working work and can be undone. Draft Undo is bounded to 20 entries and remains in memory only. Copying falls back to selected Markdown when clipboard permission is denied.

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
| `dist/library.js` | Task categories, role tags, questions and starter templates |
| `dist/core.js` | Validation, variables, profiles, versions, migration, collections, Undo, backups, Markdown |
| `dist/presentation.js` | UI-only vocabulary, guided examples and audience example selection |
| `dist/focus.js` | Focused question navigation and expandable builder steps; presentation only |
| `dist/motion.js` | Viewport entrances, dynamic content, ambient pause and reduced-motion preferences |
| `dist/persistence.js` | Debounce, revision checks, Web Locks, and conflict resolution |
| `dist/app.js` | DOM rendering, event handling, accessible focus, clipboard, downloads |
| `dist/social-preview.png` | Homepage image for shared links (1200 × 630) |
| `serve.cjs` | Loopback static development server |

The deployable artifact is the complete `dist/` directory, including all seven JavaScript modules. A reproducible artifact package can be made from the repository root:

```sh
npm run check
npm test
tar -czf promptly-static.tar.gz -C dist .
```

Upload that directory or unpacked artifact to an HTTPS static host using its existing deployment procedure. `.openai/hosting.json` records a static project with `dist` as its directory. This repository contains no Wrangler configuration, Cloudflare deployment workflow, or credentials, so it cannot reproduce the existing workers.dev site's exact deployment by itself. Obtain the actual hosting configuration before deploying there. No deployment is performed by tests or checks.

## Shared-link previews

`dist/index.html` includes Open Graph and large-image Twitter card metadata in the initial HTML, so crawlers can read it without running JavaScript. Both use `dist/social-preview.png`, a crop of the current homepage screenshot in `ReadME_Assets/home.png`. Regenerate it with `python scripts/generate_social_preview.py` (requires Pillow).

The canonical, Open Graph, and Twitter image URLs use `https://promptly.thehawk6353.workers.dev/`. Update those absolute URLs if the public domain changes. Home, about, and builder links use fragments and share the same preview. Deploy the complete `dist/` directory, then verify the public HTML contains the metadata and `/social-preview.png` returns the PNG. Platforms may cache older previews; request a refresh in their link-preview debugger after deployment if needed.



## Workplace brief builder update

Promptly now uses midnight for first visits, preserving saved daylight/midnight preferences. The starter library covers five task categories and 14 templates, including the original three. Customer reply and follow-up share one structure; project briefs and implementation plans share one structure. Optional role filters only filter the catalog and never assign an AI role.

Named `{{variables}}` replace guided values consistently at preview/export time. The advanced editor stores the instruction text independently: retaining a token keeps it connected to its field, replacing it with literal text disconnects that occurrence. Field changes never overwrite section text. Custom variables and removable sections keep templates editable. Specific completeness messages focus the relevant input. Missing information does not block deliberate export after confirmation; there is no quality score.

**My prompts** supports search/tags, favorites, preview, rename, duplication, archive/restore, save as new, and update. Each completed prompt has up to 50 immutable content versions with optional manually entered response/model/result notes. Restore adds a new saved version and preserves the unrelated working draft; Undo reverses the latest restore or archive action in this session. Result notes themselves remain editable. Reusable templates create separate briefs with cleared variable values. Save a customized template as a new template; templates are not automatically updated from those briefs.

Context and voice profiles are optional, local, limited to 50, and explicitly included as editable snapshots. Editing the profile library does not change a draft, completed prompt or saved version. Include/refresh replaces the selected snapshot explicitly, with Undo. Imported profile IDs and snapshot links are remapped together. Dedicated facts/original/style references specify facts, style or both; generated Markdown delimits and quotes their content and tells the eventual AI to treat it as content. URLs are not fetched, and delimiters cannot guarantee protection from prompt injection. Missing-information and outside-information policies are included in output.

The existing workspace and backup version 1 envelopes are retained, with validated optional variables, profiles, template markers, tags, favorites, histories and result metadata. Old workspaces/backups still load. New backups require this updated app to retain the additional metadata; older Promptly code may ignore optional extensions. Keep both now preserves profiles as well as prompts. Limits remain 10 MB overall, 500 collection entries, 100 blocks, and 100,000 characters per text field, with 50 variables/profiles/versions and 30 tags. Browser quota may be lower.

The dependency-free suite now covers the new schemas, substitutions, template separation, policies, versions, results and profile snapshots in addition to persistence and recovery. The browser fixture also checks actual theme persistence, filters, field focus, direct editing, safe rendering, intentional unfinished export, snapshots, updates, restore Undo and live preview. Run the fixture manually as documented above. Optionally, with Node 20+ and Playwright available, run `node scripts/run-browser.cjs`; it starts/stops the test server, uses installed Chrome (or `CHROME_PATH`), and fails when any browser check fails. Set `NODE_PATH` if Playwright is supplied by a separate runtime. No runtime dependency was added to Promptly.

Physical touch keyboard and screen-reader verification remain manual. Undo is bounded/in-memory; backups provide durable recovery. No accounts, cloud sync, model integrations, automatic scoring or deployment were added.

## Motion and atmosphere

Entrance effects are progressive enhancement in `motion.js`: headings, panels, template cards, guided fields and saved prompts gently fade/slide as they enter the viewport, with a capped stagger. Preview text and completeness messages remain steady during typing. Focus cancels any entrance on its ancestors so keyboard interaction never waits for an animation. Content is visible even without Web Animations or IntersectionObserver.

The background uses existing green, lime, mint and slate tokens for slow gradient glows, thin orbit outlines, small geometric accents and the existing dot grid. These are decorative, hidden from assistive technology, and cannot intercept pointer input. The header’s star control pauses ambient motion and saves the preference in `promptly-motion`. Motion also pauses in hidden tabs. The OS reduced-motion preference disables entrances, ambient motion and hover movement; preference changes apply without reloading. No new images, dependencies or colors are required.

The headless browser runner additionally verifies real entrance keyframes, keyboard pause, pause persistence, reduced-motion behavior, steady typing previews, and layout bounds at 320, 390 and 1280 pixels. Optional screenshots are written to `SCREENSHOT_DIR`.

Homepage reveals include the header controls, individual hero copy/actions and illustration pieces, lower section surfaces and their content, and footer items. Observer batches are sorted by visual top/left position with a 55 ms stagger and 650 ms fade. Offscreen homepage items stay transparent until their own viewport entry; layout space is retained. Each item reveals once per page visit, with a fresh cascade when returning home. Keyboard focus immediately reveals its containing items, and reduced motion shows all pending content without animation. The browser runner checks cascade ordering and offscreen footer visibility before/after scrolling.

## Focused editing flow

The builder now keeps three steps visible as summaries: Make it yours, Shape the instructions, and Review & save. Opening a step minimizes its peers. Guided questions use the same stored variables and field IDs, but only one question expands into a larger text area; other questions show concise answer summaries. Previous/Next controls switch questions without requiring an answer, and the final Next opens the instruction editor. Instructions likewise expand one section at a time. Blank and legacy briefs without guided fields start with the instruction editor.

Templates, completeness messages and optional profile/variable/policy settings stay compact until opened. Check links expand the correct step and question before focusing the input. Adding/removing a block also opens its editor; Undo and saved-data behavior remain unchanged. Review & save contains the existing saving actions and a direct preview button. Live preview remains optional on wide screens. Focus state is presentation only and is not included in stored drafts or backups. Smooth transitions respect reduced motion.

Browser checks exercise Next/Previous, single expanded questions/steps, preserved values, completeness jumps, preview return, and a desktop page-height bound for the guided flow. Mobile and desktop screenshots were reviewed. The existing schema, migration, version, backup, conflict and storage-error tests are unchanged.

## Plain-language UI update

See `UX-IMPLEMENTATION.md` for the audit reported before builder edits and verification limits. The starter library now has 17 templates, including listing descriptions, buyer/seller inquiry replies and open-house follow-up emails. All existing hash routes remain, with new real-estate routes. UI-only field/section names and examples live in `presentation.js` so exported headings and serialized variables retain their contracts. The existing `core.js` and `persistence.js` are unchanged by this update. The fresh, empty builder opens the gallery; existing work keeps the focused editor. The new headless UX checks are in `tests/ux-browser.cjs` and are invoked by `scripts/run-browser.cjs`.
