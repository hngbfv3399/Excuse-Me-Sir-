import { useEffect, useRef } from "react";
import { useGameStore } from "../store/useGameStore";

export function useGameState(socket, initialRoomData) {
  const setRoomInfo = useGameStore((state) => state.setRoomInfo);
  const setTimerInfo = useGameStore((state) => state.setTimerInfo);
  const setScoreInfo = useGameStore((state) => state.setScoreInfo);
  const setWaitPlayers = useGameStore((state) => state.setWaitPlayers);
  const setInventoryItem = useGameStore((state) => state.setInventoryItem);

  useEffect(() => {
    if (initialRoomData) {
      setRoomInfo(initialRoomData);
      setTimerInfo({ gamePhase: initialRoomData.gamePhase || "waiting", timeLeft: 0 });
      setWaitPlayers(initialRoomData.players || {});
    }
  }, [initialRoomData, setRoomInfo, setTimerInfo, setWaitPlayers]);

  const playersRef = useRef({});
  const itemsRef = useRef([]);
  const fieldItemsRef = useRef([]);
  const trapsRef = useRef([]);
  const myIdRef = useRef(null);

  useEffect(() => {
    if (socket.id) {
      myIdRef.current = socket.id;
    }
    socket.on("connect", () => {
      myIdRef.current = socket.id;
    });

    socket.on("room:info", (newInfo) => {
      const state = useGameStore.getState();
      setRoomInfo({ ...state.roomInfo, ...newInfo });
      setTimerInfo({ ...state.timerInfo, gamePhase: newInfo.gamePhase || state.timerInfo.gamePhase });
    });

    socket.on("game:timer", (info) => {
      setTimerInfo(info);
    });

    socket.on("game:phase_change", (info) => {
      const state = useGameStore.getState();
      setTimerInfo({ ...state.timerInfo, gamePhase: info.gamePhase, timeLeft: info.timeLeft });
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
          playersRef.current[id].characterId = serverPlayer.characterId;
        }
      });

      Object.keys(playersRef.current).forEach((id) => {
        if (!serverPlayers[id]) delete playersRef.current[id];
      });

      setWaitPlayers(serverPlayers);

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
      socket.off("game:field_items");
      socket.off("game:traps");
    };
  }, [socket, setRoomInfo, setTimerInfo, setScoreInfo, setWaitPlayers, setInventoryItem]);

  return {
    playersRef, itemsRef, fieldItemsRef, trapsRef, myIdRef
  };
}
