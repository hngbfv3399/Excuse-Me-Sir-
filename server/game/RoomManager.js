const crypto = require("crypto");
const { assignItemsToPlayers } = require("./items");

class RoomManager {
  constructor(io, rooms, socketIdToRoom, socketIdToNickname) {
    this.io = io;
    this.rooms = rooms;
    this.socketIdToRoom = socketIdToRoom;
    this.socketIdToNickname = socketIdToNickname;
  }

  broadcastRooms() {
    const roomList = Object.values(this.rooms).map((r) => ({
      id: r.id,
      title: r.title,
      isPrivate: r.isPrivate,
      maxPlayers: r.maxPlayers,
      currentPlayers: Object.keys(r.players).length,
      gamePhase: r.gamePhase,
    }));
    this.io.emit("rooms:list", roomList);
  }

  handleLogin(socket, nickname) {
    this.socketIdToNickname[socket.id] = nickname;
    this.broadcastRooms();
  }

  handleRequestList() {
    this.broadcastRooms();
  }

  handleCreateRoom(socket, roomData) {
    const roomId = crypto.randomUUID();
    this.rooms[roomId] = {
      id: roomId,
      title: roomData.title,
      isPrivate: roomData.isPrivate,
      password: roomData.password,
      maxPlayers: parseInt(roomData.maxPlayers) || 4,
      targetQuota: parseInt(roomData.targetQuota) || 2,
      players: {},
      taggerId: null,
      hostId: socket.id,
      gamePhase: "waiting", // 'waiting' | 'prep' | 'playing' | 'ended'
      timeLeft: 0,
      score: 0, // 흭득 점수
      maxScore: 0, // 최종 목표 점수 (인원 비례)
      items: [], // 드랍된 금괴 오브젝트 풀
    };

    this.joinRoom(socket, roomId);
    this.broadcastRooms();
  }

  handleJoinRoom(socket, { roomId, password }) {
    const room = this.rooms[roomId];
    if (!room) return socket.emit("room:error", "방이 존재하지 않습니다.");
    if (room.isPrivate && room.password !== password)
      return socket.emit("room:error", "비밀번호가 틀렸습니다.");
    if (Object.keys(room.players).length >= room.maxPlayers)
      return socket.emit("room:error", "방이 꽉 찼습니다.");
    if (room.gamePhase !== "waiting")
      return socket.emit("room:error", "이미 게임이 진행 중이라 난입할 수 없습니다.");

    this.joinRoom(socket, roomId);
    this.broadcastRooms();
  }

  joinRoom(socket, roomId) {
    this.leaveRoom(socket);

    const room = this.rooms[roomId];
    socket.join(roomId);
    this.socketIdToRoom[socket.id] = roomId;

    const redCount = Object.values(room.players).filter((p) => p.team === "red").length;
    const blueCount = Object.values(room.players).filter((p) => p.team === "blue").length;
    const assignedTeam = redCount <= blueCount ? "red" : "blue";

    room.players[socket.id] = {
      nickname: this.socketIdToNickname[socket.id] || "Guest",
      team: assignedTeam,
      isReady: false, 
      x: 240 + Math.random() * 40 - 20, 
      y: 240 + Math.random() * 40 - 20,
      isTagger: false,
      isJailed: false,
      characterId: assignedTeam === "red" ? "DEFAULT_RUNNER" : "DEFAULT_TAGGER",
    };

    socket.emit("room:join:success", { roomId, room });
    this.io.to(roomId).emit("room:info", {
      hostId: room.hostId,
      gamePhase: room.gamePhase,
    });
    this.io.to(roomId).emit("game:update", room.players);
  }

  handleTeamChange(socket, targetTeam) {
    const roomId = this.socketIdToRoom[socket.id];
    if (!roomId) return;
    const room = this.rooms[roomId];
    if (!room || room.gamePhase !== "waiting") return;

    const teamCount = Object.values(room.players).filter((p) => p.team === targetTeam).length;
    if (teamCount >= room.maxPlayers / 2) {
      return socket.emit("game:alert", "해당 팀은 이미 가득 찼습니다.");
    }

    room.players[socket.id].team = targetTeam;
    // 팀 변경 시 캐릭터도 해당 팀 기본 캐릭터로 변경
    room.players[socket.id].characterId = targetTeam === "red" ? "DEFAULT_RUNNER" : "DEFAULT_TAGGER";
    this.io.to(roomId).emit("game:update", room.players);
  }

  handleReady(socket) {
    const roomId = this.socketIdToRoom[socket.id];
    if (!roomId) return;
    const room = this.rooms[roomId];
    if (!room || room.gamePhase !== "waiting") return;

    room.players[socket.id].isReady = !room.players[socket.id].isReady;
    this.io.to(roomId).emit("game:update", room.players);
  }

  handleStart(socket) {
    const roomId = this.socketIdToRoom[socket.id];
    if (!roomId || !this.rooms[roomId]) return;
    const room = this.rooms[roomId];

    if (room.hostId !== socket.id) return;
    if (room.gamePhase !== "waiting" && room.gamePhase !== "ended") return;

    const playersArr = Object.entries(room.players);
    const redTeam = playersArr.filter(([id, p]) => p.team === "red");
    const blueTeam = playersArr.filter(([id, p]) => p.team === "blue");

    if (redTeam.length === 0 || blueTeam.length === 0)
      return socket.emit("game:alert", "양 팀에 최소 1명 이상 있어야 합니다.");
    if (redTeam.length !== blueTeam.length)
      return socket.emit("game:alert", "양 팀의 인원 비율이 1:1로 똑같아야 합니다.");

    const unreadyPlayers = playersArr.filter(([id, p]) => id !== room.hostId && !p.isReady);
    if (unreadyPlayers.length > 0)
      return socket.emit("game:alert", "모든 플레이어가 준비 완료를 해야 합니다.");

    room.gamePhase = "prep";
    room.timeLeft = 60; // 60초 진영공사 타임
    room.score = 0;

    assignItemsToPlayers(room);

    Object.values(room.players).forEach((p) => {
      p.isTagger = p.team === "blue";
    });

    const runnerCount = redTeam.length;
    room.maxScore = runnerCount * (room.targetQuota || 2);
    if (room.maxScore === 0) room.maxScore = 1;

    room.items = [];
    const totalGolds = room.maxScore + 2;
    for (let i = 0; i < totalGolds; i++) {
      let gx, gy;
      do {
        gx = 100 + Math.random() * 1200;
        gy = 100 + Math.random() * 1200;
      } while (
        (gx >= 120 && gx <= 400 && gy >= 120 && gy <= 400) || 
        (gx >= 680 && gx <= 960 && gy >= 680 && gy <= 960) 
      );
      room.items.push({ id: `gold_${crypto.randomUUID()}`, x: gx, y: gy });
    }

    for (const id in room.players) {
      room.players[id].isJailed = false;
      room.players[id].carriedItem = false;
      if (room.players[id].isTagger) {
        room.players[id].x = 480; 
      } else {
        room.players[id].x = 240; 
      }
      room.players[id].y = 240;
    }

    this.io.to(roomId).emit("game:start", room);
    this.io.to(roomId).emit("game:items_update", room.items);
    this.io.to(roomId).emit("game:score_update", {
      score: room.score,
      maxScore: room.maxScore,
    });
    this.io.to(roomId).emit("game:update", room.players);
    this.broadcastRooms();
  }

  leaveRoom(socket) {
    const roomId = this.socketIdToRoom[socket.id];
    if (roomId && this.rooms[roomId]) {
      const room = this.rooms[roomId];
      delete room.players[socket.id];
      delete this.socketIdToRoom[socket.id];
      socket.leave(roomId);

      if (Object.keys(room.players).length === 0) {
        delete this.rooms[roomId];
      } else {
        if (room.hostId === socket.id) {
          room.hostId = Object.keys(room.players)[0];
        }
        this.io.to(roomId).emit("room:info", {
          hostId: room.hostId,
          gamePhase: room.gamePhase,
        });
        this.io.to(roomId).emit("game:update", room.players);
      }
      this.broadcastRooms();
    }
  }
}

module.exports = RoomManager;
