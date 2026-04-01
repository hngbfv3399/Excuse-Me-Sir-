import { useRef } from "react";
import { isWall } from "../utils/physics";
import { CHARACTERS } from "../gameData/characters";

export function usePlayerPhysics(socket, playersRef, myIdRef, timerInfo, keys, setRescueProgress) {
  const joystickDirRef = useRef({ dx: 0, dy: 0 });
  const isRescuingRef = useRef(false);
  const rescueStartTimerRef = useRef(null);
  const lastMoveTimeRef = useRef(0);

  const updatePhysics = () => {
    const players = playersRef.current;
    const mId = myIdRef.current;
    const currentKeys = keys.current;

    if (!players[mId] || timerInfo.gamePhase === "ended") return;

    let dx = 0;
    let dy = 0;
    const myP = players[mId];
    
    
    const baseSpeed = (myP.characterId && CHARACTERS[myP.characterId]) ? CHARACTERS[myP.characterId].baseSpeed : 3;
    const speedMultiplier = myP.speedBoost ? 1.5 : 1.0;
    const speed = baseSpeed * speedMultiplier;

    
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

    
    if (currentKeys["z"] || currentKeys["Z"]) {
      socket.emit("item:use");
      delete currentKeys["z"];
      delete currentKeys["Z"];
    }

    
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

      const now = Date.now();
      if (now - lastMoveTimeRef.current >= 50) {
        socket.emit("player:move", {
          x: players[mId].x,
          y: players[mId].y,
        });
        lastMoveTimeRef.current = now;
      }
    }

    
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
