import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";

const API_BASE = "http://localhost:5000/api";
const MAX_MESSAGES = 50; // keep latest 50 on screen

export default function Admin({ token }) {
  const [status, setStatus] = useState("");
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [securityEvents, setSecurityEvents] = useState([]);
  const [messages, setMessages] = useState([]);

  const seenMessageIds = useRef(new Set());

  const authHeaders = useMemo(
    () => (token ? { Authorization: `Bearer ${token}` } : {}),
    [token],
  );

  const mergeMessagesNewestFirst = (incoming = []) => {
    const newOnes = [];
    for (const m of incoming) {
      const id = m?._id;
      if (!id) continue;
      if (!seenMessageIds.current.has(id)) {
        seenMessageIds.current.add(id);
        newOnes.push(m);
      }
    }
    if (newOnes.length === 0) return;
    setMessages((prev) => [...newOnes, ...prev].slice(0, MAX_MESSAGES));
  };

  const fetchAll = async () => {
    if (!token) {
      setStatus("Login as admin to view dashboard");
      return;
    }

    try {
      setStatus("Loading...");

      const [u, ev, msg] = await Promise.all([
        axios.get(`${API_BASE}/admin/users`, { headers: authHeaders }),
        axios.get(`${API_BASE}/admin/security-events`, {
          headers: authHeaders,
        }),
        axios.get(`${API_BASE}/admin/messages`, { headers: authHeaders }),
      ]);

      setUsers(u.data || []);
      setSecurityEvents(ev.data || []);

      const initialMsgs = msg.data || [];
      seenMessageIds.current = new Set(
        initialMsgs.map((m) => m?._id).filter(Boolean),
      );
      setMessages(initialMsgs.slice(0, MAX_MESSAGES));

      setStatus("OK");
    } catch (err) {
      const code = err?.response?.status;
      const url = err?.config?.url;
      const backendMsg = err?.response?.data?.message;

      setStatus(
        `error: ${code || ""} ${err?.message || "Request failed"}${
          url ? ` | URL: ${url}` : ""
        }${backendMsg ? ` | server: ${backendMsg}` : ""}`,
      );
    }
  };

  // Poll messages every 2 seconds
  useEffect(() => {
    if (!token) return;

    const timer = setInterval(async () => {
      try {
        const res = await axios.get(`${API_BASE}/admin/messages`, {
          headers: authHeaders,
        });
        mergeMessagesNewestFirst(res.data || []);
      } catch {
        // ignore polling errors to avoid spamming status
      }
    }, 2000);

    return () => clearInterval(timer);
  }, [token, authHeaders]);

  useEffect(() => {
    if (!token) {
      setStatus("Login as admin to view dashboard");
      return;
    }
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const unlockSelectedUser = async () => {
    try {
      if (!selectedUserId) {
        setStatus("Select a user to unlock");
        return;
      }

      setStatus("Unlocking user...");
      await axios.put(`${API_BASE}/admin/unlock/${selectedUserId}`, null, {
        headers: authHeaders,
      });

      setStatus("User unlocked");
      fetchAll();
    } catch (err) {
      setStatus(
        `unlock error: ${err?.response?.status || ""} ${
          err?.response?.data?.message || err?.message || "failed"
        }`,
      );
    }
  };

  // 🔴 Block / 🟢 Unblock helpers
  const blockUser = async (id) => {
    try {
      setStatus("Blocking user...");
      await axios.put(`${API_BASE}/admin/block/${id}`, null, {
        headers: authHeaders,
      });
      setStatus("User blocked");
      fetchAll();
    } catch (err) {
      setStatus(
        `block error: ${err?.response?.status || ""} ${
          err?.response?.data?.message || err?.message || "failed"
        }`,
      );
    }
  };

  const unblockUser = async (id) => {
    try {
      setStatus("Unblocking user...");
      await axios.put(`${API_BASE}/admin/unblock/${id}`, null, {
        headers: authHeaders,
      });
      setStatus("User unblocked");
      fetchAll();
    } catch (err) {
      setStatus(
        `unblock error: ${err?.response?.status || ""} ${
          err?.response?.data?.message || err?.message || "failed"
        }`,
      );
    }
  };

  if (!token) {
    return (
      <div style={{ padding: 16 }}>
        <h2>Admin Dashboard</h2>
        <div>Status: please login</div>
      </div>
    );
  }

  const resizableBoxStyle = {
    background: "#111",
    color: "#0f0",
    padding: 10,
    overflow: "auto",
    width: 520,
    height: 160,
    resize: "both",
    minWidth: 320,
    minHeight: 120,
    border: "1px solid #333",
  };

  return (
    <div style={{ padding: 16, fontFamily: "Arial" }}>
      <h2>Admin Dashboard</h2>
      <div>Status: {status}</div>

      <button onClick={fetchAll} style={{ marginTop: 10, padding: "6px 10px" }}>
        Refresh
      </button>

      <hr style={{ margin: "16px 0" }} />

      <h3>Users</h3>
      <div style={{ marginBottom: 10 }}>
        <select
          value={selectedUserId}
          onChange={(e) => setSelectedUserId(e.target.value)}
          style={{ padding: 8, width: 420, maxWidth: "100%" }}
        >
          <option value="">Select user to unlock...</option>
          {users.map((u) => (
            <option key={u._id} value={u._id}>
              {u.username} ({u.email}) - role:{u.role}
            </option>
          ))}
        </select>

        <button
          onClick={unlockSelectedUser}
          style={{ marginLeft: 10, padding: "8px 14px" }}
        >
          Unlock Selected User
        </button>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table
          border="1"
          cellPadding="6"
          style={{ borderCollapse: "collapse", minWidth: 900 }}
        >
          <thead>
            <tr>
              <th>Username</th>
              <th>Email</th>
              <th>Role</th>
              <th>Active</th>
              <th>Failed attempts</th>
              <th>Lock until</th>
              <th>Actions</th> {/* 🆕 column */}
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan="7">No users</td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u._id}>
                  <td>{u.username}</td>
                  <td>{u.email}</td>
                  <td>{u.role}</td>
                  <td>{u.isActive ? "YES" : "NO"}</td>
                  <td>{u.failedLoginAttempts ?? 0}</td>
                  <td>
                    {u.lockUntil
                      ? new Date(u.lockUntil).toLocaleString("en-IN", {
                          timeZone: "Asia/Kolkata",
                        })
                      : "-"}
                  </td>
                  <td>
                    {u.isActive ? (
                      <button
                        onClick={() => blockUser(u._id)}
                        style={{
                          padding: "4px 8px",
                          background: "#b91c1c",
                          color: "#fff",
                          border: "none",
                          borderRadius: 3,
                          cursor: "pointer",
                        }}
                      >
                        Block
                      </button>
                    ) : (
                      <button
                        onClick={() => unblockUser(u._id)}
                        style={{
                          padding: "4px 8px",
                          background: "#16a34a",
                          color: "#fff",
                          border: "none",
                          borderRadius: 3,
                          cursor: "pointer",
                        }}
                      >
                        Unblock
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <hr style={{ margin: "16px 0" }} />

      <h3>Latest Security Events</h3>
      <pre style={resizableBoxStyle}>
        {securityEvents.length === 0
          ? "No security events yet."
          : JSON.stringify(securityEvents, null, 2)}
      </pre>

      <h3>Latest Messages (newest on top)</h3>
      <pre style={resizableBoxStyle}>
        {messages.length === 0
          ? "No messages yet (API returns [])."
          : JSON.stringify(
              messages.map((m) => ({
                ...m,
                createdAt: m.createdAt
                  ? new Date(m.createdAt).toLocaleString("en-IN", {
                      timeZone: "Asia/Kolkata",
                    })
                  : m.createdAt,
              })),
              null,
              2,
            )}
      </pre>
    </div>
  );
}
