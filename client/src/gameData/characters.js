export const TEAM = {
  OFFENSE: "OFFENSE",
  DEFENSE: "DEFENSE",
};

export const CHARACTERS = {
  // --- 공격팀 (OFFENSE) ---
  THIEF: {
    id: "THIEF",
    name: "도둑",
    baseSpeed: 3.2,
    team: TEAM.OFFENSE,
    skill: "ROLL",
    desc: "파밍 속도 2배, 짧은 거리 구르기"
  },
  SPY: {
    id: "SPY",
    name: "스파이",
    baseSpeed: 2.8,
    team: TEAM.OFFENSE,
    skill: "INVISIBILITY",
    desc: "위치 추적 무효화, 3초 은신"
  },
  HACKER: {
    id: "HACKER",
    name: "해커",
    baseSpeed: 2.7,
    team: TEAM.OFFENSE,
    skill: "EMP",
    desc: "가짜 상자 구별, 방어팀 시야 암전(EMP)"
  },
  GHOST: {
    id: "GHOST",
    name: "고스트",
    baseSpeed: 2.9,
    team: TEAM.OFFENSE,
    skill: "SWAP",
    desc: "벽 밀착 시 반투명, 핑 찍힌 동료와 위치 변환"
  },
  SUPPLIER: {
    id: "SUPPLIER",
    name: "보급관",
    baseSpeed: 2.9,
    team: TEAM.OFFENSE,
    skill: "TEAM_BOOST",
    desc: "랜덤 버프템 소지, 팀 전체 이동 속도 부스트"
  },

  // --- 방어팀 (DEFENSE) ---
  PATROL: {
    id: "PATROL",
    name: "순찰병",
    baseSpeed: 3.4,
    team: TEAM.DEFENSE,
    skill: "SEARCHLIGHT",
    desc: "기본 이속 최고, 일시적 시야 확장(서치라이트)"
  },
  TRACKER: {
    id: "TRACKER",
    name: "추적자",
    baseSpeed: 3.0,
    team: TEAM.DEFENSE,
    skill: "SENSOR_SCAN",
    desc: "접근 적 경고등, 가장 가까운 적 화면 방향 핑(Edge Ping)"
  },
  HOUND: {
    id: "HOUND",
    name: "사냥개",
    baseSpeed: 3.0,
    team: TEAM.DEFENSE,
    skill: "MAD_RUSH",
    desc: "적 궤적 발자국 렌더링, 2초간 미친 속도 돌진"
  },
  COMMS: {
    id: "COMMS",
    name: "통신병",
    baseSpeed: 2.9,
    team: TEAM.DEFENSE,
    skill: "LOCKDOWN",
    desc: "시야 내 적군 모두에게 공유, 10초간 무작위 상자 3개 잠금"
  },
  DETECTIVE: {
    id: "DETECTIVE",
    name: "수사관",
    baseSpeed: 2.8,
    team: TEAM.DEFENSE,
    skill: "FAKE_CHEST",
    desc: "보물 무리 방향 힌트, 거짓 보물 상자 설치(3초 스턴)"
  }
};
