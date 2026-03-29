import { useRef } from "react";
import { isWall } from "../utils/physics";
import { CHARACTERS } from "../gameData/characters";

export function usePlayerPhysics(socket, playersRef, myIdRef, timerInfo, keys, setRescueProgress) {
  const joystickDirRef = useRef({ dx: 0, dy: 0 });
  const isRescuingRef = useRef(false);
  const rescueStartTimerRef = useRef(null);

  const updatePhysics = () => {
    const players = playersRef.current;
    const mId = myIdRef.current;
    const currentKeys = keys.current;

    if (!players[mId] || timerInfo.gamePhase === "ended") return;

    let dx = 0;
    let dy = 0;
    const myP = players[mId];
    
    // 데이터 기반 속도 매핑
    const baseSpeed = (myP.characterId && CHARACTERS[myP.characterId]) ? CHARACTERS[myP.characterId].baseSpeed : 3;
    const speedMultiplier = myP.speedBoost ? 1.5 : 1.0;
    const speed = baseSpeed * speedMultiplier;

    // 감옥 구출 스페이스바 로직 (입구 근처 판정)
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
            isRescuingRef.current = false;
            setRescueProgress(0);
            delete currentKeys[" "];
        }
      }
    } else {
      if (isRescuingRef.current) {
        isRescuingRef.current = false;
        setRescueProgress(0);
      }
    }

    // 아이템 사용
    if (currentKeys["z"] || currentKeys["Z"]) {
      socket.emit("item:use");
      delete currentKeys["z"];
      delete currentKeys["Z"];
    }

    // 조작 방향 결정
    if (!myP.isJailed && !isRescuingRef.current) {
      const jd = joystickDirRef.current;
      const usingJoystick = Math.hypot(jd.dx, jd.dy) > 0.1;
      if (usingJoystick) {
        // 조이스틱 정규화된 값(dx, dy는 이미 -1~1 사이)
        dx += jd.dx * speed;
        dy += jd.dy * speed;
      } else {
        if (currentKeys["ArrowUp"]) dy -= speed;
        if (currentKeys["ArrowDown"]) dy += speed;
        if (currentKeys["ArrowLeft"]) dx -= speed;
        if (currentKeys["ArrowRight"]) dx += speed;
      }
    }

    // 이동 처리 및 충돌 검사
    if (dx !== 0 || dy !== 0) {
      let remainingX = Math.abs(dx);
      let remainingY = Math.abs(dy);
      let stepX = dx > 0 ? 1 : (dx < 0 ? -1 : 0);
      let stepY = dy > 0 ? 1 : (dy < 0 ? -1 : 0);

      while (remainingX > 0) {
        const moveAmt = Math.min(1, remainingX);
        let nextX = players[mId].x + stepX * moveAmt;
        
        if (timerInfo.gamePhase === "prep" && !players[mId].isTagger) {
            if (nextX < 160 || nextX > 340) nextX = players[mId].x;
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
            if (nextY < 160 || nextY > 340) nextY = players[mId].y;
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

    // 다른 플레이어 보간 (Lerp)
    Object.keys(players).forEach((id) => {
      const p = players[id];
      if (id !== mId && p.x !== undefined && p.targetX !== undefined) {
        p.x += (p.targetX - p.x) * 0.1;
        p.y += (p.targetY - p.y) * 0.1;
      }
    });
  };

  return { updatePhysics, joystickDirRef, isRescuingRef, rescueStartTimerRef };
}
