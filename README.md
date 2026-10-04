# To-Do Manager

A small front-end to-do manager built with plain HTML, CSS, and JavaScript. It includes:

- a task name and priority for each item
- optional longer explanations
- optional deadlines
- task completion tracking
- inline editing for task details
- filtering by all, active, and completed items
- delete and clear-completed actions
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

## Notes

This project is intentionally lightweight and does not require a build step or external dependencies.