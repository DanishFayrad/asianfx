// Members are shown with IDs starting at 101 (database user_id 1 → 101, 2 → 102, …).
// Display-only: the stored profiles.user_id is unchanged.
const ID_OFFSET = 100;

export const displayUserId = (userId: number | string | null | undefined): number | null => (userId == null ? null : ID_OFFSET + Number(userId));
