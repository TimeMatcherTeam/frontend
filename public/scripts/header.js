import { API_URL } from "./requests.js";
import { getCookie, getToken } from "./jwtUtils.js";
import { showAuthForm } from "./popups/authPopup.js";

function initHeader() {
    const userProfileLink = document.getElementById("userProfileLink");
    const myCalendarLink = document.getElementById("myCalendarLink");

    if (userProfileLink) {
        userProfileLink.addEventListener("click", (event) => {
            event.preventDefault();
            const token = getToken();
            if (!token) {
                showAuthForm();
            } else {
                window.location.href = "/profile";
            }
        });
    }
}

async function hydrateUserHeader() {
    const userProfileLink = document.getElementById("userProfileLink");
    const usernameText = document.getElementById("usernameText");
    const userId = getCookie("userId");
    const token = getToken();

    if (!userProfileLink || !userId || !token) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/users/${userId}`, {
            headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
            const user = await response.json();
            const userName = user?.userName || user?.username || user?.name;
            if (userName) {
                usernameText.textContent = userName;
            }
        }
    } catch (error) {
        console.error("Failed to load user:", error);
    }
}

function init() {
    initHeader();
    hydrateUserHeader();
}

init();