const API_URL = "http://localhost:5000/api";

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
    alert(
      `Не удалось зарегистрировать пользователя, ответ сервера: ${JSON.stringify(json.errors)}, код ответа: ${response.status}`
    );
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
    alert(
      `Не удалось войти, ответ сервера: ${JSON.stringify(json.errors)}, код ответа: ${response.status}`
    );
  }
}
