// ID estable de Valentin Pino en participants; no depende del apodo editable.
export const CLAIM_MODERATOR_ID = "10000000-0000-0000-0000-000000000001";

export function canDeleteClaim(viewerId: string, creatorId: string) {
  return viewerId === creatorId || viewerId === CLAIM_MODERATOR_ID;
}
