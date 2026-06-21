import { getToken } from "./jwtUtils.js";

export const API_URL = "/api";

export async function getAbilities() {
    const response = await fetch(`${API_URL}/abilities`);
    const json = await response.json();
    if (response.ok) {
        return json;
    }
}
export function getAuthHeaders() {
    const token = getToken();
    if (!token) {
        throw new Error("Необходима авторизация.");
    }

    return {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
    };
}export async function requestJson(url, options = {}) {
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

