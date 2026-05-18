export default function getNearestDateForDay(dayName) {
    const weekDays = [
        'Pazar',
        'Pazartesi',
        'Salı',
        'Çarşamba',
        'Perşembe',
        'Cuma',
        'Cumartesi',
    ];
    const targetDayIndex = weekDays.indexOf(dayName);
    if (targetDayIndex === -1) return null;

    const now = new Date();
    const currentDayIndex = now.getDay();

    let diffDays = targetDayIndex - currentDayIndex;
    if (diffDays < 0) {
        diffDays += 7;
    }

    const targetDate = new Date(now);
    targetDate.setDate(now.getDate() + diffDays);
    targetDate.setHours(23, 59, 59, 999);

    return targetDate.toISOString();
}
