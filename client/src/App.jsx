import { useState } from "react";
import socket from "./hooks/useSocket";
import Login from "./components/Login";
import Lobby from "./components/Lobby";
import GameCanvas from "./components/GameCanvas";
import "./App.css";

function App() {
  const [screen, setScreen] = useState("LOGIN"); 
  const [nickname, setNickname] = useState("");
  const [roomId, setRoomId] = useState("");
  const [roomData, setRoomData] = useState(null);

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
        {`body { margin: 0; background-color: #1e1e1e; font-family: 'Inter', sans-serif; }`}
      </style>
      
      {screen === "LOGIN" && <Login onLogin={handleLogin} />}
      {screen === "LOBBY" && <Lobby nickname={nickname} onJoinSuccess={handleJoinSuccess} />}
      {screen === "INGAME" && (
        <div style={{ position: "relative", width: "100vw", height: "100vh", display: "flex", justifyContent: "center", alignItems: "center" }}>
          
          <GameCanvas initialRoomData={roomData} />
          
          <button 
            onClick={handleLeaveRoom}
            style={{
              position:"absolute", top: 20, left: 20, padding: "10px 20px", backgroundColor: "rgba(255,255,255,0.9)",
              border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold", fontSize: "14px",
              boxShadow: "0 4px 10px rgba(0,0,0,0.2)", zIndex: 100
            }}
          >
            ← 로비로 나가기
          </button>
        </div>
      )}
    </>
  );
}

export default App;