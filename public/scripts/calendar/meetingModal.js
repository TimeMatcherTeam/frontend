import { closeMeetingUsersPopup, initMeetingUsersPopup } from "./userSearchPopup.js";
import { closeMeetingGroupsPopup, initMeetingGroupsPopup } from "./groupSearchPopup.js";
import { getCookie } from "../jwtUtils.js";
import { getMeetingSelectedUsers } from "./userSearchPopup.js";
import { triggerSlotSuggester } from "./slotSuggester.js";

function parseDateTime(value) {
    if (!value) {
        return null;
    }

    const dt = new Date(value);
    if (Number.isNaN(dt.getTime())) {
        return null;
    }

    return dt;
}

function formatDateTimeLocal(date) {
    if (!date) {
        return null;
    }

    const pad = number => String(number).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function parseDurationMinutes() {
    const hours = Number(document.getElementById("meetingDurationH")?.value ?? 0);
    const minutes = Number(document.getElementById("meetingDurationM")?.value ?? 0);

    if (Number.isNaN(hours) || Number.isNaN(minutes) || hours < 0 || minutes < 0) {
        return null;
    }

    const total = hours * 60 + minutes;
    return total > 0 ? total : null;
}

function buildMeetingDraft() {
    const nameInput = document.getElementById("meetingName");
    const commentInput = document.getElementById("meetingComment");
    const startInput = document.getElementById("meetingStart");
    const endInput = document.getElementById("meetingEnd");

    const selectedUsers = getMeetingSelectedUsers();
    const currentUserId = getCookie("userId");

    const participantIds = Array.from(
        new Set([
            ...selectedUsers.map(user => user.id).filter(Boolean),
            ...(currentUserId ? [currentUserId] : [])
        ])
    );

    const h = String(document.getElementById("meetingDurationH")?.value ?? "1").padStart(2, "0");
    const m = String(document.getElementById("meetingDurationM")?.value ?? "0").padStart(2, "0");

    return {
        name: nameInput?.value?.trim() || "Новая встреча",
        comment: commentInput?.value?.trim() || "",
        start: startInput?.value || null,
        end: endInput?.value || null,
        duration: `${h}:${m}`,
        participantIds
    };
}

function tryTriggerSlots(startInput, endInput) {
    const start = parseDateTime(startInput.value);
    const end = parseDateTime(endInput.value);
    const durationMinutes = parseDurationMinutes();

    if (!start || !end || end <= start) {
        return;
    }

    const selectedUsers = getMeetingSelectedUsers();
    void triggerSlotSuggester(selectedUsers, { start, end }, durationMinutes ?? 60);
}

export function initMeetingModal() {
    const modalBg = document.getElementById('meetingModalBg');
    const cancelBtn = document.getElementById('meetingCancelBtn');
    const confirmBtn = document.getElementById('meetingConfirmBtn');
    const startInput = document.getElementById('meetingStart');
    const endInput = document.getElementById('meetingEnd');
    const durationH = document.getElementById('meetingDurationH');
    const durationM = document.getElementById('meetingDurationM');

    if (!modalBg || !cancelBtn || !confirmBtn || !startInput || !endInput || !durationH || !durationM) {
        return;
    }

    const validateDuration = () => {
        const start = parseDateTime(startInput.value);
        const end = parseDateTime(endInput.value);
        const durationMinutes = parseDurationMinutes();

        if (!start || !end || end <= start || durationMinutes === null || durationMinutes <= 0) {
            return false;
        }

        const rangeMinutes = Math.floor((end.getTime() - start.getTime()) / 60000);
        return durationMinutes <= rangeMinutes;
    };

    const onTimeChange = () => tryTriggerSlots(startInput, endInput);

    startInput.addEventListener('change', onTimeChange);
    endInput.addEventListener('change', onTimeChange);
    durationH.addEventListener('change', onTimeChange);
    durationM.addEventListener('change', onTimeChange);

    modalBg.addEventListener('click', e => {
        if (e.target === modalBg) {
            closeMeetingModal();
        }
    });

    cancelBtn.addEventListener('click', closeMeetingModal);
    confirmBtn.addEventListener('click', () => {
        const draft = buildMeetingDraft();
        sessionStorage.setItem("meetingDraft", JSON.stringify(draft));
        window.location.href = "/meeting";
    });

    initMeetingUsersPopup();
    initMeetingGroupsPopup();
}

export function openMeetingModal() {
    const modalBg = document.getElementById('meetingModalBg');
    const startInput = document.getElementById('meetingStart');
    const endInput = document.getElementById('meetingEnd');
    const durationH = document.getElementById('meetingDurationH');
    const durationM = document.getElementById('meetingDurationM');

    if (!modalBg) {
        return;
    }

    if (startInput && endInput) {
        const now = new Date();
        const nextHour = new Date(now.getTime() + 60 * 60000);
        startInput.value = formatDateTimeLocal(now);
        endInput.value = formatDateTimeLocal(nextHour);

        if (durationH) durationH.value = "1";
        if (durationM) durationM.value = "0";

        tryTriggerSlots(startInput, endInput);
    }

    modalBg.style.display = 'flex';
}

export function closeMeetingModal() {
    const modalBg = document.getElementById('meetingModalBg');
    if (!modalBg) {
        return;
    }

    modalBg.style.display = 'none';
    closeMeetingUsersPopup();
    closeMeetingGroupsPopup();
}