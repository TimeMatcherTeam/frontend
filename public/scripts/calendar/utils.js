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

export function eventBorderColor(abilityName) {
    return `var(--${abilityName}-border-color)`
}

export function hexToRgbA(hex, alpha){
    var c;
    if(/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)){
        c= hex.substring(1).split('');
        if(c.length== 3){
            c= [c[0], c[0], c[1], c[1], c[2], c[2]];
        }
        c= '0x'+c.join('');
        return 'rgba('+[(c>>16)&255, (c>>8)&255, c&255].join(',')+',1)';
    }
    throw new Error('Bad Hex');
}