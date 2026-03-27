require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const { assignItemsToPlayers, useItem } = require("./game/items");
const crypto = require("crypto");

const app = express();
app.use(cors({ origin: "*", methods: ["GET", "POST"] }));

// [배포/터널링 환경] 클라이언트의 빌드(dist)된 리액트 정적 파일들을 서빙합니다.
const path = require("path");
app.use(express.static(path.join(__dirname, "../client/dist")));

const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
  allowEIO3: true,
  transports: ["websocket", "polling"],
});

let rooms = {};
let socketIdToRoom = {};
let socketIdToNickname = {};

// 1. (삭제) 기존의 무작위 술래 할당 기능은 1:1 대기방 시스템으로 인해 폐기됩니다.
function assignTeamsToGameData(roomId) {
  const room = rooms[roomId];
  if (!room) return;
  // 레드팀은 도망자(isTagger = false), 블루팀은 관군(isTagger = true)로 세팅
  Object.values(room.players).forEach((p) => {
    p.isTagger = p.team === "blue";
  });
}

function broadcastRooms() {
  const roomList = Object.values(rooms).map((r) => ({
    id: r.id,
    title: r.title,
    isPrivate: r.isPrivate,
    maxPlayers: r.maxPlayers,
    currentPlayers: Object.keys(r.players).length,
    gamePhase: r.gamePhase,
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

    joinRoom(socket, roomId);
    broadcastRooms();
  });

  socket.on("room:join", ({ roomId, password }) => {
    const room = rooms[roomId];
    if (!room) return socket.emit("room:error", "방이 존재하지 않습니다.");
    if (room.isPrivate && room.password !== password)
      return socket.emit("room:error", "비밀번호가 틀렸습니다.");
    if (Object.keys(room.players).length >= room.maxPlayers)
      return socket.emit("room:error", "방이 꽉 찼습니다.");
    if (room.gamePhase !== "waiting")
      return socket.emit(
        "room:error",
        "이미 게임이 진행 중이라 난입할 수 없습니다.",
      );

    joinRoom(socket, roomId);
    broadcastRooms();
  });

  function joinRoom(socket, roomId) {
    leaveRoom(socket);

    const room = rooms[roomId];
    socket.join(roomId);
    socketIdToRoom[socket.id] = roomId;

    // 인원이 더 적은 팀으로 자동 배정
    const redCount = Object.values(room.players).filter(
      (p) => p.team === "red",
    ).length;
    const blueCount = Object.values(room.players).filter(
      (p) => p.team === "blue",
    ).length;
    const assignedTeam = redCount <= blueCount ? "red" : "blue";

    room.players[socket.id] = {
      nickname: socketIdToNickname[socket.id] || "Guest",
      team: assignedTeam,
      isReady: false, // 대기방 레디 상태
      x: 240 + Math.random() * 40 - 20, // 임시 스폰
      y: 240 + Math.random() * 40 - 20,
      isTagger: false,
      isJailed: false,
    };

    socket.emit("room:join:success", { roomId, room });
    io.to(roomId).emit("room:info", {
      hostId: room.hostId,
      gamePhase: room.gamePhase,
    });
    io.to(roomId).emit("game:update", room.players);
  }

  // --- 대기방 전용 이벤트 ---
  socket.on("room:team_change", (targetTeam) => {
    const roomId = socketIdToRoom[socket.id];
    if (!roomId) return;
    const room = rooms[roomId];
    if (!room || room.gamePhase !== "waiting") return;

    const teamCount = Object.values(room.players).filter(
      (p) => p.team === targetTeam,
    ).length;
    // 한 팀당 최대 팀원은 (최대 인원수 / 2) 여야 함
    if (teamCount >= room.maxPlayers / 2) {
      return socket.emit("game:alert", "해당 팀은 이미 가득 찼습니다.");
    }

    room.players[socket.id].team = targetTeam;
    io.to(roomId).emit("game:update", room.players);
  });

  socket.on("room:ready", () => {
    const roomId = socketIdToRoom[socket.id];
    if (!roomId) return;
    const room = rooms[roomId];
    if (!room || room.gamePhase !== "waiting") return;

    room.players[socket.id].isReady = !room.players[socket.id].isReady;
    io.to(roomId).emit("game:update", room.players);
  });

  socket.on("room:start", () => {
    const roomId = socketIdToRoom[socket.id];
    if (!roomId || !rooms[roomId]) return;
    const room = rooms[roomId];

    if (room.hostId !== socket.id) return;
    if (room.gamePhase !== "waiting" && room.gamePhase !== "ended") return;

    // 1:1 팀 매치 및 레디 상태 엄격 검증
    const playersArr = Object.entries(room.players);
    const redTeam = playersArr.filter(([id, p]) => p.team === "red");
    const blueTeam = playersArr.filter(([id, p]) => p.team === "blue");

    if (redTeam.length === 0 || blueTeam.length === 0)
      return socket.emit("game:alert", "양 팀에 최소 1명 이상 있어야 합니다.");
    if (redTeam.length !== blueTeam.length)
      return socket.emit(
        "game:alert",
        "양 팀의 인원 비율이 1:1로 똑같아야 합니다.",
      );

    const unreadyPlayers = playersArr.filter(
      ([id, p]) => id !== room.hostId && !p.isReady,
    );
    if (unreadyPlayers.length > 0)
      return socket.emit(
        "game:alert",
        "모든 플레이어가 준비 완료를 해야 합니다.",
      );

    room.gamePhase = "prep";
    room.timeLeft = 60; // 60초 진영공사 타임
    room.score = 0;

    // 게임 시작 시 각 플레이어에게 랜덤 아이템 1개 지급
    assignItemsToPlayers(room);

    // 할당된 팀을 캐릭터 역할로 확정 (Red=Runner, Blue=Tagger)
    assignTeamsToGameData(roomId);

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
        (gx >= 120 && gx <= 400 && gy >= 120 && gy <= 400) || // 안전구역 x:160~360 널널하게 피함
        (gx >= 680 && gx <= 960 && gy >= 680 && gy <= 960) // 감옥 존 피함
      );
      room.items.push({ id: `gold_${crypto.randomUUID()}`, x: gx, y: gy });
    }

    for (const id in room.players) {
      room.players[id].isJailed = false;
      room.players[id].carriedItem = false;
      if (room.players[id].isTagger) {
        room.players[id].x = 480; // 막히지 않은 평지
      } else {
        room.players[id].x = 240; // 안전구역 중앙
      }
      room.players[id].y = 240;
    }

    io.to(roomId).emit("game:start", room);
    io.to(roomId).emit("game:items_update", room.items);
    io.to(roomId).emit("game:score_update", {
      score: room.score,
      maxScore: room.maxScore,
    });
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

    // --- 금괴 획득 및 득점 로직 ---
    if (!player.isTagger && !player.isJailed) {
      // 1. 바닥의 금괴 줍기
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
            io.to(roomId).emit("game:items_update", room.items);
            break;
          }
        }
      }

      // 2. 금괴 들고 안전구역 입장 시 득점 +1
      if (player.carriedItem) {
        if (
          player.x >= 160 &&
          player.x <= 360 &&
          player.y >= 160 &&
          player.y <= 360
        ) {
          player.carriedItem = false;
          room.score += 1;
          io.to(roomId).emit("game:score_update", {
            score: room.score,
            maxScore: room.maxScore,
          });

          if (room.score >= room.maxScore) {
            room.gamePhase = "ended";
            io.to(roomId).emit("game:phase_change", {
              gamePhase: room.gamePhase,
              timeLeft: 0,
            });
            io.to(roomId).emit(
              "game:alert",
              "🏆 의적 홍길동 무리가 금괴를 모두 훔쳐 승리했습니다!",
            );
          }
        }
      }
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
              io.to(roomId).emit("game:items_update", room.items);
            }
            // 감옥(관아) 중앙 (타일 20 -> 800)
            p2.x = 800;
            p2.y = 800;
          }
        }
      }
    }

    if (caughtPlayerId) {
      // 모두 감옥에 갇혔는지(술래 승리) 확인
      const allRunners = Object.values(room.players).filter((p) => !p.isTagger);
      const allJailed = allRunners.every((p) => p.isJailed);

      if (allRunners.length > 0 && allJailed) {
        room.gamePhase = "ended";
        io.to(roomId).emit("game:phase_change", {
          gamePhase: room.gamePhase,
          timeLeft: 0,
        });
        io.to(roomId).emit(
          "game:alert",
          "🔥 탐관오리(술래)가 의적을 전원 감옥에 가뒀습니다!",
        );
      }

      // 텔레포트를 클라이언트에 즉시 강제 적용!
      io.to(roomId).emit("game:reset", room.players);
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
        io.to(roomId).emit("room:info", {
          hostId: room.hostId,
          gamePhase: room.gamePhase,
        });
        io.to(roomId).emit("game:update", room.players);
      }
      broadcastRooms();
    }
  }

  // 4초 구출 상호작용 관련 이벤트
  socket.on("rescue:start", () => {
    const roomId = socketIdToRoom[socket.id];
    if (!roomId) return;
    const room = rooms[roomId];
    if (!room) return;

    // 술래들에게만 알람 전송
    for (const id in room.players) {
      if (room.players[id].isTagger) {
        io.to(id).emit(
          "game:alert",
          "🚨 누군가 감옥의 문을 해킹하고 있습니다! (방어 필요)",
        );
      }
    }
  });

  socket.on("rescue:complete", () => {
    const roomId = socketIdToRoom[socket.id];
    if (!roomId) return;
    const room = rooms[roomId];
    if (!room) return;

    let rescued = 0;
    for (const id in room.players) {
      if (room.players[id].isJailed) {
        room.players[id].isJailed = false;
        room.players[id].x = 240; // 다시 안전 구역 스폰
        room.players[id].y = 240;
        rescued++;
      }
    }

    if (rescued > 0) {
      io.to(roomId).emit(
        "game:alert",
        "🔓 감옥 문이 파괴되어 동료들이 탈출해 안전구역으로 향했습니다!",
      );
      io.to(roomId).emit("game:reset", room.players);
    }
  });

  socket.on("item:use", () => {
    const roomId = socketIdToRoom[socket.id];
    if (roomId && rooms[roomId]) {
      useItem(roomId, rooms[roomId], socket.id, io);
    }
  });

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
          io.to(roomId).emit("game:phase_change", {
            gamePhase: room.gamePhase,
            timeLeft: room.timeLeft,
          });
        } else if (room.gamePhase === "playing") {
          room.gamePhase = "ended";
          // 일단 게임 오버되면 도망자들을 전부 다시 모을 수 있도록 phase_change를 보냄
          io.to(roomId).emit("game:phase_change", {
            gamePhase: room.gamePhase,
            timeLeft: 0,
          });
        }
      }
      io.to(roomId).emit("game:timer", {
        gamePhase: room.gamePhase,
        timeLeft: room.timeLeft,
      });
    }
  }
}, 1000);

// SPA 라우팅 호환: 알 수 없는 주소로 새로고침/접속하더라도 React 앱(Client)을 던져줍니다.
app.use((req, res) => {
  res.sendFile(path.join(__dirname, "../client/dist/index.html"));
});

server.listen(3001, () => {
  console.log(
    "Server running on port 3001 (Serving React App & Scalable Sockets)",
  );
});
