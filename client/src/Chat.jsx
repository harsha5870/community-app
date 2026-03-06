import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

const API_BASE = "http://localhost:5000";

export default function Chat({ token }) {
  const socketRef = useRef(null);

  const [status, setStatus] = useState("disconnected");
  const [onlineCount, setOnlineCount] = useState(0);
  const [text, setText] = useState("");
  const [messages, setMessages] = useState([]);

  // ✅ Load history once after login (and whenever token changes)
  useEffect(() => {
    if (!token) return;

    let cancelled = false;

    async function loadHistory() {
      try {
        const res = await fetch(`${API_BASE}/api/protected/chat/history`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();

        if (!res.ok) return; // optionally handle error UI
        if (!cancelled) setMessages(Array.isArray(data) ? data : []);
      } catch {
        // ignore for now
      }
    }

    loadHistory();
    return () => {
      cancelled = true;
    };
  }, [token]);

  // ✅ Socket (live updates)
  useEffect(() => {
    if (!token) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setStatus("disconnected");
      setOnlineCount(0);
      setMessages([]);
      return;
    }

    const socket = io("http://localhost:5000", {
      transports: ["websocket", "polling"],
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setStatus("connected");
      socket.emit("auth", { token }); // server expects this
    });

    socket.on("disconnect", (reason) => setStatus("disconnected: " + reason));
    socket.on("connect_error", (err) => setStatus(`error: ${err.message}`));

    socket.on("auth_error", (p) => {
      setStatus("auth error: " + (p?.message || "Invalid token"));
    });

    socket.on("online_count", (data) => setOnlineCount(data?.count ?? 0));

    socket.on("new_message", (msg) => {
      setMessages((prev) => [msg, ...prev].slice(0, 100));
    });

    socket.on("send_error", (p) => {
      setStatus("send error: " + (p?.message || "failed"));
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token]);

  const send = () => {
    const socket = socketRef.current;
    if (!socket) return;

    const clean = text.trim();
    if (!clean) return;

    socket.emit("send_message", { text: clean });
    setText("");
  };

  if (!token) return <div>Login to use chat</div>;

  return (
    <div>
      <div>Status: {status}</div>
      <div>Online users (unique): {onlineCount}</div>

      <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type message..."
          style={{ padding: 8, width: 320 }}
        />
        <button onClick={send} style={{ padding: "8px 14px" }}>
          Send
        </button>
      </div>

      <div style={{ marginTop: 12 }}>
        <h3>Messages</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {messages.map((m, idx) => (
            <div
              key={m._id || idx}
              style={{ border: "1px solid #ddd", padding: 8 }}
            >
              <div>
                <b>From:</b> {m.sender?.username || m.sender?._id || "unknown"}
              </div>
              <div>{m.text}</div>
              <div style={{ fontSize: 12, color: "#666" }}>
                {m.createdAt ? new Date(m.createdAt).toLocaleString() : ""}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
