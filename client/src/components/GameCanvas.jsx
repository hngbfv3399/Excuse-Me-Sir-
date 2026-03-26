import { useEffect, useRef, useState, useCallback } from "react";
import socket from "../hooks/useSocket";
import { useKeyboard } from "../hooks/useKeyboard";
import { isWall } from "../utils/physics";
import { renderGame } from "../utils/render";
import WaitingRoom from "./WaitingRoom";
import MobileControls from "./MobileControls";

export default function GameCanvas({ initialRoomData, onLeave }) {
  const [roomInfo, setRoomInfo] = useState(initialRoomData);
  const [timerInfo, setTimerInfo] = useState({ gamePhase: initialRoomData?.gamePhase || "waiting", timeLeft: 0 });
  const [scoreInfo, setScoreInfo] = useState({ score: 0, maxScore: 1 });
  const [rescueProgress, setRescueProgress] = useState(0);
  const [waitPlayers, setWaitPlayers] = useState(initialRoomData?.players || {});
  const [inventoryItem, setInventoryItem] = useState(null);
  const canvasRef = useRef(null);

  const isRescuingRef = useRef(false);
  const rescueStartTimerRef = useRef(null);
  
  const playersRef = useRef({});
  const itemsRef = useRef([]);
  const fieldItemsRef = useRef([]);
  const trapsRef = useRef([]);
  const myIdRef = useRef(null);
  const joystickDirRef = useRef({ dx: 0, dy: 0 }); // 모바일 조이스틱 방향벡터

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
    });

    socket.on("game:alert", (msg) => { alert(msg); });
    socket.on("game:items_update", (items) => { itemsRef.current = items; });
    socket.on("game:field_items", (items) => { fieldItemsRef.current = items; });
    socket.on("game:traps", (traps) => { trapsRef.current = traps; });
    socket.on("game:score_update", (data) => { setScoreInfo(data); });

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
          playersRef.current[id].carriedItem = serverPlayer.carriedItem;
          playersRef.current[id].inventoryItem = serverPlayer.inventoryItem;
          playersRef.current[id].isStealth = serverPlayer.isStealth;
          playersRef.current[id].speedBoost = serverPlayer.speedBoost;
          playersRef.current[id].nickname = serverPlayer.nickname;
          playersRef.current[id].team = serverPlayer.team;
        }
      });

      Object.keys(playersRef.current).forEach((id) => {
        if (!serverPlayers[id]) delete playersRef.current[id];
      });

      // 대기실 UI 갱신을 위해 React 상태 추적
      setWaitPlayers(serverPlayers);

      // 내 아이템 HUD 동기화
      const myId = myIdRef.current;
      if (myId && serverPlayers[myId]) {
        setInventoryItem(serverPlayers[myId].inventoryItem || null);
      }
    });

    return () => {
      socket.off("connect");
      socket.off("room:info");
      socket.off("game:timer");
      socket.off("game:phase_change");
      socket.off("game:start");
      socket.off("game:update");
      socket.off("game:reset"); 
      socket.off("game:alert");
      socket.off("game:items_update");
      socket.off("game:score_update");
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
        const myP = players[mId];

        // 4초 감옥 구출 시스템 (스페이스바 꾹 누르기)
        // 감옥 입구 주변 넉넉하게 박스(x: 750~850, y: 860~960) 판정
        const inJailArea = myP.x >= 750 && myP.x <= 850 && myP.y >= 860 && myP.y <= 960;
        
        if (currentKeys[" "] && inJailArea && !myP.isTagger && !myP.isJailed) {
          if (!isRescuingRef.current) {
            isRescuingRef.current = true;
            rescueStartTimerRef.current = Date.now();
            socket.emit("rescue:start");
          } else {
            const elapsed = Date.now() - rescueStartTimerRef.current;
            const progress = Math.min(1, elapsed / 4000);
            setRescueProgress(progress);
            
            if (progress >= 1) {
               socket.emit("rescue:complete");
               isRescuingRef.current = false; // 중복 방지
               setRescueProgress(0);
               delete currentKeys[" "]; // 키 초기화
            }
          }
        } else {
          if (isRescuingRef.current) {
            isRescuingRef.current = false;
            setRescueProgress(0);
          }
        }

        // 아이템 사용 (Z 키)
        if (currentKeys["z"] || currentKeys["Z"]) {
          socket.emit("item:use");
          delete currentKeys["z"];
          delete currentKeys["Z"];
        }

        // 스킬 사용 (스페이스바) - 임시로 기존 구출 시스템을 유지하되 확장 가능토록 남겨둠

        // 이동 방향 계산 (조이스틱 OR 키보드)
        if (!myP.isJailed && !isRescuingRef.current) {
          const jd = joystickDirRef.current;
          const usingJoystick = Math.hypot(jd.dx, jd.dy) > 0.1;
          if (usingJoystick) {
            dx += jd.dx * speed;
            dy += jd.dy * speed;
          } else {
            if (currentKeys["ArrowUp"]) dy -= speed;
            if (currentKeys["ArrowDown"]) dy += speed;
            if (currentKeys["ArrowLeft"]) dx -= speed;
            if (currentKeys["ArrowRight"]) dx += speed;
          }
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

            if (!isWall(nextX, players[mId].y, players[mId].isTagger)) {
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

            if (!isWall(players[mId].x, nextY, players[mId].isTagger)) {
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

      renderGame(ctx, canvas, players, mId, itemsRef.current, trapsRef.current);
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

  if (isWaiting) {
    return (
      <WaitingRoom 
        socket={socket} 
        room={{ ...roomInfo, players: waitPlayers }} 
        myId={myId} 
        onLeave={onLeave} 
      />
    );
  }

  // 내가 소지한 아이템 계산 (렌더링 전 최신값 참조)
  const myInventoryItem = inventoryItem;
  const ITEM_INFO = {
    SPEED:   { icon: "💨", name: "신속의 짚신",  desc: "이동속도 1.5배 (4초)" },
    STEALTH: { icon: "🌫️", name: "안개 은신 부적", desc: "적에게 안 보임 (4초)" },
    TRAP:    { icon: "🪤", name: "호랑이 덫",    desc: "발밑에 덫 설치" },
  };

  // 모바일 콜백 함수
  const handleJoystick = useCallback(({ dx, dy }) => {
    joystickDirRef.current = { dx, dy };
  }, []);
  const handleMobileItem = useCallback(() => {
    socket.emit("item:use");
  }, []);
  const handleMobileSkill = useCallback(() => {
    // TODO: 스킬 연결 예정
  }, []);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      
      <button 
        onClick={onLeave}
        style={{
          position:"absolute", top: 20, left: 20, padding: "10px 20px", backgroundColor: "rgba(255,255,255,0.9)",
          border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold", fontSize: "14px",
          boxShadow: "0 4px 10px rgba(0,0,0,0.2)", zIndex: 100
        }}
      >
        ← 게임 탈주 (나가기)
      </button>

      {/* 화면 최상단 타이머 UI */}
      {timerInfo.gamePhase !== "waiting" && (
        <>
          <div style={{
            position: "absolute", top: 20, left: "50%", transform: "translateX(-50%)",
            backgroundColor: timerInfo.gamePhase === "prep" ? "rgba(255, 204, 0, 0.9)" : "rgba(255, 82, 82, 0.9)",
            padding: "10px 40px", borderRadius: "30px", zIndex: 50,
            color: timerInfo.gamePhase === "prep" ? "#333" : "white", fontWeight: "bold", fontSize: "24px",
            boxShadow: "0 4px 15px rgba(0,0,0,0.3)", display: "flex", alignItems: "center", gap: "20px"
          }}>
            {timerInfo.gamePhase === "prep" ? "🚧 수비 진영 구축 (안전 구역 갇힘)" : "⚔️ 금괴 탈취 추격전"}
            <span style={{ fontSize: "32px", fontFamily: "monospace", paddingLeft: "10px" }}>
              {formatTime(timerInfo.timeLeft)}
            </span>
          </div>

          <div style={{
            position: "absolute", top: 20, right: 20,
            backgroundColor: "rgba(0, 0, 0, 0.8)", padding: "12px 24px",
            borderRadius: "12px", border: "2px solid #FFD700",
            color: "#FFD700", fontSize: "20px", fontWeight: "bold",
            boxShadow: "0 0 10px rgba(255, 215, 0, 0.5)", zIndex: 50
          }}>
            🏆 금괴: {scoreInfo.score} / {scoreInfo.maxScore}
          </div>
        </>
      )}

      {/* 구출 캐스팅(Progress) 바 UI */}
      {rescueProgress > 0 && (
        <div style={{
          position: "absolute", top: "65%", left: "50%", transform: "translateX(-50%)",
          width: "250px", height: "24px", backgroundColor: "rgba(0,0,0,0.6)", 
          borderRadius: "12px", border: "2px solid #fff", overflow: "hidden", zIndex: 100
        }}>
          <div style={{
            width: `${rescueProgress * 100}%`, height: "100%", 
            backgroundColor: "#4CAF50", transition: "width 0.1s linear"
          }} />
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
            display: "flex", justifyContent: "center", alignItems: "center",
            color: "white", fontSize: "14px", fontWeight: "bold", textShadow: "1px 1px 2px #000"
          }}>
            감옥 문 해제 중...
          </div>
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

      {/* 🎒 아이템 HUD - 좌하단 */}
      {timerInfo.gamePhase === "playing" && (
        <div style={{
          position: "absolute", bottom: 20, left: 20, zIndex: 50,
          backgroundColor: "rgba(0,0,0,0.85)", borderRadius: "12px",
          border: myInventoryItem ? "2px solid #FFD700" : "2px solid #555",
          padding: "10px 16px", minWidth: "150px",
          boxShadow: myInventoryItem ? "0 0 12px rgba(255,215,0,0.4)" : "none",
          color: "white", fontFamily: "sans-serif"
        }}>
          <div style={{ fontSize: "11px", color: "#aaa", marginBottom: "4px", letterSpacing: "1px" }}>
            🎒 보유 아이템
          </div>
          {myInventoryItem ? (
            <>
              <div style={{ fontSize: "28px", lineHeight: "1.1" }}>
                {ITEM_INFO[myInventoryItem]?.icon}
              </div>
              <div style={{ fontSize: "13px", fontWeight: "bold", color: "#FFD700", marginTop: "4px" }}>
                {ITEM_INFO[myInventoryItem]?.name}
              </div>
              <div style={{ fontSize: "11px", color: "#ccc" }}>
                {ITEM_INFO[myInventoryItem]?.desc}
              </div>
              <div style={{ fontSize: "11px", color: "#4fc3f7", marginTop: "6px", fontWeight: "bold" }}>
                [Z] 키로 사용
              </div>
            </>
          ) : (
            <div style={{ fontSize: "13px", color: "#666", marginTop: "4px" }}>없음</div>
          )}
        </div>
      )}

      {/* 🎮 모바일 전용 조이스틱 + 액션 버튼 오버레이 */}
      {timerInfo.gamePhase === "playing" && (
        <MobileControls
          onJoystick={handleJoystick}
          onItem={handleMobileItem}
          onSkill={handleMobileSkill}
          inventoryItem={myInventoryItem}
        />
      )}

      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        style={{ display: "block" }}
      />
      
    </div>
  );
}
