import { DAYS_RU, MONTHS_RU } from "./constants.js";
import { state } from "./state.js";
import { dateKey, getWeekStart } from "./utils.js";

let visibleMonth = null;
let selectedDateKey = null;
let onSelectDate = null;

function atMidnight(date) {
    const result = new Date(date);
    result.setHours(0, 0, 0, 0);
    return result;
}

function getWeekStartByDate(date) {
    const result = atMidnight(date);
    const day = (result.getDay() + 6) % 7; // Monday = 0
    result.setDate(result.getDate() - day);
    return result;
}

function getWeekOffsetForDate(date) {
    const baseWeekStart = getWeekStart(0);
    const targetWeekStart = getWeekStartByDate(date);
    const dayDiff = Math.round((targetWeekStart.getTime() - baseWeekStart.getTime()) / 86400000);
    return Math.round(dayDiff / 7);
}

function ensureVisibleMonth() {
    const weekStart = getWeekStart(state.weekOffset);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    if (!visibleMonth) {
        visibleMonth = new Date(weekStart.getFullYear(), weekStart.getMonth(), 1);
        return;
    }

    const month = visibleMonth.getMonth();
    const year = visibleMonth.getFullYear();
    const weekContainsVisibleMonth =
        (weekStart.getMonth() === month && weekStart.getFullYear() === year) ||
        (weekEnd.getMonth() === month && weekEnd.getFullYear() === year);

    if (!weekContainsVisibleMonth) {
        visibleMonth = new Date(weekStart.getFullYear(), weekStart.getMonth(), 1);
    }
}

function buildDayCell(dayDate, currentMonth, weekStart, weekEnd, todayKey) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "mini-cal-day";
    button.textContent = String(dayDate.getDate());

    const dayKey = dateKey(dayDate);
    const isOutside = dayDate.getMonth() !== currentMonth;
    const isToday = dayKey === todayKey;
    const isInWeek = dayDate >= weekStart && dayDate <= weekEnd;
    const isSelected = selectedDateKey === dayKey;

    if (isOutside) {
        button.classList.add("is-outside");
    }
    if (isInWeek) {
        button.classList.add("is-week");
    }
    if (isToday) {
        button.classList.add("is-today");
    }
    if (isSelected) {
        button.classList.add("is-selected");
    }

    button.addEventListener("click", () => {
        selectedDateKey = dayKey;
        state.weekOffset = getWeekOffsetForDate(dayDate);
        if (typeof onSelectDate === "function") {
            onSelectDate();
        }
        renderMiniCalendar();
    });

    return button;
}

function changeVisibleMonth(delta) {
    visibleMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + delta, 1);
    renderMiniCalendar(false);
}

export function renderMiniCalendar(syncWithWeek = true) {
    const host = document.getElementById("miniCalendarBox");
    if (!host) {
        return;
    }

    if (syncWithWeek) {
        ensureVisibleMonth();
    }

    const monthStart = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1);
    const monthStartWeekDay = (monthStart.getDay() + 6) % 7;
    const gridStart = new Date(monthStart);
    gridStart.setDate(monthStart.getDate() - monthStartWeekDay);

    const weekStart = getWeekStart(state.weekOffset);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    const todayKey = dateKey(new Date());

    host.innerHTML = "";

    const root = document.createElement("div");
    root.className = "mini-cal";

    const header = document.createElement("div");
    header.className = "mini-cal-header";

    const prevBtn = document.createElement("button");
    prevBtn.type = "button";
    prevBtn.className = "mini-cal-nav";
    prevBtn.textContent = "<";
    prevBtn.addEventListener("click", () => changeVisibleMonth(-1));

    const title = document.createElement("div");
    title.className = "mini-cal-title";
    title.textContent = `${MONTHS_RU[visibleMonth.getMonth()]} ${visibleMonth.getFullYear()}`;

    const nextBtn = document.createElement("button");
    nextBtn.type = "button";
    nextBtn.className = "mini-cal-nav";
    nextBtn.textContent = ">";
    nextBtn.addEventListener("click", () => changeVisibleMonth(1));

    header.append(prevBtn, title, nextBtn);

    const weekDays = document.createElement("div");
    weekDays.className = "mini-cal-weekdays";
    DAYS_RU.forEach(day => {
        const dayCell = document.createElement("div");
        dayCell.className = "mini-cal-weekday";
        dayCell.textContent = day;
        weekDays.appendChild(dayCell);
    });

    const grid = document.createElement("div");
    grid.className = "mini-cal-grid";
    for (let i = 0; i < 42; i++) {
        const dayDate = new Date(gridStart);
        dayDate.setDate(gridStart.getDate() + i);
        grid.appendChild(buildDayCell(dayDate, visibleMonth.getMonth(), weekStart, weekEnd, todayKey));
    }

    root.append(header, weekDays, grid);
    host.appendChild(root);
}

export function initMiniCalendar(onSelect) {
    onSelectDate = onSelect;
    selectedDateKey = dateKey(new Date());
    visibleMonth = new Date();
    visibleMonth.setDate(1);
    renderMiniCalendar();
}
