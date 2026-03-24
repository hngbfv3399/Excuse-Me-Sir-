import { useEffect, useState } from "react";
import socket from "../hooks/useSocket";
import CreateRoomModal from "./CreateRoomModal";

export default function Lobby({ nickname, onJoinSuccess }) {
  const [rooms, setRooms] = useState([]);
  const [showModal, setShowModal] = useState(false);
  
  useEffect(() => {
    socket.emit("rooms:request_list");

    const onRoomList = (roomList) => {
      setRooms(roomList);
    };

    const onRoomJoinSuccess = ({ roomId, room }) => {
      onJoinSuccess(roomId, room);
    };

    const onRoomError = (msg) => {
      alert(msg);
    };

    socket.on("rooms:list", onRoomList);
    socket.on("room:join:success", onRoomJoinSuccess);
    socket.on("room:error", onRoomError);

    return () => {
      socket.off("rooms:list", onRoomList);
      socket.off("room:join:success", onRoomJoinSuccess);
      socket.off("room:error", onRoomError);
    };
  }, [onJoinSuccess]);

  const handleCreateRoom = (roomData) => {
    socket.emit("room:create", roomData);
    setShowModal(false);
  };

  const handleJoin = (room) => {
    if (room.isPrivate) {
      const pswd = prompt("비밀번호를 통과해야 입장할 수 있습니다:");
      if (pswd === null) return; 
      socket.emit("room:join", { roomId: room.id, password: pswd });
    } else {
      socket.emit("room:join", { roomId: room.id, password: "" });
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={{margin: 0, color: "white"}}>현재 열려있는 방 목록</h1>
        <div style={{display: "flex", gap: "15px", alignItems: "center"}}>
          <span style={{color: "#aaa", fontSize: "16px"}}>환영합니다, <b>{nickname}</b>님 👋</span>
          <button onClick={() => setShowModal(true)} style={styles.createBtn}>+ 방 만들기</button>
        </div>
      </div>

      <div style={styles.list}>
        {rooms.length === 0 ? (
          <div style={styles.emptyState}>
            <p>생성된 방이 없습니다.</p>
            <p style={{fontSize: "14px", color: "#888"}}>첫 번째 방을 만들어 보세요!</p>
          </div>
        ) : (
          rooms.map(room => (
            <div key={room.id} style={styles.roomCard}>
              <div style={styles.roomInfo}>
                <h3 style={{margin: "0 0 8px 0", fontSize: "20px"}}>
                  {room.isPrivate && <span style={{color: "#FF5252"}}>🔒 </span>}
                  {room.title}
                </h3>
                <span style={{fontSize: "14px", color: room.isPlaying ? "#FF5252" : "#4CAF50", fontWeight: "bold"}}>
                  {room.isPlaying ? "🎮 게임 진행중" : "🟢 대기중"}
                </span>
              </div>
              <div style={styles.roomAction}>
                <div style={styles.playerCount}>
                  👤 {room.currentPlayers} <span style={{color: "#aaa"}}>/ {room.maxPlayers}</span>
                </div>
                <button 
                  onClick={() => handleJoin(room)} 
                  style={{...styles.joinBtn, opacity: (room.currentPlayers >= room.maxPlayers || room.isPlaying) ? 0.5 : 1}}
                  disabled={room.currentPlayers >= room.maxPlayers || room.isPlaying}
                >
                  {room.currentPlayers >= room.maxPlayers ? "만원" : "입장"}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {showModal && <CreateRoomModal onClose={() => setShowModal(false)} onCreate={handleCreateRoom} />}
    </div>
  );
}

const styles = {
  container: {
    padding: "40px", backgroundColor: "#1e1e1e", minHeight: "100vh", boxSizing: "border-box"
  },
  header: {
    display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #333", paddingBottom: "25px", marginBottom: "30px"
  },
  createBtn: {
    padding: "12px 24px", backgroundColor: "#FF5252", color: "white", border: "none", borderRadius: "8px", fontSize: "16px", cursor: "pointer", fontWeight: "bold", transition: "0.2s"
  },
  list: {
    display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(400px, 1fr))", gap: "20px"
  },
  emptyState: {
    gridColumn: "1 / -1", color: "white", textAlign: "center", marginTop: "80px", fontSize: "18px"
  },
  roomCard: {
    backgroundColor: "#ffffff", padding: "24px", borderRadius: "16px", display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: "0 4px 15px rgba(0,0,0,0.1)"
  },
  roomInfo: {
    display: "flex", flexDirection: "column"
  },
  roomAction: {
    display: "flex", alignItems: "center", gap: "20px"
  },
  playerCount: {
    fontSize: "18px", fontWeight: "bold", color: "#333"
  },
  joinBtn: {
    padding: "12px 28px", backgroundColor: "#007BFF", color: "white", border: "none", borderRadius: "8px", fontSize: "16px", cursor: "pointer", fontWeight: "bold"
  }
};
