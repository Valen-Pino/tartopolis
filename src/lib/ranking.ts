// Competition ranking: equal scores share a position, and subsequent places skip.
export function withRankPositions<T extends { ovr: number }>(participants: T[]) {
  let position = 0;
  return participants.map((participant, index) => {
    if (index === 0 || participant.ovr !== participants[index - 1].ovr) position = index + 1;
    return { ...participant, position };
  });
}
