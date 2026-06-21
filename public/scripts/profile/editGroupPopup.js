import { API_URL, getAuthHeaders } from "../requests.js";
import { getCookie, getToken } from "../jwtUtils.js";
import { openMeetingUsersPopup, addMeetingUsers, getMeetingSelectedUsers, resetMeetingSelectedUsers } from "../calendar/userSearchPopup.js";

let popupInitialized = false;
let currentGroup = null;
let originalParticipantIds = [];
let selectedUsers = [];
let currentGroupCreatorId = null;

function normalizeParticipant(participant) {
    if (!participant) {
        return null;
    }

    const id = participant.id ?? participant.userId ?? participant.UserId;
    if (!id) {
        return null;
    }

    return {
        id,
        userName: participant.userName ?? participant.UserName ?? "Без имени",
        email: participant.email ?? participant.Email ?? ""
    };
}


async function requestJson(url, options = {}) {
    const response = await fetch(url, { ...options, headers: { ...(options.headers || {}), ...getAuthHeaders() } });
    if (!response.ok) {
        let message = `Ошибка ${response.status}`;
        try { const error = await response.json(); message = error?.detail || error?.title || message; } catch {}
        throw new Error(message);
    }
    if (response.status === 204) return null;
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) return null;
    return response.json();
}

function createElement(tagName, className, options = {}) {
    const element = document.createElement(tagName);
    if (className) {
        element.className = className;
    }
    if (options.id) {
        element.id = options.id;
    }
    if (options.type) {
        element.type = options.type;
    }
    if (options.text != null) {
        element.textContent = options.text;
    }
    if (options.placeholder) {
        element.placeholder = options.placeholder;
    }
    if (options.for) {
        element.htmlFor = options.for;
    }
    return element;
}

function appendFields(parent, children) {
    children.forEach(child => parent.appendChild(child));
    return parent;
}

function createPopupDom() {
    if (document.getElementById("editGroupPopupBg")) return;

    const bg = document.createElement("div");
    bg.className = "overlay";
    bg.id = "editGroupPopupBg";
    bg.style.display = "none";

    const popup = document.createElement("div");
    popup.className = "create-group-popup";

    const header = createElement("div", "create-group-popup-header");
    const title = createElement("div", "create-group-popup-title", { text: "Редактирование группы" });
    const closeBtn = createElement("button", "create-group-popup-close", {
        id: "editGroupPopupCloseBtn",
        type: "button",
        text: "×"
    });
    header.append(title, closeBtn);

    const body = createElement("div", "create-group-popup-body");

    const field = createElement("div", "create-group-field");
    const label = createElement("label", "", { for: "editGroupTitleInput", text: "Название группы:" });
    const titleInput = createElement("input", "", {
        id: "editGroupTitleInput",
        type: "text"
    });
    field.append(label, titleInput);

    const addParticipantsBtn = createElement("button", "create-group-secondary-btn", {
        id: "editGroupAddParticipantsBtn",
        type: "button",
        text: "Добавить участников"
    });

    const section = createElement("div", "create-group-section");
    const sectionTitle = createElement("div", "create-group-section-title", { text: "Участники" });
    const selectedList = createElement("div", "", { id: "editGroupSelectedList" });
    section.append(sectionTitle, selectedList);

    const status = createElement("div", "create-group-status", { id: "editGroupStatus" });
    body.append(field, addParticipantsBtn, section, status);

    const footer = createElement("div", "create-group-popup-footer");
    const saveBtn = createElement("button", "create-group-primary-btn action-button", {
        id: "editGroupSaveBtn",
        type: "button",
        text: "Сохранить"
    });
    const deleteBtn = createElement("button", "create-group-primary-btn cancel-button", {
        id: "editGroupDeleteBtn",
        type: "button",
        text: "Удалить группу"
    });
    const cancelBtn = createElement("button", "create-group-primary-btn cancel-button create-group-cancel-btn", {
        id: "editGroupCancelBtn",
        type: "button",
        text: "Отмена"
    });
    footer.append(saveBtn, deleteBtn, cancelBtn);

    popup.append(header, body, footer);

    bg.appendChild(popup);
    document.body.appendChild(bg);

    document.getElementById("editGroupPopupCloseBtn").addEventListener("click", closeEditGroupPopup);
    document.getElementById("editGroupCancelBtn").addEventListener("click", closeEditGroupPopup);
    document.getElementById("editGroupAddParticipantsBtn").addEventListener("click", () => {
        // preload currently selected users into meeting popup
        resetMeetingSelectedUsers();
        addMeetingUsers(selectedUsers);
        openMeetingUsersPopup({ preserveSelection: true });
    });

    document.getElementById("editGroupSaveBtn").addEventListener("click", async () => {
        await saveGroupChanges();
    });

    document.getElementById("editGroupDeleteBtn").addEventListener("click", async () => {
        if (!currentGroup) return;
        if (!confirm("Удалить группу? Это действие нельзя будет отменить.")) return;
        try {
            await requestJson(`${API_URL}/groups/${currentGroup.id}`, { method: "DELETE" });
            closeEditGroupPopup();
            if (typeof window.onGroupCreated === "function") window.onGroupCreated();
        } catch (err) {
            renderStatus(err.message, true);
        }
    });

    // close when clicking overlay
    bg.addEventListener("click", e => { if (e.target === bg) closeEditGroupPopup(); });

    // when meeting users popup closes, import selection
    window.addEventListener("meetingUsersPopupClosed", () => {
        const sel = getMeetingSelectedUsers();
        if (Array.isArray(sel)) {
            selectedUsers = [...sel];
            renderSelectedUsers();
        }
    });
}

function renderStatus(message, isError = false) {
    const el = document.getElementById("editGroupStatus");
    if (!el) return;
    el.textContent = message || "";
    el.classList.toggle("is-error", !!isError);
}

function renderSelectedUsers() {
    const host = document.getElementById("editGroupSelectedList");
    if (!host) return;
    host.replaceChildren();
    if (!selectedUsers || selectedUsers.length === 0) {
        const empty = document.createElement("div");
        empty.className = "create-group-users-empty";
        empty.textContent = "Пока никто не выбран";
        host.appendChild(empty);
        return;
    }

    selectedUsers.forEach(user => {
        const chip = document.createElement("div");
        chip.className = "create-group-user-chip";

        const label = document.createElement("span");
        label.textContent = `${user.userName} · ${user.email}`;
        chip.appendChild(label);

        const isCreator = currentGroupCreatorId && String(user.id) === String(currentGroupCreatorId);
        if (isCreator) {
            const badge = document.createElement("span");
            badge.className = "create-group-user-creator-badge";
            badge.textContent = "создатель";
            chip.appendChild(badge);
        } else {
            const removeBtn = document.createElement("button");
            removeBtn.type = "button";
            removeBtn.textContent = "×";
            removeBtn.className = "create-group-user-remove";
            removeBtn.addEventListener("click", () => {
                selectedUsers = selectedUsers.filter(u => String(u.id) !== String(user.id));
                renderSelectedUsers();
            });
            chip.appendChild(removeBtn);
        }
        host.appendChild(chip);
    });
}

export function initEditGroupPopup() {
    if (popupInitialized) return;
    createPopupDom();
    popupInitialized = true;
}

export function openEditGroupPopup(group) {
    initEditGroupPopup();
    currentGroup = group;
    const organizer = group?.participants?.find(p => p.role === 0 || p.role === "Organizer");
    currentGroupCreatorId = organizer?.userId ?? null;
    selectedUsers = Array.isArray(group?.participants)
        ? group.participants.map(normalizeParticipant).filter(Boolean)
        : [];
    originalParticipantIds = selectedUsers.map(participant => String(participant.id));

    const bg = document.getElementById("editGroupPopupBg");
    const titleInput = document.getElementById("editGroupTitleInput");
    if (!bg) return;
    if (titleInput) {
        titleInput.value = group?.name || "";
    }
    // determine whether current user is likely the group creator
    const currentUserId = getCookie("userId");
    const isCreator = currentGroupCreatorId && String(currentGroupCreatorId) === String(currentUserId);

    // adjust delete button semantics based on role
    const deleteBtn = document.getElementById("editGroupDeleteBtn");
    if (deleteBtn) {
        if (isCreator) {
            deleteBtn.textContent = "Удалить группу";
            // existing behavior already wired in createPopupDom
        } else {
            deleteBtn.textContent = "Выйти из группы";
            deleteBtn.onclick = async () => {
                if (!currentGroup) return;
                if (!confirm("Вы уверены, что хотите покинуть группу?")) return;
                try {
                    const userId = getCookie("userId");
                    await requestJson(`${API_URL}/groups/${currentGroup.id}/participants/${userId}`, { method: "DELETE" });
                    closeEditGroupPopup();
                    if (typeof window.onGroupCreated === "function") window.onGroupCreated();
                } catch (err) {
                    renderStatus(err.message || "Не удалось покинуть группу", true);
                }
            };
        }
    }

    renderSelectedUsers();
    renderStatus("");
    bg.style.display = "flex";
}

export function closeEditGroupPopup() {
    const bg = document.getElementById("editGroupPopupBg");
    if (!bg) return;
    bg.style.display = "none";
    currentGroup = null;
    currentGroupCreatorId = null;
    originalParticipantIds = [];
    selectedUsers = [];
}

async function saveGroupChanges() {
    if (!currentGroup) return;
    const titleInput = document.getElementById("editGroupTitleInput");
    const name = titleInput?.value?.trim() || "";
    if (!name) {
        renderStatus("Название не может быть пустым", true);
        return;
    }

    try {
        // update name
        await requestJson(`${API_URL}/groups/${currentGroup.id}`, {
            method: "PUT",
            body: JSON.stringify({ name })
        });

        const newIds = new Set(selectedUsers.map(u => String(u.id)));
        const origIds = new Set(originalParticipantIds.map(id => String(id)));

        // participants to add
        for (const u of selectedUsers) {
            if (!origIds.has(String(u.id))) {
                // POST expects GUID in body
                await requestJson(`${API_URL}/groups/${currentGroup.id}/participants`, {
                    method: "POST",
                    body: JSON.stringify(u.id)
                });
            }
        }

        // participants to remove
        for (const origId of originalParticipantIds) {
            if (!newIds.has(String(origId))) {
                await requestJson(`${API_URL}/groups/${currentGroup.id}/participants/${origId}`, {
                    method: "DELETE"
                });
            }
        }

        renderStatus("Изменения сохранены");
        // refresh groups list in profile
        if (typeof window.onGroupCreated === "function") window.onGroupCreated();
        setTimeout(() => closeEditGroupPopup(), 400);
    } catch (err) {
        renderStatus(err.message || "Не удалось сохранить изменения", true);
    }
}

export default {
    initEditGroupPopup,
    openEditGroupPopup,
    closeEditGroupPopup
};
