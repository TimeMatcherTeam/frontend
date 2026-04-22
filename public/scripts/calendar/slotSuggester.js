import { API_URL } from "../requests.js";
import { getToken } from "../jwtUtils.js";

let currentParticipants = [];
let currentRange = null;
let lastSlots = [];

export function getLastSlots() {
    return lastSlots;
}

function getAuthHeaders() {
    const token = getToken();
    if (!token) {
        throw new Error("Необходима авторизация.");
    }
    return {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
    };
}

async function fetchUserBusyIntervals(userId, start, end) {
    const params = new URLSearchParams({
        Start: start.toISOString(),
        End: end.toISOString()
    });

    const response = await fetch(`${API_URL}/users/${userId}/calendar?${params}`, {
        headers: getAuthHeaders()
    });

    if (!response.ok) {
        return [];
    }

    const data = await response.json();
    const slots = Array.isArray(data?.slots) ? data.slots : [];

    return slots.map(slot => ({
        start: new Date(slot.startTime),
        end: new Date(slot.endTime),
        ability: String(slot?.ability?.ability || "").toLowerCase().includes("partial") ? "partial" : "busy"
    }));
}

export async function triggerSlotSuggester(participants, range, durationMinutes) {
    currentParticipants = participants;
    currentRange = range;

    const participantsWithIntervals = await Promise.all(
        participants.map(async participant => {
            const busyIntervals = await fetchUserBusyIntervals(participant.id, range.start, range.end);
            return { ...participant, busyIntervals };
        })
    );

    lastSlots = findBestSlots(participantsWithIntervals, range, durationMinutes);
}

function isNightHour(hour) {
    return hour >= 23 || hour < 6;
}

function isOffHour(hour) {
    return hour >= 21 || hour < 9;
}

function findBestSlots(participants, searchRange, durationMinutes, maxResults = 20) {
    const SLOT_STEP = 5;
    const MS_PER_SLOT = SLOT_STEP * 60000;

    const now = Date.now();
    const rangeStart = Math.max(
        searchRange.start.getTime() + MS_PER_SLOT - searchRange.start.getTime() % MS_PER_SLOT,
        now + MS_PER_SLOT - now % MS_PER_SLOT
    );
    const rangeEnd = searchRange.end.getTime() - searchRange.end.getTime() % MS_PER_SLOT;
    const totalSlots = Math.floor((rangeEnd - rangeStart) / MS_PER_SLOT);

    if (totalSlots <= 0 || durationMinutes <= 0) {
        return [];
    }

    const windowSlots = Math.ceil(durationMinutes / SLOT_STEP);
    if (windowSlots > totalSlots) {
        return [];
    }

    const busyMap = [];
    participants.forEach(participant => {
        if (!Array.isArray(participant.busyIntervals)) {
            return;
        }

        participant.busyIntervals.forEach(interval => {
            const busyStart = interval.start.getTime();
            const busyEnd = interval.end.getTime();

            const slotFrom = Math.max(0, Math.floor((busyStart - rangeStart) / MS_PER_SLOT));
            const slotTo = Math.min(totalSlots, Math.ceil((busyEnd - rangeStart) / MS_PER_SLOT));

            for (let i = slotFrom; i < slotTo; i++) {
                if (!busyMap[i]) busyMap[i] = [];
                busyMap[i].push({ name: participant.userName, ability: interval.ability });
            }
        });
    });

    const results = [];
    const usedStarts = [];

    const candidates = [];

    for (let i = 0; i <= totalSlots - windowSlots; i++) {
        const startMs = rangeStart + i * MS_PER_SLOT;
        const startDate = new Date(startMs);
        const startHour = startDate.getHours();
        const startMinutes = startDate.getMinutes();

        const reasons = [];

        let hasBusy = false;
        for (let w = 0; w < windowSlots; w++) {
            const slotReasons = busyMap[i + w];
            if (!slotReasons) continue;
            for (const r of slotReasons) {
                if (r.ability === "busy") {
                    hasBusy = true;
                    break;
                }
            }
            if (hasBusy) break;
        }

        if (hasBusy) continue;

        const partialNames = new Set();
        for (let w = 0; w < windowSlots; w++) {
            const slotReasons = busyMap[i + w];
            if (!slotReasons) continue;
            for (const r of slotReasons) {
                if (r.ability === "partial") {
                    partialNames.add(r.name);
                }
            }
        }

        partialNames.forEach(name => {
            reasons.push(`частично занят ${name}`);
        });

        if (isNightHour(startHour)) {
            reasons.push("ночное время");
        } else if (isOffHour(startHour)) {
            reasons.push("нерабочее время");
        }

        let beautyPenalty = 0;
        if (startMinutes === 0) {
            beautyPenalty = 0;
        } else if (startMinutes === 30) {
            beautyPenalty = 1;
        } else if (startMinutes % 15 === 0) {
            beautyPenalty = 2;
        } else {
            beautyPenalty = 3;
        }

        candidates.push({
            index: i,
            score: reasons.length * 100 + beautyPenalty,
            reasons,
            start: new Date(startMs),
            end: new Date(startMs + durationMinutes * 60000)
        });
    }

    candidates.sort((a, b) => a.score - b.score);

    for (const candidate of candidates) {
        if (results.length >= maxResults) break;

        const startMs = candidate.start.getTime();

        usedStarts.push(startMs);
        results.push(candidate);
    }

    return results;
}