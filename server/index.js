require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const path = require("path");

const RoomManager = require("./game/RoomManager");
const GameManager = require("./game/GameManager");

const app = express();
app.use(cors({ origin: "*", methods: ["GET", "POST"] }));
app.use(express.static(path.join(__dirname, "../client/dist")));

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
  allowEIO3: true,
  transports: ["websocket", "polling"],
});

// 글로벌 다중 룸 상태 저장소 (In-memory)
let rooms = {};
let socketIdToRoom = {};
let socketIdToNickname = {};

// Manager 객체 인스턴스화
const roomManager = new RoomManager(io, rooms, socketIdToRoom, socketIdToNickname);
const gameManager = new GameManager(io, rooms, socketIdToRoom);

io.on("connection", (socket) => {
  // 로비 및 대기방 관리 이벤트
  socket.on("user:login", (nickname) => roomManager.handleLogin(socket, nickname));
  socket.on("rooms:request_list", () => roomManager.handleRequestList());
  socket.on("room:create", (roomData) => roomManager.handleCreateRoom(socket, roomData));
  socket.on("room:join", (data) => roomManager.handleJoinRoom(socket, data));
  
  socket.on("room:team_change", (targetTeam) => roomManager.handleTeamChange(socket, targetTeam));
  socket.on("room:ready", () => roomManager.handleReady(socket));
  socket.on("room:start", () => roomManager.handleStart(socket));
  
  // 인게임 로직 및 물리 이벤트
  socket.on("player:move", (data) => gameManager.handlePlayerMove(socket, data));
  socket.on("rescue:start", () => gameManager.handleRescueStart(socket));
  socket.on("rescue:complete", () => gameManager.handleRescueComplete(socket));
  socket.on("item:use", () => gameManager.handleItemUse(socket));
  
  // 접속 해제
  socket.on("room:leave", () => roomManager.leaveRoom(socket));
  socket.on("disconnect", () => roomManager.leaveRoom(socket));
});

// 글로벌 게임 타이머 및 상태 감시 루프
gameManager.startGlobalTimerLoop();

app.use((req, res) => {
  res.sendFile(path.join(__dirname, "../client/dist/index.html"));
});

server.listen(3001, () => {
  console.log("Server running on port 3001 (OOP Structure)");
});
