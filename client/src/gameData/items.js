export const ITEM_TYPES = {
  SPEED: "SPEED",     // 신속의 짚신
  TRAP: "TRAP",       // 호랑이 덫
  STEALTH: "STEALTH"  // 안개 부적 (은신)
};

// 켄니 픽셀팩에서 적당한 오브젝트 스프라이트 매핑
export const ITEM_SPRITES = {
  [ITEM_TYPES.SPEED]: { tx: 28, ty: 7 },   // 작은 포션 병
  [ITEM_TYPES.TRAP]: { tx: 24, ty: 1 },    // 상자/장애물
  [ITEM_TYPES.STEALTH]: { tx: 26, ty: 8 }, // 두루마리/책
};
