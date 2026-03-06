require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const http = require("http");
const { Server } = require("socket.io");

const connectDB = require("./config/db");

const app = express();
const PORT = process.env.PORT || 5000;

connectDB();

app.use(express.json());
app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(helmet());

// ✅ general limiter (less strict so UI doesn’t break)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
});
app.use(apiLimiter);

app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/protected", require("./routes/protectedRoutes"));
app.use("/api/admin", require("./routes/adminRoutes"));

app.get("/", (req, res) => res.json({ message: "API running" }));

const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: ["http://localhost:5173"], credentials: true },
});

require("./sockets/chatSocket")(io);
app.set("io", io);

server.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`),
);
