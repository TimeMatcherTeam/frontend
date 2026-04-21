import { API_URL } from "../requests.js";
import { getCookie, getToken } from "../jwtUtils.js";
import { HOUR_H, COLORS } from "./constants.js";
import { state } from "./state.js";
import { buildHeader } from "./header.js";
import { initMiniCalendar, renderMiniCalendar } from "./miniCalendar.js";
import { getWeekStart, dateKey, fmt2 } from "./utils.js";
import { openTimePickerPopup, restoreSelectedTime } from "./timePickerPopup.js";
import { getLastSlots, getDuration, triggerSlotSuggester } from "./slotSuggester.js";

const SEARCH_LIMIT = 8;

let participantUsers = [];
let searchTimer = null;
const creatorUserId = getCookie("userId") || null;

function readDraft() {
    try {
        const raw = sessionStorage.getItem("meetingDraft");
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

function getParticipantIds() {
    const ids = [
        ...participantUsers.map(user => user.id).filter(Boolean),
        ...(creatorUserId ? [creatorUserId] : [])
    ];

    return Array.from(new Set(ids));
}

function isCreatorUser(userId) {
    if (!creatorUserId || !userId) {
        return false;
    }

    return String(userId) === String(creatorUserId);
}

function normalizeUser(user) {
    const id = user?.id ?? user?.userId;
    if (!id) {
        return null;
    }

    return {
        id,
        userName: user.userName || "Без имени",
        email: user.email || ""
    };
}

function saveDraftParticipants() {
    const draft = readDraft() || {};
    const participantIds = [
        ...participantUsers.map(user => user.id).filter(Boolean),
        ...(creatorUserId ? [creatorUserId] : [])
    ];

    const updated = {
        ...draft,
        participantIds: Array.from(new Set(participantIds))
    };

    sessionStorage.setItem("meetingDraft", JSON.stringify(updated));
}

function parseDraftDateTime(value) {
    if (!value) {
        return null;
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return null;
    }

    return date;
}

function formatMeetingRange(date) {
    return date.toLocaleString("ru-RU", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit"
    });
}

function renderMeetingRangeLabel(range) {
    const label = document.getElementById("meetingRangeLabel");
    if (!label) {
        return;
    }

    if (!range?.start || !range?.end) {
        label.textContent = "Диапазон встречи не выбран";
        return;
    }

    label.textContent = `Диапазон встречи: ${formatMeetingRange(range.start)} – ${formatMeetingRange(range.end)}`;
}

function getMeetingRangeFromDraft() {
    const draft = readDraft();
    const start = parseDraftDateTime(draft?.start);
    const end = parseDraftDateTime(draft?.end);

    if (!start || !end || end <= start) {
        return null;
    }

    return { start, end };
}

function getSearchElements() {
    return {
        searchInput: document.getElementById("meetingParticipantSearch"),
        searchResults: document.getElementById("meetingParticipantSearchResults"),
        participantsList: document.getElementById("meetingParticipantsList")
    };
}

function createUserInfo(user) {
    const info = document.createElement("div");
    info.className = "meeting-participant-info";

    const name = document.createElement("div");
    name.className = "meeting-participant-name";
    name.textContent = user.userName;

    const email = document.createElement("div");
    email.className = "meeting-participant-email";
    email.textContent = user.email;

    info.append(name, email);
    return info;
}

function renderParticipants() {
    const { participantsList } = getSearchElements();
    if (!participantsList) {
        return;
    }

    participantsList.replaceChildren();

    if (participantUsers.length === 0) {
        const empty = document.createElement("div");
        empty.className = "meeting-participants-empty";
        empty.textContent = "Участников пока нет";
        participantsList.appendChild(empty);
        return;
    }

    participantUsers.forEach(user => {
        const row = document.createElement("div");
        row.className = "meeting-participant-row";

        const removeBtn = document.createElement("button");
        removeBtn.type = "button";
        removeBtn.className = "meeting-participant-action";
        const isCreator = isCreatorUser(user.id);

        if (isCreator) {
            removeBtn.textContent = "Создатель";
            removeBtn.disabled = true;
        } else {
            removeBtn.textContent = "Удалить";
            removeBtn.addEventListener("click", async () => {
                participantUsers = participantUsers.filter(item => item.id !== user.id);
                saveDraftParticipants();
                renderParticipants();
                await buildAll();
            });
        }

        row.append(createUserInfo(user), removeBtn);
        participantsList.appendChild(row);
    });
}

function renderSearchResults(users) {
    const { searchResults } = getSearchElements();
    if (!searchResults) {
        return;
    }

    searchResults.replaceChildren();

    if (!Array.isArray(users) || users.length === 0) {
        return;
    }

    users.forEach(user => {
        const alreadyAdded = participantUsers.some(item => item.id === user.id);
        if (alreadyAdded) {
            return;
        }

        const row = document.createElement("div");
        row.className = "meeting-participant-search-row";

        const addBtn = document.createElement("button");
        addBtn.type = "button";
        addBtn.className = "meeting-participant-action";
        addBtn.textContent = "Добавить";
        addBtn.addEventListener("click", async () => {
            participantUsers = [...participantUsers, user];
            saveDraftParticipants();
            renderParticipants();
            renderSearchResults(users);
            await buildAll();
        });

        row.append(createUserInfo(user), addBtn);
        searchResults.appendChild(row);
    });
}

async function getUserById(userId) {
    const response = await fetch(`${API_URL}/users/${userId}`, {
        method: "GET",
        headers: getAuthHeaders()
    });

    if (!response.ok) {
        return null;
    }

    return response.json();
}

async function searchUsers(searchText) {
    if (!searchText || searchText.length < 2) {
        renderSearchResults([]);
        return;
    }

    const params = new URLSearchParams({
        SearchText: searchText,
        Limit: String(SEARCH_LIMIT),
        Page: "1"
    });

    const response = await fetch(`${API_URL}/users?${params.toString()}`, {
        method: "GET",
        headers: getAuthHeaders()
    });

    if (!response.ok) {
        renderSearchResults([]);
        return;
    }

    const users = await response.json();
    const normalized = (Array.isArray(users) ? users : [])
        .map(normalizeUser)
        .filter(Boolean);
    renderSearchResults(normalized);
}

function initParticipantsSearch() {
    const { searchInput } = getSearchElements();
    if (!searchInput) {
        return;
    }

    searchInput.addEventListener("input", () => {
        const value = searchInput.value.trim();
        if (searchTimer) {
            clearTimeout(searchTimer);
        }
        searchTimer = setTimeout(() => {
            void searchUsers(value);
        }, 250);
    });
}

async function initParticipants() {
    const draft = readDraft();
    const ids = Array.from(new Set([
        ...((draft?.participantIds || []).filter(Boolean)),
        ...(creatorUserId ? [creatorUserId] : [])
    ]));

    if (ids.length === 0) {
        participantUsers = [];
        renderParticipants();
        return;
    }

    const users = await Promise.all(ids.map(id => getUserById(id)));
    participantUsers = users
        .map(normalizeUser)
        .filter(Boolean);

    saveDraftParticipants();
    renderParticipants();
}

function getAuthHeaders() {
    const token = getToken();
    if (!token) {
        throw new Error("Необходима авторизация.");
    }

    return {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
    };
}

function getRequestedPeriod() {
    const start = getWeekStart(state.weekOffset);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);

    return { start, end };
}

function normalizeToLocal(dateTimeString) {
    const date = new Date(dateTimeString);
    return {
        date: dateKey(date),
        time: `${fmt2(date.getHours())}:${fmt2(date.getMinutes())}`
    };
}

function hexToRgba(hex, alpha) {
    const clean = String(hex || "").replace("#", "");
    if (clean.length !== 6) {
        return `rgba(47, 55, 67, ${alpha})`;
    }

    const r = parseInt(clean.slice(0, 2), 16);
    const g = parseInt(clean.slice(2, 4), 16);
    const b = parseInt(clean.slice(4, 6), 16);

    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

async function loadMergedCalendar() {
    const participantIds = getParticipantIds();
    if (participantIds.length === 0) {
        state.events = [];
        renderMergedEvents();
        return;
    }

    const period = getRequestedPeriod();
    const apiBase = API_URL.endsWith("/api") ? API_URL.slice(0, -4) : API_URL;

    const response = await fetch(`${apiBase}/merge-calendar`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
            userIds: participantIds,
            requestedPeriod: {
                start: period.start.toISOString(),
                end: period.end.toISOString()
            }
        })
    });

    if (!response.ok) {
        throw new Error(`Ошибка загрузки объединенного календаря: ${response.status}`);
    }

    const data = await response.json();
    const slots = Array.isArray(data?.slots) ? data.slots : [];

    state.events = slots.map(slot => {
        const start = normalizeToLocal(slot.startTime);
        const end = normalizeToLocal(slot.endTime);
        const abilityName = String(slot?.ability?.ability || "").toLowerCase();
        const color = abilityName.includes("partial") ? 1 : 0;

        return {
            id: slot.id,
            date: start.date,
            start: start.time,
            end: end.time,
            color
        };
    });

    renderMergedEvents();
}

function buildTimeCol() {
    const tc = document.getElementById("timeCol");
    tc.replaceChildren();
    tc.style.position = "relative";
    tc.style.height = `${HOUR_H * 24}px`;

    for (let h = 1; h < 24; h++) {
        const lbl = document.createElement("div");
        lbl.className = "time-label";
        lbl.style.top = `${h * HOUR_H}px`;
        lbl.textContent = `${fmt2(h)}:00`;
        tc.appendChild(lbl);
    }
}

function buildGrid() {
    const ga = document.getElementById("gridArea");
    ga.replaceChildren();
    ga.style.height = `${HOUR_H * 24}px`;

    const ws = getWeekStart(state.weekOffset);

    for (let i = 0; i < 7; i++) {
        const col = document.createElement("div");
        col.className = "day-col";
        col.style.height = "100%";

        for (let h = 0; h < 24; h++) {
            const hl = document.createElement("div");
            hl.className = "hour-line";
            hl.style.top = `${h * HOUR_H}px`;
            col.appendChild(hl);

            const hf = document.createElement("div");
            hf.className = "half-line";
            hf.style.top = `${h * HOUR_H + HOUR_H / 2}px`;
            col.appendChild(hf);
        }

        const d = new Date(ws);
        d.setDate(ws.getDate() + i);
        col.dataset.date = dateKey(d);

        ga.appendChild(col);
    }

    renderMergedEvents();
}

export function renderMergedEvents() {
    document.querySelectorAll(".merged-event-block").forEach(el => el.remove());

    const ws = getWeekStart(state.weekOffset);
    const days = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date(ws);
        d.setDate(ws.getDate() + i);
        days.push(dateKey(d));
    }

    state.events.forEach(ev => {
        const idx = days.indexOf(ev.date);
        if (idx < 0) {
            return;
        }

        const col = document.querySelectorAll(".day-col")[idx];
        if (!col) {
            return;
        }

        const [sh, sm] = ev.start.split(":").map(Number);
        const [eh, em] = ev.end.split(":").map(Number);

        const top = ((sh * 60 + sm) / 60) * HOUR_H;
        const height = Math.max((((eh * 60 + em) - (sh * 60 + sm)) / 60) * HOUR_H, 8);

        const c = COLORS[ev.color || 0];
        const isSelected = ev.id === "__selected_slot__";
        const alpha = isSelected ? 0.5 : 0.15;

        const block = document.createElement("div");
        block.className = "merged-event-block";
        block.style.top = `${top}px`;
        block.style.height = `${height}px`;
        block.style.background = hexToRgba(c.border, alpha);

        if (isSelected) {
            block.style.border = `2px solid ${c.border}`;
            block.style.borderLeft = `4px solid ${c.border}`;
        }

        col.appendChild(block);
    });
}

function initHeaderTitle() {
    const draft = readDraft();
    const title = document.getElementById("meetingTitle");
    if (title && draft?.name) {
        title.textContent = `Встреча: ${draft.name}`;
    }
}

async function buildAll() {
    buildHeader();
    buildTimeCol();
    buildGrid();
    renderMiniCalendar();

    try {
        await loadMergedCalendar();
        restoreSelectedTime();
        renderMergedEvents();
        const draft = readDraft();
        const durationMinutes = parseDraftDuration(draft?.duration);
        const meetingRange = getMeetingRangeFromDraft();

        renderMeetingRangeLabel(meetingRange);

        if (meetingRange) {
            void triggerSlotSuggester(participantUsers, meetingRange, durationMinutes ?? 60);
        }
    } catch (error) {
        alert(error?.message || "Не удалось загрузить объединенный календарь");
    }
}

function parseDraftDuration(value) {
    if (!value) {
        return null;
    }

    const [h, m] = value.split(":").map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) {
        return null;
    }

    return h * 60 + m;
}

document.getElementById("prevBtn").onclick = async () => {
    state.weekOffset--;
    await buildAll();
};

document.getElementById("nextBtn").onclick = async () => {
    state.weekOffset++;
    await buildAll();
};

document.getElementById("todayBtn").onclick = async () => {
    state.weekOffset = 0;
    await buildAll();
};

initHeaderTitle();
await initParticipants();
initParticipantsSearch();
await buildAll();
initMiniCalendar(() => {
    void buildAll();
});

const now = new Date();
document.getElementById("calBody").scrollTop = Math.max((now.getHours() - 1) * HOUR_H, 0);

document.getElementById("meetingSelectTimeBtn")?.addEventListener("click", () => {
    openTimePickerPopup(getLastSlots(), getDuration());
});

document.addEventListener("slots:slotSelected", () => {
    renderMergedEvents();
});

document.getElementById("meetingConfirmBtn")?.addEventListener("click", async () => {
    const draft = readDraft();
    if (!draft?.start || !draft?.end) {
        alert("Выберите время встречи");
        return;
    }

    try {
        const token = getToken();
        const response = await fetch(`${API_URL}/meetings`, {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify({
                startTime: new Date(draft.start).toISOString(),
                endTime: new Date(draft.end).toISOString(),
                name: draft.name || "Новая встреча",
                comment: draft.comment || "",
                isOnline: false,
                participantIds: draft.participantIds || []
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Ошибка создания встречи: ${response.status}`);
        }


        sessionStorage.removeItem("meetingDraft");
        window.location.href = "/";
    } catch (error) {
        alert(error?.message || "Не удалось создать встречу");
    }
});