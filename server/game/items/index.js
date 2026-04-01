// server/items.js


const ITEMS_BY_TEAM = {
  red: ["STEALTH", "SPEED"],  
  blue: ["TRAP", "SPEED"]     
};

const ACTIVE_DURATION = 4000;


function assignItemsToPlayers(room) {
  Object.values(room.players).forEach((p) => {
    const pool = ITEMS_BY_TEAM[p.team] || ["SPEED"];
    const randomItem = pool[Math.floor(Math.random() * pool.length)];
    p.inventoryItem = randomItem;
  });
}


function useItem(roomId, room, socketId, io) {
  const p = room.players[socketId];
  if (!p || !p.inventoryItem || p.isJailed) return;

  const type = p.inventoryItem;
  p.inventoryItem = null; 

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
