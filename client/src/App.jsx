import { useState, useEffect } from "react";
import socket from "./hooks/useSocket";
import Login from "./components/Login";
import Lobby from "./components/Lobby";
import GameCanvas from "./components/GameCanvas";
import "./App.css";

const GAME_W = 800;
const GAME_H = 600;

function useScale() {
  const [scale, setScale] = useState(1);
  useEffect(() => {
    function calc() {
      const sw = window.innerWidth;
      const sh = window.innerHeight;
      setScale(Math.min(sw / GAME_W, sh / GAME_H, 1));
    }
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, []);
  return scale;
}

function App() {
  const [screen, setScreen] = useState("LOGIN"); 
  const [nickname, setNickname] = useState("");
  const [roomId, setRoomId] = useState("");
  const [roomData, setRoomData] = useState(null);
  const scale = useScale();

  const handleLogin = (name) => {
    setNickname(name);
    socket.emit("user:login", name);
    setScreen("LOBBY");
  };

  const handleJoinSuccess = (joinedRoomId, rData) => {
    setRoomId(joinedRoomId);
    setRoomData(rData);
    setScreen("INGAME");
  };

  const handleLeaveRoom = () => {
    socket.emit("room:leave");
    setRoomId("");
    setRoomData(null);
    setScreen("LOBBY");
  };

  return (
    <>
      <style>
        {`
          *, *::before, *::after { box-sizing: border-box; }
          html, body { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; }
          body { 
            background-color: #0a0a0c; 
            display: flex; justify-content: center; align-items: center; 
            min-height: 100dvh;
          }
          #root { display: flex; justify-content: center; align-items: center; width: 100%; height: 100%; }
        `}
      </style>

      {/* 반응형 아케이드 프레임: scale로 어떤 화면에서도 800x600 비율 유지 */}
      <div style={{
        width: `${GAME_W}px`,
        height: `${GAME_H}px`,
        transform: `scale(${scale})`,
        transformOrigin: "center center",
        backgroundColor: "#1e1e1e",
        position: "relative",
        borderRadius: "16px",
        overflow: "hidden",
        border: "4px solid #444",
        boxShadow: "0 0 50px rgba(0,0,0,0.8)",
        flexShrink: 0,
      }}>
        {screen === "LOGIN" && <Login onLogin={handleLogin} />}
        {screen === "LOBBY" && <Lobby nickname={nickname} onJoinSuccess={handleJoinSuccess} />}
        {screen === "INGAME" && <GameCanvas initialRoomData={roomData} onLeave={handleLeaveRoom} />}
      </div>
    </>
  );
}

export default App;