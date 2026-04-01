import { useState } from "react";

export default function PasswordModal({ onClose, onSubmit }) {
  const [password, setPassword] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (password.trim() === "") return alert("비밀번호를 입력해주세요!");
    onSubmit(password);
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <h3 style={{marginTop: 0, marginBottom: "16px"}}>비밀번호 입력</h3>
        <p style={{fontSize: "14px", color: "#666", marginBottom: "20px"}}>비공개 방에 입장하기 위해 비밀번호를 입력해주세요.</p>
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <input 
              type="text" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              autoFocus 
              style={styles.input} 
              maxLength={10} 
              placeholder="비밀번호"
            />
          </div>
          <div style={styles.buttonRow}>
            <button type="button" onClick={onClose} style={styles.cancelBtn}>취소</button>
            <button type="submit" style={styles.submitBtn}>입장</button>
          </div>
        </form>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0, 
    backgroundColor: "rgba(0,0,0,0.6)", display: "flex", 
    justifyContent: "center", alignItems: "center", zIndex: 1000, backdropFilter: "blur(3px)"
  },
  modal: {
    backgroundColor: "white", padding: "24px", borderRadius: "12px", 
    width: "300px", boxShadow: "0 10px 25px rgba(0,0,0,0.2)"
  },
  form: {
    display: "flex", flexDirection: "column", gap: "16px"
  },
  field: {
    display: "flex", flexDirection: "column"
  },
  input: {
    padding: "10px", borderRadius: "6px", border: "1px solid #ccc", fontSize: "16px"
  },
  buttonRow: {
    display: "flex", gap: "10px"
  },
  cancelBtn: {
    flex: 1, padding: "10px", backgroundColor: "#e0e0e0", color: "#333", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "14px", fontWeight: "bold"
  },
  submitBtn: {
    flex: 1, padding: "10px", backgroundColor: "#007BFF", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "14px", fontWeight: "bold"
  }
};
