export const SKILL_TYPES = {
  DASH: "DASH",
  HEAL: "HEAL",
  SHIELD: "SHIELD"
};

export const SKILL_INFO = {
  [SKILL_TYPES.DASH]: { name: "대시", cooldown: 5000, desc: "순간적으로 빠르게 이동" },
  [SKILL_TYPES.HEAL]: { name: "치유", cooldown: 10000, desc: "주변 아군 치료" },
  [SKILL_TYPES.SHIELD]: { name: "방어막", cooldown: 15000, desc: "1회 공격 무시" }
};
