import { API_URL } from "../requests.js";
import { getCookie, getToken } from "../jwtUtils.js";
import { getMeetingSelectedUsers, openMeetingUsersPopup } from "./userSearchPopup.js";

let popupInitialized = false;
let selectedUsers = [];

function getCurrentUserId() {
    const userId = getCookie("userId");
    if (!userId) {
        throw new Error("Не удалось определить пользователя: отсутствует userId.");
    }

    return userId;
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

async function requestJson(url, options = {}) {
    const response = await fetch(url, {
        ...options,
        headers: {
            ...(options.headers || {}),
            ...getAuthHeaders()
        }
    });

    if (!response.ok) {
        let message = `Ошибка ${response.status}`;
        try {
            const error = await response.json();
            message = error?.detail || error?.title || message;
        } catch {
            // Ignore non-json error body.
        }
        throw new Error(message);
    }

    if (response.status === 204) {
        return null;
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
        return null;
    }

    return response.json();
}

function getElements() {
    return {
        popupBg: document.getElementById("createGroupPopupBg"),
        closeBtn: document.getElementById("createGroupPopupCloseBtn"),
        titleInput: document.getElementById("createGroupTitleInput"),
        addParticipantsBtn: document.getElementById("createGroupAddParticipantsBtn"),
        selectedList: document.getElementById("createGroupSelectedList"),
        confirmBtn: document.getElementById("createGroupConfirmBtn"),
        cancelBtn: document.getElementById("createGroupCancelBtn"),
        status: document.getElementById("createGroupStatus")
    };
}

function renderStatus(message, isError = false) {
    const { status } = getElements();
    if (!status) {
        return;
    }

    status.textContent = message || "";
    status.classList.toggle("is-error", isError);
}

function renderSelectedUsers() {
    const { selectedList } = getElements();
    if (!selectedList) {
        return;
    }

    selectedList.replaceChildren();

    if (selectedUsers.length === 0) {
        const empty = document.createElement("div");
        empty.className = "create-group-users-empty";
        empty.textContent = "Пока никто не выбран";
        selectedList.appendChild(empty);
        return;
    }

    selectedUsers.forEach(user => {
        const chip = document.createElement("button");
        chip.type = "button";
        chip.className = "create-group-user-chip";
        chip.textContent = `${user.userName} · ${user.email}`;
        chip.title = "Нажмите, чтобы убрать";
        chip.addEventListener("click", () => {
            selectedUsers = selectedUsers.filter(item => item.id !== user.id);
            renderSelectedUsers();
        });
        selectedList.appendChild(chip);
    });
}

function openPopup() {
    const { popupBg, titleInput } = getElements();
    if (!popupBg) {
        return;
    }

    popupBg.style.display = "flex";
    selectedUsers = [];
    renderSelectedUsers();
    renderStatus("");

    if (titleInput) {
        titleInput.value = "";
        titleInput.focus();
    }
}

export function closeCreateGroupPopup() {
    const { popupBg } = getElements();
    if (!popupBg) {
        return;
    }

    popupBg.style.display = "none";
}

async function createGroup() {
    const { titleInput, confirmBtn } = getElements();
    const groupName = titleInput?.value?.trim() || "";

    if (!groupName) {
        renderStatus("Введите название группы", true);
        return;
    }

    if (confirmBtn) {
        confirmBtn.disabled = true;
    }

    try {
        const userId = getCurrentUserId();
        const participantIds = [userId, ...selectedUsers.map(user => user.id)];

        const group = await requestJson(`${API_URL}/groups`, {
            method: "POST",
            body: JSON.stringify({
                name: groupName,
                participantIds: Array.from(new Set(participantIds))
            })
        });

        renderStatus("Группа создана успешно!");
        
        // Clear state after successful creation
        selectedUsers = [];
        if (titleInput) {
            titleInput.value = "";
        }
        
        setTimeout(() => {
            closeCreateGroupPopup();
            // Trigger a refresh of groups (if callback is provided)
            if (window.onGroupCreated) {
                window.onGroupCreated(group);
            }
        }, 500);
    } catch (error) {
        renderStatus(error?.message || "Не удалось создать группу", true);
    } finally {
        if (confirmBtn) {
            confirmBtn.disabled = false;
        }
    }
}

export function initCreateGroupPopup() {
    if (popupInitialized) {
        return;
    }

    const { popupBg, closeBtn, addParticipantsBtn, confirmBtn, cancelBtn } = getElements();
    if (!popupBg || !closeBtn || !addParticipantsBtn || !confirmBtn || !cancelBtn) {
        return;
    }

    popupInitialized = true;

    const openBtn = document.getElementById("actionGroup");

    if (openBtn) {
        openBtn.addEventListener("click", openPopup);
    }

    closeBtn.addEventListener("click", closeCreateGroupPopup);
    cancelBtn.addEventListener("click", closeCreateGroupPopup);
    
    addParticipantsBtn.addEventListener("click", () => {
        openMeetingUsersPopup();
    });

    window.addEventListener("meetingUsersPopupClosed", () => {
        const selected = getMeetingSelectedUsers();
        if (selected) {
            selectedUsers = [...selected];
            renderSelectedUsers();
        }
    });

    confirmBtn.addEventListener("click", async (e) => {
        e.preventDefault();
        await createGroup();
    });

    popupBg.addEventListener("click", event => {
        if (event.target === popupBg) {
            closeCreateGroupPopup();
        }
    });
}

export function openCreateGroupPopup() {
    const { popupBg, titleInput } = getElements();
    if (!popupBg) return;
    
    popupBg.style.display = "flex";
    selectedUsers = [];
    renderSelectedUsers();
    renderStatus("");
    
    if (titleInput) {
        titleInput.value = "";
        titleInput.focus();
    }
}