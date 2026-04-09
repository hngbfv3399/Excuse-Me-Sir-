import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { usePlayerPhysics } from './usePlayerPhysics';
import * as physicsUtils from '../utils/physics';

vi.mock('../utils/physics', () => ({
  isWall: vi.fn(),
}));

describe('usePlayerPhysics', () => {
  let mockSocket;
  let playersRef;
  let myIdRef;
  let timerInfo;
  let keys;
  let setRescueProgress;

  beforeEach(() => {
    vi.useFakeTimers();
    mockSocket = { emit: vi.fn() };
    myIdRef = { current: 'player1' };
    playersRef = {
       current: {
           player1: { x: 200, y: 200, characterId: 'thief_base', isTagger: false, speedBoost: false }
       }
    };
    timerInfo = { gamePhase: 'playing' };
    keys = { current: {} };
    setRescueProgress = vi.fn();
    physicsUtils.isWall.mockReturnValue(false); 
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('1. 기동 속도 및 방향 연산 (base speed & boost)', () => {
    // 3 base speed * 1.5 boost = 4.5
    playersRef.current.player1.speedBoost = true;
    keys.current = { 'ArrowRight': true };

    const { result } = renderHook(() =>
      usePlayerPhysics(mockSocket, playersRef, myIdRef, timerInfo, keys, setRescueProgress)
    );

    result.current.updatePhysics();

    expect(playersRef.current.player1.x).toBeCloseTo(204.5, 1);
    expect(playersRef.current.player1.y).toBe(200);
  });

  it('2. 벽 충돌 처리 (isWall mock)', () => {
    keys.current = { 'ArrowRight': true };
    // 오른쪽으로 움직이는 모든 것을 벽이라고 가정
    physicsUtils.isWall.mockReturnValue(true);

    const { result } = renderHook(() =>
      usePlayerPhysics(mockSocket, playersRef, myIdRef, timerInfo, keys, setRescueProgress)
    );

    result.current.updatePhysics();

    // 벽이 있으면 x 좌표가 증가하면 안 됨
    expect(playersRef.current.player1.x).toBe(200);
  });

  it('3. 준비 단계(prep) 이동 제한 구역 (160~340)', () => {
    timerInfo.gamePhase = 'prep';
    playersRef.current.player1.x = 340; // 경계선
    keys.current = { 'ArrowRight': true }; // 밖으로 나가려 시도

    const { result } = renderHook(() =>
      usePlayerPhysics(mockSocket, playersRef, myIdRef, timerInfo, keys, setRescueProgress)
    );

    result.current.updatePhysics();

    // 340 밖으로 나갈 수 없어야 함
    expect(playersRef.current.player1.x).toBe(340);
  });
});
