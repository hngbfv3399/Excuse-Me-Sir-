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


let rooms = {};
let socketIdToRoom = {};
let socketIdToNickname = {};


const roomManager = new RoomManager(io, rooms, socketIdToRoom, socketIdToNickname);
const gameManager = new GameManager(io, rooms, socketIdToRoom);

io.on("connection", (socket) => {
  
  socket.on("user:login", (nickname) => roomManager.handleLogin(socket, nickname));
  socket.on("rooms:request_list", () => roomManager.handleRequestList());
  socket.on("room:create", (roomData) => roomManager.handleCreateRoom(socket, roomData));
  socket.on("room:join", (data) => roomManager.handleJoinRoom(socket, data));
  
  socket.on("room:team_change", (targetTeam) => roomManager.handleTeamChange(socket, targetTeam));
  socket.on("room:ready", () => roomManager.handleReady(socket));
  socket.on("room:start", () => roomManager.handleStart(socket));
  
  
  socket.on("player:move", (data) => gameManager.handlePlayerMove(socket, data));
  socket.on("rescue:start", () => gameManager.handleRescueStart(socket));
  socket.on("rescue:complete", () => gameManager.handleRescueComplete(socket));
  socket.on("item:use", () => gameManager.handleItemUse(socket));
  
  
  socket.on("room:leave", () => roomManager.leaveRoom(socket));
  socket.on("disconnect", () => roomManager.leaveRoom(socket));
});


gameManager.startGlobalTimerLoop();

app.use((req, res) => {
  res.sendFile(path.join(__dirname, "../client/dist/index.html"));
});

server.listen(3001, () => {
  console.log("Server running on port 3001 (OOP Structure)");
});
