import { API_URL } from "../requests.js";
import { getCookie, getToken } from "../jwtUtils.js";
import { createUserGroupsBlock } from "../calendar/components/userGroupsBlock.js";
import { logout } from "../auth.js";

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
        saveButton: document.getElementById("profileSaveBtn"),
        changePasswordButton: document.getElementById("profileChangePasswordBtn"),
        logoutButton: document.getElementById("profileLogoutBtn"),
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

async function loadGroups() {
    try {
        const userId = getCurrentUserId();
        const groups = await requestJson(`${API_URL}/users/${userId}/groups`);
        const { groupsHost } = getElements();
        
        if (groupsHost) {
            const groupsBlock = createUserGroupsBlock(groupsHost, null);
            groupsBlock.render(Array.isArray(groups) ? groups : []);
        }
    } catch (error) {
        console.error("Ошибка при загрузке групп:", error);
    }
}

async function loadProfile() {
    const userId = getCurrentUserId();
    try {
        const user = await requestJson(`${API_URL}/users/${userId}`);
        setProfileForm(user);

        const { profileLink } = getElements();
        if (profileLink && user?.userName) {
            profileLink.textContent = user.userName;
        }

        await loadGroups();
        renderStatus("Данные профиля загружены");
    } catch (error) {
        renderStatus(error?.message || "Не удалось загрузить профиль", true);
    }
}

async function saveProfile() {
    const userId = getCurrentUserId();
    const { nicknameInput, emailInput, saveButton } = getElements();
    const userName = nicknameInput?.value?.trim() || "";
    const email = emailInput?.value?.trim() || "";

    if (!userName || !email) {
        renderStatus("Ник и почта не могут быть пустыми.", true);
        return;
    }

    if (saveButton) {
        saveButton.disabled = true;
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
        if (saveButton) {
            saveButton.disabled = false;
        }
    }
}

function initProfilePage() {
    const { saveButton, logoutButton } = getElements();

    // Set up global handlers for group updates
    window.onGroupCreated = () => {
        void loadGroups();
    };

    saveButton.addEventListener("click", () => {
        void saveProfile();
    });

    logoutButton.addEventListener("click", () => {
        logout();
        window.location = "/";
    })

    void loadProfile().catch(error => {
        renderStatus(error?.message || "Не удалось загрузить профиль", true);
    });

    const passEl = getPasswordElements();
    const changePassBtn = document.getElementById("profileChangePasswordBtn");

    if (changePassBtn) {
        changePassBtn.onclick = () => togglePasswordModal(true);
    }
    if (passEl.closeBtn) passEl.closeBtn.onclick = () => togglePasswordModal(false);
    if (passEl.cancelBtn) passEl.cancelBtn.onclick = () => togglePasswordModal(false);
    if (passEl.confirmBtn) passEl.confirmBtn.onclick = () => void handlePasswordChange();
}

function getPasswordElements() {
    return {
        bg: document.getElementById("passwordPopupBg"),
        oldInput: document.getElementById("oldPasswordInput"),
        newInput: document.getElementById("newPasswordInput"),
        confirmInput: document.getElementById("confirmPasswordInput"),
        status: document.getElementById("passwordStatus"),
        confirmBtn: document.getElementById("passwordConfirmBtn"),
        cancelBtn: document.getElementById("passwordCancelBtn"),
        closeBtn: document.getElementById("passwordPopupCloseBtn")
    };
}

function togglePasswordModal(show) {
    const el = getPasswordElements();
    if (!el.bg) return;
    el.bg.style.display = show ? "flex" : "none";
    if (show) {
        el.oldInput.value = "";
        el.newInput.value = "";
        el.confirmInput.value = "";
        el.status.textContent = "";
    }
}

async function handlePasswordChange() {
    const el = getPasswordElements();
    const oldPassword = el.oldInput.value.trim();
    const newPassword = el.newInput.value.trim();
    const confirmPassword = el.confirmInput.value.trim();

    if (!oldPassword || !newPassword || !confirmPassword) {
        el.status.textContent = "Заполните все поля";
        el.status.classList.add("is-error");
        return;
    }

    if (newPassword !== confirmPassword) {
        el.status.textContent = "Пароли не совпадают";
        el.status.classList.add("is-error");
        return;
    }

    try {
        el.confirmBtn.disabled = true;
        const userId = getCurrentUserId();

        await requestJson(`${API_URL}/users/${userId}/change-password`, {
            method: "PUT",
            body: JSON.stringify({ oldPassword, newPassword })
        });

        togglePasswordModal(false);
        renderStatus("Пароль успешно изменен");
    } catch (error) {
        el.status.textContent = error.message;
        el.status.classList.add("is-error");
    } finally {
        el.confirmBtn.disabled = false;
    }
}

initProfilePage();
