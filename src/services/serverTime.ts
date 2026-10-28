// Offset between the database clock and the browser clock, so every client
// shows the same countdowns. Updated from get_global_timer().server_time.
export let serverTimeOffset = 0;

export const updateServerTimeOffset = (serverTimeMs?: number | string | null): void => {
    if (!serverTimeMs) return;
    serverTimeOffset = Number(serverTimeMs) - Date.now();
};
