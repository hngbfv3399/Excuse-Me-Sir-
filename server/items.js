// server/items.js
// 게임 시작 시 각 플레이어에게 랜덤 아이템 1개를 지급하는 시스템

const ITEM_TYPES = ["SPEED", "STEALTH", "TRAP"];
const ACTIVE_DURATION = 4000;

// 게임 시작 시 모든 플레이어에게 랜덤 아이템 1개씩 지급
function assignItemsToPlayers(room) {
  Object.values(room.players).forEach((p) => {
    const randomItem = ITEM_TYPES[Math.floor(Math.random() * ITEM_TYPES.length)];
    p.inventoryItem = randomItem;
  });
}

// 'Z' 키를 눌러 인벤토리 아이템 사용 (소모 후 null 처리)
function useItem(roomId, room, socketId, io) {
  const p = room.players[socketId];
  if (!p || !p.inventoryItem || p.isJailed) return;

  const type = p.inventoryItem;
  p.inventoryItem = null; // 소모됨

  if (type === "SPEED") {
    p.speedBoost = true;
    setTimeout(() => {
      if (room.players[socketId]) {
        room.players[socketId].speedBoost = false;
        io.to(roomId).emit("game:update", room.players);
      }
    }, ACTIVE_DURATION);
  } else if (type === "STEALTH") {
    p.isStealth = true;
    setTimeout(() => {
      if (room.players[socketId]) {
        room.players[socketId].isStealth = false;
        io.to(roomId).emit("game:update", room.players);
      }
    }, ACTIVE_DURATION);
  } else if (type === "TRAP") {
    if (!room.activeTraps) room.activeTraps = [];
    room.activeTraps.push({ x: p.x, y: p.y, team: p.team });
    io.to(roomId).emit("game:traps", room.activeTraps);
  }

  io.to(roomId).emit("game:update", room.players);
}

module.exports = { assignItemsToPlayers, useItem };
