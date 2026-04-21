import { state } from "./state.js";
import { getDuration } from "./slotSuggester.js";

const popupBg = document.getElementById("meetingTimePopupBg");
const closeBtn = document.getElementById("meetingTimePopupClose");
const startInput = document.getElementById("meetingTimeStart");
const endInput = document.getElementById("meetingTimeEnd");
const applyBtn = document.getElementById("meetingTimeApplyBtn");
const slotsList = document.getElementById("meetingTimeSlotsList");
const status = document.getElementById("meetingTimeStatus");

function toDateTimeLocal(date) {
    const pad = n => String(n).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function applyTime(start, end) {
    const draft = JSON.parse(sessionStorage.getItem("meetingDraft") || "{}");
    draft.start = toDateTimeLocal(start);
    draft.end = toDateTimeLocal(end);
    sessionStorage.setItem("meetingDraft", JSON.stringify(draft));

    const fmt2 = n => String(n).padStart(2, "0");
    const dateStr = `${start.getFullYear()}-${fmt2(start.getMonth() + 1)}-${fmt2(start.getDate())}`;
    const startStr = `${fmt2(start.getHours())}:${fmt2(start.getMinutes())}`;
    const endStr = `${fmt2(end.getHours())}:${fmt2(end.getMinutes())}`;

    state.events = state.events.filter(ev => ev.id !== "__selected_slot__");
    state.events.push({
        id: "__selected_slot__",
        date: dateStr,
        start: startStr,
        end: endStr,
        color: 2
    });

    document.dispatchEvent(new CustomEvent("slots:slotSelected"));

    const confirmBtn = document.getElementById("meetingConfirmBtn");
    if (confirmBtn) {
        confirmBtn.disabled = false;
    }

    updateSelectedTimeLabel(start, end);
    closePopup();
}

function updateSelectedTimeLabel(start, end) {
    const label = document.getElementById("meetingSelectedTimeLabel");
    if (!label) {
        return;
    }

    if (!start || !end) {
        label.textContent = "";
        label.style.display = "none";
        return;
    }

    const fmt = date => date.toLocaleString("ru-RU", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit"
    });

    label.textContent = `${fmt(start)} – ${fmt(end)}`;
    label.style.display = "";
}

function slotColor(score, maxScore) {
    const ratio = maxScore > 0 ? Math.min(score / maxScore, 1) : 0;

    if (ratio < 0.5) {
        return `color-mix(in srgb, #5BB7D5 ${100 - ratio * 200}%, #F5A623 ${ratio * 200}%)`;
    }

    return `color-mix(in srgb, #F5A623 ${100 - (ratio - 0.5) * 200}%, #EA4335 ${(ratio - 0.5) * 200}%)`;
}

function fmtTime(date) {
    return date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

function renderSlotsInPopup(slots) {
    slotsList.innerHTML = "";

    if (!slots.length) {
        const empty = document.createElement("div");
        empty.className = "meeting-slots-empty";
        empty.textContent = "нет подходящего времени";
        slotsList.appendChild(empty);
        return;
    }

    if (status) {
        status.textContent = `найдено ${slots.length} вариантов`;
    }

    const maxScore = Math.max(...slots.map(s => s.score));

    slots.forEach((slot, index) => {
        const item = document.createElement("div");
        item.className = "meeting-slot-item";
        item.style.borderColor = slotColor(slot.score, maxScore);

        const time = document.createElement("div");
        time.className = "meeting-slot-time";
        time.textContent = `${fmtTime(slot.start)} – ${fmtTime(slot.end)}`;

        const date = document.createElement("div");
        date.className = "meeting-slot-date";
        date.textContent = slot.start.toLocaleDateString("ru-RU", {
            weekday: "short",
            day: "numeric",
            month: "short"
        });

        item.append(time, date);
        if (index === 0) {
            item.classList.add("is-selected");
            startInput.value = toDateTimeLocal(slot.start);
            endInput.value = toDateTimeLocal(slot.end);
        }
        item.addEventListener("click", () => {
            slotsList.querySelectorAll(".meeting-slot-item").forEach(el => el.classList.remove("is-selected"));
            item.classList.add("is-selected");
            startInput.value = toDateTimeLocal(slot.start);
            endInput.value = toDateTimeLocal(slot.end);
        });

        slotsList.appendChild(item);
    });
}

export function openTimePickerPopup(slots) {
    const slotsToRender = Array.isArray(slots) ? [...slots] : [];

    renderSlotsInPopup(slotsToRender);
    popupBg.style.display = "flex";
}

export function restoreSelectedTime() {
    const draft = JSON.parse(sessionStorage.getItem("meetingDraft") || "{}");
    if (!draft.start || !draft.end) {
        return;
    }

    const start = new Date(draft.start);
    const end = new Date(draft.end);

    updateSelectedTimeLabel(start, end);

    const fmt2 = n => String(n).padStart(2, "0");
    const dateStr = `${start.getFullYear()}-${fmt2(start.getMonth() + 1)}-${fmt2(start.getDate())}`;
    const startStr = `${fmt2(start.getHours())}:${fmt2(start.getMinutes())}`;
    const endStr = `${fmt2(end.getHours())}:${fmt2(end.getMinutes())}`;

    state.events = state.events.filter(ev => ev.id !== "__selected_slot__");
    state.events.push({
        id: "__selected_slot__",
        date: dateStr,
        start: startStr,
        end: endStr,
        color: 2
    });
}

function closePopup() {
    popupBg.style.display = "none";
}

applyBtn?.addEventListener("click", () => {
    const start = new Date(startInput.value);
    const end = new Date(endInput.value);

    if (!startInput.value || !endInput.value || isNaN(start) || isNaN(end) || end <= start) {
        alert("Укажите корректное время начала и конца");
        return;
    }

    applyTime(start, end);
});

startInput?.addEventListener("change", () => {
    if (!startInput.value) {
        return;
    }

    const durationMinutes = getDuration();
    if (!durationMinutes) {
        return;
    }

    const start = new Date(startInput.value);
    const end = new Date(start.getTime() + durationMinutes * 60000);
    endInput.value = toDateTimeLocal(end);
});

endInput?.addEventListener("change", () => {
    if (!endInput.value) {
        return;
    }

    const durationMinutes = getDuration();
    if (!durationMinutes) {
        return;
    }

    const end = new Date(endInput.value);
    const start = new Date(end.getTime() - durationMinutes * 60000);
    startInput.value = toDateTimeLocal(start);
});

closeBtn?.addEventListener("click", closePopup);
popupBg?.addEventListener("click", e => {
    if (e.target === popupBg) closePopup();
});