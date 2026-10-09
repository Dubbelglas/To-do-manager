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

