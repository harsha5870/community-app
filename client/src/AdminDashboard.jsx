import { useEffect, useState } from "react";
import { api } from "./api";

export default function AdminDashboard({ token }) {
  const [dash, setDash] = useState(null);
  const [requests, setRequests] = useState([]);
  const [users, setUsers] = useState([]);
  const [status, setStatus] = useState("idle");

  const isLocked = (u) => u.lockUntil && new Date(u.lockUntil) > new Date();

  const loadDashboard = async () => {
    const res = await api.get("/api/admin/dashboard");
    setDash(res.data);
  };

  const loadRequests = async () => {
    const res = await api.get("/api/admin/unlock-requests?status=pending");
    setRequests(res.data);
  };

  const loadUsers = async () => {
    const res = await api.get("/api/admin/users");
    setUsers(res.data);
  };

  const loadAll = async () => {
    try {
      setStatus("loading...");
      await Promise.all([loadDashboard(), loadRequests(), loadUsers()]);
      setStatus("loaded");
    } catch (err) {
      setStatus("error: " + (err?.response?.data?.message || err.message));
    }
  };

  const approve = async (requestId) => {
    try {
      setStatus("approving...");
      await api.put(`/api/admin/unlock-requests/${requestId}/approve`);
      setStatus("approved ✅");
      await loadAll();
    } catch (err) {
      setStatus(
        "approve failed: " + (err?.response?.data?.message || err.message),
      );
    }
  };

  const reject = async (requestId) => {
    try {
      setStatus("rejecting...");
      await api.put(`/api/admin/unlock-requests/${requestId}/reject`);
      setStatus("rejected ✅");
      await loadAll();
    } catch (err) {
      setStatus(
        "reject failed: " + (err?.response?.data?.message || err.message),
      );
    }
  };

  const unlockUser = async (userId) => {
    try {
      setStatus("unlocking...");
      await api.put(`/api/admin/unlock/${userId}`);
      setStatus("user unlocked ✅");
      await loadAll();
    } catch (err) {
      setStatus(
        "unlock failed: " + (err?.response?.data?.message || err.message),
      );
    }
  };

  useEffect(() => {
    if (token) loadAll();
  }, [token]);

  if (!token) return <div style={{ padding: 16 }}>Login first (no token)</div>;

  return (
    <div style={{ padding: 16, fontFamily: "Arial" }}>
      <h2>Admin Dashboard</h2>
      <div>Status: {status}</div>
      <button onClick={loadAll} style={{ marginTop: 8 }}>
        Refresh
      </button>

      <hr />

      <h3>Pending Unlock Requests</h3>
      <table
        border="1"
        cellPadding="8"
        style={{ width: "100%", borderCollapse: "collapse" }}
      >
        <thead>
          <tr>
            <th>Requested by</th>
            <th>Email</th>
            <th>Reason</th>
            <th>Time</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {requests.length === 0 ? (
            <tr>
              <td colSpan="5">No pending requests</td>
            </tr>
          ) : (
            requests.map((r) => (
              <tr key={r._id}>
                <td>{r.user?.username || "-"}</td>
                <td>{r.user?.email || "-"}</td>
                <td>{r.reason || "-"}</td>
                <td>{new Date(r.createdAt).toLocaleString()}</td>
                <td>
                  <button onClick={() => approve(r._id)}>Approve</button>
                  <button
                    onClick={() => reject(r._id)}
                    style={{ marginLeft: 8 }}
                  >
                    Reject
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <hr />

      <h3>Users</h3>
      <table
        border="1"
        cellPadding="8"
        style={{ width: "100%", borderCollapse: "collapse" }}
      >
        <thead>
          <tr>
            <th>Username</th>
            <th>Email</th>
            <th>Role</th>
            <th>Active</th>
            <th>Failed attempts</th>
            <th>Lock until</th>
            <th>Locked?</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {users.length === 0 ? (
            <tr>
              <td colSpan="8">No users found</td>
            </tr>
          ) : (
            users.map((u) => (
              <tr key={u._id}>
                <td>{u.username}</td>
                <td>{u.email}</td>
                <td>{u.role}</td>
                <td style={{ color: u.isActive ? "lightgreen" : "red" }}>
                  {u.isActive ? "YES" : "NO"}
                </td>
                <td>{u.failedLoginAttempts ?? 0}</td>
                <td>
                  {u.lockUntil ? new Date(u.lockUntil).toLocaleString() : "-"}
                </td>
                <td style={{ color: isLocked(u) ? "red" : "lightgreen" }}>
                  {isLocked(u) ? "LOCKED" : "OK"}
                </td>
                <td>
                  {isLocked(u) ? (
                    <button onClick={() => unlockUser(u._id)}>Unlock</button>
                  ) : (
                    "-"
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <hr />

      <h3>Online Users</h3>
      <div>Count: {dash?.onlineUsersCount ?? 0}</div>
      <ul>
        {(dash?.onlineUserIds || []).map((id) => (
          <li key={id}>{id}</li>
        ))}
      </ul>

      <hr />

      <h3>Latest Security Events</h3>
      <pre
        style={{
          maxHeight: 220,
          overflow: "auto",
          background: "#111",
          color: "#0f0",
          padding: 10,
        }}
      >
        {JSON.stringify(dash?.latestSecurityEvents || [], null, 2)}
      </pre>

      <hr />

      <h3>Latest Messages</h3>
      <pre
        style={{
          maxHeight: 220,
          overflow: "auto",
          background: "#111",
          color: "#0f0",
          padding: 10,
        }}
      >
        {JSON.stringify(dash?.latestMessages || [], null, 2)}
      </pre>
    </div>
  );
}
