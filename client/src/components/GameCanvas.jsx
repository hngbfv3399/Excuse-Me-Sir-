import { useEffect, useRef, useState, useCallback } from "react";
import socket from "../hooks/useSocket";
import { useKeyboard } from "../hooks/useKeyboard";
import { PixiEngine } from "../renderer/engine";
import WaitingRoom from "./WaitingRoom";
import GameHUD from "./GameHUD";

import { useGameState } from "../hooks/useGameState";
import { usePlayerPhysics } from "../hooks/usePlayerPhysics";
import { useGameStore } from "../store/useGameStore";

export default function GameCanvas({ initialRoomData, onLeave }) {
  const roomInfo = useGameStore((state) => state.roomInfo);
  const timerInfo = useGameStore((state) => state.timerInfo);
  const scoreInfo = useGameStore((state) => state.scoreInfo);
  const waitPlayers = useGameStore((state) => state.waitPlayers);
  const inventoryItem = useGameStore((state) => state.inventoryItem);

  const {
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

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <GameHUD 
        onLeave={onLeave}
        rescueProgress={rescueProgress}
        isHost={isHost}
        handleJoystick={handleJoystick}
        handleMobileItem={handleMobileItem}
        handleMobileSkill={handleMobileSkill}
      />

      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        style={{ display: "block" }}
      />
      
    </div>
  );
}
