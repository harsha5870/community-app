import { useEffect, useRef, useState } from "react";
import api from "../services/api"; // change path if your api file is elsewhere

export default function Login({ onAuthSuccess }) {
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const timerRef = useRef(null);

  const clearFields = () => {
    setUsername("");
    setEmail("");
    setPassword("");
  };

  // Auto-clear status after 5s
  useEffect(() => {
    if (!status) return;
    timerRef.current = setTimeout(() => setStatus(""), 5000);
    return () => timerRef.current && clearTimeout(timerRef.current);
  }, [status]);

  // Clear fields when switching tabs
  useEffect(() => {
    clearFields();
    setStatus("");
  }, [mode]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Clear immediately so creds don’t sit on screen
    const _username = username;
    const _email = email;
    const _password = password;
    clearFields();

    try {
      const url = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const payload =
        mode === "login"
          ? { email: _email, password: _password }
          : { username: _username, email: _email, password: _password };

      const res = await api.post(url, payload);

      setStatus(mode === "login" ? "Login successful" : "Account created");
      onAuthSuccess?.(res.data); // {token, user, message}
    } catch (err) {
      setStatus(err?.response?.data?.message || "Auth failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 8 }}>
        <button type="button" onClick={() => setMode("login")}>
          Login
        </button>
        <button type="button" onClick={() => setMode("register")}>
          Create account
        </button>
      </div>

      <h2>{mode === "login" ? "Login" : "Create account"}</h2>

      <form onSubmit={handleSubmit}>
        {mode === "register" && (
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username"
            disabled={loading}
            autoComplete="off"
            required
          />
        )}

        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          disabled={loading}
          autoComplete="off"
          required
        />

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          disabled={loading}
          autoComplete="off"
          required
        />

        <button type="submit" disabled={loading}>
          {loading ? "Please wait..." : mode === "login" ? "Login" : "Create"}
        </button>
      </form>

      {status && <div>Status: {status}</div>}
    </div>
  );
}
