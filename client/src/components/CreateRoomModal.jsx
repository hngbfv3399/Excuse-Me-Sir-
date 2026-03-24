import { useState } from "react";

export default function CreateRoomModal({ onClose, onCreate }) {
  const [title, setTitle] = useState("");
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [isPrivate, setIsPrivate] = useState(false);
  const [password, setPassword] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (title.trim() === "") return alert("방 제목을 입력해주세요!");
    if (isPrivate && password.trim() === "") return alert("비밀번호를 입력해야 합니다!");
    
    onCreate({ title, maxPlayers, isPrivate, password });
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <h2 style={{marginTop: 0}}>방 만들기</h2>
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label>방 제목</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} autoFocus style={styles.input} maxLength={20} />
          </div>
          <div style={styles.field}>
            <label>최대 인원 ({maxPlayers}명)</label>
            <input type="range" min="2" max="8" value={maxPlayers} onChange={e => setMaxPlayers(e.target.value)} />
          </div>
          <div style={styles.fieldRow}>
            <label style={{display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", userSelect: "none"}}>
              <input type="checkbox" checked={isPrivate} onChange={e => setIsPrivate(e.target.checked)} />
              비공개 방 (비밀번호 설정)
            </label>
          </div>
          {isPrivate && (
            <div style={styles.field}>
              <label>비밀번호</label>
              <input type="text" value={password} onChange={e => setPassword(e.target.value)} style={styles.input} maxLength={10} />
            </div>
          )}
          <div style={styles.buttonRow}>
            <button type="button" onClick={onClose} style={styles.cancelBtn}>취소</button>
            <button type="submit" style={styles.createBtn}>생성</button>
          </div>
        </form>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: "fixed", top: 0, left: 0, right: 0, bottom: 0, 
    backgroundColor: "rgba(0,0,0,0.6)", display: "flex", 
    justifyContent: "center", alignItems: "center", zIndex: 1000, backdropFilter: "blur(3px)"
  },
  modal: {
    backgroundColor: "white", padding: "30px", borderRadius: "12px", 
    width: "350px", boxShadow: "0 10px 25px rgba(0,0,0,0.2)"
  },
  form: {
    display: "flex", flexDirection: "column", gap: "18px"
  },
  field: {
    display: "flex", flexDirection: "column", gap: "6px", fontWeight: "bold", fontSize: "14px", color: "#444"
  },
  fieldRow: {
    display: "flex", alignItems: "center", fontSize: "14px", fontWeight: "bold", color: "#444"
  },
  input: {
    padding: "10px", borderRadius: "6px", border: "1px solid #ccc", fontSize: "16px"
  },
  buttonRow: {
    display: "flex", gap: "10px", marginTop: "10px"
  },
  cancelBtn: {
    flex: 1, padding: "12px", backgroundColor: "#e0e0e0", color: "#333", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "16px", fontWeight: "bold"
  },
  createBtn: {
    flex: 1, padding: "12px", backgroundColor: "#FF5252", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "16px", fontWeight: "bold"
  }
};
