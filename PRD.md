# Product Requirements Document

## Document status

Working draft based on the current implementation. This document describes what the product does today and leaves future product decisions open for further development.

## Product summary

To-Do Manager is a lightweight, browser-based task manager for creating, organizing, prioritizing, and tracking tasks. It runs as a static web app, stores task data in the current browser, supports offline use through a service worker, and can be installed as a progressive web app (PWA).

## Current product experience

The main screen contains a toolbar and two task panes: **Tasks** and **Periodic**. Users can add or edit a task in a shared dialog, filter by category, switch the sort mode, mark tasks complete, import or export a spreadsheet, and delete completed tasks. A welcome notice explains local data storage and includes a random fact and dad joke.

The interface is responsive and supports desktop and mobile use. Task details can be expanded from the task name or its details indicator. URLs and supported bare domains in details are clickable. On touch devices, users can long-press to select details text.

## Product goals reflected in the implementation

- Make it quick to capture tasks and the information needed to act on them.
- Help users distinguish urgent or important tasks using deadlines and priorities.
- Keep recurring or periodic tasks visible in a separate list.
- Let users organize and focus their task list with categories, sorting, and filtering.
- Keep the app usable offline and provide spreadsheet import/export for portability and backup.

These goals are inferred from the current feature set and should be confirmed or revised as the product direction develops.

## Users and use cases

The implementation does not define specific user personas. Its current features support people who want to:

- Capture and update personal tasks in a simple list.
- Group tasks into named categories.
- Track deadlines, priorities, completion, and recurring status.
- Use the list on a phone or desktop, including when offline.
- Back up, move, or bulk-load tasks using a spreadsheet.

## Functional requirements

### Task management

- Users can create tasks with a required name (maximum 160 characters), category, priority, details (maximum 500 characters), optional deadline, and periodic status.
- Users can edit an existing task using the same form.
- Users can cancel or close the task dialog without saving the form.
- Users can mark an individual task complete or incomplete.
- Users can toggle completion for the currently displayed tasks.
- Users can delete all completed tasks after confirming the action.
- The app shows task counts for the Tasks and Periodic panes.
- Task details can be expanded or collapsed. Tapping plain details text collapses the details; clicking a link follows it without collapsing. On touch devices, selecting text by long-press must not collapse details.

### Categories

- Tasks belong to a category; tasks without a category default to **General**.
- Users can create a category while adding or editing a task by choosing **Add new category...** and entering a name.
- Users can rename an existing category. Renaming updates tasks in that category and the active category filter.
- The Rename button is disabled when **Add new category...** is selected or when there are no categories.
- Users can filter both task panes to a selected category, or show all categories.

### Priority, deadlines, and ordering

- Priority values are Low, Medium, High, and Very high. New tasks default to Medium.
- Deadlines are optional calendar dates. Tasks with deadlines appear before tasks without deadlines when sorting by deadline.
- Users can switch between deadline and priority sorting. The other sort mode is used as a tie-breaker, followed by task name.
- The selected sort mode is saved in browser storage. Deadline sorting is the default when no preference has been saved.
- Deadline badges visually distinguish overdue, due tomorrow, and soon dates.

### Periodic tasks

- A task can be marked Periodic and will appear in the Periodic pane instead of the Tasks pane.
- Category filters and sort order apply to periodic tasks as well.

### Spreadsheet import and export

- Users can import `.xlsx`, `.xls`, and `.csv` files. Valid imported tasks are added to the current task list.
- The first worksheet is read. Supported columns, in order, are Category, Priority, Task, Details, Deadline, and Periodic. Header rows are supported.
- Imported priorities accept the four priority names or numeric values 1–4. Periodic values `true`, `1`, `yes`, or `y` are treated as true.
- Rows without a category or task name are skipped. Invalid or unreadable files produce an error message.
- Export produces an `.xlsx` workbook with the same six columns. Priority is exported as 1–4.
- Where the browser supports a file save picker, the user can choose where to save the workbook; otherwise, a download starts.
- Successful import and export actions show a confirmation.

### Persistence, offline use, and installation

- Tasks are stored in browser `localStorage` on the current device and browser. They do not sync between devices.
- Sort preference is stored separately in browser `localStorage`.
- The app migrates supported older task data formats and normalizes older priority and deadline fields.
- The service worker caches the app shell to support offline use and checks for updates.
- The site can be installed as a PWA on supported browsers.
- Clearing browser site data can delete locally stored tasks. The UI and README recommend exporting a backup.

### Interface behavior

- The layout adapts to mobile and desktop screen sizes.
- Confirmation messages appear above open dialogs and dismiss automatically.
- A subtle star field and occasional shooting star decorate the black page background. The shooting star is disabled when reduced motion is enabled.
- The app uses semantic form controls, dialog elements, and accessible labels/status text for key actions and task counts.

## Data model

Each task currently contains:

| Field | Description |
| --- | --- |
| `id` | Unique task identifier |
| `name` | Required task name |
| `category` | Category name; defaults to General |
| `periodic` | Whether the task belongs in the Periodic pane |
| `priority` | `low`, `medium`, `high`, or `very-high` |
| `description` | Optional details text |
| `deadline` | Optional date in `YYYY-MM-DD` form |
| `completed` | Completion state |

## Non-functional requirements and constraints

- The app is a static HTML, CSS, and JavaScript site with no build step or server-side task database.
- Task storage is local to the browser and can be lost if site data is cleared. Backup depends on spreadsheet export.
- Offline availability depends on service worker support and prior caching of the app shell.
- Spreadsheet support uses the bundled SheetJS library.
- External links recognized in task details open in a new tab with `noopener noreferrer`.
- The app should remain usable with reduced-motion preferences enabled.

## Current limitations and decisions to revisit

- There is no account, cloud sync, or multi-device synchronization.
- There is no dedicated recurring schedule (such as daily or weekly); Periodic is a separate task flag/list.
- Import adds tasks and does not currently reconcile duplicates or replace the existing list.
- The app has no stated retention policy, automated cloud backup, or undo history.
- Product direction, target audience, and success measures have not yet been specified.

## Open questions for future development

- Who is the primary user, and what is the main setting in which they use the app?
- Should Periodic mean recurring tasks, and if so, what schedule and completion behavior are expected?
- Is cross-device sync desirable, or should local-only storage remain a product principle?
- Should imports offer preview, duplicate detection, and replace/merge choices?
- Which accessibility, browser, and offline support levels should be guaranteed?
- What outcomes or metrics will indicate that the product is useful?
