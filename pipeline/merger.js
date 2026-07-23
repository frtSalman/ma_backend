export function mergeDuplicateTopics(topics) {
    const merged = topics.reduce((acc, current) => {
        const key = current.normalizedName;
        if (!acc[key]) {
            acc[key] = { ...current };
        } else {
            acc[key].T += current.T || 0;
            acc[key].D += current.D || 0;
            acc[key].Y += current.Y || 0;
        }
        return acc;
    }, {});

    return Object.values(merged);
}
