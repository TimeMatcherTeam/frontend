import { HOUR_H, COLORS } from "./constants.js";
import { state } from "./state.js";
import { getWeekStart, dateKey, fmt2 } from "./utils.js";
import { openModal } from "./slotModal.js";
import { showTooltip } from "./tooltip.js";

export function buildTimeCol() {
    const tc = document.getElementById('timeCol');
    tc.innerHTML = '';
    tc.style.position = 'relative';
    tc.style.height = (HOUR_H * 24) + 'px';
    for (let h = 1; h < 24; h++) {
        const lbl = document.createElement('div');
        lbl.className = 'time-label';
        lbl.style.top = (h * HOUR_H) + 'px';
        lbl.textContent = fmt2(h) + ':00';
        tc.appendChild(lbl);
    }
}

export function buildGrid() {
    const ga = document.getElementById('gridArea');
    ga.innerHTML = '';
    ga.style.height = (HOUR_H * 24) + 'px';
    const ws = getWeekStart(state.weekOffset);

    for (let i = 0; i < 7; i++) {
        const col = document.createElement('div');
        col.className = 'day-col';
        col.style.height = '100%';

        /* Hour and half-hour lines */
        for (let h = 0; h < 24; h++) {
            const hl = document.createElement('div');
            hl.className = 'hour-line';
            hl.style.top = (h * HOUR_H) + 'px';
            col.appendChild(hl);

            const hf = document.createElement('div');
            hf.className = 'half-line';
            hf.style.top = (h * HOUR_H + HOUR_H / 2) + 'px';
            col.appendChild(hf);
        }

        const d = new Date(ws); d.setDate(ws.getDate() + i);
        col.dataset.date = dateKey(d);

        /* Click to create event */
        col.addEventListener('click', e => {
            if (!e.target.closest('.event-block')) {
                const rect = col.getBoundingClientRect();
                const scrollTop = document.getElementById('calBody').scrollTop;
                const y = e.clientY - rect.top + scrollTop;
                const totalMin = Math.round((y / HOUR_H) * 60 / 15) * 15;
                const hh = Math.min(Math.floor(totalMin / 60), 23);
                const mm = totalMin % 60;
                const endH = Math.min(hh + 1, 23);
                state.pendingTime = { date: col.dataset.date, start: fmt2(hh)+':'+fmt2(mm), end: fmt2(endH)+':'+fmt2(mm) };
                openModal();
            }
        });
        ga.appendChild(col);
    }

    renderEvents();
    renderNowLine();
}

export function renderEvents() {
    document.querySelectorAll('.event-block').forEach(e => e.remove());

    const ws = getWeekStart(state.weekOffset);
    const days = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date(ws); d.setDate(ws.getDate() + i);
        days.push(dateKey(d));
    }

    state.events.forEach(ev => {
        const idx = days.indexOf(ev.date);
        if (idx < 0) return;
        const col = document.querySelectorAll('.day-col')[idx];
        if (!col) return;

        const [sh, sm] = ev.start.split(':').map(Number);
        const [eh, em] = ev.end.split(':').map(Number);
        const top    = (sh * 60 + sm) / 60 * HOUR_H;
        const height = Math.max(((eh * 60 + em) - (sh * 60 + sm)) / 60 * HOUR_H, 20);

        const c = COLORS[ev.color || 0];
        const block = document.createElement('div');
        block.className = 'event-block';
        block.style.top = top + 'px';
        block.style.height = height + 'px';
        block.style.background = c.bg;
        block.style.borderLeftColor = c.border;
        block.style.color = c.text;

        if (height > 28) {
            block.innerHTML = `<span class="ev-name">${ev.name || '(без названия)'}</span><span class="ev-time">${ev.start}–${ev.end}</span>`;
        } else {
            block.innerHTML = `<span class="ev-name">${ev.name || '(без названия)'}</span>`;
        }

        block.addEventListener('click', e => { e.stopPropagation(); showTooltip(ev, e); });
        col.appendChild(block);
    });
}

export function renderNowLine() {
    document.querySelectorAll('.now-line').forEach(e => e.remove());
    const now = new Date();
    const todayKey = dateKey(now);
    const ws = getWeekStart(state.weekOffset);
    for (let i = 0; i < 7; i++) {
        const d = new Date(ws); d.setDate(ws.getDate() + i);
        if (dateKey(d) === todayKey) {
            const col = document.querySelectorAll('.day-col')[i];
            if (!col) return;
            const top = (now.getHours() * 60 + now.getMinutes()) / 60 * HOUR_H;
            const line = document.createElement('div');
            line.className = 'now-line';
            line.style.top = top + 'px';
            col.appendChild(line);
        }
    }
}