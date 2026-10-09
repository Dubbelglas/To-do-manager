(() => {
    const STORAGE_KEY = 'todo-manager-v1';
    const STORAGE_VERSION_KEY = 'todo-manager-schema-version';
    const CURRENT_STORAGE_VERSION = 2;
    const PRIORITY_LABELS = {
        low: 'Low',
        medium: 'Medium',
        high: 'High',
        'very-high': 'Very high',
    };
    const PRIORITY_ORDER = { low: 1, medium: 2, high: 3, 'very-high': 4 };

    function createId() {
        return crypto.randomUUID ? crypto.randomUUID() : `task-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    }

    function normalizePriority(value) {
        const normalized = String(value ?? '').trim().toLowerCase();
        if (['low', 'medium', 'high', 'very-high'].includes(normalized)) return normalized;
        return ({ 1: 'low', 2: 'medium', 3: 'high', 4: 'very-high' })[normalized] || 'medium';
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

    function discardStoredTasks() {
        try {
            localStorage.removeItem(STORAGE_KEY);
            localStorage.removeItem(STORAGE_VERSION_KEY);
        } catch (error) {
            console.error('Unable to remove incompatible task data:', error);
        }
    }

    function loadTasks() {
        let storedTasks;
        try {
            storedTasks = localStorage.getItem(STORAGE_KEY);
            if (!storedTasks) return [];

            const parsed = JSON.parse(storedTasks);
            const tasks = Array.isArray(parsed) ? parsed : parsed?.tasks;
            const dataVersion = Number(parsed?.version || localStorage.getItem(STORAGE_VERSION_KEY) || 1);

            // Read older arrays and task containers even when the current task list is empty.
            // Validate the whole collection before normalizing so malformed legacy records
            // cannot leave a partially migrated list behind.
            if (!Array.isArray(tasks) || !Number.isInteger(dataVersion) || dataVersion > CURRENT_STORAGE_VERSION
                || !tasks.every((task) => task && typeof task === 'object' && !Array.isArray(task)
                    && typeof (task.name ?? task.text) === 'string' && (task.name ?? task.text).trim())) {
                throw new Error('Stored tasks use an unsupported format.');
            }

            const normalizedTasks = tasks.map(normalizeTask);
            if (dataVersion < CURRENT_STORAGE_VERSION || !Array.isArray(parsed)) {
                localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: CURRENT_STORAGE_VERSION, tasks: normalizedTasks }));
                localStorage.setItem(STORAGE_VERSION_KEY, String(CURRENT_STORAGE_VERSION));
            }
            return normalizedTasks;
        } catch (error) {
            console.error('Unable to load tasks:', error);
            discardStoredTasks();
            return [];
        }
    }

    const state = {
        tasks: loadTasks(),
        editingId: null,
        expandedTaskIds: new Set(),
        sortMode: 'priority',
        categoryFilter: '',
    };

    function saveTasks() {
        try {
            const payload = { version: CURRENT_STORAGE_VERSION, tasks: state.tasks };
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
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
        }[char]));
    }

    function getCategories() {
        return [...new Set(state.tasks.map((task) => (task.category || 'General').trim()).filter(Boolean))]
            .sort((a, b) => a.localeCompare(b));
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
        return sortTasks(state.tasks.filter((task) => task.periodic
            && (!state.categoryFilter || (task.category || 'General').trim() === state.categoryFilter)));
    }

    function sortTasks(tasks) {
        return [...tasks].sort((a, b) => {
            const primaryKey = state.sortMode === 'deadline' ? 'deadline' : 'priority';
            const secondaryKey = primaryKey === 'priority' ? 'deadline' : 'priority';
            const primaryComparison = primaryKey === 'priority'
                ? PRIORITY_ORDER[b.priority] - PRIORITY_ORDER[a.priority]
                : compareDeadlineValues(a, b);
            if (primaryComparison !== 0) return primaryComparison;
            const secondaryComparison = secondaryKey === 'priority'
                ? PRIORITY_ORDER[b.priority] - PRIORITY_ORDER[a.priority]
                : compareDeadlineValues(a, b);
            if (secondaryComparison !== 0) return secondaryComparison;
            return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
        });
    }

    function compareDeadlineValues(taskA, taskB) {
        const hasDeadlineA = Boolean(taskA.deadline);
        const hasDeadlineB = Boolean(taskB.deadline);
        if (!hasDeadlineA && !hasDeadlineB) return 0;
        if (!hasDeadlineA) return 1;
        if (!hasDeadlineB) return -1;
        return new Date(`${taskA.deadline}T00:00:00`) - new Date(`${taskB.deadline}T00:00:00`);
    }

    function normalizeDeadline(value) {
        if (!value) return '';
        if (value instanceof Date && !Number.isNaN(value.getTime())) {
            return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
        }
        if (typeof value === 'number') {
            const parsed = XLSX.SSF.parse_date_code(value);
            if (parsed) return `${parsed.y}-${String(parsed.m).padStart(2, '0')}-${String(parsed.d).padStart(2, '0')}`;
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
        if (Number.isNaN(parsedDate.getTime())) return '';
        return `${parsedDate.getFullYear()}-${String(parsedDate.getMonth() + 1).padStart(2, '0')}-${String(parsedDate.getDate()).padStart(2, '0')}`;
    }

    function getPriorityNumber(priority) {
        return PRIORITY_ORDER[normalizePriority(priority)];
    }

    function formatDate(dateValue) {
        if (!dateValue) return '';
        const date = new Date(`${dateValue}T00:00:00`);
        return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date);
    }

    window.TodoData = {
        state,
        normalizePriority,
        getPriorityDisplayName,
        saveTasks,
        escapeHtml,
        getCategories,
        createTask,
        getVisibleTasks,
        getVisiblePeriodicTasks,
        normalizeDeadline,
        getPriorityNumber,
        formatDate,
    };
})();
