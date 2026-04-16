export function fmt2(n) {
    return String(n).padStart(2, "0");
}

export function dateKey(d) {
    return `${d.getFullYear()}-${fmt2(d.getMonth() + 1)}-${fmt2(d.getDate())}`;
}

export function getWeekStart(offset = 0) {
    const now = new Date();
    const day = (now.getDay() + 6) % 7; // Monday = 0

    const result = new Date(now);
    result.setDate(now.getDate() - day + offset * 7);
    result.setHours(0, 0, 0, 0);

    return result;
}

export function formatTime(date) {
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    return `${hours}:${minutes}`;
}

export function getCurrentWeekBorders() {
    const today = new Date();
    const day = today.getDay();

    // Начало недели (понедельник)
    const start = new Date(today);
    start.setDate(today.getDate() - (day === 0 ? 6 : day - 1));
    start.setHours(0, 0, 0, 0);

    // Конец недели (воскресенье)
    const end = new Date(today);
    end.setDate(today.getDate() + (day === 0 ? 0 : 7 - day));
    end.setHours(23, 59, 59, 999);

    return [start, end]
}
