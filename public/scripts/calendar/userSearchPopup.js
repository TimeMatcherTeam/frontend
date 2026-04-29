import { API_URL } from "../requests.js";
import { getCookie, getToken } from "../jwtUtils.js";

const SEARCH_LIMIT = 8;
const MIN_SEARCH_LENGTH = 2;

let popupInitialized = false;
let searchTimer = null;
let selectedUsers = [];

function getCurrentUserId() {
    return getCookie("userId") || null;
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

function addUsersToSelection(users) {
    const normalizedUsers = (Array.isArray(users) ? users : [])
        .map(normalizeUser)
        .filter(Boolean)
        .filter(user => String(user.id) !== String(getCurrentUserId()));

    if (normalizedUsers.length === 0) {
        return false;
    }

    const existingIds = new Set(selectedUsers.map(user => user.id));
    let changed = false;

    normalizedUsers.forEach(user => {
        if (!existingIds.has(user.id)) {
            selectedUsers.push(user);
            existingIds.add(user.id);
            changed = true;
        }
    });

    if (changed) {
        renderSelectedUsers();
    }

    return changed;
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

async function requestJson(url) {
    const response = await fetch(url, {
        headers: getAuthHeaders()
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

async function getUsers(searchText) {
    const params = new URLSearchParams({
        SearchText: searchText,
        Limit: String(SEARCH_LIMIT),
        Page: "1"
    });

    return requestJson(`${API_URL}/users?${params.toString()}`);
}

function getElements() {
    return {
        popupBg: document.getElementById("meetingUsersPopupBg"),
        closeBtn: document.getElementById("meetingUsersPopupCloseBtn"),
        cancelBtn: document.getElementById("meetingUsersPopupCancelBtn"),
        searchInput: document.getElementById("meetingUsersSearchInput"),
        status: document.getElementById("meetingUsersSearchStatus"),
        results: document.getElementById("meetingUsersResults"),
        selected: document.getElementById("meetingUsersSelected")
    };
}

function renderSelectedUsers() {
    const { selected } = getElements();
    if (!selected) {
        return;
    }

    selected.replaceChildren();

    if (selectedUsers.length === 0) {
        const empty = document.createElement("div");
        empty.className = "meeting-users-empty";
        empty.textContent = "Пока никто не выбран";
        selected.appendChild(empty);
        return;
    }

    selectedUsers.forEach(user => {
        const chip = document.createElement("button");
        chip.type = "button";
        chip.className = "meeting-user-chip";
        chip.textContent = `${user.userName} · ${user.email}`;
        chip.title = "Нажмите, чтобы убрать";
        chip.addEventListener("click", () => {
            selectedUsers = selectedUsers.filter(item => item.id !== user.id);
            renderSelectedUsers();
        });
        selected.appendChild(chip);
    });
}

function renderStatus(message, isError = false) {
    const { status } = getElements();
    if (!status) {
        return;
    }

    status.textContent = message || "";
    status.classList.toggle("is-error", isError);
}

function renderResults(users) {
    const { results } = getElements();
    if (!results) {
        return;
    }

    results.replaceChildren();

    if (!Array.isArray(users) || users.length === 0) {
        const empty = document.createElement("div");
        empty.className = "meeting-users-empty";
        empty.textContent = "Ничего не найдено";
        results.appendChild(empty);
        return;
    }

    users.forEach(user => {
        const isSelected = selectedUsers.some(item => item.id === user.id);
        const row = document.createElement("div");
        row.className = "meeting-user-row";
        if (isSelected) {
            row.classList.add("is-selected");
        }

        const info = document.createElement("div");
        info.className = "meeting-user-info";

        const name = document.createElement("div");
        name.className = "meeting-user-name";
        name.textContent = user.userName || "Без имени";

        const email = document.createElement("div");
        email.className = "meeting-user-email";
        email.textContent = user.email || "";

        info.append(name, email);

        const action = document.createElement("button");
        action.type = "button";
        action.className = "meeting-user-add-btn";
        action.textContent = isSelected ? "Добавлен" : "Добавить";
        action.disabled = isSelected;
        action.addEventListener("click", () => {
            addUsersToSelection([user]);
            renderResults(users);
        });

        row.append(info, action);
        results.appendChild(row);
    });
}

function clearResults() {
    const { results } = getElements();
    if (!results) {
        return;
    }

    results.replaceChildren();
}

async function runSearch() {
    const { searchInput } = getElements();
    if (!searchInput) {
        return;
    }

    const searchText = searchInput.value.trim();
    if (searchText.length < MIN_SEARCH_LENGTH) {
        renderStatus(`Введите минимум ${MIN_SEARCH_LENGTH} символа для поиска.`);
        clearResults();
        return;
    }

    renderStatus("Поиск...");

    try {
        const users = await getUsers(searchText);
        const currentUserId = getCurrentUserId();
        const filteredUsers = (Array.isArray(users) ? users : [])
            .map(normalizeUser)
            .filter(Boolean)
            .filter(user => String(user.id) !== String(currentUserId));

        renderStatus(filteredUsers.length > 0 ? `Найдено: ${filteredUsers.length}` : "Совпадений нет");
        renderResults(filteredUsers);
    } catch (error) {
        renderStatus(error?.message || "Не удалось выполнить поиск", true);
        renderResults([]);
    }
}

function scheduleSearch() {
    if (searchTimer) {
        clearTimeout(searchTimer);
    }

    searchTimer = setTimeout(() => {
        runSearch();
    }, 250);
}

function openPopup() {
    const { popupBg, searchInput } = getElements();
    if (!popupBg) {
        return;
    }

    popupBg.style.display = "flex";
    renderSelectedUsers();
    renderStatus(`Введите минимум ${MIN_SEARCH_LENGTH} символа для поиска.`);
    clearResults();

    if (searchInput) {
        searchInput.value = "";
        searchInput.focus();
    }
}

export function openMeetingUsersPopup() {
    openPopup();
}

export function closeMeetingUsersPopup() {
    const { popupBg } = getElements();
    if (!popupBg) {
        return;
    }

    popupBg.style.display = "none";
    window.dispatchEvent(new CustomEvent("meetingUsersPopupClosed"));
}

export function addMeetingUsers(users) {
    return addUsersToSelection(users);
}

export function getMeetingSelectedUsers() {
    return selectedUsers.map(user => ({ ...user }));
}

export function initMeetingUsersPopup() {
    if (popupInitialized) {
        return;
    }

    const { popupBg, closeBtn, cancelBtn, searchInput } = getElements();
    if (!popupBg || !closeBtn || !cancelBtn || !searchInput) {
        return;
    }

    popupInitialized = true;

    const openBtn = document.getElementById("meetingAddParticipantsBtn");
    
    // Только если кнопка существует
    if (openBtn) {
        openBtn.addEventListener("click", openPopup);
    }
    
    closeBtn.addEventListener("click", closeMeetingUsersPopup);
    cancelBtn.addEventListener("click", closeMeetingUsersPopup);
    popupBg.addEventListener("click", event => {
        if (event.target === popupBg) {
            closeMeetingUsersPopup();
        }
    });
    searchInput.addEventListener("input", scheduleSearch);
    searchInput.addEventListener("keydown", event => {
        if (event.key === "Enter") {
            event.preventDefault();
            runSearch();
        }
        if (event.key === "Escape") {
            closeMeetingUsersPopup();
        }
    });
}