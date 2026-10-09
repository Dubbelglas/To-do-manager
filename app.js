(() => {
    const {
        state,
        normalizePriority,
        getPriorityDisplayName,
        saveTasks,
        saveSortMode,
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
    const tasksPane = document.querySelector('.tasks-pane');
    const periodicPane = document.querySelector('.periodic-pane');
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
    const renameCategoryButton = document.querySelector('#rename-category');
    const renameCategoryDialog = document.querySelector('#rename-category-dialog');
    const renameCategoryForm = document.querySelector('#rename-category-form');
    const renameCategorySelect = document.querySelector('#rename-category-select');
    const renameCategoryName = document.querySelector('#rename-category-name');
    const dialogTitle = document.querySelector('#task-dialog-title');
    const submitTaskButton = document.querySelector('#submit-task');
    const confirmationBanner = document.querySelector('#confirmation-banner');
    let categoryValidationAttempted = false;
    let confirmationTimer = null;
    let taskDialogHistoryToken = null;

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
        if (daysUntil < 1) return 'date-tomorrow';
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
            taskDialogHistoryToken = `task-dialog-${Date.now()}-${Math.random()}`;
            window.history.pushState({ ...window.history.state, taskDialogToken: taskDialogHistoryToken }, '');
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

    taskDialog.addEventListener('close', () => {
        if (taskDialogHistoryToken && window.history.state?.taskDialogToken === taskDialogHistoryToken) {
            window.history.back();
        }
        taskDialogHistoryToken = null;
    });

    window.addEventListener('popstate', () => {
        if (taskDialog.open) closeTaskDialog();
    });

    function refreshCategoryOptions(selectedValue = '') {
        const categories = getCategories();
        renameCategoryButton.disabled = categories.length === 0;
        const selected = categories.includes(selectedValue) ? selectedValue : '';

        categorySelect.innerHTML = [
            '<option value="__new__">Add new category...</option>',
            ...categories.map((category) => `<option value="${escapeHtml(category)}" ${category === selected ? 'selected' : ''}>${escapeHtml(category)}</option>`),
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

    function openRenameCategoryDialog() {
        const categories = getCategories();
        if (!categories.length) return;

        renameCategorySelect.innerHTML = categories.map((category) =>
            `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`).join('');
        const selectedCategory = categorySelect.value !== '__new__' ? categorySelect.value : state.categoryFilter;
        renameCategorySelect.value = categories.includes(selectedCategory) ? selectedCategory : categories[0];
        renameCategoryName.value = '';
        renameCategoryName.setCustomValidity('');
        renameCategoryName.classList.remove('category-invalid');
        if (typeof renameCategoryDialog.showModal === 'function') {
            renameCategoryDialog.showModal();
        } else {
            renameCategoryDialog.setAttribute('open', '');
        }
        renameCategoryName.focus();
    }

    function closeRenameCategoryDialog() {
        if (typeof renameCategoryDialog.close === 'function') {
            renameCategoryDialog.close();
        } else {
            renameCategoryDialog.removeAttribute('open');
        }
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

    function renderDescription(description) {
        const lines = String(description).replace(/\r\n?/g, '\n').split('\n');
        const blocks = [];
        const getListItem = (line) => {
            const match = line.match(/^(\s*)([-*+]|\d+[.)])\s+(.+)$/);
            if (!match) return null;
            return {
                indent: match[1].replace(/\t/g, '    ').length,
                type: /^\d/.test(match[2]) ? 'ol' : 'ul',
                text: match[3],
            };
        };

        const renderList = (start, indent, type) => {
            const items = [];
            let index = start;
            while (index < lines.length) {
                const item = getListItem(lines[index]);
                if (!item || item.indent < indent) break;
                if (item.indent > indent) {
                    if (items.length) {
                        const nested = renderList(index, item.indent, item.type);
                        items[items.length - 1] += nested.html;
                        index = nested.nextIndex;
                        continue;
                    }
                    break;
                }
                if (item.type !== type) break;

                index += 1;
                let nestedHtml = '';
                while (index < lines.length) {
                    const nestedItem = getListItem(lines[index]);
                    if (!nestedItem || nestedItem.indent <= indent) break;
                    const nested = renderList(index, nestedItem.indent, nestedItem.type);
                    nestedHtml += nested.html;
                    index = nested.nextIndex;
                }
                items.push(`<li>${escapeHtml(item.text)}${nestedHtml}</li>`);
            }
            return { html: `<${type}>${items.join('')}</${type}>`, nextIndex: index };
        };

        let index = 0;
        while (index < lines.length) {
            if (!lines[index].trim()) {
                index += 1;
                continue;
            }

            const item = getListItem(lines[index]);
            if (item) {
                const rendered = renderList(index, item.indent, item.type);
                blocks.push(rendered.html);
                index = rendered.nextIndex;
                continue;
            }

            const paragraph = [];
            while (index < lines.length && lines[index].trim() && !getListItem(lines[index])) {
                paragraph.push(lines[index]);
                index += 1;
            }
            blocks.push(`<p>${paragraph.map(escapeHtml).join('<br>')}</p>`);
        }
        return blocks.join('');
    }

    function updateNewCategoryVisibility() {
        const showNewCategory = categorySelect.value === '__new__';
        newCategoryWrap.classList.toggle('hidden', !showNewCategory);
        newCategoryInput.required = showNewCategory;
    }

    function getDisplayedTasks() {
        return [
            ...(tasksPane.open ? getVisibleTasks() : []),
            ...(periodicPane.open ? getVisiblePeriodicTasks() : []),
        ];
    }

    function renderTaskView(task) {
        return `
        <div class="task-card">
            <div class="task-main-row">
                <div class="todo-main">
                    <input type="checkbox" data-action="toggle" data-id="${task.id}" aria-label="Mark ${escapeHtml(task.name)} complete" ${task.completed ? 'checked' : ''} />
                    ${task.description
            ? `<button type="button" class="todo-text task-name-text task-name-toggle" data-action="toggle-details" aria-controls="task-details-${escapeHtml(task.id)}" aria-expanded="${state.expandedTaskIds.has(task.id)}">${escapeHtml(task.name)}</button>`
            : `<span class="todo-text task-name-text">${escapeHtml(task.name)}</span>`}
                    ${task.description ? `<button type="button" class="details-indicator" data-action="toggle-details" aria-controls="task-details-${escapeHtml(task.id)}" aria-expanded="${state.expandedTaskIds.has(task.id)}" aria-label="Show details for ${escapeHtml(task.name)}" ${state.expandedTaskIds.has(task.id) ? 'hidden' : ''}>&hellip;</button>` : ''}
                </div>

                <!-- Badge: deadline -->
                <div class="meta">
                    <span class="badge category">${escapeHtml(task.category || 'General')}</span>
                    <span class="badge ${task.priority}">${({ low: 'Low', medium: 'Med', high: 'Hi', 'very-high': 'vHi' })[task.priority]}</span>
                    ${task.deadline ? `<span class="badge date ${getDeadlineColorClass(task.deadline)}">${formatDate(task.deadline)}</span>` : ''}
                </div>

                <button type="button" class="secondary-btn icon-btn task-edit-btn" data-action="edit" data-id="${task.id}" aria-label="Edit ${escapeHtml(task.name)}" title="Edit task">
                    <svg class="icon-svg" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="m15 5 4 4M4 20l4-.8L19.2 8a2.1 2.1 0 0 0-3-3L5 16.2 4 20Z" />
                    </svg>
                </button>
            </div>

            ${task.description ? `
                <div id="task-details-${escapeHtml(task.id)}" class="task-details" ${state.expandedTaskIds.has(task.id) ? '' : 'hidden'}>
                    <div class="task-description">${renderDescription(task.description)}</div>
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
        const toggleTasks = getDisplayedTasks();
        const completedVisibleCount = toggleTasks.filter((task) => task.completed).length;
        const toggleState = toggleTasks.length === 0 || completedVisibleCount === 0
            ? 'unchecked'
            : completedVisibleCount === toggleTasks.length ? 'checked' : 'mixed';
        if (sortSelect) {
            saveSortMode(state.sortMode);
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

        const hasRegularTasks = state.tasks.some((task) => !task.periodic);
        const hasPeriodicTasks = state.tasks.some((task) => task.periodic);
        const regularEmptyMessage = state.categoryFilter && hasRegularTasks
            ? 'No tasks of the selected category.'
            : 'No tasks in this view yet.';
        const periodicEmptyMessage = state.categoryFilter && hasPeriodicTasks
            ? 'No periodic tasks of the selected category.'
            : 'No periodic tasks yet.';

        list.innerHTML = renderTasks(visibleTasks, regularEmptyMessage);
        periodicList.innerHTML = renderTasks(periodicTasks, periodicEmptyMessage);
    }

    function attemptCategoryValidation() {
        categoryValidationAttempted = true;
        updateCategoryValidation();
    }

    window.TodoApp = {
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
        updateNewCategoryVisibility,
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
            importButton,
            importInput,
            exportButton,
            sortSelect,
            openCategoryFilterButton,
            categoryFilterControl,
            categoryFilterMenu,
            toolbar,
            taskDialog,
            renameCategoryButton,
            renameCategoryForm,
            renameCategorySelect,
            renameCategoryName,
        },
    };

    refreshCategoryOptions();
    render();

    window.setTimeout(() => {
        const loadingScreen = document.querySelector('#loading-screen');
        const warningDialog = document.querySelector('#first-run-warning');
        const facts = [
            'Octopuses have three hearts.',
            'A day on Venus is longer than its year.',
            'Honey can stay edible for thousands of years when sealed.',
            'Bananas are berries, but strawberries are not.',
            'Some turtles can breathe through their bottoms.'
        ];
        const jokes = [
            'Why did the scarecrow win an award? Because he was outstanding in his field.',
            'I only know 25 letters of the alphabet. I don’t know y.',
            'Why did the bicycle fall over? It was two-tired.',
            'What do you call cheese that isn’t yours? Nacho cheese.',
            'I used to hate facial hair, but then it grew on me.'
        ];
        let loadingFinished = false;

        const showWelcomeWarning = () => {
            if (loadingFinished) return;
            loadingFinished = true;
            loadingScreen.remove();

            let warningSeen = false;
            try {
                warningSeen = localStorage.getItem('todo-manager-welcome-warning-seen') === 'true';
            } catch (error) {
                console.error('Unable to check whether the welcome warning was seen:', error);
            }

            if (!warningSeen) {
                document.querySelector('#welcome-fact').textContent = facts[Math.floor(Math.random() * facts.length)];
                document.querySelector('#welcome-joke').textContent = jokes[Math.floor(Math.random() * jokes.length)];
                warningDialog.showModal();
            }
        };

        loadingScreen.classList.add('is-hidden');
        loadingScreen.addEventListener('transitionend', (event) => {
            if (event.target === loadingScreen && event.propertyName === 'opacity') showWelcomeWarning();
        }, { once: true });
        window.setTimeout(showWelcomeWarning, 600);

        document.querySelector('#dismiss-first-run-warning').addEventListener('click', () => {
            try {
                localStorage.setItem('todo-manager-welcome-warning-seen', 'true');
            } catch (error) {
                console.error('Unable to remember that the welcome warning was seen:', error);
            }
            warningDialog.close();
        });
    }, 200);  // Time the loading screen is shown before fading out, in milliseconds

})();

