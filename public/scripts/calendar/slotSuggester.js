import { state } from "./state.js";
import { API_URL } from "../requests.js";
import { getToken } from "../jwtUtils.js";

let currentParticipants = [];
let currentRange = null;
let currentDuration = null;
let lastSlots = [];

export function getLastSlots() {
    return lastSlots;
}

export function getDuration() {
    return currentDuration;
}

export function getCurrentRange() {
    return currentRange;
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
    currentDuration = durationMinutes;

    const participantsWithIntervals = await Promise.all(
        participants.map(async participant => {
            const busyIntervals = await fetchUserBusyIntervals(participant.id, range.start, range.end);
            return { ...participant, busyIntervals };
        })
    );

    lastSlots = findBestSlots(participantsWithIntervals, range, durationMinutes);
}

function findBestSlots(participants, searchRange, durationMinutes, maxResults = 20) {
    const SLOT_STEP = 5;
    const MS_PER_SLOT = SLOT_STEP * 60000;
    const ABILITY_WEIGHTS = {
        busy: 10000,
        partial: 40,
    };
    const EXTRA_WEIGHTS = [
        { start: 23, end: 6,  weight: 20 },
        { start: 21, end: 14, weight: 20 },
    ];

    const rangeStart = searchRange.start.getTime() + MS_PER_SLOT - searchRange.start.getTime() % MS_PER_SLOT;
    const rangeEnd = searchRange.end.getTime() - searchRange.end.getTime() % MS_PER_SLOT;
    const totalSlots = Math.floor((rangeEnd - rangeStart) / MS_PER_SLOT);
    console.log(searchRange.start);
    console.log(rangeStart);
    console.log(searchRange.end);
    console.log(rangeEnd);
    console.log(totalSlots);
    if (totalSlots <= 0 || durationMinutes <= 0) {
        return [];
    }

    const weights = new Float32Array(totalSlots);

    for (let i = 0; i < totalSlots; i++) {
        const hour = new Date(rangeStart + i * MS_PER_SLOT).getHours();

        for (const rule of EXTRA_WEIGHTS) {
            if (((rule.start > rule.end) && (hour >= rule.start || hour < rule.end)) ||
                ((rule.start <= rule.end) && (hour >= rule.start && hour < rule.end))) {
                weights[i] += rule.weight;
            }
        }
    }

    participants.forEach(participant => {
        if (!Array.isArray(participant.busyIntervals)) {
            return;
        }

        participant.busyIntervals.forEach(interval => {
            const busyStart = interval.start.getTime();
            const busyEnd = interval.end.getTime();
            const penalty = ABILITY_WEIGHTS[interval.ability] ?? ABILITY_WEIGHTS.busy;

            const slotFrom = Math.max(0, Math.floor((busyStart - rangeStart) / MS_PER_SLOT));
            const slotTo = Math.min(totalSlots, Math.ceil((busyEnd - rangeStart) / MS_PER_SLOT));

            for (let i = slotFrom; i < slotTo; i++) {
                weights[i] += penalty;
            }
        });
    });

    const windowSlots = Math.ceil(durationMinutes / SLOT_STEP);
    if (windowSlots > totalSlots) {
        return [];
    }

    let windowWeight = 0;
    for (let i = 0; i < windowSlots; i++) {
        windowWeight += weights[i];
    }

    const candidates = [{ index: 0, score: windowWeight }];

    for (let i = 1; i <= totalSlots - windowSlots; i++) {
        windowWeight -= weights[i - 1];
        windowWeight += weights[i + windowSlots - 1];
        candidates.push({ index: i, score: windowWeight });
    }

    for (const candidate of candidates) {
        const minutes = new Date(rangeStart + candidate.index * MS_PER_SLOT).getMinutes();
        if (minutes === 0) {
            candidate.score += 0;
        } else if (minutes === 30) {
            candidate.score += 1;
        } else if (minutes % 15 === 0) {
            candidate.score += 2;
        } else {
            candidate.score += 3;
        }
    }

    candidates.sort((a, b) => a.score - b.score);

    const results = [];
    const usedRanges = [];

    for (const candidate of candidates) {
        if (results.length >= maxResults) {
            break;
        }

        const startMs = rangeStart + candidate.index * MS_PER_SLOT;
        const endMs = startMs + durationMinutes * 60000;

        if(candidate.score >= ABILITY_WEIGHTS.busy) {
            continue;
        }

        usedRanges.push([startMs, endMs]);
        results.push({
            start: new Date(startMs),
            end: new Date(endMs),
            score: candidate.score
        });
    }

    return results;
}