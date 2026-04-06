import { API_URL } from "./requests.js";

export async function register(email, username, password) {
  const response = await fetch(`${API_URL}/users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, username, password }),
  });
  const json = await response.json();
  if (response.ok) {
    return json;
  } else {
    throw new Error(json.detail || "Ошибка регистрации");
  }
}

export async function login(email, password) {
  const response = await fetch(`${API_URL}/users/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });
  const json = await response.json();
  if (response.ok) {
    return json;
  } else {
    throw new Error(json.detail || "Ошибка входа");
  }
}
