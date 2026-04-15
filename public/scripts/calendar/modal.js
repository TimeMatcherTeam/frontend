import { state } from "./state.js";
import { COLORS } from "./constants.js";
import { renderEvents } from "./grid.js";
import { hideTooltip } from "./tooltip.js";
import { getWeekStart, dateKey } from "./utils.js";

export function openModal(ev) {
    state.editId = ev ? ev.id : null;
    document.getElementById('modalTitle').textContent = ev ? 'Редактировать событие' : 'Новое событие';
    document.getElementById('evName').value = ev ? ev.name : '';

    if (ev) {
        document.getElementById('evDate').value  = ev.date;
        document.getElementById('evStart').value = ev.start;
        document.getElementById('evEnd').value   = ev.end;
        state.selColor = ev.color || 0;
    } else if (state.pendingTime) {
        document.getElementById('evDate').value  = state.pendingTime.date;
        document.getElementById('evStart').value = state.pendingTime.start;
        document.getElementById('evEnd').value   = state.pendingTime.end;
        state.pendingTime = null;
        state.selColor = 0;
    } else {
        document.getElementById('evDate').value  = dateKey(getWeekStart(state.weekOffset));
        document.getElementById('evStart').value = '09:00';
        document.getElementById('evEnd').value   = '10:00';
        state.selColor = 0;
    }

    renderColorPicker();
    document.getElementById('modalBg').style.display = 'flex';
    setTimeout(() => document.getElementById('evName').focus(), 50);
    hideTooltip();
}

export function closeModal() {
    document.getElementById('modalBg').style.display = 'none';
    state.editId = null;
    state.pendingTime = null;
}

export function saveEvent() {
    const name  = document.getElementById('evName').value.trim() || '(без названия)';
    const date  = document.getElementById('evDate').value;
    const start = document.getElementById('evStart').value;
    const end   = document.getElementById('evEnd').value;
    if (!date || !start || !end) return;

    if (state.editId) {
        const ev = state.events.find(e => e.id === state.editId);
        if (ev) { ev.name = name; ev.date = date; ev.start = start; ev.end = end; ev.color = state.selColor; }
    } else {
        state.events.push({ id: Date.now(), name, date, start, end, color: state.selColor });
    }

    closeModal();
    renderEvents();
}

function renderColorPicker() {
    const row = document.getElementById('colorRow');
    row.innerHTML = '';
    COLORS.forEach((c, i) => {
        const dot = document.createElement('div');
        dot.className = 'color-dot' + (i === state.selColor ? ' selected' : '');
        dot.style.background = c.border;
        dot.title = ['Синий','Красный','Зелёный','Жёлтый','Фиолетовый','Голубой'][i];
        dot.onclick = () => { state.selColor = i; renderColorPicker(); };
        row.appendChild(dot);
    });
}