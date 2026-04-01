function useSkill(roomId, room, socketId, io, skillType) {
  const p = room.players[socketId];
  if (!p || p.isJailed) return;
  
  console.log(`[SKILL] Player ${socketId} used ${skillType}`);
}
module.exports = { useSkill };
