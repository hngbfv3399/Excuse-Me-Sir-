import { useRef, useCallback, useState, useEffect } from "react";


export default function MobileControls({ onJoystick, onItem, onSkill, onRescueDown, onRescueUp, inventoryItem }) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const isMobileUA = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
      setIsMobile(hasTouch && isMobileUA);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

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

    
    if (knobRef.current) {
      knobRef.current.style.transform = `translate(${Math.cos(angle) * clampedDist}px, ${Math.sin(angle) * clampedDist}px)`;
    }

    
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

  if (!isMobile) return null;

  return (
    <div style={styles.overlay}>
      
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

      
      <div style={styles.actionArea}>
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            style={{ ...styles.actionBtn, ...styles.skillBtn, width: "60px", height: "60px" }}
            onTouchStart={(e) => { e.preventDefault(); onSkill(); }}
          >
            <span style={styles.btnIcon}>⚡</span>
            <span style={{ fontSize: "10px", fontWeight: "bold", color: "#FFD700" }}>스킬</span>
          </button>
          <button
            style={{ ...styles.actionBtn, ...styles.rescueBtn, width: "60px", height: "60px" }}
            onTouchStart={(e) => { e.preventDefault(); onRescueDown(); }}
            onTouchEnd={(e) => { e.preventDefault(); onRescueUp(); }}
            onTouchCancel={(e) => { e.preventDefault(); onRescueUp(); }}
          >
            <span style={styles.btnIcon}>✋</span>
            <span style={{ fontSize: "10px", fontWeight: "bold", color: "#FFD700" }}>구출/행동</span>
          </button>
        </div>
        
        <button
          style={{
            ...styles.actionBtn,
            ...styles.itemBtn,
            width: "70px", height: "70px",
            borderColor: itemLabel ? "#FFD700" : "#555",
            boxShadow: itemLabel ? "0 0 14px rgba(255,215,0,0.5)" : "none",
            opacity: itemLabel ? 1 : 0.5,
          }}
          onTouchStart={(e) => { e.preventDefault(); if (itemLabel) onItem(); }}
          disabled={!itemLabel}
        >
          <span style={{ fontSize: "22px" }}>{itemLabel ? itemLabel.icon : "🎒"}</span>
          <span style={{ fontSize: "12px", fontWeight: "bold", color: "#FFD700" }}>{itemLabel ? itemLabel.label : "없음"}</span>
        </button>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    height: "160px",             
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "0 20px 12px 20px",
    pointerEvents: "none",       
    zIndex: 200,
  },

  
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
    backgroundColor: "rgba(80,80,180,0.7)",
    borderColor: "#7986cb",
    boxShadow: "0 0 10px rgba(121,134,203,0.4)",
  },
  rescueBtn: {
    backgroundColor: "rgba(50,150,50,0.7)",
    borderColor: "#81C784",
    boxShadow: "0 0 10px rgba(129,199,132,0.4)",
  },
  itemBtn: {
    backgroundColor: "rgba(0,0,0,0.7)",
  },
  btnIcon: { fontSize: "22px", lineHeight: 1 },
  btnLabel: { fontSize: "11px", fontWeight: "bold", color: "#FFD700", lineHeight: 1 },
  btnHint: { fontSize: "9px", color: "#aaa", lineHeight: 1 },
};
