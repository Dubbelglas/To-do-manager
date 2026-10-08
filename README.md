# To-Do Manager

A lightweight task manager built with HTML, CSS, and JavaScript. Tasks are stored in the browser with `localStorage`.

Features include task categories, priorities, details, deadlines, recurring tasks, completion tracking, sorting and filtering, task import/export in `.xlsx` format, and a shared pop-up form for adding and editing tasks.

## GitHub Pages

This is a static site with no build step. In the repository's **Settings → Pages**, select **Deploy from a branch**, then choose the branch containing this version and the repository root (`/`) as the folder. Once the deployment completes, visit:

<https://dubbelglas.github.io/To-do-manager/>

The app uses paths relative to its site directory, so the manifest, icons, and service worker work from a GitHub Pages project URL. The service worker caches the app shell for offline use and only removes caches belonging to this app.

To install on Android, open the published HTTPS site in Chrome, open the menu, and select **Install app** or **Add to Home screen**. Tasks are stored on that device and do not sync between devices. A previously installed version may need to be removed and installed again after the first PWA deployment.

## Run locally

From this folder, start a local server:

```bash
python -m http.server 8000
```

Then open <http://localhost:8000>. Browsers treat localhost as a secure context for service workers and PWA development.

## Project files

- `index.html` — app page and relative asset links
- `styles.css` — responsive layout and styling
- `app.js` — task behavior and local storage
- `manifest.webmanifest` — install name, display mode, start URL, and icons
- `service-worker.js` — offline app shell cache
- `icons/` — app icons
- `xlsx.full.min.js` — bundled spreadsheet support

Spreadsheet columns are category, priority (1 = low, 2 = medium, 3 = high, 4 = very high), task, details, deadline, and Periodic. Set Periodic to true, 1, yes, or y to place a task in the Periodiek pane. Imported rows with headers are supported; exported workbooks use the same column order.
