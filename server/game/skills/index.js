function useSkill(roomId, room, socketId, io, skillType) {
  const p = room.players[socketId];
  if (!p || p.isJailed) return;
  // TODO: 스킬별 로직 추가 (추후 캐릭터 고유 스킬과 연동)
  console.log(`[SKILL] Player ${socketId} used ${skillType}`);
}
module.exports = { useSkill };
