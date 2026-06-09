import { API_URL } from "../requests.js";
import { getCookie, getToken } from "../jwtUtils.js";

let popupInitialized = false;
let currentMeeting = null; // the calendar event object

function getAuthHeaders() {
    const token = getToken();
    if (!token) throw new Error("Необходима авторизация.");
    return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

async function requestJson(url, options = {}) {
    const response = await fetch(url, {
        ...options,
        headers: { ...(options.headers || {}), ...getAuthHeaders() }
    });
    if (!response.ok) {
        let message = `Ошибка ${response.status}`;
        try { const err = await response.json(); message = err?.detail || err?.title || message; } catch {}
        throw new Error(message);
    }
    if (response.status === 204) return null;
    const ct = response.headers.get("content-type") || "";
    if (!ct.includes("application/json")) return null;
    return response.json();
}

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

function createPopupDom() {
    if (document.getElementById("meetingEditPopupBg")) return;

    const bg = document.createElement("div");
    bg.className = "overlay";
    bg.id = "meetingEditPopupBg";
    bg.style.display = "none";

    const popup = document.createElement("div");
    popup.className = "create-group-popup meeting-edit-popup";

    // Header
    const header = document.createElement("div");
    header.className = "create-group-popup-header";
    const title = document.createElement("div");
    title.className = "create-group-popup-title";
    title.textContent = "Редактирование встречи";
    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "create-group-popup-close";
    closeBtn.id = "meetingEditCloseBtn";
    closeBtn.textContent = "×";
    header.append(title, closeBtn);

    // Body
    const body = document.createElement("div");
    body.className = "create-group-popup-body";

    // Name field
    const nameField = document.createElement("div");
    nameField.className = "create-group-field";
    const nameLabel = document.createElement("label");
    nameLabel.htmlFor = "meetingEditNameInput";
    nameLabel.textContent = "Название встречи:";
    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.id = "meetingEditNameInput";
    nameField.append(nameLabel, nameInput);

    // Comment field
    const commentField = document.createElement("div");
    commentField.className = "create-group-field";
    const commentLabel = document.createElement("label");
    commentLabel.htmlFor = "meetingEditCommentInput";
    commentLabel.textContent = "Комментарий:";
    const commentInput = document.createElement("input");
    commentInput.type = "text";
    commentInput.id = "meetingEditCommentInput";
    commentField.append(commentLabel, commentInput);

    // Time info (read-only)
    const timeField = document.createElement("div");
    timeField.className = "create-group-field";
    const timeLabel = document.createElement("label");
    timeLabel.textContent = "Время:";
    const timeInfo = document.createElement("div");
    timeInfo.id = "meetingEditTimeInfo";
    timeInfo.className = "meeting-edit-time-info";
    timeField.append(timeLabel, timeInfo);

    // Participants section
    const section = document.createElement("div");
    section.className = "create-group-section";
    const sectionTitle = document.createElement("div");
    sectionTitle.className = "create-group-section-title";
    sectionTitle.textContent = "Участники";
    const participantsList = document.createElement("div");
    participantsList.id = "meetingEditParticipantsList";
    section.append(sectionTitle, participantsList);

    const status = document.createElement("div");
    status.className = "create-group-status";
    status.id = "meetingEditStatus";

    body.append(nameField, commentField, timeField, section, status);

    // Footer
    const footer = document.createElement("div");
    footer.className = "create-group-popup-footer";
    const saveBtn = document.createElement("button");
    saveBtn.type = "button";
    saveBtn.className = "create-group-primary-btn action-button";
    saveBtn.id = "meetingEditSaveBtn";
    saveBtn.textContent = "Сохранить";
    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.className = "create-group-primary-btn cancel-button create-group-cancel-btn";
    cancelBtn.id = "meetingEditCancelBtn";
    cancelBtn.textContent = "Отмена";
    footer.append(saveBtn, cancelBtn);

    popup.append(header, body, footer);
    bg.appendChild(popup);
    document.body.appendChild(bg);

    // Events
    document.getElementById("meetingEditCloseBtn").addEventListener("click", closeMeetingEditPopup);
    document.getElementById("meetingEditCancelBtn").addEventListener("click", closeMeetingEditPopup);
    bg.addEventListener("click", e => { if (e.target === bg) closeMeetingEditPopup(); });

    document.getElementById("meetingEditSaveBtn").addEventListener("click", async () => {
        await saveMeetingChanges();
    });
}

export function initMeetingEditPopup() {
    if (popupInitialized) return;
    createPopupDom();
    popupInitialized = true;
}

export async function openMeetingEditPopup(ev) {
    initMeetingEditPopup();
    currentMeeting = ev;

    const bg = document.getElementById("meetingEditPopupBg");
    if (!bg) return;

    // Fill fields from event
    const nameInput = document.getElementById("meetingEditNameInput");
    const commentInput = document.getElementById("meetingEditCommentInput");
    const timeInfo = document.getElementById("meetingEditTimeInfo");

    if (nameInput) nameInput.value = ev.name || "";
    if (commentInput) commentInput.value = ev.comment || "";
    if (timeInfo) timeInfo.textContent = `${ev.start} – ${ev.end}`;

    renderStatus("Загружаем участников…");
    bg.style.display = "flex";

    // Load full meeting details from API to get participants
    try {
        const targetId = ev.meetingId || ev.id;
        const details = await loadMeetingDetails(targetId);
        const participants = Array.isArray(details?.participants)
            ? details.participants
            : (Array.isArray(ev.participants) ? ev.participants : []);
        const creatorId = details?.creatorId || details?.organizerId || ev.creatorId;

        // Update currentMeeting with fresh details
        currentMeeting = { ...ev, participants, creatorId: creatorId || ev.creatorId };

        if (nameInput && details?.name) nameInput.value = details.name;
        if (commentInput && (details?.comment || details?.description)) {
            commentInput.value = details.comment || details.description || "";
        }

        renderParticipants(participants, creatorId);
        renderStatus("");
    } catch {
        // Fallback: use data already in the event
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
        // Update event name in state if possible
        if (currentMeeting) currentMeeting.name = name;
        setTimeout(() => closeMeetingEditPopup(), 400);
    } catch (err) {
        renderStatus(err.message || "Не удалось сохранить изменения", true);
    }
}
