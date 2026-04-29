import { state } from "./state.js";
import { COLORS } from "./constants.js";
import { renderEvents } from "./grid.js";
import { hideTooltip } from "./tooltip.js";
import { getWeekStart, dateKey } from "./utils.js";
import {
    AddSlot,
    UpdateSlot,
    mapSlotResponseToCalendarEvent,
    abilityTypeByColor,
    colorByAbilityName
} from "./slotsRequests.js";

export function openModal(ev) {
    state.editId = ev ? ev.id : null;
    document.getElementById('modalTitle').textContent = ev ? 'Редактировать событие' : 'Новое событие';
    document.getElementById('evName').value = ev ? ev.name : '';

    if (ev) {
        document.getElementById('evDate').value  = ev.date;
        document.getElementById('evStart').value = ev.start;
        document.getElementById('evEnd').value   = ev.end;
        state.selColor = Number.isInteger(ev.color)
            ? ev.color
            : colorByAbilityName(ev.abilityName);
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

function isGuid(value) {
    return typeof value === "string" && /^[0-9a-fA-F-]{36}$/.test(value);
}

export async function saveEvent() {
    const name  = document.getElementById('evName').value.trim() || '(без названия)';
    const date  = document.getElementById('evDate').value;
    const start = document.getElementById('evStart').value;
    const end   = document.getElementById('evEnd').value;
    if (!date || !start || !end) return;

    const payload = {
        name,
        date,
        start,
        end,
        color: state.selColor,
        abilityType: abilityTypeByColor(state.selColor)
    };

    try {
        if (state.editId) {
            const ev = state.events.find(e => e.id === state.editId);
            if (!ev) return;

            if (isGuid(state.editId)) {
                const updatedSlot = await UpdateSlot(state.editId, payload);

                const normalized = mapSlotResponseToCalendarEvent(updatedSlot, state.selColor);
                ev.id = normalized.id;
                ev.name = normalized.name;
                ev.date = normalized.date;
                ev.start = normalized.start;
                ev.end = normalized.end;
                ev.color = normalized.color;
                ev.abilityId = normalized.abilityId;
            } else {
                ev.name = name;
                ev.date = date;
                ev.start = start;
                ev.end = end;
                ev.color = state.selColor;
            }
        } else {
            const createdSlot = await AddSlot(payload);
            state.events.push(mapSlotResponseToCalendarEvent(createdSlot, state.selColor));
        }
    } catch (error) {
        alert(error?.message || "Не удалось сохранить событие");
        return;
    }

    closeModal();
    renderEvents();
}

function renderColorPicker() {
    const row = document.getElementById('colorRow');
    row.replaceChildren();
    const labels = ['Занят', 'Встреча нежелательна'];
    // Только первые 2 цвета для личного календаря (зелёный только для встреч)
    for (let i = 0; i < 2; i++) {
        const c = COLORS[i];

        const wrapper = document.createElement('div');
        wrapper.className = 'color-item';

        const dot = document.createElement('div');
        dot.className = 'color-dot' + (i === state.selColor ? ' selected' : '');
        dot.style.background = c.border;
        dot.title = labels[i];
        dot.onclick = () => { state.selColor = i; renderColorPicker(); };

        const labelSpan = document.createElement('div');
        labelSpan.className = 'color-label';
        labelSpan.textContent = labels[i];

        wrapper.appendChild(dot);
        wrapper.appendChild(labelSpan);
        row.appendChild(wrapper);
    }
}