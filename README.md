# To-Do Manager

A small front-end to-do manager built with plain HTML, CSS, and JavaScript. It includes:

- a task and priority for each item
- optional details
- optional deadlines
- task completion tracking
- a separate pane for tasks marked Periodic
- double-click editing for task details
- filtering by category
- clear-completed action
- import and export in `.xlsx` format
- automatic browser persistence with localStorage whenever tasks are added or updated

## Run locally

Open `index.html` directly in a browser, or serve the folder with a simple local web server:

```bash
python -m http.server 8000
```

Then browse to http://localhost:8000.

## Files

- `index.html` — app structure
- `styles.css` — layout and styling
- `app.js` — task logic and persistence

## Install on Android

Publish this folder to a static host that serves it over HTTPS, then open the site in Chrome on Android. Use Chrome's menu and choose **Install app** or **Add to Home screen**. The app shell is cached for offline use after the first successful visit; tasks remain stored in that browser on that device.

Opening `index.html` as a local file does not enable installation or offline caching. Service workers require HTTPS (or localhost during development).

The Android install metadata is in `manifest.webmanifest`, the offline cache is managed by `service-worker.js`, and the app icon is `icons/app-icon.svg`.

## Notes

This project is intentionally lightweight and does not require a build step or external dependencies.

Spreadsheet columns are category, priority (1 = low, 2 = medium, 3 = high, 4 = very high), task, details, deadline, and Periodic. Set Periodic to true, 1, yes, or y to place a task in the Periodiek pane. Imported rows with headers are supported; exported workbooks use the same column order.
