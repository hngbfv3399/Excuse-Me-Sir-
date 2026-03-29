import React, { useEffect, useState } from 'react';

export default function WaitingRoom({ socket, room, myId, onLeave }) {
  const [errorLine, setErrorLine] = useState("");
  
  // 서버로부터 경고 알림 구독
  useEffect(() => {
    const handleAlert = (msg) => {
      setErrorLine(msg);
      setTimeout(() => setErrorLine(""), 3000);
    };
    socket.on("game:alert", handleAlert);
    return () => socket.off("game:alert", handleAlert);
  }, [socket]);

  const players = room.players || {};
  
  const redTeam = Object.entries(players).filter(([id, p]) => p.team === "red");
  const blueTeam = Object.entries(players).filter(([id, p]) => p.team === "blue");

  const amReady = players[myId]?.isReady;
  const isHost = room.hostId === myId;
  const myTeam = players[myId]?.team;

  const handleTeamChange = (team) => {
    socket.emit("room:team_change", team);
  };

  const toggleReady = () => {
    socket.emit("room:ready");
  };

  const handleStart = () => {
    socket.emit("room:start");
  };

  const styles = {
    container: {
      width: "100%", height: "100%", boxSizing: "border-box",
      backgroundColor: "#0f0f13", color: "white",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 20
    },
    title: {
      fontSize: "32px", fontWeight: "800", marginBottom: 10,
      textShadow: "0 0 10px rgba(255,255,255,0.3)"
    },
    subtitle: {
      fontSize: "16px", color: "gray", marginBottom: 30
    },
    errorText: {
      color: "#FF5252", fontSize: "14px", minHeight: "20px", marginBottom: 10
    },
    teamContainer: {
      display: "flex", gap: "30px", width: "100%", maxWidth: "800px", marginBottom: 30
    },
    teamBox: (teamType) => ({
      flex: 1,
      backgroundColor: teamType === "red" ? "rgba(229, 57, 53, 0.15)" : "rgba(30, 136, 229, 0.15)",
      border: `2px solid ${teamType === "red" ? "#E53935" : "#1E88E5"}`,
      borderRadius: "16px",
      padding: "20px",
      display: "flex", flexDirection: "column", gap: "12px",
      backdropFilter: "blur(10px)"
    }),
    teamHeader: (teamType) => ({
      color: teamType === "red" ? "#FF5252" : "#64B5F6",
      margin: 0, textAlign: "center", fontSize: "24px", paddingBottom: "10px", borderBottom: "1px solid rgba(255,255,255,0.1)"
    }),
    playerRow: (isMe) => ({
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "12px 16px", backgroundColor: isMe ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.3)",
      borderRadius: "8px", fontWeight: isMe ? "bold" : "normal"
    }),
    readyBadge: (isReady) => ({
      fontSize: "12px", padding: "4px 8px", borderRadius: "20px",
      backgroundColor: isReady ? "rgba(76, 175, 80, 0.2)" : "rgba(158, 158, 158, 0.2)",
      color: isReady ? "#81C784" : "#BDBDBD", border: `1px solid ${isReady ? "#4CAF50" : "#9E9E9E"}`
    }),
    joinBtn: {
      marginTop: "auto", padding: "12px", border: "none", borderRadius: "8px", cursor: "pointer",
      backgroundColor: "rgba(255,255,255,0.1)", color: "white", fontSize: "14px", fontWeight: "bold",
      transition: "background 0.2s"
    },
    controls: {
      display: "flex", gap: "15px"
    },
    actionBtn: (active) => ({
      padding: "16px 32px", border: "none", borderRadius: "12px", cursor: "pointer",
      fontSize: "18px", fontWeight: "800", color: "white",
      backgroundColor: active ? "#4CAF50" : "gray",
      boxShadow: "0 4px 15px rgba(0,0,0,0.5)",
      transition: "transform 0.1s"
    }),
    startBtn: {
      padding: "16px 40px", border: "none", borderRadius: "12px", cursor: "pointer",
      fontSize: "20px", fontWeight: "800", color: "white",
      background: "linear-gradient(45deg, #FF5252, #FF1744)",
      boxShadow: "0 0 20px rgba(255, 82, 82, 0.5)",
      transition: "transform 0.1s"
    },
    leaveBtn: {
      padding: "16px 24px", border: "1px solid #555", borderRadius: "12px", cursor: "pointer",
      fontSize: "16px", color: "#ccc", backgroundColor: "transparent"
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>{room.title}</h2>
      <div style={styles.subtitle}>목표 탈취: 1팀당 {room.maxScore}개 | 최대 인원: {room.maxPlayers}명</div>
      
      <div style={styles.errorText}>{errorLine}</div>

      <div style={styles.teamContainer}>
        {/* 의적 홍길동 팀 (공격) */}
        <div style={styles.teamBox("red")}>
          <h3 style={styles.teamHeader("red")}>🔴 의적 홍길동 팀 (공격) [{redTeam.length} / {room.maxPlayers/2}]</h3>
          {redTeam.map(([id, p]) => (
            <div key={id} style={styles.playerRow(id === myId)}>
              <span>{p.nickname} {id === room.hostId && "👑"}</span>
              <span style={styles.readyBadge(p.isReady || id === room.hostId)}>{(p.isReady || id === room.hostId) ? "준비완료" : "대기중"}</span>
            </div>
          ))}
          {myTeam !== "red" && (
             <button style={styles.joinBtn} onClick={() => handleTeamChange("red")} onMouseOver={e => e.target.style.backgroundColor="rgba(255,255,255,0.2)"} onMouseOut={e => e.target.style.backgroundColor="rgba(255,255,255,0.1)"}>
               의적 홍길동 팀으로 이동 ➔
             </button>
          )}
        </div>

        {/* 탐관오리 팀 (수비) */}
        <div style={styles.teamBox("blue")}>
          <h3 style={styles.teamHeader("blue")}>🔵 탐관오리 팀 (수비) [{blueTeam.length} / {room.maxPlayers/2}]</h3>
          {blueTeam.map(([id, p]) => (
            <div key={id} style={styles.playerRow(id === myId)}>
              <span>{p.nickname} {id === room.hostId && "👑"}</span>
              <span style={styles.readyBadge(p.isReady || id === room.hostId)}>{(p.isReady || id === room.hostId) ? "준비완료" : "대기중"}</span>
            </div>
          ))}
          {myTeam !== "blue" && (
             <button style={styles.joinBtn} onClick={() => handleTeamChange("blue")} onMouseOver={e => e.target.style.backgroundColor="rgba(255,255,255,0.2)"} onMouseOut={e => e.target.style.backgroundColor="rgba(255,255,255,0.1)"}>
               탐관오리 팀으로 이동 ➔
             </button>
          )}
        </div>
      </div>

      <div style={styles.controls}>
        <button style={styles.leaveBtn} onClick={onLeave}>나가기</button>
        {!isHost && (
          <button style={styles.actionBtn(!amReady)} onClick={toggleReady}>
            {amReady ? "준비 취소" : "준비 완료!"}
          </button>
        )}
        {isHost && (
          <button style={styles.startBtn} onClick={handleStart}>
            🔥 게임 시작 (모두 레디 수치 확인)
          </button>
        )}
      </div>
    </div>
  );
}
