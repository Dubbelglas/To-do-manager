const STORAGE_KEY = 'todo-manager-v1';
const STORAGE_VERSION_KEY = 'todo-manager-schema-version';
const CURRENT_STORAGE_VERSION = 2;
const PRIORITY_LABELS = {
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    'very-high': 'Very high',
};

const state = {
    tasks: loadTasks(),
    editingId: null,
    sortMode: 'priority',
    categoryFilter: '',
};

const form = document.querySelector('#todo-form');
const nameInput = document.querySelector('#todo-name');
const categorySelect = document.querySelector('#todo-category');
const newCategoryWrap = document.querySelector('#todo-new-category-wrap');
const newCategoryInput = document.querySelector('#todo-new-category');
const priorityInput = document.querySelector('#todo-priority');
const descriptionInput = document.querySelector('#todo-description');
const deadlineInput = document.querySelector('#todo-deadline');
const periodicInput = document.querySelector('#todo-periodic');
const list = document.querySelector('#todo-list');
const periodicList = document.querySelector('#periodic-todo-list');
const taskCount = document.querySelector('#task-count');
const periodicTaskCount = document.querySelector('#periodic-task-count');
const clearCompletedButton = document.querySelector('#clear-completed');
const completeVisibleButton = document.querySelector('#complete-visible');
const importButton = document.querySelector('#import-tasks');
const importInput = document.querySelector('#import-file');
const exportButton = document.querySelector('#export-tasks');
const sortSelect = document.querySelector('#sort-tasks');
const categoryFilterSelect = document.querySelector('#category-filter');
const taskDialog = document.querySelector('#task-dialog');
const dialogTitle = document.querySelector('#task-dialog-title');
const submitTaskButton = document.querySelector('#submit-task');
const confirmationBanner = document.querySelector('#confirmation-banner');
let categoryValidationAttempted = false;
let confirmationTimer = null;

function showConfirmation(message) {
    confirmationBanner.textContent = message;
    confirmationBanner.hidden = false;
    window.clearTimeout(confirmationTimer);
    confirmationTimer = window.setTimeout(() => {
        confirmationBanner.hidden = true;
    }, 3000);
}

function updateCategoryValidation() {
    const categoryNeedsName = categorySelect.value === '__new__';
    const categoryIsMissing = !categorySelect.value;
    const newCategoryIsMissing = categoryNeedsName && !newCategoryInput.value.trim();
    const invalid = categoryValidationAttempted && (categoryIsMissing || newCategoryIsMissing);

    categorySelect.classList.toggle('category-invalid', invalid);
    newCategoryInput.classList.toggle('category-invalid', invalid);
    if (!categoryIsMissing && !newCategoryIsMissing) {
        categoryValidationAttempted = false;
    }
}

function openTaskDialog(task = null) {
    state.editingId = task?.id || null;
    categoryValidationAttempted = false;
    dialogTitle.textContent = task ? 'Edit task' : 'Add task';
    submitTaskButton.textContent = task ? 'Save changes' : 'Add task';
    form.reset();
    priorityInput.value = task?.priority || 'medium';
    nameInput.value = task?.name || '';
    descriptionInput.value = task?.description || '';
    deadlineInput.value = task?.deadline || '';
    periodicInput.checked = task?.periodic || false;
    refreshCategoryOptions(task?.category || '');
    if (task && !getCategories().includes(task.category)) {
        categorySelect.value = '__new__';
        newCategoryInput.value = task.category;
    }
    updateNewCategoryVisibility();
    if (typeof taskDialog.showModal === 'function') {
        taskDialog.showModal();
    } else {
        taskDialog.setAttribute('open', '');
    }
    nameInput.focus();
}

function closeTaskDialog() {
    if (typeof taskDialog.close === 'function') {
        taskDialog.close();
    } else {
        taskDialog.removeAttribute('open');
    }
    state.editingId = null;
    categoryValidationAttempted = false;
    form.reset();
    priorityInput.value = 'medium';
    refreshCategoryOptions();
}

const PRIORITY_ORDER = {
    low: 1,
    medium: 2,
    high: 3,
    'very-high': 4,
};

function createId() {
    return crypto.randomUUID ? crypto.randomUUID() : `task-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizePriority(value) {
    const normalized = String(value ?? '').trim().toLowerCase();
    if (['low', 'medium', 'high', 'very-high'].includes(normalized)) {
        return normalized;
    }

    switch (normalized) {
        case '1':
            return 'low';
        case '2':
            return 'medium';
        case '3':
            return 'high';
        case '4':
            return 'very-high';
        default:
            return 'medium';
    }
}

function getPriorityDisplayName(value) {
    return PRIORITY_LABELS[normalizePriority(value)] || 'Medium';
}

function normalizeTask(task) {
    const legacyPeriodicCategory = String(task.category || '').trim().toLocaleLowerCase() === 'periodiek';
    return {
        id: task.id || createId(),
        name: task.name || task.text || '',
        category: legacyPeriodicCategory ? 'General' : (task.category || 'General'),
        periodic: Boolean(task.periodic) || legacyPeriodicCategory,
        priority: normalizePriority(task.priority),
        description: task.description || '',
        deadline: task.deadline || task.dueDate || '',
        completed: Boolean(task.completed),
    };
}

function loadTasks() {
    try {
        const storedTasks = localStorage.getItem(STORAGE_KEY);
        if (!storedTasks) {
            return [];
        }

        const parsed = JSON.parse(storedTasks);

        if (Array.isArray(parsed)) {
            return parsed.map(normalizeTask);
        }

        if (parsed && typeof parsed === 'object' && Array.isArray(parsed.tasks)) {
            return parsed.tasks.map(normalizeTask);
        }

        return [];
    } catch (error) {
        console.error('Unable to load tasks:', error);
        return [];
    }
}

function saveTasks() {
    try {
        const payload = {
            version: CURRENT_STORAGE_VERSION,
            tasks: state.tasks,
        };

        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
        localStorage.setItem(STORAGE_VERSION_KEY, String(CURRENT_STORAGE_VERSION));
        return true;
    } catch (error) {
        console.error('Unable to save tasks:', error);
        alert('Tasks changed in this session but could not be saved in this browser.');
        return false;
    }
}

function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
    }[char]));
}

function getCategories() {
    return [...new Set(state.tasks.map((task) => (task.category || 'General').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function refreshCategoryOptions(selectedValue = '') {
    const categories = getCategories();
    const selected = categories.includes(selectedValue) ? selectedValue : '';

    categorySelect.innerHTML = [
        ...categories.map((category) => `<option value="${escapeHtml(category)}" ${category === selected ? 'selected' : ''}>${escapeHtml(category)}</option>`),
        '<option value="__new__">Add new category...</option>',
    ].join('');

    if (selected) {
        categorySelect.value = selected;
    } else if (categories.length) {
        categorySelect.value = categories[0];
    } else {
        categorySelect.value = '__new__';
    }

    updateNewCategoryVisibility();
}

function refreshCategoryFilterOptions() {
    const categories = getCategories();
    if (!categories.includes(state.categoryFilter)) {
        state.categoryFilter = '';
    }

    categoryFilterSelect.innerHTML = [
        '<option value="">--All--</option>',
        ...categories.map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`),
    ].join('');
    categoryFilterSelect.value = state.categoryFilter;
}

function updateNewCategoryVisibility() {
    const showNewCategory = categorySelect.value === '__new__';
    newCategoryWrap.classList.toggle('hidden', !showNewCategory);
    newCategoryInput.required = showNewCategory;
}

function createTask(name, priority, description, deadline, category = 'General', periodic = false) {
    return {
        id: createId(),
        name,
        category: category || 'General',
        periodic,
        priority: normalizePriority(priority),
        description,
        deadline,
        completed: false,
    };
}

function getVisibleTasks() {
    const tasks = state.categoryFilter
        ? state.tasks.filter((task) => (task.category || 'General').trim() === state.categoryFilter)
        : state.tasks;

    return sortTasks(tasks.filter((task) => !task.periodic));
}

function getVisiblePeriodicTasks() {
    return sortTasks(state.tasks.filter((task) => task.periodic && (!state.categoryFilter || (task.category || 'General').trim() === state.categoryFilter)));
}

function sortTasks(tasks) {
    return [...tasks].sort((a, b) => {
        const primaryKey = state.sortMode === 'deadline' ? 'deadline' : 'priority';
        const secondaryKey = primaryKey === 'priority' ? 'deadline' : 'priority';

        const primaryComparison = primaryKey === 'priority'
            ? PRIORITY_ORDER[b.priority] - PRIORITY_ORDER[a.priority]
            : compareDeadlineValues(a, b);

        if (primaryComparison !== 0) {
            return primaryComparison;
        }

        if (secondaryKey === 'priority') {
            return PRIORITY_ORDER[b.priority] - PRIORITY_ORDER[a.priority];
        }

        return compareDeadlineValues(a, b);
    });
}

function compareDeadlineValues(taskA, taskB) {
    const hasDeadlineA = Boolean(taskA.deadline);
    const hasDeadlineB = Boolean(taskB.deadline);

    if (!hasDeadlineA && !hasDeadlineB) {
        return 0;
    }

    if (!hasDeadlineA) {
        return 1;
    }

    if (!hasDeadlineB) {
        return -1;
    }

    return new Date(`${taskA.deadline}T00:00:00`) - new Date(`${taskB.deadline}T00:00:00`);
}

function normalizeDeadline(value) {
    if (!value) {
        return '';
    }

    if (value instanceof Date && !Number.isNaN(value.getTime())) {
        return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
    }

    if (typeof value === 'number') {
        const parsed = XLSX.SSF.parse_date_code(value);
        if (parsed) {
            return `${parsed.y}-${String(parsed.m).padStart(2, '0')}-${String(parsed.d).padStart(2, '0')}`;
        }
    }

    const stringValue = String(value).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(stringValue)) {
        const [year, month, day] = stringValue.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
            ? stringValue
            : '';
    }

    const parsedDate = new Date(stringValue);
    if (Number.isNaN(parsedDate.getTime())) {
        return '';
    }

    return `${parsedDate.getFullYear()}-${String(parsedDate.getMonth() + 1).padStart(2, '0')}-${String(parsedDate.getDate()).padStart(2, '0')}`;
}

function getPriorityNumber(priority) {
    return PRIORITY_ORDER[normalizePriority(priority)];
}

function formatDate(dateValue) {
    if (!dateValue) {
        return '';
    }

    const date = new Date(`${dateValue}T00:00:00`);
    return new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: 'numeric',
    }).format(date);
}

function getCategorySelectMarkup(taskId, selectedValue) {
    const categories = getCategories();
    const options = categories.map((category) => `
        <option value="${escapeHtml(category)}" ${category === selectedValue ? 'selected' : ''}>${escapeHtml(category)}</option>
    `).join('');

    return `
        <select data-id="${taskId}" data-field="category" class="task-category-select">
            ${options}
            <option value="__new__" ${selectedValue === '__new__' ? 'selected' : ''}>Add new category...</option>
        </select>
    `;
}

function renderTaskView(task) {
    return `
        <div class="task-card">
            <div class="task-main-row">
                <label class="todo-main">
                    <input type="checkbox" data-action="toggle" data-id="${task.id}" ${task.completed ? 'checked' : ''} />
                    <span class="todo-text">${escapeHtml(task.name)}</span>
                </label>

                <div class="meta">
                    <span class="badge category">${escapeHtml(task.category || 'General')}</span>
                    ${task.deadline ? `<span class="badge date">Due ${formatDate(task.deadline)}</span>` : ''}
                    <span class="badge ${task.priority}">${getPriorityDisplayName(task.priority)}</span>
                    <button type="button" class="secondary-btn icon-btn task-edit-btn" data-action="edit" data-id="${task.id}" aria-label="Edit ${escapeHtml(task.name)}" title="Edit task">
                        <svg class="icon-svg" viewBox="0 0 24 24" aria-hidden="true">
                            <path d="m15 5 4 4M4 20l4-.8L19.2 8a2.1 2.1 0 0 0-3-3L5 16.2 4 20Z" />
                        </svg>
                    </button>
                </div>
            </div>

            ${task.description ? `<p class="task-description">${escapeHtml(task.description)}</p>` : ''}

        </div>
    `;
}

function render() {
    refreshCategoryOptions(categorySelect?.value || '');
    refreshCategoryFilterOptions();
    const visibleTasks = getVisibleTasks();
    const periodicTasks = getVisiblePeriodicTasks();
    const toggleTasks = [...visibleTasks, ...periodicTasks];
    const completedVisibleCount = toggleTasks.filter((task) => task.completed).length;
    const toggleState = toggleTasks.length === 0 || completedVisibleCount === 0
        ? 'unchecked'
        : completedVisibleCount === toggleTasks.length ? 'checked' : 'mixed';
    if (sortSelect) {
        sortSelect.value = state.sortMode === 'deadline' ? '1' : '0';
        sortSelect.setAttribute('aria-valuetext', state.sortMode === 'deadline' ? 'Deadline' : 'Priority');
        sortSelect.closest('.sort-slider-control').dataset.mode = state.sortMode;
        document.querySelectorAll('.sort-slider-option').forEach((option) => {
            option.setAttribute('aria-pressed', String(option.dataset.sortValue === sortSelect.value));
        });
    }

    taskCount.textContent = String(visibleTasks.length);
    taskCount.setAttribute('aria-label', `${visibleTasks.length} task${visibleTasks.length === 1 ? '' : 's'}`);
    periodicTaskCount.textContent = String(periodicTasks.length);
    periodicTaskCount.setAttribute('aria-label', `${periodicTasks.length} periodic task${periodicTasks.length === 1 ? '' : 's'}`);
    completeVisibleButton.dataset.state = toggleState;
    completeVisibleButton.setAttribute('aria-pressed', toggleState === 'mixed' ? 'mixed' : String(toggleState === 'checked'));
    completeVisibleButton.setAttribute('aria-label', toggleState === 'checked'
        ? 'Mark visible tasks incomplete'
        : 'Mark visible tasks complete');
    completeVisibleButton.title = completeVisibleButton.getAttribute('aria-label');

    const renderTasks = (tasks, emptyMessage) => tasks.length
        ? tasks.map((task) => `
            <li class="todo-item ${task.completed ? 'is-done' : ''}" data-id="${task.id}">
                ${renderTaskView(task)}
            </li>
        `)
            .join('')
        : `<li class="empty-state">${emptyMessage}</li>`;

    list.innerHTML = renderTasks(visibleTasks, 'No tasks in this view yet.');
    periodicList.innerHTML = renderTasks(periodicTasks, 'No Periodic tasks yet.');
}

form.addEventListener('submit', (event) => {
    event.preventDefault();

    const name = nameInput.value.trim();
    if (!name) {
        nameInput.focus();
        return;
    }

    let selectedCategory = categorySelect.value;
    if (selectedCategory === '__new__') {
        const newCategory = newCategoryInput.value.trim();
        if (!newCategory) {
            categoryValidationAttempted = true;
            updateCategoryValidation();
            newCategoryInput.focus();
            return;
        }
        selectedCategory = newCategory;
    }

    const addingTask = !state.editingId;
    if (state.editingId) {
        const task = state.tasks.find((item) => item.id === state.editingId);
        if (task) {
            task.name = name;
            task.category = selectedCategory;
            task.priority = normalizePriority(priorityInput.value);
            task.description = descriptionInput.value.trim();
            task.deadline = deadlineInput.value;
            task.periodic = periodicInput.checked;
        }
    } else {
        state.tasks.unshift(createTask(name, priorityInput.value, descriptionInput.value.trim(), deadlineInput.value, selectedCategory, periodicInput.checked));
    }
    const saved = saveTasks();
    closeTaskDialog();
    render();
    if (addingTask && saved) showConfirmation('Task added successfully.');
});

document.querySelector('#add-task').addEventListener('click', () => openTaskDialog());
document.querySelector('#cancel-task').addEventListener('click', closeTaskDialog);
document.querySelector('#close-task-dialog').addEventListener('click', closeTaskDialog);
taskDialog.addEventListener('close', () => { state.editingId = null; });

for (const taskList of [list, periodicList]) taskList.addEventListener('change', (event) => {
    const checkbox = event.target.closest('input[type="checkbox"][data-action="toggle"]');
    if (!checkbox) {
        return;
    }

    const task = state.tasks.find((item) => item.id === checkbox.dataset.id);
    if (!task) {
        return;
    }

    task.completed = checkbox.checked;
    saveTasks();
    render();
});

for (const taskList of [list, periodicList]) taskList.addEventListener('dblclick', (event) => {
    if (event.target.closest('input, button, select, textarea')) {
        return;
    }

    const item = event.target.closest('.todo-item');
    if (!item) {
        return;
    }
    openTaskDialog(state.tasks.find((task) => task.id === item.dataset.id));
});

for (const taskList of [list, periodicList]) taskList.addEventListener('click', (event) => {
    const button = event.target.closest('[data-action]');
    if (!button) {
        return;
    }

    const { action, id } = button.dataset;
    if (action === 'edit') {
        const task = state.tasks.find((item) => item.id === id);
        if (task) openTaskDialog(task);
    }
});

clearCompletedButton.addEventListener('click', () => {
    const removedCount = state.tasks.filter((task) => task.completed).length;
    state.tasks = state.tasks.filter((task) => !task.completed);
    state.editingId = null;
    const saved = saveTasks();
    render();
    if (removedCount > 0 && saved) {
        showConfirmation(`${removedCount} completed task${removedCount === 1 ? '' : 's'} deleted.`);
    }
});

completeVisibleButton.addEventListener('click', () => {
    const visibleTasks = [...getVisibleTasks(), ...getVisiblePeriodicTasks()];
    if (!visibleTasks.length) {
        return;
    }

    const markDone = visibleTasks.some((task) => !task.completed);
    visibleTasks.forEach((task) => {
        task.completed = markDone;
    });
    saveTasks();
    render();
});

sortSelect?.addEventListener('input', () => {
    state.sortMode = sortSelect.value === '1' ? 'deadline' : 'priority';
    render();
});

document.querySelectorAll('.sort-slider-option').forEach((option) => {
    option.addEventListener('click', () => {
        sortSelect.value = option.dataset.sortValue;
        sortSelect.dispatchEvent(new Event('input', { bubbles: true }));
    });
});

categoryFilterSelect.addEventListener('change', () => {
    state.categoryFilter = categoryFilterSelect.value;
    render();
});

categorySelect.addEventListener('change', () => {
    updateNewCategoryVisibility();
    updateCategoryValidation();
});
newCategoryInput.addEventListener('input', updateCategoryValidation);
form.addEventListener('invalid', (event) => {
    if (event.target === categorySelect || event.target === newCategoryInput) {
        categoryValidationAttempted = true;
        updateCategoryValidation();
    }
}, true);

importButton.addEventListener('click', () => {
    importInput.click();
});

importInput.addEventListener('change', async (event) => {
    const [file] = event.target.files;
    if (!file) {
        return;
    }

    if (!window.XLSX) {
        alert('The spreadsheet importer requires a browser connection to the XLSX library.');
        return;
    }

    try {
        const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(firstSheet, { raw: true, defval: '', header: 1 });

        const importedTasks = rows
            .map((row) => {
                const values = Array.isArray(row) ? row : Object.values(row || {});
                if (!values.length) {
                    return null;
                }

                const category = String(values[0] ?? '').trim();
                const priority = String(values[1] ?? '').trim();
                const name = String(values[2] ?? '').trim();
                const description = String(values[3] ?? '').trim();
                const deadline = normalizeDeadline(values[4]);
                const periodicValue = String(values[5] ?? '').trim().toLowerCase();

                if (category.toLowerCase() === 'category'
                    && priority.toLowerCase() === 'priority'
                    && ['name', 'task', 'task name'].includes(name.toLowerCase())) {
                    return null;
                }

                if (!category || !name) {
                    return null;
                }

                return createTask(name, normalizePriority(priority), description, deadline, category, ['true', '1', 'yes', 'y'].includes(periodicValue));
            })
            .filter(Boolean);

        if (!importedTasks.length) {
            alert('No valid rows were found in the selected file. Use columns: category, priority, task, details, deadline.');
            return;
        }

        state.tasks = [...importedTasks, ...state.tasks];
        const saved = saveTasks();
        render();
        if (saved) showConfirmation('Spreadsheet imported successfully.');
        importInput.value = '';
    } catch (error) {
        console.error('Unable to import tasks:', error);
        alert('The file could not be read. Please make sure it is a valid .xlsx, .xls, or .csv spreadsheet.');
    } finally {
        importInput.value = '';
    }
});
exportButton.addEventListener('click', () => {
    try {
        const worksheet = XLSX.utils.aoa_to_sheet([
            ['Category', 'Priority', 'Task', 'Details', 'Deadline', 'Periodic'],
            ...state.tasks.map((task) => [
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
        XLSX.writeFile(workbook, 'tasks.xlsx');
        showConfirmation('Spreadsheet exported successfully.');
    } catch (error) {
        console.error('Unable to export tasks:', error);
        alert('The spreadsheet could not be exported.');
    }
});

refreshCategoryOptions();
render();

