const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const crypto = require("crypto");

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" },
});

let rooms = {};
let socketIdToRoom = {};
let socketIdToNickname = {};

// 1. 방 안의 인원에 따른 '술래 수 자동 할당 로직'
function assignRandomTaggers(roomId) {
  const room = rooms[roomId];
  if (!room) return;
  const ids = Object.keys(room.players);
  
  // 플레이어 수에 따른 술래 할당 (7명 이상이면 2명, 미만이면 1명)
  const taggerCount = ids.length >= 7 ? 2 : 1;
  const nonTaggers = [...ids];

  // 전체 술래 초기화
  ids.forEach(id => room.players[id].isTagger = false);

  for (let i = 0; i < taggerCount; i++) {
    if (nonTaggers.length === 0) break;
    const randIndex = Math.floor(Math.random() * nonTaggers.length);
    const taggerId = nonTaggers.splice(randIndex, 1)[0];
    room.players[taggerId].isTagger = true;
    
    // 대표 태거 ID 저장 (과거 호환용, 추후 지워도 무방함)
    if (i === 0) room.taggerId = taggerId; 
  }
}

function broadcastRooms() {
  const roomList = Object.values(rooms).map(r => ({
    id: r.id,
    title: r.title,
    isPrivate: r.isPrivate,
    maxPlayers: r.maxPlayers,
    currentPlayers: Object.keys(r.players).length,
    gamePhase: r.gamePhase
  }));
  io.emit("rooms:list", roomList);
}

io.on("connection", (socket) => {
  socket.on("user:login", (nickname) => {
    socketIdToNickname[socket.id] = nickname;
    broadcastRooms();
  });

  socket.on("rooms:request_list", () => {
    broadcastRooms();
  });

  socket.on("room:create", (roomData) => {
    const roomId = crypto.randomUUID();
    rooms[roomId] = {
      id: roomId,
      title: roomData.title,
      isPrivate: roomData.isPrivate,
      password: roomData.password,
      maxPlayers: parseInt(roomData.maxPlayers) || 4,
      players: {},
      taggerId: null,
      hostId: socket.id,
      gamePhase: "waiting", // 'waiting' | 'prep' | 'playing' | 'ended'
      timeLeft: 0           
    };
    
    joinRoom(socket, roomId);
    broadcastRooms();
  });

  socket.on("room:join", ({ roomId, password }) => {
    const room = rooms[roomId];
    if (!room) return socket.emit("room:error", "방이 존재하지 않습니다.");
    if (room.isPrivate && room.password !== password) return socket.emit("room:error", "비밀번호가 틀렸습니다.");
    if (Object.keys(room.players).length >= room.maxPlayers) return socket.emit("room:error", "방이 꽉 찼습니다.");
    if (room.gamePhase !== "waiting") return socket.emit("room:error", "이미 게임이 진행 중이라 난입할 수 없습니다.");
    
    joinRoom(socket, roomId);
    broadcastRooms();
  });

  function joinRoom(socket, roomId) {
    leaveRoom(socket);

    const room = rooms[roomId];
    socket.join(roomId);
    socketIdToRoom[socket.id] = roomId;

    room.players[socket.id] = {
      nickname: socketIdToNickname[socket.id] || "Guest",
      x: 240 + Math.random() * 40 - 20, // 안전 구역 내부
      y: 240 + Math.random() * 40 - 20,
      isTagger: false,
      isJailed: false,
    };

    socket.emit("room:join:success", { roomId, room });
    io.to(roomId).emit("room:info", { hostId: room.hostId, gamePhase: room.gamePhase });
    io.to(roomId).emit("game:update", room.players);
  }

  socket.on("room:start", () => {
    const roomId = socketIdToRoom[socket.id];
    if (!roomId || !rooms[roomId]) return;
    const room = rooms[roomId];
    
    if (room.hostId !== socket.id) return; 
    if (room.gamePhase !== "waiting" && room.gamePhase !== "ended") return;

    room.gamePhase = "prep";
    room.timeLeft = 60; // 60초 대기(진영공사 타임)
    assignRandomTaggers(roomId); 

    for (const id in room.players) {
      room.players[id].isJailed = false; // 시작 시 감옥 초기화
      if (room.players[id].isTagger) {
        room.players[id].x = 480; // 막히지 않은 평지
      } else {
        room.players[id].x = 240; // 안전구역 중앙
      }
      room.players[id].y = 240;
    }

    io.to(roomId).emit("game:start", room);
    io.to(roomId).emit("game:update", room.players);
    broadcastRooms(); 
  });

  socket.on("player:move", ({ x, y }) => {
    const roomId = socketIdToRoom[socket.id];
    if (!roomId) return;

    const room = rooms[roomId];
    if (!room) return;

    const player = room.players[socket.id];
    if (!player) return;

    player.x = x;
    player.y = y;

    if (room.gamePhase === "waiting" || room.gamePhase === "ended") {
      io.to(roomId).emit("game:update", room.players);
      return;
    }

    // --- 충돌 및 감옥 로직 ---
    let caughtPlayerId = null;
    
    // 술래 -> 도망자 체포 체크
    for (const p1_id in room.players) {
      for (const p2_id in room.players) {
        const p1 = room.players[p1_id];
        const p2 = room.players[p2_id];
        
        // p1이 술래고 p2가 현재 도망 다니는 도망자일 때
        if (p1.isTagger && !p2.isTagger && !p2.isJailed) {
          const isIntersect = 
            p1.x < p2.x + 20 && p1.x + 20 > p2.x &&
            p1.y < p2.y + 20 && p1.y + 20 > p2.y;
            
          if (isIntersect) {
            caughtPlayerId = p2_id;
            p2.isJailed = true;
            // 감옥(관아) 중앙 (타일 20 -> 800)
            p2.x = 800;
            p2.y = 800;
          }
        }
      }
    }

    if (caughtPlayerId) {
      // 모두 감옥에 갇혔는지(술래 승리) 확인
      const allRunners = Object.values(room.players).filter(p => !p.isTagger);
      const allJailed = allRunners.every(p => p.isJailed);

      if (allRunners.length > 0 && allJailed) {
        room.gamePhase = "ended";
        io.to(roomId).emit("game:phase_change", { gamePhase: room.gamePhase, timeLeft: 0 });
      }

      // 텔레포트를 클라이언트에 즉시 강제 적용!
      io.to(roomId).emit("game:reset", room.players);
      return;
    }

    // 도망자 -> 감옥 동료 구출 체크
    let rescueOccurred = false;
    if (!player.isTagger && !player.isJailed) {
      for (const other_id in room.players) {
        if (other_id !== socket.id) {
          const other = room.players[other_id];
          if (!other.isTagger && other.isJailed) {
            const isIntersect = 
              player.x < other.x + 20 && player.x + 20 > other.x &&
              player.y < other.y + 20 && player.y + 20 > other.y;
            
            if (isIntersect) {
              other.isJailed = false;
              rescueOccurred = true;
            }
          }
        }
      }
    }
    
    if (rescueOccurred) {
      io.to(roomId).emit("game:reset", room.players); // 색상 변경 등을 위해 패치
      return;
    }
    // --- 감옥 로직 끝 ---

    io.to(roomId).emit("game:update", room.players);
  });

  function leaveRoom(socket) {
    const roomId = socketIdToRoom[socket.id];
    if (roomId && rooms[roomId]) {
      const room = rooms[roomId];
      delete room.players[socket.id];
      delete socketIdToRoom[socket.id];
      socket.leave(roomId);
      
      if (Object.keys(room.players).length === 0) {
        delete rooms[roomId]; 
      } else {
        if (room.hostId === socket.id) {
          room.hostId = Object.keys(room.players)[0];
        }
        io.to(roomId).emit("room:info", { hostId: room.hostId, gamePhase: room.gamePhase });
        io.to(roomId).emit("game:update", room.players);
      }
      broadcastRooms();
    }
  }

  socket.on("room:leave", () => leaveRoom(socket));
  socket.on("disconnect", () => leaveRoom(socket));
});

// 글로벌 타이머루프 - 1초마다 도는 중앙관리 시스템
setInterval(() => {
  for (const roomId in rooms) {
    const room = rooms[roomId];
    if (room.gamePhase === "prep" || room.gamePhase === "playing") {
      room.timeLeft -= 1;

      if (room.timeLeft <= 0) {
        if (room.gamePhase === "prep") {
          room.gamePhase = "playing";
          room.timeLeft = 180; // 추격전 3분
          io.to(roomId).emit("game:phase_change", { gamePhase: room.gamePhase, timeLeft: room.timeLeft });
        } else if (room.gamePhase === "playing") {
          room.gamePhase = "ended";
          // 일단 게임 오버되면 도망자들을 전부 다시 모을 수 있도록 phase_change를 보냄
          io.to(roomId).emit("game:phase_change", { gamePhase: room.gamePhase, timeLeft: 0 });
        }
      }
      io.to(roomId).emit("game:timer", { gamePhase: room.gamePhase, timeLeft: room.timeLeft });
    }
  }
}, 1000);

server.listen(3001, () => {
  console.log("server running");
});
