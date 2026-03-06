import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { api, setAuthToken } from "./api";

export default function ChatPage({ token, setToken }) {
  const [email, setEmail] = useState("member@test.com");
  const [password, setPassword] = useState("member123");
  const [status, setStatus] = useState("not connected");

  const [onlineCount, setOnlineCount] = useState(0);

  const [text, setText] = useState("");
  const [messages, setMessages] = useState([]);

  const [reason, setReason] = useState("");
  const [reqStatus, setReqStatus] = useState("");

  const socketRef = useRef(null);

  const disconnectOldSocket = () => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    if (window.__socket) {
      window.__socket.disconnect();
      window.__socket = null;
    }
  };

  const clearCredsSoon = () => {
    // Clear credentials after a short delay (you asked for auto erase)
    setTimeout(() => {
      setEmail("");
      setPassword("");
    }, 800);
  };

  const login = async () => {
    try {
      setStatus("logging in...");

      disconnectOldSocket();
      setAuthToken(null);
      setToken("");

      const res = await api.post("/api/auth/login", { email, password });

      setToken(res.data.token);
      setAuthToken(res.data.token);

      setStatus(`login success (role: ${res.data.user?.role || "unknown"})`);
      clearCredsSoon();
    } catch (err) {
      setStatus(
        "login failed: " + (err?.response?.data?.message || err.message),
      );
      clearCredsSoon();
    }
  };

  const connectSocket = () => {
    if (!token) return setStatus("Login first (no token)");

    disconnectOldSocket();

    const socket = io("http://localhost:5000", {
      transports: ["websocket"],
    });

    socketRef.current = socket;
    window.__socket = socket;

    socket.on("connect", () => {
      setStatus("connected");
      // ✅ authenticate after connect (matches the server code)
      socket.emit("auth", { token });
    });

    socket.on("auth_error", (p) => {
      setStatus("auth error: " + (p?.message || "invalid token"));
    });

    socket.on("connect_error", (err) => {
      setStatus("socket error: " + err.message);
    });

    socket.on("disconnect", (r) => {
      setStatus("disconnected: " + r);
    });

    // ✅ live online count
    socket.on("online_count", ({ count }) => {
      setOnlineCount(count || 0);
    });

    // ✅ receive new message broadcast
    socket.on("new_message", (msg) => {
      setMessages((prev) => [msg, ...prev]);
    });

    socket.on("send_error", (p) => {
      setStatus("send error: " + (p?.message || "failed"));
    });
  };

  const sendMessage = () => {
    const socket = socketRef.current;
    if (!socket || socket.disconnected)
      return setStatus("Connect socket first");
    const clean = text.trim();
    if (!clean) return;

    // ✅ send message to server
    socket.emit("send_message", { text: clean });
    setText("");
  };

  const requestUnlock = async () => {
    try {
      setReqStatus("sending request...");
      const res = await api.post("/api/unlock-request", { reason });
      setReqStatus(res.data.message);
      setReason("");
    } catch (err) {
      setReqStatus(
        "request failed: " + (err?.response?.data?.message || err.message),
      );
    }
  };

  useEffect(() => {
    // cleanup on unmount
    return () => disconnectOldSocket();
  }, []);

  return (
    <div style={{ padding: 16, fontFamily: "Arial" }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <div>Logged in as member.</div>
      </div>

      <div style={{ marginTop: 8 }}>Status: {status}</div>
      <div style={{ marginTop: 6 }}>Online users (unique): {onlineCount}</div>

      <hr />

      <h2>Chat</h2>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email"
          autoComplete="off"
        />
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="password"
          type="password"
          autoComplete="off"
        />
        <button onClick={login}>Login</button>
        <button onClick={connectSocket}>Connect Socket</button>
      </div>

      <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message..."
          style={{ width: 420 }}
        />
        <button onClick={sendMessage}>Send</button>
      </div>

      <h3 style={{ marginTop: 18 }}>Messages</h3>
      <div style={{ border: "1px solid #ddd", padding: 10, minHeight: 120 }}>
        {messages.length === 0 ? (
          <div>No messages yet.</div>
        ) : (
          messages.map((m) => (
            <div
              key={m._id}
              style={{ padding: "6px 0", borderBottom: "1px solid #eee" }}
            >
              <b>{m.sender?.username || "unknown"}</b>: {m.text}
              <div style={{ fontSize: 11, opacity: 0.7 }}>
                {m.createdAt ? new Date(m.createdAt).toLocaleString() : ""}
              </div>
            </div>
          ))
        )}
      </div>

      <hr />

      <h3>Request admin unlock</h3>
      <input
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Reason (optional)"
        style={{ width: 420 }}
      />
      <button onClick={requestUnlock} style={{ marginLeft: 8 }}>
        Request Unlock
      </button>
      <div style={{ marginTop: 8 }}>Request status: {reqStatus}</div>
    </div>
  );
}
