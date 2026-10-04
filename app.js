const STORAGE_KEY = 'todo-manager-v1';
const PRIORITY_LABELS = {
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    'very-high': 'Very high',
};

const state = {
    tasks: loadTasks(),
    filter: 'all',
    editingId: null,
    sortMode: 'priority',
};

const form = document.querySelector('#todo-form');
const nameInput = document.querySelector('#todo-name');
const categorySelect = document.querySelector('#todo-category');
const newCategoryWrap = document.querySelector('#todo-new-category-wrap');
const newCategoryInput = document.querySelector('#todo-new-category');
const priorityInput = document.querySelector('#todo-priority');
const descriptionInput = document.querySelector('#todo-description');
const deadlineInput = document.querySelector('#todo-deadline');
const list = document.querySelector('#todo-list');
const summary = document.querySelector('#task-summary');
const filterButtons = document.querySelectorAll('.filter-btn');
const clearCompletedButton = document.querySelector('#clear-completed');
const importButton = document.querySelector('#import-tasks');
const importInput = document.querySelector('#import-file');
const sortSelect = document.querySelector('#sort-tasks');
const sortButton = document.querySelector('#apply-sort');

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
    return {
        id: task.id || createId(),
        name: task.name || task.text || '',
        category: task.category || 'General',
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

        return JSON.parse(storedTasks).map(normalizeTask);
    } catch (error) {
        console.error('Unable to load tasks:', error);
        return [];
    }
}

function saveTasks() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.tasks));
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

function updateNewCategoryVisibility() {
    const showNewCategory = categorySelect.value === '__new__';
    newCategoryWrap.classList.toggle('hidden', !showNewCategory);
    newCategoryInput.required = showNewCategory;
}

function getImportCellValue(row, candidateKeys, fallbackIndex) {
    const keys = candidateKeys.map((key) => String(key).toLowerCase());
    const match = Object.keys(row).find((key) => keys.includes(String(key).toLowerCase()));

    if (match) {
        return row[match];
    }

    return row[fallbackIndex] ?? '';
}

function createTask(name, priority, description, deadline, category = 'General') {
    return {
        id: createId(),
        name,
        category: category || 'General',
        priority: normalizePriority(priority),
        description,
        deadline,
        completed: false,
    };
}

function getVisibleTasks() {
    const visibleTasks = [];

    switch (state.filter) {
        case 'active':
            visibleTasks.push(...state.tasks.filter((task) => !task.completed));
            break;
        case 'completed':
            visibleTasks.push(...state.tasks.filter((task) => task.completed));
            break;
        default:
            visibleTasks.push(...state.tasks);
            break;
    }

    return [...visibleTasks].sort((a, b) => {
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

function renderTaskEditor(task) {
    const selectedCategory = task.category || 'General';
    return `
        <div class="task-editor">
            <div class="editor-grid">
                <label class="field field-wide">
                    <span>Name</span>
                    <input type="text" data-id="${task.id}" data-field="name" value="${escapeHtml(task.name)}" required />
                </label>

                <label class="field">
                    <span>Category</span>
                    ${getCategorySelectMarkup(task.id, selectedCategory)}
                </label>

                <label class="field">
                    <span>Priority</span>
                    <select data-id="${task.id}" data-field="priority">
                        <option value="low" ${task.priority === 'low' ? 'selected' : ''}>Low</option>
                        <option value="medium" ${task.priority === 'medium' ? 'selected' : ''}>Medium</option>
                        <option value="high" ${task.priority === 'high' ? 'selected' : ''}>High</option>
                        <option value="very-high" ${task.priority === 'very-high' ? 'selected' : ''}>Very high</option>
                    </select>
                </label>

                <label class="field">
                    <span>Deadline</span>
                    <input type="date" data-id="${task.id}" data-field="deadline" value="${task.deadline || ''}" />
                </label>

                <label class="field field-full">
                    <span>Explanation</span>
                    <textarea rows="3" data-id="${task.id}" data-field="description">${escapeHtml(task.description)}</textarea>
                </label>
            </div>

            <div class="task-actions">
                <button type="button" class="primary-btn small" data-action="save-edit" data-id="${task.id}">Save</button>
                <button type="button" class="secondary-btn small" data-action="cancel-edit" data-id="${task.id}">Cancel</button>
            </div>
        </div>
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
                </div>
            </div>

            ${task.description ? `<p class="task-description">${escapeHtml(task.description)}</p>` : ''}

            <div class="task-actions">
                <button type="button" class="action-btn edit-btn" data-action="edit" data-id="${task.id}">Edit</button>
                <button type="button" class="delete-btn" data-action="delete" data-id="${task.id}">Delete</button>
            </div>
        </div>
    `;
}

function render() {
    const visibleTasks = getVisibleTasks();
    const remaining = state.tasks.filter((task) => !task.completed).length;

    if (sortSelect) {
        sortSelect.value = state.sortMode;
    }

    summary.textContent = `${remaining} task${remaining === 1 ? '' : 's'} left`;

    filterButtons.forEach((button) => {
        const active = button.dataset.filter === state.filter;
        button.classList.toggle('is-active', active);
    });

    refreshCategoryOptions(categorySelect?.value || '');

    if (!visibleTasks.length) {
        list.innerHTML = '<li class="empty-state">No tasks in this view yet.</li>';
        return;
    }

    list.innerHTML = visibleTasks
        .map((task) => `
            <li class="todo-item ${task.completed ? 'is-done' : ''}">
                ${state.editingId === task.id ? renderTaskEditor(task) : renderTaskView(task)}
            </li>
        `)
        .join('');
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
            newCategoryInput.focus();
            return;
        }
        selectedCategory = newCategory;
    }

    state.tasks.unshift(createTask(name, priorityInput.value, descriptionInput.value.trim(), deadlineInput.value, selectedCategory));
    form.reset();
    priorityInput.value = 'medium';
    refreshCategoryOptions();
    nameInput.focus();
    saveTasks();
    render();
});

list.addEventListener('change', (event) => {
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

list.addEventListener('click', (event) => {
    const button = event.target.closest('[data-action]');
    if (!button) {
        return;
    }

    const { action, id } = button.dataset;
    const taskIndex = state.tasks.findIndex((task) => task.id === id);
    if (taskIndex === -1) {
        return;
    }

    if (action === 'delete') {
        state.tasks.splice(taskIndex, 1);
        if (state.editingId === id) {
            state.editingId = null;
        }
        saveTasks();
        render();
        return;
    }

    if (action === 'edit') {
        state.editingId = id;
        render();
        return;
    }

    if (action === 'cancel-edit') {
        state.editingId = null;
        render();
        return;
    }

    if (action === 'save-edit') {
        const task = state.tasks[taskIndex];
        const nameField = list.querySelector(`[data-id="${id}"][data-field="name"]`);
        const categoryField = list.querySelector(`[data-id="${id}"][data-field="category"]`);
        const priorityField = list.querySelector(`[data-id="${id}"][data-field="priority"]`);
        const descriptionField = list.querySelector(`[data-id="${id}"][data-field="description"]`);
        const deadlineField = list.querySelector(`[data-id="${id}"][data-field="deadline"]`);
        const updatedName = nameField ? nameField.value.trim() : task.name;

        if (!updatedName) {
            if (nameField) {
                nameField.focus();
            }
            return;
        }

        task.name = updatedName;
        task.category = categoryField && categoryField.value !== '__new__' ? categoryField.value.trim() : task.category;
        task.priority = normalizePriority(priorityField?.value || task.priority);
        task.description = descriptionField ? descriptionField.value.trim() : task.description;
        task.deadline = deadlineField ? deadlineField.value : task.deadline;

        state.editingId = null;
        saveTasks();
        render();
    }
});

list.addEventListener('input', (event) => {
    const field = event.target.closest('[data-field]');
    if (!field) {
        return;
    }

    const task = state.tasks.find((item) => item.id === field.dataset.id);
    if (!task) {
        return;
    }

    task[field.dataset.field] = field.value;
    saveTasks();
});

filterButtons.forEach((button) => {
    button.addEventListener('click', () => {
        state.filter = button.dataset.filter;
        render();
    });
});

clearCompletedButton.addEventListener('click', () => {
    state.tasks = state.tasks.filter((task) => !task.completed);
    state.editingId = null;
    saveTasks();
    render();
});

sortButton?.addEventListener('click', () => {
    state.sortMode = sortSelect?.value || state.sortMode;
    render();
});

sortSelect?.addEventListener('change', () => {
    state.sortMode = sortSelect.value;
    render();
});

categorySelect.addEventListener('change', updateNewCategoryVisibility);

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
        const rows = XLSX.utils.sheet_to_json(firstSheet, { raw: false, defval: '', header: 1 });

        const importedTasks = rows
            .map((row) => {
                const values = Array.isArray(row) ? row : Object.values(row || {});
                if (!values.length) {
                    return null;
                }

                const category = String(values[0] ?? '').trim();
                const priority = String(values[1] ?? '').trim();
                const name = String(values[2] ?? '').trim();

                if (['category', 'priority', 'name'].includes(category.toLowerCase()) && ['category', 'priority', 'name'].includes(priority.toLowerCase())) {
                    return null;
                }

                if (!category || !name) {
                    return null;
                }

                return createTask(name, normalizePriority(priority), '', '', category);
            })
            .filter(Boolean);

        if (!importedTasks.length) {
            alert('No valid rows were found in the selected file. Use columns: category, priority, name.');
            return;
        }

        state.tasks = [...importedTasks, ...state.tasks];
        saveTasks();
        render();
        importInput.value = '';
    } catch (error) {
        console.error('Unable to import tasks:', error);
        alert('The file could not be read. Please make sure it is a valid .xlsx, .xls, or .csv spreadsheet.');
    }
});

refreshCategoryOptions();
render();

