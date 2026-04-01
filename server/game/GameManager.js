const crypto = require("crypto");
const { useItem } = require("./items");

class GameManager {
  constructor(io, rooms, socketIdToRoom) {
    this.io = io;
    this.rooms = rooms;
    this.socketIdToRoom = socketIdToRoom;
  }

  handlePlayerMove(socket, { x, y }) {
    const roomId = this.socketIdToRoom[socket.id];
    if (!roomId) return;
    const room = this.rooms[roomId];
    if (!room) return;

    const player = room.players[socket.id];
    if (!player) return;

    player.x = x;
    player.y = y;

    if (room.gamePhase === "waiting" || room.gamePhase === "ended") {
      this.io.to(roomId).emit("game:update", room.players);
      return;
    }

    if (!player.isTagger && !player.isJailed) {
      if (!player.carriedItem) {
        for (let i = 0; i < room.items.length; i++) {
          const it = room.items[i];
          const isIntersect =
            player.x < it.x + 20 &&
            player.x + 20 > it.x &&
            player.y < it.y + 20 &&
            player.y + 20 > it.y;
          if (isIntersect) {
            player.carriedItem = true;
            room.items.splice(i, 1);
            this.io.to(roomId).emit("game:items_update", room.items);
            break;
          }
        }
      }

      if (player.carriedItem) {
        if (player.x >= 160 && player.x <= 360 && player.y >= 160 && player.y <= 360) {
          player.carriedItem = false;
          room.score += 1;
          this.io.to(roomId).emit("game:score_update", {
            score: room.score,
            maxScore: room.maxScore,
          });

          if (room.score >= room.maxScore) {
            room.gamePhase = "ended";
            this.io.to(roomId).emit("game:phase_change", {
              gamePhase: room.gamePhase,
              timeLeft: 0,
            });
            this.io.to(roomId).emit(
              "game:alert",
              "🏆 레드팀이 승리했습니다!"
            );
          }
        }
      }
    }

    let caughtPlayerId = null;

    for (const p1_id in room.players) {
      for (const p2_id in room.players) {
        const p1 = room.players[p1_id];
        const p2 = room.players[p2_id];

        if (p1.isTagger && !p2.isTagger && !p2.isJailed) {
          const isIntersect =
            p1.x < p2.x + 20 &&
            p1.x + 20 > p2.x &&
            p1.y < p2.y + 20 &&
            p1.y + 20 > p2.y;

          if (isIntersect) {
            caughtPlayerId = p2_id;
            p2.isJailed = true;
            if (p2.carriedItem) {
              p2.carriedItem = false;
              room.items.push({
                id: `gold_${crypto.randomUUID()}`,
                x: p2.x,
                y: p2.y,
              });
              this.io.to(roomId).emit("game:items_update", room.items);
            }
            p2.x = 800;
            p2.y = 800;
          }
        }
      }
    }

    if (caughtPlayerId) {
      const allRunners = Object.values(room.players).filter((p) => !p.isTagger);
      const allJailed = allRunners.every((p) => p.isJailed);

      if (allRunners.length > 0 && allJailed) {
        room.gamePhase = "ended";
        this.io.to(roomId).emit("game:phase_change", {
          gamePhase: room.gamePhase,
          timeLeft: 0,
        });
        this.io.to(roomId).emit(
          "game:alert",
          "🔥 블루팀이 승리했습니다!"
        );
      }
      this.io.to(roomId).emit("game:reset", room.players);
      return;
    }

    this.io.to(roomId).emit("game:update", room.players);
  }

  handleRescueStart(socket) {
    const roomId = this.socketIdToRoom[socket.id];
    if (!roomId) return;
    const room = this.rooms[roomId];
    if (!room) return;

    for (const id in room.players) {
      if (room.players[id].isTagger) {
        this.io.to(id).emit(
          "game:alert",
          "🚨 누군가 감옥의 문을 해킹하고 있습니다! (방어 필요)"
        );
      }
    }
  }

  handleRescueComplete(socket) {
    const roomId = this.socketIdToRoom[socket.id];
    if (!roomId) return;
    const room = this.rooms[roomId];
    if (!room) return;

    let rescued = 0;
    for (const id in room.players) {
      if (room.players[id].isJailed) {
        room.players[id].isJailed = false;
        room.players[id].x = 240; 
        room.players[id].y = 240;
        rescued++;
      }
    }

    if (rescued > 0) {
      this.io.to(roomId).emit(
        "game:alert",
        "🔓 감옥 문이 파괴되어 동료들이 탈출해 안전구역으로 향했습니다!"
      );
      this.io.to(roomId).emit("game:reset", room.players);
    }
  }

  handleItemUse(socket) {
    const roomId = this.socketIdToRoom[socket.id];
    if (roomId && this.rooms[roomId]) {
      useItem(roomId, this.rooms[roomId], socket.id, this.io);
    }
  }

  startGlobalTimerLoop() {
    setInterval(() => {
      for (const roomId in this.rooms) {
        const room = this.rooms[roomId];
        if (room.gamePhase === "prep" || room.gamePhase === "playing") {
          room.timeLeft -= 1;

          if (room.timeLeft <= 0) {
            if (room.gamePhase === "prep") {
              room.gamePhase = "playing";
              room.timeLeft = 180; 
              this.io.to(roomId).emit("game:phase_change", {
                gamePhase: room.gamePhase,
                timeLeft: room.timeLeft,
              });
            } else if (room.gamePhase === "playing") {
              room.gamePhase = "ended";
              this.io.to(roomId).emit("game:phase_change", {
                gamePhase: room.gamePhase,
                timeLeft: 0,
              });
            }
          }
          this.io.to(roomId).emit("game:timer", {
            gamePhase: room.gamePhase,
            timeLeft: room.timeLeft,
          });
        }
      }
    }, 1000);
  }
}

module.exports = GameManager;
