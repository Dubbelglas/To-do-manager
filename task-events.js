(() => {
    const {
        state,
        normalizePriority,
        createTask,
        saveTasks,
        getCategories,
        getDisplayedTasks,
        render,
        showConfirmation,
        updateCategoryValidation,
        attemptCategoryValidation,
        refreshCategoryOptions,
        openTaskDialog,
        closeTaskDialog,
        openRenameCategoryDialog,
        closeRenameCategoryDialog,
        elements: {
            form,
            nameInput,
            categorySelect,
            newCategoryInput,
            priorityInput,
            descriptionInput,
            deadlineInput,
            periodicInput,
            list,
            periodicList,
            tasksPane,
            periodicPane,
            clearCompletedButton,
            deleteConfirmDialog,
            deleteConfirmMessage,
            cancelDeleteButton,
            confirmDeleteButton,
            completeVisibleButton,
            taskDialog,
            renameCategoryButton,
            renameCategoryForm,
            renameCategorySelect,
            renameCategoryName,
        },
    } = window.TodoApp;

form.addEventListener('submit', (event) => {
    event.preventDefault();

    const name = nameInput.value.trim();
    if (!name) {
        nameInput.classList.add('name-invalid');
        nameInput.focus();
        return;
    }

    let selectedCategory = categorySelect.value;
    if (selectedCategory === '__new__') {
        const newCategory = newCategoryInput.value.trim();
        if (!newCategory) {
            attemptCategoryValidation();
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

nameInput.addEventListener('invalid', () => {
    nameInput.classList.add('name-invalid');
});

nameInput.addEventListener('input', () => {
    if (nameInput.value.trim()) nameInput.classList.remove('name-invalid');
});

descriptionInput.addEventListener('keydown', (event) => {
    if (event.key === 'Backspace' && !event.shiftKey && !event.ctrlKey && !event.altKey && !event.metaKey
        && descriptionInput.selectionStart === descriptionInput.selectionEnd) {
        const value = descriptionInput.value;
        const caret = descriptionInput.selectionStart;
        const lineStart = value.lastIndexOf('\n', caret - 1) + 1;
        const leadingWhitespace = value.slice(lineStart, caret);
        if (/^[ \t]+$/.test(leadingWhitespace)) {
            event.preventDefault();
            const removeCount = leadingWhitespace.endsWith('\t')
                ? 1
                : Math.min(2, leadingWhitespace.match(/ *$/)[0].length);
            descriptionInput.value = `${value.slice(0, caret - removeCount)}${value.slice(caret)}`;
            descriptionInput.setSelectionRange(caret - removeCount, caret - removeCount);
            return;
        }
    }

    if (event.key === 'Tab' && !event.shiftKey && !event.ctrlKey && !event.altKey && !event.metaKey) {
        event.preventDefault();
        const value = descriptionInput.value;
        const selectionStart = descriptionInput.selectionStart;
        const selectionEnd = descriptionInput.selectionEnd;
        const indent = '  ';

        if (selectionStart === selectionEnd) {
            const lineStart = value.lastIndexOf('\n', selectionStart - 1) + 1;
            descriptionInput.value = `${value.slice(0, lineStart)}${indent}${value.slice(lineStart)}`;
            descriptionInput.setSelectionRange(selectionStart + indent.length, selectionEnd + indent.length);
            return;
        }

        const firstLineStart = value.lastIndexOf('\n', selectionStart - 1) + 1;
        let lastSelectedPosition = selectionEnd - 1;
        if (value[lastSelectedPosition] === '\n') lastSelectedPosition -= 1;
        const lastLineStart = value.lastIndexOf('\n', lastSelectedPosition) + 1;
        const lineStarts = [];
        for (let lineStart = firstLineStart; lineStart <= lastLineStart;) {
            lineStarts.push(lineStart);
            const nextLine = value.indexOf('\n', lineStart);
            if (nextLine === -1 || nextLine >= lastLineStart) break;
            lineStart = nextLine + 1;
        }

        let indentedValue = value;
        for (const lineStart of lineStarts.slice().reverse()) {
            indentedValue = `${indentedValue.slice(0, lineStart)}${indent}${indentedValue.slice(lineStart)}`;
        }
        const startShift = lineStarts.filter((lineStart) => lineStart <= selectionStart).length * indent.length;
        const endShift = lineStarts.filter((lineStart) => lineStart < selectionEnd).length * indent.length;
        descriptionInput.value = indentedValue;
        descriptionInput.setSelectionRange(selectionStart + startShift, selectionEnd + endShift);
        return;
    }

    if (event.key !== 'Enter' || event.shiftKey || event.ctrlKey || event.altKey || event.metaKey
        || descriptionInput.selectionStart !== descriptionInput.selectionEnd) return;

    const caret = descriptionInput.selectionStart;
    const before = descriptionInput.value.slice(0, caret);
    const lineStart = before.lastIndexOf('\n') + 1;
    const currentLine = before.slice(lineStart);
    const emptyMarker = currentLine.match(/^(\s*)([-*+]|\d+[.)])\s*$/);
    if (emptyMarker) {
        event.preventDefault();
        descriptionInput.setRangeText('\n', lineStart, caret, 'end');
        return;
    }

    const bullet = currentLine.match(/^(\s*)([-*+])\s+.+$/);
    const numbered = currentLine.match(/^(\s*)(\d+)[.)]\s+.+$/);
    if (bullet || numbered) {
        event.preventDefault();
        const prefix = bullet
            ? `\n${bullet[1]}${bullet[2]} `
            : `\n${numbered[1]}${Number(numbered[2]) + 1}. `;
        descriptionInput.setRangeText(prefix, caret, caret, 'end');
    }
});

document.querySelector('#add-task').addEventListener('click', () => openTaskDialog());
document.querySelector('#cancel-task').addEventListener('click', closeTaskDialog);
document.querySelector('#close-task-dialog').addEventListener('click', closeTaskDialog);
taskDialog.addEventListener('close', () => { state.editingId = null; });

renameCategoryButton.addEventListener('click', openRenameCategoryDialog);
document.querySelector('#close-rename-category').addEventListener('click', closeRenameCategoryDialog);
document.querySelector('#cancel-rename-category').addEventListener('click', closeRenameCategoryDialog);
renameCategoryName.addEventListener('input', () => {
    renameCategoryName.setCustomValidity('');
    renameCategoryName.classList.remove('category-invalid');
});
renameCategoryForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const oldCategory = renameCategorySelect.value;
    const newCategory = renameCategoryName.value.trim();
    if (!newCategory) {
        renameCategoryName.reportValidity();
        return;
    }

    const normalizedNewCategory = newCategory.toLocaleLowerCase();
    const duplicate = getCategories().some((category) => category !== oldCategory
        && category.toLocaleLowerCase() === normalizedNewCategory);
    if (duplicate) {
        renameCategoryName.setCustomValidity('A category with this name already exists.');
        renameCategoryName.classList.add('category-invalid');
        renameCategoryName.reportValidity();
        return;
    }
    if (newCategory === oldCategory) {
        closeRenameCategoryDialog();
        return;
    }

    state.tasks.forEach((task) => {
        if ((task.category || 'General').trim() === oldCategory) task.category = newCategory;
    });
    if (state.categoryFilter === oldCategory) state.categoryFilter = newCategory;
    if (categorySelect.value === oldCategory) refreshCategoryOptions(newCategory);
    const saved = saveTasks();
    closeRenameCategoryDialog();
    render();
    if (saved) showConfirmation(`Category renamed to ${newCategory}.`);
});

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

const supportsLongPress = window.matchMedia('(pointer: coarse)').matches;
let longPressTimer = null;
let longPressTriggered = false;
let longPressClickResetTimer = null;
let longPressStart = null;
const clearLongPress = () => {
    window.clearTimeout(longPressTimer);
    longPressTimer = null;
    longPressStart = null;
};

function toggleTaskDetails(item) {
    if (!item) return;
    const details = item.querySelector('.task-details');
    const nameToggle = item.querySelector('.task-name-toggle');
    const indicator = item.querySelector('.details-indicator');
    const isExpanded = state.expandedTaskIds.has(item.dataset.id);
    const nextExpanded = !isExpanded;
    for (const toggle of [nameToggle, indicator]) {
        toggle?.setAttribute('aria-expanded', String(nextExpanded));
    }
    if (details) details.hidden = !nextExpanded;
    if (indicator) indicator.hidden = nextExpanded;
    if (nextExpanded) state.expandedTaskIds.add(item.dataset.id);
    else state.expandedTaskIds.delete(item.dataset.id);
}

if (supportsLongPress) {
    for (const taskList of [list, periodicList]) {
        taskList.addEventListener('pointerdown', (event) => {
            if (event.pointerType !== 'touch' && event.pointerType !== 'pen') return;
            if (event.target.closest('.task-details')) return;
            const control = event.target.closest('input, button, select, textarea, a');
            if (control && !control.matches('.task-name-toggle')) return;
            if (!event.target.closest('.task-main-row')) return;
            const item = event.target.closest('.todo-item');
            if (!item) return;

            clearLongPress();
            longPressStart = { x: event.clientX, y: event.clientY, item };
            longPressTimer = window.setTimeout(() => {
                const task = state.tasks.find((entry) => entry.id === item.dataset.id);
                if (!task) return;
                longPressTriggered = true;
                window.clearTimeout(longPressClickResetTimer);
                longPressClickResetTimer = window.setTimeout(() => { longPressTriggered = false; }, 1200);
                openTaskDialog(task);
            }, 550);
        });
        taskList.addEventListener('pointermove', (event) => {
            if (!longPressStart) return;
            if (Math.hypot(event.clientX - longPressStart.x, event.clientY - longPressStart.y) > 12) {
                clearLongPress();
            }
        });
        for (const eventName of ['pointerup', 'pointercancel', 'pointerleave']) {
            taskList.addEventListener(eventName, clearLongPress);
        }
        taskList.addEventListener('contextmenu', (event) => {
            if (event.target.closest('.todo-item') && !event.target.closest('.task-details')) event.preventDefault();
        });
    }
}

for (const taskList of [list, periodicList]) taskList.addEventListener('click', (event) => {
    if (longPressTriggered) {
        longPressTriggered = false;
        window.clearTimeout(longPressClickResetTimer);
        event.preventDefault();
        event.stopPropagation();
        return;
    }
    const item = event.target.closest('.todo-item');
    const button = event.target.closest('[data-action]');
    if (button?.dataset.action === 'toggle-details') {
        toggleTaskDetails(item);
        return;
    }

    // Follow links in the Details field without letting the card's hide-on-click
    // behavior consume the same click.
    if (event.target.closest('.task-details a')) return;

    if (event.target.closest('.task-details')) {
        // Long pressing selects text on touch devices. The generated click must
        // not collapse the details while the user is selecting that text.
        if (window.getSelection()?.toString()) return;
        toggleTaskDetails(item);
        return;
    }

    if (!event.target.closest('.task-main-row')) return;
    if (button) {
        const { action, id } = button.dataset;
        if (action === 'edit') {
            const task = state.tasks.find((entry) => entry.id === id);
            if (task) openTaskDialog(task);
        }
        return;
    }

    if (event.target.closest('input, select, textarea, a')) return;
    toggleTaskDetails(item);
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
    const displayedTasks = getDisplayedTasks();
    if (!displayedTasks.length) {
        return;
    }

    const markDone = displayedTasks.some((task) => !task.completed);
    displayedTasks.forEach((task) => {
        task.completed = markDone;
    });
    saveTasks();
    render();
});

for (const pane of [tasksPane, periodicPane]) {
    pane.addEventListener('toggle', render);
}

})();

