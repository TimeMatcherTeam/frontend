import { API_URL } from "../requests.js";
import { getCookie, getToken } from "../jwtUtils.js";
import { createUserGroupsBlock } from "../calendar/components/userGroupsBlock.js";

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
        nicknameInput: document.getElementById("profileNickname"),
        emailInput: document.getElementById("profileEmail"),
        saveBtn: document.getElementById("profileSaveBtn"),
        status: document.getElementById("profileStatus"),
        groupsHost: document.getElementById("profileGroupsHost"),
        profileLink: document.getElementById("userProfileLink")
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

function setProfileForm(user) {
    const { nicknameInput, emailInput } = getElements();
    if (nicknameInput) {
        nicknameInput.value = user?.userName || "";
    }
    if (emailInput) {
        emailInput.value = user?.email || "";
    }
}

async function loadProfile() {
    const userId = getCurrentUserId();
    const [user, groups] = await Promise.all([
        requestJson(`${API_URL}/users/${userId}`),
        requestJson(`${API_URL}/users/${userId}/groups`)
    ]);

    setProfileForm(user);

    const { profileLink, groupsHost } = getElements();
    if (profileLink && user?.userName) {
        profileLink.textContent = user.userName;
    }

    const groupsBlock = createUserGroupsBlock(groupsHost, null);
    groupsBlock.render(Array.isArray(groups) ? groups : []);

    renderStatus("Данные профиля загружены");
}

async function saveProfile() {
    const userId = getCurrentUserId();
    const { nicknameInput, emailInput, saveBtn } = getElements();
    const userName = nicknameInput?.value?.trim() || "";
    const email = emailInput?.value?.trim() || "";

    if (!userName || !email) {
        renderStatus("Ник и почта не могут быть пустыми.", true);
        return;
    }

    if (saveBtn) {
        saveBtn.disabled = true;
    }

    try {
        const updatedUser = await requestJson(`${API_URL}/users/${userId}`, {
            method: "PUT",
            body: JSON.stringify({ userName, email })
        });

        const normalized = updatedUser || { userName, email };
        setProfileForm(normalized);

        const { profileLink } = getElements();
        if (profileLink && normalized.userName) {
            profileLink.textContent = normalized.userName;
        }

        renderStatus("Профиль сохранён");
    } catch (error) {
        renderStatus(error?.message || "Не удалось сохранить профиль", true);
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
        }
    }
}

function initProfilePage() {
    const { saveBtn } = getElements();
    if (!saveBtn) {
        return;
    }

    saveBtn.addEventListener("click", () => {
        void saveProfile();
    });

    void loadProfile().catch(error => {
        renderStatus(error?.message || "Не удалось загрузить профиль", true);
    });
}

initProfilePage();
