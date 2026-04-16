export function fmt2(n) {
    return String(n).padStart(2, '0');
}

export function dateKey(d) {
    return `${d.getFullYear()}-${fmt2(d.getMonth()+1)}-${fmt2(d.getDate())}`;
}

export function getWeekStart(offset = 0) {
    const now = new Date();
    const day = (now.getDay() + 6) % 7; // Monday = 0

    const result = new Date(now);
    result.setDate(now.getDate() - day + offset * 7);
    result.setHours(0, 0, 0, 0);

    return result;
}