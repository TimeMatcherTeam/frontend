import { API_URL, getAuthHeaders, requestJson } from "../requests.js";
import { getCookie } from "../jwtUtils.js";
import { state } from "./state.js";
import { renderEvents } from "./grid.js";

let popupInitialized = false;
let currentMeeting = null;


async function loadMeetingDetails(meetingId) {
    return requestJson(`${API_URL}/meetings/${meetingId}`, { method: "GET" });
}

function normalizeParticipant(p) {
    if (!p) return null;
    const id = p.id ?? p.userId ?? p.UserId;
    if (!id) return null;
    return {
        id,
        userName: p.userName ?? p.UserName ?? p.name ?? "Без имени",
        email: p.email ?? p.Email ?? ""
    };
}

function renderStatus(message, isError = false) {
    const el = document.getElementById("meetingEditStatus");
    if (!el) return;
    el.textContent = message || "";
    el.classList.toggle("is-error", !!isError);
}

function renderParticipants(participants, creatorId) {
    const list = document.getElementById("meetingEditParticipantsList");
    if (!list) return;
    list.replaceChildren();

    if (!Array.isArray(participants) || participants.length === 0) {
        const empty = document.createElement("div");
        empty.className = "meeting-edit-participants-empty";
        empty.textContent = "Участников нет";
        list.appendChild(empty);
        return;
    }

    participants.forEach(p => {
        const normalized = normalizeParticipant(p);
        if (!normalized) return;

        const row = document.createElement("div");
        row.className = "meeting-edit-participant-row";

        const info = document.createElement("div");
        info.className = "meeting-edit-participant-info";

        const name = document.createElement("div");
        name.className = "meeting-edit-participant-name";
        name.textContent = normalized.userName;

        const email = document.createElement("div");
        email.className = "meeting-edit-participant-email";
        email.textContent = normalized.email;

        info.append(name, email);

        const isCreator = creatorId && String(normalized.id) === String(creatorId);
        if (isCreator) {
            const badge = document.createElement("span");
            badge.className = "meeting-edit-creator-badge";
            badge.textContent = "создатель";
            row.append(info, badge);
        } else {
            row.appendChild(info);
        }

        list.appendChild(row);
    });
}


export function initMeetingEditPopup() {
    if (popupInitialized) return;

    document.getElementById("meetingEditCloseBtn").addEventListener("click", closeMeetingEditPopup);
    document.getElementById("meetingEditCancelBtn").addEventListener("click", closeMeetingEditPopup);
    document.getElementById("meetingEditSaveBtn").addEventListener("click", async () => {
        await saveMeetingChanges();
    });
    document.getElementById("meetingEditPopupBg").addEventListener("click", e => {
        if (e.target === document.getElementById("meetingEditPopupBg")) closeMeetingEditPopup();
    });

    popupInitialized = true;
}

export async function openMeetingEditPopup(ev) {
    initMeetingEditPopup();
    currentMeeting = ev;

    const bg = document.getElementById("meetingEditPopupBg");
    if (!bg) return;

    const nameInput = document.getElementById("meetingEditNameInput");
    const commentInput = document.getElementById("meetingEditCommentInput");
    const timeInfo = document.getElementById("meetingEditTimeInfo");

    if (nameInput) nameInput.value = ev.name || "";
    if (commentInput) commentInput.value = ev.comment || "";
    if (timeInfo) timeInfo.textContent = `${ev.start} – ${ev.end}`;

    renderStatus("Загружаем участников…");
    bg.style.display = "flex";

    try {
        const targetId = ev.meetingId || ev.id;
        const details = await loadMeetingDetails(targetId);
        const participants = Array.isArray(details?.participants)
            ? details.participants
            : (Array.isArray(ev.participants) ? ev.participants : []);
        const creatorId = details?.creatorId || details?.organizerId || ev.creatorId;
        currentMeeting = { ...ev, participants, creatorId: creatorId || ev.creatorId };

        if (nameInput && details?.name) nameInput.value = details.name;
        if (commentInput && (details?.comment || details?.description)) {
            commentInput.value = details.comment || details.description || "";
        }

        renderParticipants(participants, creatorId);
        renderStatus("");
    } catch {
        renderParticipants(ev.participants || [], ev.creatorId);
        renderStatus("");
    }
}

export function closeMeetingEditPopup() {
    const bg = document.getElementById("meetingEditPopupBg");
    if (!bg) return;
    bg.style.display = "none";
    currentMeeting = null;
    renderStatus("");
}

async function saveMeetingChanges() {
    if (!currentMeeting) return;
    const nameInput = document.getElementById("meetingEditNameInput");
    const commentInput = document.getElementById("meetingEditCommentInput");

    const name = nameInput?.value?.trim() || "";
    if (!name) {
        renderStatus("Название не может быть пустым", true);
        return;
    }

    const comment = commentInput?.value?.trim() || "";
    const targetId = currentMeeting.meetingId || currentMeeting.id;

    try {
        await requestJson(`${API_URL}/meetings/${targetId}`, {
            method: "PUT",
            body: JSON.stringify({ name, comment })
        });
        renderStatus("Изменения сохранены");
        if (currentMeeting) {
            state.events = state.events.map(e =>
              e.meetingId === currentMeeting.meetingId ? { ...e, name, comment } : e
            );
            renderEvents();
        }
        setTimeout(() => closeMeetingEditPopup(), 400);
    } catch (err) {
        renderStatus(err.message || "Не удалось сохранить изменения", true);
    }
}
