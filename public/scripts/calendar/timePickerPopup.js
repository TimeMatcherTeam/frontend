import { state } from "./state.js";

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
    draft.meetingStart = toDateTimeLocal(start);
    draft.meetingEnd = toDateTimeLocal(end);
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
    if (!label) return;

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

function slotBorderColor(reasonsCount) {
    if (reasonsCount === 0) return "#5BB7D5";
    if (reasonsCount === 1) return "#F5A623";
    return "#EA4335";
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

    slots.forEach(slot => {
        const item = document.createElement("div");
        item.className = "meeting-slot-item";
        item.style.borderColor = slotBorderColor(slot.reasons.length);

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

        if (slot.reasons.length > 0) {
            const reasonsList = document.createElement("div");
            reasonsList.className = "meeting-slot-reasons";
            slot.reasons.forEach(reason => {
                const r = document.createElement("div");
                r.className = "meeting-slot-reason";
                r.textContent = reason;
                reasonsList.appendChild(r);
            });
            item.appendChild(reasonsList);
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
    const draft = JSON.parse(sessionStorage.getItem("meetingDraft") || "{}");
    if (startInput && draft.meetingStart) startInput.value = draft.meetingStart;
    if (endInput && draft.meetingEnd) endInput.value = draft.meetingEnd;

    renderSlotsInPopup(slots || []);
    popupBg.style.display = "flex";
}

export function restoreSelectedTime() {
    const draft = JSON.parse(sessionStorage.getItem("meetingDraft") || "{}");
    if (!draft.meetingStart || !draft.meetingEnd) return;

    const start = new Date(draft.meetingStart);
    const end = new Date(draft.meetingEnd);

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
    if (!startInput.value) return;

    const draft = JSON.parse(sessionStorage.getItem("meetingDraft") || "{}");
    const [h, m] = (draft.duration || "1:00").split(":").map(Number);
    const durationMinutes = h * 60 + m;
    if (!durationMinutes) return;

    const start = new Date(startInput.value);
    endInput.value = toDateTimeLocal(new Date(start.getTime() + durationMinutes * 60000));
});

endInput?.addEventListener("change", () => {
    if (!endInput.value) return;

    const draft = JSON.parse(sessionStorage.getItem("meetingDraft") || "{}");
    const [h, m] = (draft.duration || "1:00").split(":").map(Number);
    const durationMinutes = h * 60 + m;
    if (!durationMinutes) return;

    const end = new Date(endInput.value);
    startInput.value = toDateTimeLocal(new Date(end.getTime() - durationMinutes * 60000));
});

closeBtn?.addEventListener("click", closePopup);
popupBg?.addEventListener("click", e => {
    if (e.target === popupBg) closePopup();
});