export const API_URL = "/api";

export async function getAbilities() {
  const response = await fetch(`${API_URL}/abilities`)
  const json = await response.json();
  if (response.ok) {
    return json;
  } else {
    alert(
      `Не удалось войти, ответ сервера: ${JSON.stringify(json.errors)}, код ответа: ${response.status}`
    );
  }
}