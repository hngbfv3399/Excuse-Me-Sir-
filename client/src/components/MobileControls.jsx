import { useRef, useCallback } from "react";

/**
 * MobileControls
 * - 왼쪽: 가상 조이스틱 (터치 드래그로 8방향 이동)
 * - 오른쪽: 아이템(Z) 버튼 + 스킬(Space) 버튼
 *
 * @param {Object} props
 * @param {Function} props.onJoystick  - ({ dx, dy }) 정규화된 방향벡터 (-1 ~ 1) 콜백
 * @param {Function} props.onItem      - 아이템 사용 버튼 콜백
 * @param {Function} props.onSkill     - 스킬 사용 버튼 콜백
 * @param {string|null} props.inventoryItem - 현재 보유 아이템 타입
 */
export default function MobileControls({ onJoystick, onItem, onSkill, inventoryItem }) {
  const baseRef = useRef(null);
  const knobRef = useRef(null);
  const joystickState = useRef({ active: false, startX: 0, startY: 0, touchId: null });

  const KNOB_LIMIT = 36; // px

  const handleJoystickStart = useCallback((e) => {
    e.preventDefault();
    const touch = e.changedTouches[0];
    joystickState.current = { active: true, startX: touch.clientX, startY: touch.clientY, touchId: touch.identifier };
  }, []);

  const handleJoystickMove = useCallback((e) => {
    e.preventDefault();
    const state = joystickState.current;
    if (!state.active) return;

    const touch = Array.from(e.touches).find(t => t.identifier === state.touchId);
    if (!touch) return;

    const rawDx = touch.clientX - state.startX;
    const rawDy = touch.clientY - state.startY;
    const dist = Math.hypot(rawDx, rawDy);
    const clampedDist = Math.min(dist, KNOB_LIMIT);
    const angle = Math.atan2(rawDy, rawDx);

    // 노브 시각 이동
    if (knobRef.current) {
      knobRef.current.style.transform = `translate(${Math.cos(angle) * clampedDist}px, ${Math.sin(angle) * clampedDist}px)`;
    }

    // 정규화된 방향 벡터 전달
    if (dist > 8) {
      onJoystick({ dx: Math.cos(angle), dy: Math.sin(angle) });
    } else {
      onJoystick({ dx: 0, dy: 0 });
    }
  }, [onJoystick]);

  const handleJoystickEnd = useCallback((e) => {
    e.preventDefault();
    joystickState.current.active = false;
    if (knobRef.current) {
      knobRef.current.style.transform = "translate(0px, 0px)";
    }
    onJoystick({ dx: 0, dy: 0 });
  }, [onJoystick]);

  const ITEM_LABELS = {
    SPEED:   { icon: "💨", label: "신속" },
    STEALTH: { icon: "🌫️", label: "은신" },
    TRAP:    { icon: "🪤", label: "덫" },
  };

  const itemLabel = inventoryItem ? ITEM_LABELS[inventoryItem] : null;

  return (
    <div style={styles.overlay}>
      {/* ===== 왼쪽: 조이스틱 ===== */}
      <div style={styles.joystickArea}>
        <div
          ref={baseRef}
          style={styles.joystickBase}
          onTouchStart={handleJoystickStart}
          onTouchMove={handleJoystickMove}
          onTouchEnd={handleJoystickEnd}
          onTouchCancel={handleJoystickEnd}
        >
          <div ref={knobRef} style={styles.joystickKnob} />
        </div>
      </div>

      {/* ===== 오른쪽: 아이템 + 스킬 버튼 ===== */}
      <div style={styles.actionArea}>
        {/* 스킬 버튼 (위) */}
        <button
          style={{ ...styles.actionBtn, ...styles.skillBtn }}
          onTouchStart={(e) => { e.preventDefault(); onSkill(); }}
        >
          <span style={styles.btnIcon}>⚡</span>
          <span style={styles.btnLabel}>스킬</span>
          <span style={styles.btnHint}>준비중</span>
        </button>

        {/* 아이템 버튼 (아래) */}
        <button
          style={{
            ...styles.actionBtn,
            ...styles.itemBtn,
            borderColor: itemLabel ? "#FFD700" : "#555",
            boxShadow: itemLabel ? "0 0 14px rgba(255,215,0,0.5)" : "none",
            opacity: itemLabel ? 1 : 0.5,
          }}
          onTouchStart={(e) => { e.preventDefault(); if (itemLabel) onItem(); }}
          disabled={!itemLabel}
        >
          <span style={styles.btnIcon}>{itemLabel ? itemLabel.icon : "🎒"}</span>
          <span style={styles.btnLabel}>{itemLabel ? itemLabel.label : "없음"}</span>
          <span style={styles.btnHint}>아이템</span>
        </button>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    height: "160px",             // 모바일 조작 패드 높이
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "0 20px 12px 20px",
    pointerEvents: "none",       // 캔버스 클릭 통과 (버튼만 포인터 이벤트 받음)
    zIndex: 200,
  },

  // 왼쪽 조이스틱 영역
  joystickArea: {
    display: "flex", justifyContent: "center", alignItems: "center",
    pointerEvents: "auto",
  },
  joystickBase: {
    width: "110px", height: "110px", borderRadius: "50%",
    backgroundColor: "rgba(255,255,255,0.12)",
    border: "2px solid rgba(255,255,255,0.3)",
    boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
    display: "flex", justifyContent: "center", alignItems: "center",
    position: "relative", cursor: "pointer",
    backdropFilter: "blur(4px)",
    touchAction: "none",
  },
  joystickKnob: {
    width: "46px", height: "46px", borderRadius: "50%",
    backgroundColor: "rgba(255,255,255,0.85)",
    boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
    transition: "transform 0.05s ease-out",
    pointerEvents: "none",
  },

  // 오른쪽 버튼 영역
  actionArea: {
    display: "flex", flexDirection: "column", gap: "10px",
    justifyContent: "center", alignItems: "center",
    pointerEvents: "auto",
  },
  actionBtn: {
    width: "70px", height: "70px", borderRadius: "50%",
    border: "2px solid #555",
    display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center",
    cursor: "pointer", gap: "2px",
    backdropFilter: "blur(4px)",
    touchAction: "none", userSelect: "none",
    transition: "transform 0.1s",
    color: "white",
  },
  skillBtn: {
    width: "58px", height: "58px",
    backgroundColor: "rgba(80,80,180,0.7)",
    borderColor: "#7986cb",
    boxShadow: "0 0 10px rgba(121,134,203,0.4)",
  },
  itemBtn: {
    backgroundColor: "rgba(0,0,0,0.7)",
  },
  btnIcon: { fontSize: "22px", lineHeight: 1 },
  btnLabel: { fontSize: "11px", fontWeight: "bold", color: "#FFD700", lineHeight: 1 },
  btnHint: { fontSize: "9px", color: "#aaa", lineHeight: 1 },
};
