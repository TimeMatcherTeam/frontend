import { state } from "./state.js";

export function showTooltip(ev, mouseEv) {
    state.tooltipEv = ev;
    const [y, m, d] = ev.date.split('-');
    document.getElementById('ttTitle').textContent = ev.name || '(без названия)';
    document.getElementById('ttTime').textContent  = `${d}.${m}.${y} · ${ev.start} – ${ev.end}`;
    const tt = document.getElementById('evTooltip');
    tt.style.display = 'block';
    tt.classList.add('visible');
    const x   = Math.min(mouseEv.clientX + 12, window.innerWidth - 200);
    const top = Math.min(mouseEv.clientY - 20, window.innerHeight - 140);
    tt.style.left = x + 'px';
    tt.style.top  = top + 'px';
}

export function hideTooltip() {
    document.getElementById('evTooltip').style.display = 'none';
    document.getElementById('evTooltip').classList.remove('visible');
    state.tooltipEv = null;
}