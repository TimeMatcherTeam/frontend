export const API_URL = "http://localhost:5000/api";
import { JWT } from "../globals.js";

export async function getAbilities() {
  const response = await fetch(`${API_URL}/abilities`);
  const json = await response.json();
  if (response.ok) {
    const res = {};
    for (const el of json) {
      res[el.ability] = el.id
    }
    return json;
  } else {
    throw new Error(json.detail || "Ошибка получения типов промежутков");
  }
}

