import { API_URL } from "../requests.js";
import { getCookie, getToken } from "../jwtUtils.js";
import { dateKey, fmt2 } from "./utils.js";
import { showAuthForm } from "../popups/authPopup.js";

let cachedAbilities = null;

const ABILITY_TYPE = {
	BUSY: "busy",
	PARTIAL: "partially_busy"
};

export function abilityTypeByColor(colorIndex) {
	return colorIndex === 1 ? ABILITY_TYPE.PARTIAL : ABILITY_TYPE.BUSY;
}

function normalizeAbilityName(value) {
	return String(value || "").toLowerCase().trim();
}

function getAbilityTypeByName(name) {
	const normalized = normalizeAbilityName(name);
	if (normalized === ABILITY_TYPE.PARTIAL) {
		return ABILITY_TYPE.PARTIAL;
	}
	if (normalized === ABILITY_TYPE.BUSY) {
		return ABILITY_TYPE.BUSY;
	}
	return ABILITY_TYPE.BUSY;
}

export function colorByAbilityName(name) {
	return getAbilityTypeByName(name) === ABILITY_TYPE.PARTIAL ? 1 : 0;
}

function getCurrentUserId() {
	const userId = getCookie("userId");
	if (!userId) {
		showAuthForm();
		throw new Error("Не удалось определить пользователя: отсутствует userId.");
	}
	return userId;
}

function getAuthHeaders() {
	const token = getToken();
	if (!token) {
		showAuthForm()
		throw new Error("Необходима авторизация.");
	}
	return {
		"Content-Type": "application/json",
		Authorization: `Bearer ${token}`
	};
}

async function requestJson(url, options = {}) {
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

async function getAbilities() {
	if (cachedAbilities) {
		return cachedAbilities;
	}

	const abilities = await requestJson(`${API_URL}/abilities`, { method: "GET" });
	if (!Array.isArray(abilities) || abilities.length === 0) {
		throw new Error("Справочник занятости пуст. Добавьте busy и partially_busy в таблицу Abilities.");
	}

	cachedAbilities = abilities;
	return cachedAbilities;
}

async function getAbilityIdByType(abilityType) {
	const abilities = await getAbilities();
	const selected = abilities.find(a => getAbilityTypeByName(a?.ability) === abilityType)
		|| abilities.find(a => getAbilityTypeByName(a?.name) === abilityType);

	if (!selected?.id) {
		throw new Error(`Не найден тип занятости '${abilityType}'. Ожидаются значения busy и partially_busy.`);
	}

	return selected.id;
}

function buildSlotPayload(eventData, abilityId) {
	const toUtcIso = (date, time) => new Date(`${date}T${time}:00`).toISOString();

	return {
		startTime: toUtcIso(eventData.date, eventData.start),
		endTime: toUtcIso(eventData.date, eventData.end),
		title: eventData.name,
		abilityId
	};
}

export function mapSlotResponseToCalendarEvent(slot, color = 0) {
	const start = new Date(slot.startTime);
	const end = new Date(slot.endTime);
	const abilityName = slot.ability?.ability || slot.ability?.name || "";
	const resolvedColor = Number.isInteger(color) ? color : colorByAbilityName(abilityName);

	return {
		id: slot.id,
		name: slot.title || "(без названия)",
		date: dateKey(start),
		start: `${fmt2(start.getHours())}:${fmt2(start.getMinutes())}`,
		end: `${fmt2(end.getHours())}:${fmt2(end.getMinutes())}`,
		color: resolvedColor,
		abilityId: slot.ability?.id || null,
		abilityName
	};
}

export async function AddSlot(eventData) {
	const userId = getCurrentUserId();
	const abilityType = eventData.abilityType || abilityTypeByColor(eventData.color);
	const abilityId = eventData.abilityId || await getAbilityIdByType(abilityType);
	const payload = buildSlotPayload(eventData, abilityId);

	return requestJson(`${API_URL}/users/${userId}/calendar/slots`, {
		method: "POST",
		body: JSON.stringify(payload)
	});
}

export async function UpdateSlot(slotId, eventData) {
	const userId = getCurrentUserId();
	const abilityType = eventData.abilityType || abilityTypeByColor(eventData.color);
	const abilityId = eventData.abilityId || await getAbilityIdByType(abilityType);
	const payload = buildSlotPayload(eventData, abilityId);

	return requestJson(`${API_URL}/users/${userId}/calendar/slots/${slotId}`, {
		method: "PUT",
		body: JSON.stringify(payload)
	});
}

export async function DeleteSlot(slotId) {
	const userId = getCurrentUserId();
	return requestJson(`${API_URL}/users/${userId}/calendar/slots/${slotId}`, {
		method: "DELETE"
	});
}
