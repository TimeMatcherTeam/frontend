import { API_URL } from "./requests.js";
import { getCookie, getToken } from "./jwtUtils.js";

const HEADER_MARKUP = `
    <div class="page-header">
        <a class="brand-link" href="/">TimeMatcher</a>
        <nav class="page-nav">
            <a id="myCalendarLink" class="page-link" href="/">мой календарь</a>
            <a id="userProfileLink" class="page-link" href="/profile">my_nickname</a>
        </nav>
    </div>
`;

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
                Authorization: `Bearer ${token}`
            }
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

    host.innerHTML = HEADER_MARKUP;
    hydrateUserHeader();
}

initPageHeader();
