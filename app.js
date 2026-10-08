const {
    state,
    normalizePriority,
    getPriorityDisplayName,
    saveTasks,
    escapeHtml,
    getCategories,
    createTask,
    getVisibleTasks,
    getVisiblePeriodicTasks,
    formatDate,
} = window.TodoData;

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
const deleteConfirmDialog = document.querySelector('#delete-confirm-dialog');
const deleteConfirmMessage = document.querySelector('#delete-confirm-message');
const cancelDeleteButton = document.querySelector('#cancel-delete');
const confirmDeleteButton = document.querySelector('#confirm-delete');
const completeVisibleButton = document.querySelector('#complete-visible');
const importButton = document.querySelector('#import-tasks');
const importInput = document.querySelector('#import-file');
const exportButton = document.querySelector('#export-tasks');
const sortSelect = document.querySelector('#sort-tasks');
const openCategoryFilterButton = document.querySelector('#open-category-filter');
const categoryFilterControl = document.querySelector('.category-filter-control');
const categoryFilterMenu = document.querySelector('#category-filter-menu');
const toolbar = document.querySelector('.toolbar');
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

function getDeadlineColorClass(deadline) {
    const [year, month, day] = deadline.split('-').map(Number);
    const dueDate = Date.UTC(year, month - 1, day);
    const now = new Date();
    const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    const daysUntil = Math.round((dueDate - today) / 86400000);

    if (daysUntil < 0) return 'date-overdue';
    if (daysUntil === 1) return 'date-tomorrow';
    if (daysUntil <= 7) return 'date-soon';
    return '';
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

    const options = [['', 'All categories'], ...categories.map((category) => [category, category])];
    categoryFilterMenu.innerHTML = options.map(([value, label]) => `
        <button type="button" class="category-filter-option" role="option" data-category="${escapeHtml(value)}"
            aria-selected="${state.categoryFilter === value}">${escapeHtml(label)}</button>
    `).join('');
    openCategoryFilterButton.classList.toggle('has-category-filter', Boolean(state.categoryFilter));
    openCategoryFilterButton.setAttribute('aria-label', state.categoryFilter
        ? `Category filter: ${state.categoryFilter}`
        : 'Choose task category');
    openCategoryFilterButton.title = openCategoryFilterButton.getAttribute('aria-label');
}

function updateNewCategoryVisibility() {
    const showNewCategory = categorySelect.value === '__new__';
    newCategoryWrap.classList.toggle('hidden', !showNewCategory);
    newCategoryInput.required = showNewCategory;
}

function renderTaskView(task) {
    return `
        <div class="task-card">
            <div class="task-main-row">
                <div class="todo-main">
                    <input type="checkbox" data-action="toggle" data-id="${task.id}" aria-label="Mark ${escapeHtml(task.name)} complete" ${task.completed ? 'checked' : ''} />
                    ${task.description
            ? `<button type="button" class="todo-text task-name-toggle" data-action="toggle-details" aria-controls="task-details-${escapeHtml(task.id)}" aria-expanded="${state.expandedTaskIds.has(task.id)}">${escapeHtml(task.name)}</button>`
            : `<span class="todo-text">${escapeHtml(task.name)}</span>`}
                </div>

                <button type="button" class="secondary-btn icon-btn task-edit-btn" data-action="edit" data-id="${task.id}" aria-label="Edit ${escapeHtml(task.name)}" title="Edit task">
                    <svg class="icon-svg" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="m15 5 4 4M4 20l4-.8L19.2 8a2.1 2.1 0 0 0-3-3L5 16.2 4 20Z" />
                    </svg>
                </button>
            </div>

            <div class="meta">
                ${task.description ? `<button type="button" class="details-indicator" data-action="toggle-details" aria-controls="task-details-${escapeHtml(task.id)}" aria-expanded="${state.expandedTaskIds.has(task.id)}" aria-label="Show details for ${escapeHtml(task.name)}" ${state.expandedTaskIds.has(task.id) ? 'hidden' : ''}>•••</button>` : ''}
                <span class="badge category">${escapeHtml(task.category || 'General')}</span>
                ${task.deadline ? `<span class="badge date ${getDeadlineColorClass(task.deadline)}">Due ${formatDate(task.deadline)}</span>` : ''}
                <span class="badge ${task.priority}">${getPriorityDisplayName(task.priority)}</span>
            </div>

            ${task.description ? `
                <div id="task-details-${escapeHtml(task.id)}" class="task-details" ${state.expandedTaskIds.has(task.id) ? '' : 'hidden'}>
                    <p class="task-description">${escapeHtml(task.description)}</p>
                </div>
            ` : ''}

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
        const sortValue = state.sortMode === 'deadline' ? '1' : '0';
        sortSelect.setAttribute('aria-valuenow', sortValue);
        sortSelect.setAttribute('aria-valuetext', state.sortMode === 'deadline' ? 'Deadline' : 'Priority');
        sortSelect.closest('.sort-slider-control').dataset.mode = state.sortMode;
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
    if (action === 'toggle-details') {
        const expanded = button.getAttribute('aria-expanded') === 'true';
        const item = button.closest('.todo-item');
        const details = item?.querySelector('.task-details');
        const nameToggle = item?.querySelector('.task-name-toggle');
        const indicator = item?.querySelector('.details-indicator');
        const nextExpanded = !expanded;
        for (const toggle of [nameToggle, indicator]) {
            toggle?.setAttribute('aria-expanded', String(nextExpanded));
        }
        if (details) details.hidden = expanded;
        if (indicator) indicator.hidden = !expanded;
        if (expanded) state.expandedTaskIds.delete(item.dataset.id);
        else state.expandedTaskIds.add(item.dataset.id);
        return;
    }

    if (action === 'edit') {
        const task = state.tasks.find((item) => item.id === id);
        if (task) openTaskDialog(task);
    }
});

function closeDeleteConfirmDialog() {
    if (typeof deleteConfirmDialog.close === 'function') {
        deleteConfirmDialog.close();
    } else {
        deleteConfirmDialog.removeAttribute('open');
    }
}

clearCompletedButton.addEventListener('click', () => {
    const completedCount = state.tasks.filter((task) => task.completed).length;
    if (!completedCount) return;

    deleteConfirmMessage.textContent = `Delete ${completedCount} completed task${completedCount === 1 ? '' : 's'}? This action cannot be undone.`;
    if (typeof deleteConfirmDialog.showModal === 'function') {
        deleteConfirmDialog.showModal();
    } else {
        deleteConfirmDialog.setAttribute('open', '');
    }
});

cancelDeleteButton.addEventListener('click', closeDeleteConfirmDialog);

confirmDeleteButton.addEventListener('click', () => {
    const removedCount = state.tasks.filter((task) => task.completed).length;
    if (!removedCount) {
        closeDeleteConfirmDialog();
        return;
    }

    for (const task of state.tasks) {
        if (task.completed) state.expandedTaskIds.delete(task.id);
    }
    state.tasks = state.tasks.filter((task) => !task.completed);
    state.editingId = null;
    const saved = saveTasks();
    closeDeleteConfirmDialog();
    render();
    if (saved) showConfirmation(`${removedCount} completed task${removedCount === 1 ? '' : 's'} deleted.`);
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

let sortPointerStart = null;
sortSelect?.addEventListener('pointerdown', (event) => {
    sortPointerStart = { x: event.clientX, y: event.clientY, pointerId: event.pointerId };
    sortSelect.setPointerCapture(event.pointerId);
});

sortSelect?.addEventListener('pointerup', (event) => {
    if (!sortPointerStart || sortPointerStart.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - sortPointerStart.x;
    const deltaY = event.clientY - sortPointerStart.y;
    sortPointerStart = null;
    if (Math.abs(deltaX) > 12 && Math.abs(deltaX) > Math.abs(deltaY)) {
        state.sortMode = deltaX > 0 ? 'deadline' : 'priority';
    } else if (Math.max(Math.abs(deltaX), Math.abs(deltaY)) > 12) {
        return;
    } else {
        state.sortMode = state.sortMode === 'priority' ? 'deadline' : 'priority';
    }
    render();
});

sortSelect?.addEventListener('pointercancel', () => { sortPointerStart = null; });
sortSelect?.addEventListener('keydown', (event) => {
    if (['ArrowRight', 'ArrowDown', 'End'].includes(event.key)) {
        state.sortMode = 'deadline';
    } else if (['ArrowLeft', 'ArrowUp', 'Home'].includes(event.key)) {
        state.sortMode = 'priority';
    } else if (event.key === 'Enter' || event.key === ' ') {
        state.sortMode = state.sortMode === 'priority' ? 'deadline' : 'priority';
    } else {
        return;
    }
    event.preventDefault();
    render();
});

function setCategoryFilterOpen(isOpen) {
    categoryFilterControl.classList.toggle('is-open', isOpen);
    toolbar.classList.toggle('category-filter-open', isOpen);
    openCategoryFilterButton.setAttribute('aria-expanded', String(isOpen));
}

categoryFilterMenu.addEventListener('click', (event) => {
    const option = event.target.closest('[data-category]');
    if (!option) return;

    state.categoryFilter = option.dataset.category;
    setCategoryFilterOpen(false);
    render();
});

categoryFilterMenu.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    setCategoryFilterOpen(false);
    openCategoryFilterButton.focus();
});

openCategoryFilterButton.addEventListener('click', () => {
    setCategoryFilterOpen(!categoryFilterControl.classList.contains('is-open'));
});

document.addEventListener('click', (event) => {
    if (categoryFilterControl.contains(event.target)) return;
    setCategoryFilterOpen(false);
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
refreshCategoryOptions();
render();

