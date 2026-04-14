import { API_URL } from "./requests.js";
import { JWT, ABILITIES } from "../globals.js";

export async function getUser(userId) {
  const response = await fetch(`${API_URL}/users/${userId}`, {
    headers: {
      Authorization: `Bearer ${JWT}`,
    },
  });
  const json = await response.json();
  if (response.ok) {
    return json;
  } else {
    throw new Error(json.detail || "Ошибка получения пользователя");
  }
}

export async function getUserCalendar(userId, start, end) {
  const query = new URLSearchParams({
    Start: start,
    End: end
  })
  const response = await fetch(`${API_URL}/users/${userId}/calendar/?${query}`, {
    headers: {
      Authorization: `Bearer ${JWT}`,
    },

  });
  const json = await response.json();
  if (response.ok) {
    return json;
  } else {
    throw new Error(json.detail || "Ошибка получения календаря");
  }
}

export async function getUserGroups(userId) {
  const response = await fetch(`${API_URL}/users/${userId}/groups`, {
    headers: {
      Authorization: `Bearer ${JWT}`,
    },
  });
  const json = await response.json();
  if (response.ok) {
    return json;
  } else {
    throw new Error(json.detail || "Ошибка получения групп");
  }
}

export async function getUserMeetings(userId) {
  const response = await fetch(`${API_URL}/users/${userId}/meetings`, {
    headers: {
      Authorization: `Bearer ${JWT}`,
    },
  });
  const json = await response.json();
  if (response.ok) {
    return json;
  } else {
    throw new Error(json.detail || "Ошибка получения встреч");
  }
}

export async function changeUserData(userId, newEmail, newUsername) {
  const response = await fetch(`${API_URL}/users/${userId}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${JWT}`,
    },
    body: {
      userName: newUsername,
      email: newEmail
    }
  });
  const json = await response.json();
  if (response.ok) {
    return json;
  } else {
    throw new Error(json.detail || "Ошибка изменения пользователя");
  }
}

export async function getUser(userId) {
  const response = await fetch(`${API_URL}/users/${userId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${JWT}`,
    },
  });
  const json = await response.json();
  if (response.ok) {
    return json;
  } else {
    throw new Error(json.detail || "Ошибка удаления пользователя");
  }
}

export async function addInterval(userId, start, end, abilityType) {
  const response = await fetch(`${API_URL}/users/${userId}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${JWT}`,
    },
    body: {
      startTime: start,
      endTime: end,
      abilityId: ABILITIES[abilityType]
    }
  });
  const json = await response.json();
  if (response.ok) {
    return json;
  } else {
    throw new Error(json.detail || "Ошибкаизменения пользователя");
  }
}