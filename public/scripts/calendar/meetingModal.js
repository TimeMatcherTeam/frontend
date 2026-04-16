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

import { closeMeetingUsersPopup, initMeetingUsersPopup } from "./userSearchPopup.js";
import { closeMeetingGroupsPopup, initMeetingGroupsPopup } from "./groupSearchPopup.js";
import { getCookie } from "../jwtUtils.js";
import { getMeetingSelectedUsers } from "./userSearchPopup.js";

function parseDurationMinutes(value) {
    if (!value) {
        return null;
    }

    const [hoursValue, minutesValue] = value.split(':');
    const hours = Number(hoursValue);
    const minutes = Number(minutesValue);

    if (Number.isNaN(hours) || Number.isNaN(minutes) || hours < 0 || minutes < 0 || minutes > 59) {
        return null;
    }

    return hours * 60 + minutes;
}

function buildMeetingDraft() {
    const nameInput = document.getElementById("meetingName");
    const commentInput = document.getElementById("meetingComment");
    const startInput = document.getElementById("meetingStart");
    const endInput = document.getElementById("meetingEnd");
    const durationInput = document.getElementById("meetingDuration");

    const selectedUsers = getMeetingSelectedUsers();
    const currentUserId = getCookie("userId");

    const participantIds = Array.from(
        new Set([
            ...selectedUsers.map(user => user.id).filter(Boolean),
            ...(currentUserId ? [currentUserId] : [])
        ])
    );

    return {
        name: nameInput?.value?.trim() || "Новая встреча",
        comment: commentInput?.value?.trim() || "",
        start: startInput?.value || null,
        end: endInput?.value || null,
        duration: durationInput?.value || null,
        participantIds
    };
}

export function initMeetingModal() {
    const modalBg = document.getElementById('meetingModalBg');
    const cancelBtn = document.getElementById('meetingCancelBtn');
    const confirmBtn = document.getElementById('meetingConfirmBtn');
    const startInput = document.getElementById('meetingStart');
    const endInput = document.getElementById('meetingEnd');
    const durationInput = document.getElementById('meetingDuration');

    if (!modalBg || !cancelBtn || !confirmBtn || !startInput || !endInput || !durationInput) {
        return;
    }

    const validateDuration = () => {
        const start = parseDateTime(startInput.value);
        const end = parseDateTime(endInput.value);
        const durationMinutes = parseDurationMinutes(durationInput.value);

        if (!start || !end || end <= start || durationMinutes === null || durationMinutes <= 0) {
            return false;
        }

        const rangeMinutes = Math.floor((end.getTime() - start.getTime()) / 60000);
        return durationMinutes <= rangeMinutes;
    };

    modalBg.addEventListener('click', e => {
        if (e.target === modalBg) {
            closeMeetingModal();
        }
    });

    cancelBtn.addEventListener('click', closeMeetingModal);
    confirmBtn.addEventListener('click', () => {
        if (!validateDuration()) {
            alert('Продолжительность должна быть меньше либо равна разнице между началом и концом.');
            return;
        }

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
    const durationInput = document.getElementById('meetingDuration');
    if (!modalBg) {
        return;
    }

    if (startInput && endInput && durationInput) {
        const now = new Date();
        const nextHour = new Date(now.getTime() + 60 * 60000);
        startInput.value = formatDateTimeLocal(now);
        endInput.value = formatDateTimeLocal(nextHour);
        durationInput.value = '01:00';
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
