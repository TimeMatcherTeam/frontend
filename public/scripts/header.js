import { API_URL } from "./requests.js";
import { getCookie, getToken } from "./jwtUtils.js";
import { showAuthForm } from "./popups/authPopup.js";

function buildHeaderNode() {
    const header = document.createElement("div");
    header.className = "page-header";

    const brandLink = document.createElement("a");
    brandLink.className = "brand-link";
    brandLink.href = "/";
    brandLink.textContent = "TimeMatcher";

    const nav = document.createElement("nav");
    nav.className = "page-nav";

    const myCalendarLink = document.createElement("a");
    myCalendarLink.id = "myCalendarLink";
    myCalendarLink.className = "page-link";
    myCalendarLink.href = "/";
    myCalendarLink.textContent = "мой календарь";

    const userProfileLink = document.createElement("a");
    userProfileLink.id = "userProfileLink";
    userProfileLink.className = "page-link";
    userProfileLink.href = "/profile";
    userProfileLink.textContent = "войти";
    userProfileLink.addEventListener("click", (event) => {
        event.preventDefault();
        const token = getToken();
        if (!token) {
            showAuthForm();
        }
        else {
            window.location.href = "/profile";
        }
    });

    nav.append(myCalendarLink, userProfileLink);
    header.append(brandLink, nav);

    return header;
}

async function hydrateUserHeader() {
    const userProfileLink = document.getElementById("userProfileLink");
    const myCalendarLink = document.getElementById("myCalendarLink");

    if (!userProfileLink || !myCalendarLink) {
        return;
    }

    myCalendarLink.href = "/";
    userProfileLink.href = "/profile";

    const userId = getCookie("userId");
    const token = getToken();

    if (!userId || !token) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/users/${userId}`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            return;
        }

        const user = await response.json();
        const userName = user?.userName || user?.username || user?.name;
        if (userName) {
            userProfileLink.textContent = userName;
        }
    } catch {
        // Keep placeholder nickname if request fails.
    }
}

function initPageHeader() {
    const host = document.getElementById("pageHeader");
    if (!host) {
        return;
    }

    host.replaceChildren(buildHeaderNode());
    hydrateUserHeader();
}

initPageHeader();
