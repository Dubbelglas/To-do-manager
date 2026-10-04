const STORAGE_KEY = 'todo-manager-v1';
const state = {
    tasks: loadTasks(),
    filter: 'all',
    editingId: null,
};

const form = document.querySelector('#todo-form');
const nameInput = document.querySelector('#todo-name');
const priorityInput = document.querySelector('#todo-priority');
const descriptionInput = document.querySelector('#todo-description');
const deadlineInput = document.querySelector('#todo-deadline');
const list = document.querySelector('#todo-list');
const summary = document.querySelector('#task-summary');
const filterButtons = document.querySelectorAll('.filter-btn');
const clearCompletedButton = document.querySelector('#clear-completed');

function createId() {
    return crypto.randomUUID ? crypto.randomUUID() : `task-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeTask(task) {
    return {
        id: task.id || createId(),
        name: task.name || task.text || '',
        priority: ['low', 'medium', 'high'].includes(task.priority) ? task.priority : 'medium',
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

function createTask(name, priority, description, deadline) {
    return {
        id: createId(),
        name,
        priority,
        description,
        deadline,
        completed: false,
    };
}

function getVisibleTasks() {
    switch (state.filter) {
        case 'active':
            return state.tasks.filter((task) => !task.completed);
        case 'completed':
            return state.tasks.filter((task) => task.completed);
        default:
            return state.tasks;
    }
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

function renderTaskEditor(task) {
    return `
        <div class="task-editor">
            <div class="editor-grid">
                <label class="field field-wide">
                    <span>Name</span>
                    <input type="text" data-id="${task.id}" data-field="name" value="${escapeHtml(task.name)}" required />
                </label>

                <label class="field">
                    <span>Priority</span>
                    <select data-id="${task.id}" data-field="priority">
                        <option value="low" ${task.priority === 'low' ? 'selected' : ''}>Low</option>
                        <option value="medium" ${task.priority === 'medium' ? 'selected' : ''}>Medium</option>
                        <option value="high" ${task.priority === 'high' ? 'selected' : ''}>High</option>
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
                    ${task.deadline ? `<span class="badge date">Due ${formatDate(task.deadline)}</span>` : ''}
                    <span class="badge ${task.priority}">${task.priority}</span>
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

    summary.textContent = `${remaining} task${remaining === 1 ? '' : 's'} left`;

    filterButtons.forEach((button) => {
        const active = button.dataset.filter === state.filter;
        button.classList.toggle('is-active', active);
    });

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

    state.tasks.unshift(createTask(name, priorityInput.value, descriptionInput.value.trim(), deadlineInput.value));
    form.reset();
    priorityInput.value = 'medium';
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
        const updatedName = nameField ? nameField.value.trim() : task.name;

        if (!updatedName) {
            if (nameField) {
                nameField.focus();
            }
            return;
        }

        task.name = updatedName;
        task.priority = list.querySelector(`[data-id="${id}"][data-field="priority"]`)?.value || task.priority;
        task.description = list.querySelector(`[data-id="${id}"][data-field="description"]`)?.value.trim() || '';
        task.deadline = list.querySelector(`[data-id="${id}"][data-field="deadline"]`)?.value || '';

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

render();
