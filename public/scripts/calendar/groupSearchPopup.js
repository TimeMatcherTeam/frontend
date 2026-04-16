import { API_URL } from "../requests.js";
import { getCookie, getToken } from "../jwtUtils.js";
import { addMeetingUsers } from "./userSearchPopup.js";
import { createUserGroupsBlock } from "./components/userGroupsBlock.js";

const MIN_SEARCH_LENGTH = 1;

let popupInitialized = false;
let groupsCache = null;
let searchTimer = null;
let allGroupsBlock = null;

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

function getCurrentUserId() {
    const userId = getCookie("userId");
    if (!userId) {
        throw new Error("Не удалось определить пользователя: отсутствует userId.");
    }

    return userId;
}

async function getGroups() {
    if (groupsCache) {
        return groupsCache;
    }

    const userId = getCurrentUserId();
    const groups = await requestJson(`${API_URL}/users/${userId}/groups`);
    groupsCache = Array.isArray(groups) ? groups : [];
    return groupsCache;
}

function getElements() {
    return {
        popupBg: document.getElementById("meetingGroupsPopupBg"),
        closeBtn: document.getElementById("meetingGroupsPopupCloseBtn"),
        cancelBtn: document.getElementById("meetingGroupsPopupCancelBtn"),
        searchInput: document.getElementById("meetingGroupsSearchInput"),
        status: document.getElementById("meetingGroupsSearchStatus"),
        results: document.getElementById("meetingGroupsResults"),
        allGroupsHost: document.getElementById("meetingAllGroupsBlock")
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

function clearResults() {
    const { results } = getElements();
    if (!results) {
        return;
    }

    results.innerHTML = "";
}

function normalizeText(value) {
    return String(value || "").toLowerCase().trim();
}

function filterGroups(groups, searchText) {
    const normalizedSearch = normalizeText(searchText);
    if (!normalizedSearch) {
        return groups;
    }

    return groups.filter(group => {
        const nameMatch = normalizeText(group.name).includes(normalizedSearch);
        const participantMatch = Array.isArray(group.participants) && group.participants.some(participant => {
            return normalizeText(participant.userName).includes(normalizedSearch)
                || normalizeText(participant.email).includes(normalizedSearch);
        });

        return nameMatch || participantMatch;
    });
}

function renderResults(groups) {
    const { results } = getElements();
    if (!results) {
        return;
    }

    results.innerHTML = "";

    if (!Array.isArray(groups) || groups.length === 0) {
        const empty = document.createElement("div");
        empty.className = "meeting-users-empty";
        empty.textContent = "Группы не найдены";
        results.appendChild(empty);
        return;
    }

    groups.forEach(group => {
        const row = document.createElement("div");
        row.className = "meeting-group-row";

        const info = document.createElement("div");
        info.className = "meeting-group-info";

        const name = document.createElement("div");
        name.className = "meeting-group-name";
        name.textContent = group.name || "Без названия";

        const meta = document.createElement("div");
        meta.className = "meeting-group-meta";
        const participantsCount = Array.isArray(group.participants) ? group.participants.length : 0;
        meta.textContent = `${participantsCount} участников`;

        info.append(name, meta);

        const action = document.createElement("button");
        action.type = "button";
        action.className = "meeting-group-add-btn";
        action.textContent = "Добавить всех";
        action.addEventListener("click", () => {
            addMeetingUsers(group.participants || []);
            closeMeetingGroupsPopup();
        });

        row.append(info, action);
        results.appendChild(row);
    });
}

async function runSearch() {
    const { searchInput } = getElements();
    if (!searchInput) {
        return;
    }

    const searchText = searchInput.value.trim();

    try {
        const groups = await getGroups();
        const filteredGroups = filterGroups(groups, searchText);
        allGroupsBlock?.render(groups);

        if (searchText.length < MIN_SEARCH_LENGTH) {
            renderStatus(`Введите название группы или имя участника.`);
        } else {
            renderStatus(filteredGroups.length > 0 ? `Найдено: ${filteredGroups.length}` : "Совпадений нет");
        }

        renderResults(filteredGroups);
    } catch (error) {
        renderStatus(error?.message || "Не удалось выполнить поиск групп", true);
        clearResults();
        allGroupsBlock?.render([]);
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
    renderStatus("Загрузка групп...");
    clearResults();

    if (searchInput) {
        searchInput.value = "";
        searchInput.focus();
    }

    runSearch();
}

export function closeMeetingGroupsPopup() {
    const { popupBg } = getElements();
    if (!popupBg) {
        return;
    }

    popupBg.style.display = "none";
}

export function initMeetingGroupsPopup() {
    if (popupInitialized) {
        return;
    }

    const { popupBg, closeBtn, cancelBtn, searchInput, allGroupsHost } = getElements();
    if (!popupBg || !closeBtn || !cancelBtn || !searchInput || !allGroupsHost) {
        return;
    }

    popupInitialized = true;

    allGroupsBlock = createUserGroupsBlock(allGroupsHost, group => {
        addMeetingUsers(group?.participants || []);
        closeMeetingGroupsPopup();
    });

    const openBtn = document.getElementById("meetingAddGroupsBtn");

    openBtn?.addEventListener("click", openPopup);
    closeBtn.addEventListener("click", closeMeetingGroupsPopup);
    cancelBtn.addEventListener("click", closeMeetingGroupsPopup);
    popupBg.addEventListener("click", event => {
        if (event.target === popupBg) {
            closeMeetingGroupsPopup();
        }
    });
    searchInput.addEventListener("input", scheduleSearch);
    searchInput.addEventListener("keydown", event => {
        if (event.key === "Enter") {
            event.preventDefault();
            runSearch();
        }
        if (event.key === "Escape") {
            closeMeetingGroupsPopup();
        }
    });
}
