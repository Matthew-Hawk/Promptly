# Promptly

A responsive, browser-local prompt workshop built with HTML, CSS, and JavaScript. No AI API key or build step required.

Run `node serve.cjs` and open http://127.0.0.1:5173.

The home, explanation, and builder views use hash navigation. Add, reorder, and remove prompt blocks; fill their fields to generate Markdown; copy or export a `.md` file. Drafts and the daylight/midnight palette preference persist in localStorage for this browser. Reduced-motion preferences disable ambient animations. No prompts are sent to a model.

The deployable files are in `dist/`. The app uses Google Fonts with local sans-serif fallbacks. Browser-local storage is device-specific; Markdown exports provide a portable copy.
