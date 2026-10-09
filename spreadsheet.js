(() => {
    const { createTask, getPriorityNumber, normalizeDeadline, normalizePriority } = window.TodoData;
    const NO_VALID_ROWS = 'NO_VALID_ROWS';

    async function importTasks(file) {
        if (!window.XLSX) throw new Error('XLSX library unavailable');

        const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(firstSheet, { raw: true, defval: '', header: 1 });
        const tasks = rows.map((row) => {
            const values = Array.isArray(row) ? row : Object.values(row || {});
            if (!values.length) return null;

            const category = String(values[0] ?? '').trim();
            const priority = String(values[1] ?? '').trim();
            const name = String(values[2] ?? '').trim();
            const description = String(values[3] ?? '').trim();
            const deadline = normalizeDeadline(values[4]);
            const periodicValue = String(values[5] ?? '').trim().toLowerCase();

            if (category.toLowerCase() === 'category'
                && priority.toLowerCase() === 'priority'
                && ['name', 'task', 'task name'].includes(name.toLowerCase())) return null;
            if (!category || !name) return null;

            return createTask(name, normalizePriority(priority), description, deadline, category,
                ['true', '1', 'yes', 'y'].includes(periodicValue));
        }).filter(Boolean);

        if (!tasks.length) {
            const error = new Error('No valid task rows found.');
            error.code = NO_VALID_ROWS;
            throw error;
        }
        return tasks;
    }

    async function exportTasks(tasks) {
        const worksheet = XLSX.utils.aoa_to_sheet([
            ['Category', 'Priority', 'Task', 'Details', 'Deadline', 'Periodic'],
            ...tasks.map((task) => [
                task.category || 'General',
                getPriorityNumber(task.priority),
                task.name,
                task.description,
                task.deadline,
                task.periodic,
            ]),
        ]);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Tasks');
        const fileData = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        const file = new Blob([fileData], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });

        if (typeof window.showSaveFilePicker === 'function') {
            const fileHandle = await window.showSaveFilePicker({
                suggestedName: 'tasks.xlsx',
                types: [{
                    description: 'Excel spreadsheet',
                    accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] },
                }],
            });
            const writable = await fileHandle.createWritable();
            await writable.write(file);
            await writable.close();
            return 'saved';
        }

        const downloadUrl = URL.createObjectURL(file);
        const downloadLink = document.createElement('a');
        downloadLink.href = downloadUrl;
        downloadLink.download = 'tasks.xlsx';
        downloadLink.click();
        window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 60_000);
        return 'started';
    }

    window.TaskSpreadsheet = { importTasks, exportTasks, NO_VALID_ROWS };
})();

importButton.addEventListener('click', () => {
    importInput.click();
});

importInput.addEventListener('change', async (event) => {
    const [file] = event.target.files;
    if (!file) return;

    try {
        const importedTasks = await TaskSpreadsheet.importTasks(file);
        state.tasks = [...importedTasks, ...state.tasks];
        const saved = saveTasks();
        render();
        if (saved) showConfirmation('Spreadsheet imported successfully.');
    } catch (error) {
        if (error.code === TaskSpreadsheet.NO_VALID_ROWS) {
            alert('No valid rows were found in the selected file. Use columns: category, priority, task, details, deadline.');
        } else {
            console.error('Unable to import tasks:', error);
            alert('The file could not be read. Please make sure it is a valid .xlsx, .xls, or .csv spreadsheet.');
        }
    } finally {
        importInput.value = '';
    }
});

exportButton.addEventListener('click', async () => {
    try {
        const result = await TaskSpreadsheet.exportTasks(state.tasks);
        showConfirmation(result === 'saved'
            ? 'Spreadsheet exported successfully.'
            : 'Spreadsheet download started.');
    } catch (error) {
        if (error.name === 'AbortError') return;
        console.error('Unable to export tasks:', error);
        alert('The spreadsheet could not be exported.');
    }
});
