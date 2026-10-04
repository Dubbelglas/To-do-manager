# To-Do Manager

A small front-end to-do manager built with plain HTML, CSS, and JavaScript. It includes:

- a task and priority for each item
- optional details
- optional deadlines
- task completion tracking
- double-click editing for task details
<<<<<<< HEAD
- filtering by all, active, and completed items
=======
>>>>>>> 722d308 (Zichtbaar per categorie; labels opschonen)
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

## Notes

This project is intentionally lightweight and does not require a build step or external dependencies.

<<<<<<< HEAD
Spreadsheet columns are category, priority (1 = low, 2 = medium, 3 = high, 4 = very high), task name, explanation, and deadline. Imported rows with headers are supported; exported workbooks use the same column order.
=======
Spreadsheet columns are category, priority (1 = low, 2 = medium, 3 = high, 4 = very high), task, details, and deadline. Imported rows with headers are supported; exported workbooks use the same column order.
>>>>>>> 722d308 (Zichtbaar per categorie; labels opschonen)
