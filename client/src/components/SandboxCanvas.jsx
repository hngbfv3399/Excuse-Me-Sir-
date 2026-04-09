import { useEffect, useRef, useState } from "react";
import { useKeyboard } from "../hooks/useKeyboard";
import { PixiEngine } from "../renderer/engine";
import { isWall } from "../utils/physics";
import { CHARACTERS } from "../gameData/characters";
import { SANDBOX_MAP } from "../constants/sandboxMap";

export default function SandboxCanvas({ onLeave }) {
  const wrapperRef = useRef(null);
  const engineRef = useRef(null);
  const keys = useKeyboard();

  const [mainChar, setMainChar] = useState("THIEF");
  const [dummyChar, setDummyChar] = useState("PATROL");

  const playersRef = useRef({
    main: { x: 400, y: 400, isTagger: false, characterId: "THIEF", name: "Main", speedBoost: false },
    dummy: { x: 800, y: 800, isTagger: true, characterId: "PATROL", name: "Dummy", speedBoost: false },
  });

  const trapsRef = useRef([]);
  const itemsRef = useRef([{ id: "test_gold_1", x: 600, y: 600 }]);

  // 캐릭터 변경 적용
  useEffect(() => {
    playersRef.current.main.characterId = mainChar;
    playersRef.current.main.isTagger = CHARACTERS[mainChar]?.team === "DEFENSE";
    playersRef.current.dummy.characterId = dummyChar;
    playersRef.current.dummy.isTagger = CHARACTERS[dummyChar]?.team === "DEFENSE";
  }, [mainChar, dummyChar]);

  useEffect(() => {
    if (!wrapperRef.current) return;
    
    // 이전 잔여 캔버스가 있다면 HMR이나 StrictMode의 흔적이므로 싹 밀어버립니다.
    wrapperRef.current.innerHTML = '';

    const canvas = document.createElement("canvas");
    canvas.width = 800;
    canvas.height = 600;
    canvas.style.display = "block";
    canvas.style.backgroundColor = "#555"; // 빈공간 확인을 위해 살짝 밝게
    wrapperRef.current.appendChild(canvas);

    const engine = new PixiEngine(canvas);
    
    // 샌드박스 맵 연동
    engine.init(SANDBOX_MAP).then(() => {
      engineRef.current = engine;
    });

    // 테스트 렌더링 확인용 콘솔 타이머
    const debugTimer = setInterval(() => {
      if (!engineRef.current || !engineRef.current.layers?.entity) return;
      const eLayer = engineRef.current.layers.entity;
      console.log(`[TEST CODE] 렌더링 상태 검증: 
      - Map 개체: ${engineRef.current.layers.map?.children?.length || 0}
      - Entity 개체: ${eLayer.children.length}
      - Camera 포지션: x:${engineRef.current.cameraContainer?.x?.toFixed(1)}, y:${engineRef.current.cameraContainer?.y?.toFixed(1)}
      `);
      eLayer.children.forEach((child, i) => {
         const nameLabel = child.getChildByLabel("label");
         console.log(`  -> Entity[${i}] (Name: ${nameLabel ? nameLabel.text : 'Unknown'}) | x:${child.x.toFixed(1)}, y:${child.y.toFixed(1)} | Visible: ${child.visible}`);
      });
    }, 3000);

    return () => {
      clearInterval(debugTimer);
      // 컴포넌트가 언마운트되면 DOM에서 캔버스를 즉결 처형하여 컨텍스트 꼬임을 방지합니다.
      if (wrapperRef.current && wrapperRef.current.contains(canvas)) {
        wrapperRef.current.removeChild(canvas);
      }
      try { engine.destroy(); } catch(e) {}
    };
  }, []);

  useEffect(() => {
    let animationId;
    let lastTime = Date.now();

    function gameLoop() {
      const now = Date.now();
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      const currentKeys = keys.current;
      const players = playersRef.current;
      
      const movePlayer = (id, dx, dy, baseSpeed) => {
        let stepX = dx > 0 ? 1 : (dx < 0 ? -1 : 0);
        let stepY = dy > 0 ? 1 : (dy < 0 ? -1 : 0);
        let remainingX = Math.abs(dx * baseSpeed);
        let remainingY = Math.abs(dy * baseSpeed);
        
        while (remainingX > 0) {
          const moveAmt = Math.min(1, remainingX);
          const nextX = players[id].x + stepX * moveAmt;
          if (!isWall(nextX, players[id].y, players[id].isTagger, SANDBOX_MAP)) {
            players[id].x = nextX;
            remainingX -= moveAmt;
          } else break;
        }

        while (remainingY > 0) {
          const moveAmt = Math.min(1, remainingY);
          const nextY = players[id].y + stepY * moveAmt;
          if (!isWall(players[id].x, nextY, players[id].isTagger, SANDBOX_MAP)) {
            players[id].y = nextY;
            remainingY -= moveAmt;
          } else break;
        }
      };

      const mSpeed = CHARACTERS[players.main.characterId]?.baseSpeed || 3;
      const dxMain = (currentKeys['ArrowRight'] ? 1 : 0) - (currentKeys['ArrowLeft'] ? 1 : 0);
      const dyMain = (currentKeys['ArrowDown'] ? 1 : 0) - (currentKeys['ArrowUp'] ? 1 : 0);
      if (dxMain !== 0 || dyMain !== 0) movePlayer('main', dxMain, dyMain, mSpeed);

      const dSpeed = CHARACTERS[players.dummy.characterId]?.baseSpeed || 3;
      const dxDummy = (currentKeys['KeyD'] ? 1 : 0) - (currentKeys['KeyA'] ? 1 : 0);
      const dyDummy = (currentKeys['KeyS'] ? 1 : 0) - (currentKeys['KeyW'] ? 1 : 0);
      if (dxDummy !== 0 || dyDummy !== 0) movePlayer('dummy', dxDummy, dyDummy, dSpeed);

      const handleActions = (id) => {
        const p = players[id];
        let action = null;
        if (id === 'main') {
          if (currentKeys['Space']) action = 'FARMING';
          else if (currentKeys['ShiftRight'] || currentKeys['Enter']) action = 'SKILL';
          else if (currentKeys['Digit1']) action = 'ITEM';
        } else if (id === 'dummy') {
          if (currentKeys['KeyF'] || currentKeys['f'] || currentKeys['F']) action = 'TRAP';
          else if (currentKeys['ShiftLeft'] || currentKeys['KeyE']) action = 'SKILL';
          else if (currentKeys['KeyQ']) action = 'ITEM';
        }
        
        // Trap placement is instant 
        if (action === 'TRAP' && p.action !== 'TRAP') {
          trapsRef.current.push({ id: `trap_${Date.now()}`, x: p.x, y: p.y });
        }
        
        p.action = action;
        if (action === 'FARMING') {
          p.actionProgress = Math.min((p.actionProgress || 0) + 1, 300);
        } else {
          p.actionProgress = 0;
        }
      };

      handleActions('main');
      handleActions('dummy');

      if (engineRef.current && engineRef.current.isInitialized) {
        engineRef.current.update(players, 'main', itemsRef.current, trapsRef.current);
      }
      
      animationId = requestAnimationFrame(gameLoop);
    }

    gameLoop();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [keys]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      {/* 샌드박스 UI 오버레이 */}
      <div style={{ position: "absolute", top: 10, left: 10, right: 10, display: 'flex', flexDirection: 'column', gap: '10px', zIndex: 10, color: 'white', background: 'rgba(0,0,0,0.6)', padding: 15, borderRadius: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
           <h3 style={{ margin: 0 }}>🛠 실험실 (Sandbox)</h3>
           <button onClick={onLeave} style={{ padding: "8px 16px", background: "#FF5252", color: "white", border: "none", borderRadius: 4, cursor: "pointer" }}>나가기</button>
        </div>
        
        <div style={{ display: 'flex', gap: '20px' }}>
            <div style={{ background: 'rgba(255,255,255,0.1)', padding: 10, borderRadius: 6, flex: 1 }}>
                <h4 style={{ margin: '0 0 10px 0', color: '#88ccff' }}>Main 제어 (화살표 이동, Space 파밍)</h4>
                <select value={mainChar} onChange={e => setMainChar(e.target.value)} style={{ padding: 5, width: '100%', cursor: 'pointer' }}>
                   {Object.values(CHARACTERS).map(c => <option key={c.id} value={c.id}>[{c.team === 'OFFENSE' ? '공격' : '방어'}] {c.name}</option>)}
                </select>
                <p style={{ fontSize: '12px', margin: '5px 0 0 0' }}>스킬: <strong>{CHARACTERS[mainChar]?.skill}</strong> (속도: {CHARACTERS[mainChar]?.baseSpeed})</p>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.1)', padding: 10, borderRadius: 6, flex: 1 }}>
                <h4 style={{ margin: '0 0 10px 0', color: '#ff8888' }}>Dummy 제어 (WASD 이동, F 상호작용)</h4>
                <select value={dummyChar} onChange={e => setDummyChar(e.target.value)} style={{ padding: 5, width: '100%', cursor: 'pointer' }}>
                   {Object.values(CHARACTERS).map(c => <option key={c.id} value={c.id}>[{c.team === 'OFFENSE' ? '공격' : '방어'}] {c.name}</option>)}
                </select>
            </div>
        </div>
      </div>
      <div ref={wrapperRef} style={{ width: 800, height: 600 }} />
    </div>
  );
}
