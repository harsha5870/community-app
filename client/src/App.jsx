import { useState } from "react";
import axios from "axios";
import Admin from "./Admin"; // your admin page
import Chat from "./Chat"; // your chat page

const API_BASE = "http://localhost:5000/api";

export default function App() {
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [token, setToken] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");

  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
  });

  const onChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const commonInputStyle = {
    padding: 8,
    marginBottom: 8,
    width: 260,
  };

  const handleLogin = async () => {
    try {
      setStatus("Logging in...");
      const res = await axios.post(`${API_BASE}/auth/login`, {
        email: form.email,
        password: form.password,
      });
      setToken(res.data.token);
      setRole(res.data.role);
      setStatus("Login success");
    } catch (err) {
      setStatus(
        `login failed: ${err?.response?.data?.message || err.message || "error"}`,
      );
    }
  };

  const handleRegister = async () => {
    try {
      setStatus("Creating account...");
      const res = await axios.post(`${API_BASE}/auth/register`, {
        username: form.username,
        email: form.email,
        password: form.password,
      });
      setToken(res.data.token);
      setRole(res.data.user?.role || "member");
      setStatus("Account created and logged in");
    } catch (err) {
      setStatus(
        `register failed: ${
          err?.response?.data?.message || err.message || "error"
        }`,
      );
    }
  };

  const handleLogout = () => {
    setToken("");
    setRole("");
    setStatus("Logged out");
  };

  // If logged in, show Chat/Admin UI as before
  if (token) {
    return (
      <div style={{ padding: 16 }}>
        <div style={{ marginBottom: 8 }}>
          Logged in as {role}.{" "}
          <button onClick={handleLogout} style={{ padding: "4px 10px" }}>
            Logout
          </button>
        </div>
        {role === "admin" ? <Admin token={token} /> : <Chat token={token} />}
      </div>
    );
  }

  // Start page (only auth UI)
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0f172a",
        color: "#e5e7eb",
        fontFamily: "Arial",
      }}
    >
      <div
        style={{
          background: "#111827",
          padding: 24,
          borderRadius: 8,
          width: 340,
          boxShadow: "0 10px 40px rgba(0,0,0,0.6)",
        }}
      >
        <div
          style={{
            display: "flex",
            marginBottom: 16,
            borderRadius: 6,
            overflow: "hidden",
            border: "1px solid #374151",
          }}
        >
          <button
            onClick={() => {
              setMode("login");
              setStatus("");
            }}
            style={{
              flex: 1,
              padding: 8,
              background: mode === "login" ? "#2563eb" : "#111827",
              color: mode === "login" ? "#fff" : "#9ca3af",
              border: "none",
              cursor: "pointer",
            }}
          >
            Login
          </button>
          <button
            onClick={() => {
              setMode("register");
              setStatus("");
            }}
            style={{
              flex: 1,
              padding: 8,
              background: mode === "register" ? "#2563eb" : "#111827",
              color: mode === "register" ? "#fff" : "#9ca3af",
              border: "none",
              cursor: "pointer",
            }}
          >
            Create account
          </button>
        </div>

        {mode === "login" ? (
          <>
            <h2 style={{ marginBottom: 12 }}>Login</h2>
            <input
              style={commonInputStyle}
              type="email"
              name="email"
              placeholder="Email"
              value={form.email}
              onChange={onChange}
            />
            <input
              style={commonInputStyle}
              type="password"
              name="password"
              placeholder="Password"
              value={form.password}
              onChange={onChange}
            />
            <button
              onClick={handleLogin}
              style={{
                padding: 8,
                width: "100%",
                marginTop: 4,
                background: "#2563eb",
                color: "#fff",
                border: "none",
                borderRadius: 4,
                cursor: "pointer",
              }}
            >
              Login
            </button>
          </>
        ) : (
          <>
            <h2 style={{ marginBottom: 12 }}>Create new account</h2>
            <input
              style={commonInputStyle}
              type="text"
              name="username"
              placeholder="Username"
              value={form.username}
              onChange={onChange}
            />
            <input
              style={commonInputStyle}
              type="email"
              name="email"
              placeholder="Email"
              value={form.email}
              onChange={onChange}
            />
            <input
              style={commonInputStyle}
              type="password"
              name="password"
              placeholder="Password"
              value={form.password}
              onChange={onChange}
            />
            <button
              onClick={handleRegister}
              style={{
                padding: 8,
                width: "100%",
                marginTop: 4,
                background: "#10b981",
                color: "#fff",
                border: "none",
                borderRadius: 4,
                cursor: "pointer",
              }}
            >
              Sign up
            </button>
          </>
        )}

        <div style={{ marginTop: 10, fontSize: 12, color: "#9ca3af" }}>
          Status: {status}
        </div>
      </div>
    </div>
  );
}
