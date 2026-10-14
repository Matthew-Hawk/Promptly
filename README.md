<div align="center">

# ▦ promptly.

### Better prompts. Clearer requests. Your words.

Start with a template. Make it fit your task.<br>
A browser-local prompt builder for school, everyday discoveries, creative ideas, work, and code.

[![Try the builder](https://img.shields.io/badge/TRY_THE_BUILDER_%E2%86%97-157F1F?style=for-the-badge)](https://promptly.thehawk6353.workers.dev/#builder)

**Start with the [live builder ↗](https://promptly.thehawk6353.workers.dev/#builder).**<br>
No account. No API key. Your work stays on your device.

![Promptly homepage in its midnight palette](ReadME_Assets/home.png)

</div>

## 🧩 Build a prompt. Keep the useful parts.

1. **Pick a task.** Choose shopping, learning, writing, planning, places, or ideas to start its instructions, browse all 27 templates, or write your own task.
2. **Follow the questions.** Click through a few choices for your goal, preferences, and style. Select multiple priorities when helpful, and type only the details you need. Watch your request take shape as you go.
3. **Review and export.** Read your prompt in the same panel, then copy or download Markdown for your preferred AI.
4. **Save it for next time.** Save a completed prompt or reusable template. Update prompts with version history, or save as new.

![The prompt editor with a homepage template, guided fields, and save-to-collection controls](ReadME_Assets/editor.png)

## ✦ Less starting over. More building on what works.

- **Task-first templates** with guided questions, consistent variables and actionable completeness checks.
- **Editable sections** with collapse, navigation and optional live preview on wide screens.
- **Saved prompts:** search, tags, favorites, preview, rename, duplicate, archive, saved versions and restore.
- **My details (local facts and tone)** with editable snapshots and explicit refresh.
- **Reference material**, missing-information policies and optional manual results attached to versions.
- **Undo** for block removal, clearing, and prompt replacement.
- **JSON backup and import** to preserve editable prompts and saved versions.
- **Midnight by default**, persisted theme preferences, responsive controls, and reduced-motion support.

<details>
<summary><strong>🌙 See the prompt preview in midnight</strong></summary>

![The updated prompt preview in midnight, with copy and export controls](ReadME_Assets/preview.png)

</details>

### 💾 Keep a copy of your work

Working drafts autosave locally. Save as new creates a completed prompt; Update adds a version. Reusable templates create separate working copies with empty guided values. Profile edits never silently alter included snapshots. Browser storage doesn't sync between devices and can be cleared—download JSON backups regularly. Markdown exports preserve prompt text; JSON backups preserve editable blocks and saved entries.

Promptly doesn't call an AI model or generate responses. It helps you organize the instructions you take to one.

## ⚙️ Under the hood

**HTML, CSS, and vanilla JavaScript.** No build step or runtime dependencies. `library.js` defines task templates, roles and questions; `core.js` handles validation, variables, profiles, versions, collections, Undo, backups, and Markdown; `persistence.js` handles browser storage and conflicting edits across tabs; `app.js` connects the interface. The deployable files live in `dist/`.

Local saving needs browser storage and Web Locks over HTTPS or localhost. If storage is unavailable, you can still edit in memory and export your work. Recovery and development details: **[DEVELOPMENT.md](DEVELOPMENT.md)**. The UI/UX audit and remaining manual checks are in **[UX-IMPLEMENTATION.md](UX-IMPLEMENTATION.md)**.

## 💻 Run locally

With Git and **Node.js 18+** installed:

```sh
git clone https://github.com/Matthew-Hawk/Promptly.git
cd Promptly
npm start
```

Open **[http://127.0.0.1:5173/#builder](http://127.0.0.1:5173/#builder)**. No dependency installation needed; press **Ctrl+C** to stop. Use the local server rather than opening the HTML directly—the app uses JavaScript modules.

---

<div align="center">

**A little clarity changes everything. ✦**

[Build your brief ↗](https://promptly.thehawk6353.workers.dev/#builder) · [Matthew Hawkins](https://github.com/Matthew-Hawk)

</div>
