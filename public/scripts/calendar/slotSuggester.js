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

async function fetchMergedIntervals(participantIds, start, end) {

    const response = await fetch(`${API_URL}/users/merge-calendar`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
            userIds: participantIds,
            requestedPeriod: {
                start: start.toISOString(),
                end: end.toISOString()
            }
        })
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

    const participantIds = participants.map(p => p.id).filter(Boolean);

    const mergedIntervals = await fetchMergedIntervals(participantIds, range.start, range.end);
    lastSlots = findBestSlots(mergedIntervals, range, durationMinutes, participants.length);
}

function findBestSlots(mergedIntervals, searchRange, durationMinutes, totalParticipants = 1, maxResults = 20) {
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

    const busySlots = new Array(totalSlots).fill(null).map(() => ({ busy: 0, partial: 0 }));

    mergedIntervals.forEach(interval => {
        const intervalStart = interval.start.getTime();
        const intervalEnd = interval.end.getTime();

        const slotFrom = Math.max(0, Math.floor((intervalStart - rangeStart) / MS_PER_SLOT));
        const slotTo = Math.min(totalSlots, Math.ceil((intervalEnd - rangeStart) / MS_PER_SLOT));

        for (let i = slotFrom; i < slotTo; i++) {
            if (interval.ability === "busy") {
                busySlots[i].busy++;
            } else {
                busySlots[i].partial++;
            }
        }
    });

    const candidates = [];

    for (let i = 0; i <= totalSlots - windowSlots; i++) {
        const startMs = rangeStart + i * MS_PER_SLOT;
        const startDate = new Date(startMs);
        const startHour = startDate.getHours();
        const startMinutes = startDate.getMinutes();

        let score = 0;

        let hasBusy = false;
        let maxPartial = 0;

        for (let w = 0; w < windowSlots; w++) {
            const slot = busySlots[i + w];
            if (slot.busy > 0) {
                hasBusy = true;
                break;
            }
            if (slot.partial > maxPartial) {
                maxPartial = slot.partial;
            }
        }

        if (hasBusy) continue;

        const reasons = [];

        if (maxPartial > 0) {
            reasons.push(`частично ${maxPartial == 1?'занят':'заняты'} ${` ${maxPartial} `} ${(maxPartial%10 >=2 && maxPartial%10 <= 4)?'человека':'человек'} `);
        }
        score += maxPartial * 100;

        if (startHour >= 23 || startHour < 6) {
            reasons.push("ночное время");
            score += 300;
        } else if (startHour >= 21 || startHour < 9) {
            reasons.push("нерабочее время");
            score += 100;
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
        score += beautyPenalty;

        candidates.push({
            score: score,
            reasons,
            start: new Date(startMs),
            end: new Date(startMs + durationMinutes * 60000)
        });
    }

    candidates.sort((a, b) => a.score - b.score);

    const results = [];
    const usedStarts = [];

    for (const candidate of candidates) {
        if (results.length >= maxResults) break;

        const startMs = candidate.start.getTime();
        const overlaps = usedStarts.some(s => Math.abs(startMs - s) < 30 * 60000);
        if (overlaps) continue;

        usedStarts.push(startMs);
        results.push(candidate);
    }

    return results;
}