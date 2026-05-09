import { getWeekStart, dateKey } from "./utils.js";
import { DAYS_RU, MONTHS_RU } from "./constants.js";
import { state } from "./state.js";

export function getWeekLabel(ws, we){
    if (ws.getMonth() === we.getMonth()) {
        return `${ws.getDate()} – ${we.getDate()} ${MONTHS_RU[we.getMonth()]} ${we.getFullYear()}`;
    } else {
        return `${ws.getDate()} ${MONTHS_RU[ws.getMonth()]} – ${we.getDate()} ${MONTHS_RU[we.getMonth()]} ${we.getFullYear()}`;
    }
}

export function buildHeader() {
    const ws = getWeekStart(state.weekOffset);
    const we = new Date(ws); we.setDate(ws.getDate() + 6);

    document.getElementById('weekLabel').textContent =
        getWeekLabel(ws, we);

    const head = document.getElementById('colHead');
    head.replaceChildren();

    const thTime = document.createElement('div');
    thTime.className = 'th-time';
    head.appendChild(thTime);

    const todayStr = dateKey(new Date());

    for (let i = 0; i < 7; i++) {
        const d = new Date(ws); d.setDate(ws.getDate() + i);
        const isToday = dateKey(d) === todayStr;

        const div = document.createElement('div');
        div.className = 'th-day';
        div.textContent = DAYS_RU[i];

        const dayNumber = document.createElement('span');
        dayNumber.className = `th-num${isToday ? ' today' : ''}`;
        dayNumber.textContent = String(d.getDate());

        div.appendChild(dayNumber);
        head.appendChild(div);
    }
}