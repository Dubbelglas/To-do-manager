const STORAGE_KEY = 'todo-manager-v1';
const state = {
    tasks: loadTasks(),
    filter: 'all',
};

const form = document.querySelector('#todo-form');
const input = document.querySelector('#todo-input');
const dueDateInput = document.querySelector('#todo-date');
const priorityInput = document.querySelector('#todo-priority');
const list = document.querySelector('#todo-list');
const summary = document.querySelector('#task-summary');
const filterButtons = document.querySelectorAll('.filter-btn');
const clearCompletedButton = document.querySelector('#clear-completed');

function loadTasks() {
    try {
        const storedTasks = localStorage.getItem(STORAGE_KEY);
        return storedTasks ? JSON.parse(storedTasks) : [];
    } catch (error) {
        console.error('Unable to load tasks:', error);
        return [];
    }
}

function saveTasks() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.tasks));
}

function escapeHtml(value) {
    return value.replace(/[&<>"']/g, (char) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
    }[char]));
}

function createTask(text, dueDate, priority) {
    return {
        id: crypto.randomUUID ? crypto.randomUUID() : `task-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        text,
        dueDate,
        priority,
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
        .map(
            (task) => `
        <li class="todo-item ${task.completed ? 'is-done' : ''}">
          <label class="todo-main">
            <input type="checkbox" data-action="toggle" data-id="${task.id}" ${task.completed ? 'checked' : ''} />
            <span class="todo-text">${escapeHtml(task.text)}</span>
          </label>

          <div class="meta">
            ${task.dueDate ? `<span class="badge date">${formatDate(task.dueDate)}</span>` : ''}
            <span class="badge ${task.priority}">${task.priority}</span>
          </div>

          <button type="button" class="delete-btn" data-action="delete" data-id="${task.id}">Delete</button>
        </li>
      `,
        )
        .join('');
}

form.addEventListener('submit', (event) => {
    event.preventDefault();

    const text = input.value.trim();
    if (!text) {
        input.focus();
        return;
    }

    state.tasks.unshift(createTask(text, dueDateInput.value, priorityInput.value));
    form.reset();
    priorityInput.value = 'medium';
    input.focus();
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

    if (action === 'toggle') {
        state.tasks[taskIndex].completed = !state.tasks[taskIndex].completed;
    }

    if (action === 'delete') {
        state.tasks.splice(taskIndex, 1);
    }

    saveTasks();
    render();
});

filterButtons.forEach((button) => {
    button.addEventListener('click', () => {
        state.filter = button.dataset.filter;
        render();
    });
});

clearCompletedButton.addEventListener('click', () => {
    state.tasks = state.tasks.filter((task) => !task.completed);
    saveTasks();
    render();
});

render();
