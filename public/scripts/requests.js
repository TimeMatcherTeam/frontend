import { getToken } from "./jwtUtils";

export const API_URL = "/api";

export async function getAbilities() {
  const response = await fetch(`${API_URL}/abilities`)
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
        Authorization: `Bearer ${token}`
    };
}
