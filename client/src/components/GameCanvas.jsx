import { useEffect, useRef, useState } from "react";
import socket from "../hooks/useSocket";
import { useKeyboard } from "../hooks/useKeyboard";
import { isWall } from "../utils/physics";
import { renderGame } from "../utils/render";

export default function GameCanvas({ initialRoomData }) {
  const [roomInfo, setRoomInfo] = useState(initialRoomData);
  const [timerInfo, setTimerInfo] = useState({ gamePhase: initialRoomData?.gamePhase || "waiting", timeLeft: 0 });
  const canvasRef = useRef(null);

  const playersRef = useRef({});
  const myIdRef = useRef(null);

  const keys = useKeyboard();
  const speed = 3;

  const myId = socket.id;
  const isHost = roomInfo?.hostId === myId;
  const isWaiting = timerInfo.gamePhase === "waiting";
  const isPrep = timerInfo.gamePhase === "prep";

  useEffect(() => {
    if (socket.id) {
      myIdRef.current = socket.id;
    }

    socket.on("connect", () => {
      myIdRef.current = socket.id;
    });

    socket.on("room:info", (newInfo) => {
      setRoomInfo((prev) => ({ ...prev, ...newInfo }));
      setTimerInfo((prev) => ({ ...prev, gamePhase: newInfo.gamePhase || prev.gamePhase }));
    });

    socket.on("game:timer", (info) => {
      setTimerInfo(info);
    });

    socket.on("game:phase_change", (info) => {
      setTimerInfo(prev => ({ ...prev, gamePhase: info.gamePhase, timeLeft: info.timeLeft }));
      if (info.gamePhase === "ended") {
        alert("게임이 종료되었습니다!");
      }
    });

    socket.on("game:start", (startedRoom) => {
      setRoomInfo(startedRoom);
      
      Object.keys(startedRoom.players).forEach((id) => {
        const p = startedRoom.players[id];
        if (playersRef.current[id]) {
          playersRef.current[id].x = p.x;
          playersRef.current[id].y = p.y;
          playersRef.current[id].targetX = p.x;
          playersRef.current[id].targetY = p.y;
        }
      });
    });

    socket.on("game:reset", (serverPlayers) => {
      Object.keys(serverPlayers).forEach((id) => {
        const serverPlayer = serverPlayers[id];
        if (playersRef.current[id]) {
          playersRef.current[id].x = serverPlayer.x;
          playersRef.current[id].y = serverPlayer.y;
          playersRef.current[id].targetX = serverPlayer.x;
          playersRef.current[id].targetY = serverPlayer.y;
          playersRef.current[id].isJailed = serverPlayer.isJailed;
        }
      });
    });

    socket.on("game:update", (serverPlayers) => {
      Object.keys(serverPlayers).forEach((id) => {
        const serverPlayer = serverPlayers[id];

        if (!playersRef.current[id]) {
          playersRef.current[id] = {
            ...serverPlayer,
            targetX: serverPlayer.x,
            targetY: serverPlayer.y,
          };
        } else {
          playersRef.current[id].targetX = serverPlayer.x;
          playersRef.current[id].targetY = serverPlayer.y;
          playersRef.current[id].isTagger = serverPlayer.isTagger;
          playersRef.current[id].isJailed = serverPlayer.isJailed;
        }
      });

      Object.keys(playersRef.current).forEach((id) => {
        if (!serverPlayers[id]) delete playersRef.current[id];
      });
    });

    return () => {
      socket.off("connect");
      socket.off("room:info");
      socket.off("game:timer");
      socket.off("game:phase_change");
      socket.off("game:start");
      socket.off("game:update");
      socket.off("game:reset"); 
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animationId;

    function gameLoop() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const players = playersRef.current;
      const mId = myIdRef.current;
      const currentKeys = keys.current;

      if (players[mId] && timerInfo.gamePhase !== "ended") {
        let dx = 0;
        let dy = 0;

        if (!players[mId].isJailed) {
          if (currentKeys["w"] || currentKeys["W"]) dy -= speed;
          if (currentKeys["s"] || currentKeys["S"]) dy += speed;
          if (currentKeys["a"] || currentKeys["A"]) dx -= speed;
          if (currentKeys["d"] || currentKeys["D"]) dx += speed;
        }

        if (dx !== 0 || dy !== 0) {
          let remainingX = Math.abs(dx);
          let remainingY = Math.abs(dy);
          let stepX = dx > 0 ? 1 : (dx < 0 ? -1 : 0);
          let stepY = dy > 0 ? 1 : (dy < 0 ? -1 : 0);

          while (remainingX > 0) {
            const moveAmt = Math.min(1, remainingX);
            let nextX = players[mId].x + stepX * moveAmt;
            
            // 안전 구역 가두기 (도망자 & 준비 시간 60초)
            if (timerInfo.gamePhase === "prep" && !players[mId].isTagger) {
               // 맵 기준 x: 160 ~ 340 타일 벽 안쪽으로 고정
               if (nextX < 160 || nextX > 340) { nextX = players[mId].x; }
            }

            if (!isWall(nextX, players[mId].y)) {
              players[mId].x = nextX;
              remainingX -= moveAmt;
            } else break;
          }

          while (remainingY > 0) {
            const moveAmt = Math.min(1, remainingY);
            let nextY = players[mId].y + stepY * moveAmt;

            if (timerInfo.gamePhase === "prep" && !players[mId].isTagger) {
               // 맵 기준 y: 160 ~ 340
               if (nextY < 160 || nextY > 340) { nextY = players[mId].y; }
            }

            if (!isWall(players[mId].x, nextY)) {
              players[mId].y = nextY;
              remainingY -= moveAmt;
            } else break;
          }

          socket.emit("player:move", {
            x: players[mId].x,
            y: players[mId].y,
          });
        }
      }

      Object.keys(players).forEach((id) => {
        const p = players[id];
        if (id !== mId) {
          p.x += (p.targetX - p.x) * 0.1;
          p.y += (p.targetY - p.y) * 0.1;
        }
      });

      renderGame(ctx, canvas, players, mId);
      animationId = requestAnimationFrame(gameLoop);
    }

    gameLoop();
    return () => cancelAnimationFrame(animationId);
  }, [keys, timerInfo.gamePhase]);

  // 초 단위를 분:초 로 변환
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div style={{ position: "relative" }}>
      {/* 화면 최상단 타이머 UI */}
      {timerInfo.gamePhase !== "waiting" && (
        <div style={{
          position: "absolute", top: 20, left: "50%", transform: "translateX(-50%)",
          backgroundColor: timerInfo.gamePhase === "prep" ? "rgba(255, 204, 0, 0.9)" : "rgba(255, 82, 82, 0.9)",
          padding: "10px 40px", borderRadius: "30px", zIndex: 50,
          color: timerInfo.gamePhase === "prep" ? "#333" : "white", fontWeight: "bold", fontSize: "24px",
          boxShadow: "0 4px 15px rgba(0,0,0,0.3)", display: "flex", alignItems: "center", gap: "20px"
        }}>
          {timerInfo.gamePhase === "prep" ? "🚧 수비 진영 구축 (안전 구역 갇힘)" : "⚔️ 곡식 탈취 추격전"}
          <span style={{ fontSize: "32px", fontFamily: "monospace", paddingLeft: "10px" }}>
            {formatTime(timerInfo.timeLeft)}
          </span>
        </div>
      )}

      {/* 게임 끝났을 시 축하 리플레이 오버레이 */}
      {timerInfo.gamePhase === "ended" && (
         <div style={{
          position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: "rgba(0,0,0,0.7)", borderRadius: "12px", zIndex: 10,
          display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center",
          color: "white", backdropFilter: "blur(4px)"
        }}>
          <h2 style={{ fontSize: "40px", color: "#FFD700" }}>게임 종료!</h2>
          {isHost && (
             <button 
              onClick={() => { socket.emit("room:start"); }}
              style={{
                marginTop: "20px", padding: "16px 40px", fontSize: "20px", fontWeight: "bold", 
                backgroundColor: "#4CAF50", color: "white", border: "none", borderRadius: "12px", cursor: "pointer"
              }}
            >
              🔄 다시 시작
            </button>
          )}
        </div>
      )}

      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        style={{ 
          border: "2px solid #555", display: "block", margin: "0 auto", 
          borderRadius: "12px", boxShadow: "0 10px 30px rgba(0,0,0,0.5)" 
        }}
      />
      
      {/* 대기실 필름 */}
      {isWaiting && (
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: "rgba(0,0,0,0.5)", borderRadius: "12px",
          display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center",
          color: "white", backdropFilter: "blur(2px)"
        }}>
          <h2 style={{ fontSize: "36px", margin: "0 0 10px 0", color: "#FFF", textShadow: "0 2px 4px rgba(0,0,0,0.5)" }}>대기실</h2>
          <p style={{ fontSize: "18px", margin: "0 0 40px 0", color: "#ddd" }}>{roomInfo?.title}</p>
          
          {isHost ? (
            <button 
              onClick={() => socket.emit("room:start")}
              style={{
                padding: "16px 40px", fontSize: "20px", fontWeight: "bold", 
                backgroundColor: "#FF5252", color: "white", border: "none", 
                borderRadius: "12px", cursor: "pointer", boxShadow: "0 4px 15px rgba(255, 82, 82, 0.4)",
              }}
            >
              🚀 게임 시작
            </button>
          ) : (
            <div style={{
                padding: "16px 40px", fontSize: "18px", fontWeight: "bold", 
                backgroundColor: "rgba(0,0,0,0.4)", color: "#ccc", border: "1px solid #666", 
                borderRadius: "12px"
            }}>
              ⏳ 방장의 게임 시작을 기다리고 있습니다...
            </div>
          )}
        </div>
      )}
    </div>
  );
}
