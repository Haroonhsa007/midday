export function isBlockedNewUser(createdAt: string | Date | null | undefined) {
  const cutoff = process.env.NEW_USER_CUTOFF;
  if (!cutoff || !createdAt) return false;
  return new Date(createdAt).getTime() >= new Date(cutoff).getTime();
}
