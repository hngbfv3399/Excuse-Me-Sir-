import { create } from 'zustand';

export const useGameStore = create((set) => ({
  // 게임 전역 상태
  roomInfo: null,
  timerInfo: { gamePhase: "waiting", timeLeft: 0 },
  scoreInfo: { score: 0, maxScore: 1 },
  waitPlayers: {},
  inventoryItem: null,

  // 상태 업데이트 액션
  setRoomInfo: (info) => set({ roomInfo: info }),
  setTimerInfo: (info) => set({ timerInfo: info }),
  setScoreInfo: (info) => set({ scoreInfo: info }),
  setWaitPlayers: (players) => set({ waitPlayers: players }),
  setInventoryItem: (item) => set({ inventoryItem: item })
}));
