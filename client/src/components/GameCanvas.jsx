import { useEffect, useRef, useState, useCallback } from "react";
import socket from "../hooks/useSocket";
import { useKeyboard } from "../hooks/useKeyboard";
import { PixiEngine } from "../renderer/engine";
import WaitingRoom from "./WaitingRoom";
import MobileControls from "./MobileControls";

import { useGameState } from "../hooks/useGameState";
import { usePlayerPhysics } from "../hooks/usePlayerPhysics";

export default function GameCanvas({ initialRoomData, onLeave }) {
  const {
    roomInfo, timerInfo, scoreInfo, waitPlayers, inventoryItem,
    playersRef, itemsRef, fieldItemsRef, trapsRef, myIdRef
  } = useGameState(socket, initialRoomData);

  const [rescueProgress, setRescueProgress] = useState(0);
  const canvasRef = useRef(null);
  const engineRef = useRef(null);

  const keys = useKeyboard();
  const { updatePhysics, isRescuingRef, joystickDirRef } = usePlayerPhysics(
    socket, playersRef, myIdRef, timerInfo, keys, setRescueProgress
  );

  const myId = socket.id;
  const isHost = roomInfo?.hostId === myId;
  const isWaiting = timerInfo.gamePhase === "waiting";
  const isPrep = timerInfo.gamePhase === "prep";

  useEffect(() => {
    let isCancelled = false;
    if (isWaiting || !canvasRef.current) return;
    
    const engine = new PixiEngine(canvasRef.current);
    engine.init().then(() => {
      if (isCancelled) {
        engine.destroy();
      } else {
        engineRef.current = engine;
      }
    });

    return () => {
      isCancelled = true;
      if (engineRef.current) {
        engineRef.current.destroy();
        engineRef.current = null;
      }
    };
  }, [isWaiting]);

  useEffect(() => {
    let animationId;

    function gameLoop() {
      // 1. 물리 틱 업데이트 (충돌, 입력, 패킷 발송 등)
      updatePhysics();

      // 2. 렌더 코어 업데이트
      const players = playersRef.current;
      const mId = myIdRef.current;
      
      if (engineRef.current && engineRef.current.isInitialized) {
        engineRef.current.update(players, mId, itemsRef.current, trapsRef.current);
      }
      
      animationId = requestAnimationFrame(gameLoop);
    }

    gameLoop();
    return () => cancelAnimationFrame(animationId);
  }, [updatePhysics, timerInfo.gamePhase]);

  // 초 단위를 분:초 로 변환
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
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
      {(timerInfo.gamePhase === "playing" || timerInfo.gamePhase === "prep") && (
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
