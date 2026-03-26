import { useState } from "react";

export default function Login({ onLogin }) {
  const [nickname, setNickname] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (nickname.trim() === "") return;
    onLogin(nickname);
  };

  return (
    <div style={styles.container}>
      <form onSubmit={handleSubmit} style={styles.card}>
        <h2 style={styles.title}>게스트 로그인</h2>
        <input 
          autoFocus
          type="text" 
          placeholder="닉네임을 입력하세요 (최대 10자)" 
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          style={styles.input}
          maxLength={10}
        />
        <button type="submit" style={styles.button}>입장하기</button>
      </form>
    </div>
  );
}

const styles = {
  container: {
    width: "100%", height: "100%",
    display: "flex", 
    justifyContent: "center", 
    alignItems: "center", 
    backgroundColor: "#0f0f13",
  },
  card: {
    background: "rgba(255, 255, 255, 0.9)", 
    padding: "40px", 
    borderRadius: "16px", 
    boxShadow: "0 8px 32px rgba(0,0,0,0.3)", 
    display: "flex", 
    flexDirection: "column", 
    gap: "20px", 
    width: "320px",
    backdropFilter: "blur(10px)",
    border: "1px solid rgba(255, 255, 255, 0.2)"
  },
  title: {
    margin: "0 0 10px 0", 
    textAlign: "center", 
    color: "#333",
    fontSize: "24px"
  },
  input: {
    padding: "14px", 
    fontSize: "16px", 
    borderRadius: "8px", 
    border: "1px solid #ddd", 
    outline: "none",
    transition: "border 0.2s"
  },
  button: {
    padding: "14px", 
    fontSize: "16px", 
    backgroundColor: "#FF5252", 
    color: "white", 
    border: "none", 
    borderRadius: "8px", 
    cursor: "pointer", 
    fontWeight: "bold",
    transition: "transform 0.1s, background 0.2s"
  }
};
