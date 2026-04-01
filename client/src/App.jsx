import { useState, useEffect, useCallback } from "react";
import socket from "./hooks/useSocket";
import Login from "./components/Login";
import Lobby from "./components/Lobby";
import GameCanvas from "./components/GameCanvas";
import "./App.css";


const GAME_W = 800;
const GAME_H = 600;

function useScale() {
  const [scale, setScale] = useState(1);
  const [isPortrait, setIsPortrait] = useState(false);

  useEffect(() => {
    function calc() {
      const sw = window.innerWidth;
      const sh = window.innerHeight;
      setScale(Math.min(sw / GAME_W, sh / GAME_H, 1));
      
      const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const isMobileUA = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
      if (hasTouch && isMobileUA) {
        setIsPortrait(sh > sw);
      } else {
        setIsPortrait(false);
      }
    }
    calc();
    const handleOrientation = () => setTimeout(calc, 100);
    window.addEventListener("resize", calc);
    window.addEventListener("orientationchange", handleOrientation);
    return () => {
      window.removeEventListener("resize", calc);
      window.removeEventListener("orientationchange", handleOrientation);
    };
  }, []);
  return { scale, isPortrait };
}

function App() {
  const [screen, setScreen] = useState("LOGIN"); 
  const [nickname, setNickname] = useState("");
  const [roomId, setRoomId] = useState("");
  const [roomData, setRoomData] = useState(null);
  const { scale, isPortrait } = useScale();

  const handleLogin = (name) => {
    setNickname(name);
    socket.emit("user:login", name);
    setScreen("LOBBY");
  };

  const handleJoinSuccess = useCallback((joinedRoomId, rData) => {
    setRoomId(joinedRoomId);
    setRoomData(rData);
    setScreen("INGAME");
  }, []);

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

      {isPortrait ? (
        <div style={{
          width: "100%", height: "100%", backgroundColor: "#0a0a0c", color: "#fff",
          display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center",
          textAlign: "center", padding: "20px"
        }}>
          <div style={{ fontSize: "50px", marginBottom: "20px", transform: "rotate(-90deg)" }}>📱</div>
          <h2>가로 모드로 회전해주세요</h2>
          <p style={{ color: "#aaa", marginTop: "10px", lineHeight: "1.5" }}>기기를 눕혀야 정상적인 게임 플레이가 가능합니다.<br/>회전 후 자동으로 화면이 전환됩니다.</p>
        </div>
      ) : (
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
      )}
    </>
  );
}

export default App;