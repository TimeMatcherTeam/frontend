import { dateKey, getCurrentWeekBorders, getWeekStart} from "./utils.js";
import { HOUR_H} from "./constants.js";
import { state } from "./state.js";
import { buildHeader } from "./header.js";
import { buildTimeCol, buildGrid, renderEvents, renderNowLine } from "./grid.js";
import { openModal, closeModal, saveEvent } from "./slotModal.js";
import { hideTooltip } from "./tooltip.js";
import { DeleteSlot, getUserCalendar } from "./slotsRequests.js";
import { initMeetingModal, openMeetingModal } from "./meetingModal.js";
import { initMiniCalendar, renderMiniCalendar } from "./miniCalendar.js";


document.getElementById('prevBtn').onclick = () => {
    state.weekOffset--;
    buildAll();
};

document.getElementById('nextBtn').onclick = () => {
    state.weekOffset++;
    buildAll();
};

document.getElementById('todayBtn').onclick = () => {
    state.weekOffset = 0;
    buildAll();
};

document.getElementById('addBtn').onclick = e => {
    e.stopPropagation();
    document.getElementById('createDropdown').classList.toggle('open');
};

document.getElementById('actionEvent').onclick = () => {
    document.getElementById('createDropdown').classList.remove('open');
    openModal();
};

document.getElementById('actionMeeting').onclick = () => {
    document.getElementById('createDropdown').classList.remove('open');
    openMeetingModal();
};

document.getElementById('saveBtn').onclick = saveEvent;
document.getElementById('cancelBtn').onclick = closeModal;
document.getElementById('modalClose').onclick = closeModal;

document.getElementById('modalBg').onclick = e => {
    if (e.target === document.getElementById('modalBg')) closeModal();
};

document.getElementById('evName').addEventListener('keydown', e => {
    if (e.key === 'Enter')  saveEvent();
    if (e.key === 'Escape') closeModal();
});

function isGuid(value) {
    return typeof value === "string" && /^[0-9a-fA-F-]{36}$/.test(value);
}

document.getElementById('ttDel').onclick = async () => {
    if (!state.tooltipEv) return;

    try {
        if (isGuid(state.tooltipEv.id)) {
            await DeleteSlot(state.tooltipEv.id);
        }
        state.events = state.events.filter(e => e.id !== state.tooltipEv.id);
        hideTooltip();
        renderEvents();
    } catch (error) {
        alert(error?.message || "Не удалось удалить событие");
    }
};

document.getElementById('ttEdit').onclick = () => {
    if (state.tooltipEv) {
        const ev = state.tooltipEv;
        hideTooltip();
        openModal(ev);
    }
};

document.addEventListener('click', e => {
    if (!e.target.closest('.create-dropdown')) {
        document.getElementById('createDropdown').classList.remove('open');
    }
    if (!e.target.closest('.ev-tooltip') && !e.target.closest('.event-block')) hideTooltip();
});

function updateCalendar() {
    const ws = getWeekStart(state.weekOffset);
    const we = new Date(ws);
    console.log(ws, we)
    we.setDate(ws.getDate() + 6);
    we.setHours(23, 59, 59, 999);
    getUserCalendar(ws, we)
        .then(calendar => {
            console.log(calendar);
            if (calendar.slots) {
                state.events = state.events.filter(e => e.id <= 3);
                state.events.push(...calendar.slots);
            }
            renderEvents();
        })
        .catch(error => {
            console.error('Ошибка загрузки календаря:', error);
        });
}

function buildAll() {
    buildHeader();
    buildTimeCol();
    buildGrid();
    renderMiniCalendar();
    updateCalendar();
}
buildAll();
initMeetingModal();
initMiniCalendar(buildAll);

/* Scroll to current hour */
const now = new Date();
document.getElementById('calBody').scrollTop = Math.max((now.getHours() - 1) * HOUR_H, 0);

/* Update now-line every minute */
setInterval(renderNowLine, 60000);
