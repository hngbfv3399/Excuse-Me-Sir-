import { create } from 'zustand';

export const useGameStore = create((set) => ({
  
  roomInfo: null,
  timerInfo: { gamePhase: "waiting", timeLeft: 0 },
  scoreInfo: { score: 0, maxScore: 1 },
  waitPlayers: {},
  inventoryItem: null,

  
  setRoomInfo: (info) => set({ roomInfo: info }),
  setTimerInfo: (info) => set({ timerInfo: info }),
  setScoreInfo: (info) => set({ scoreInfo: info }),
  setWaitPlayers: (players) => set({ waitPlayers: players }),
  setInventoryItem: (item) => set({ inventoryItem: item })
}));
