const jwt = require("jsonwebtoken");
const Message = require("../models/Message");

function getJwtSecret() {
  const secret = process.env.JWT_SECRET || process.env.JWTSECRET;
  if (!secret)
    throw new Error("Missing JWT secret in .env (JWT_SECRET or JWTSECRET)");
  return secret;
}

module.exports = (io) => {
  io.onlineUsers = new Map();

  io.on("connection", (socket) => {
    socket.on("auth", ({ token }) => {
      try {
        const payload = jwt.verify(token, getJwtSecret());
        socket.userId = payload.userId;
        io.onlineUsers.set(socket.userId, socket.id);
        io.emit("online_count", { count: io.onlineUsers.size });
      } catch (e) {
        socket.emit("auth_error", { message: "Invalid token" });
      }
    });

    socket.on("send_message", async ({ text, receiver = null }) => {
      try {
        if (!socket.userId) {
          return socket.emit("send_error", { message: "Not authenticated" });
        }

        const clean = (text || "").trim();
        if (!clean) return;

        const msg = await Message.create({
          sender: socket.userId,
          receiver: receiver || null,
          text: clean,
        });

        const full = await Message.findById(msg._id)
          .populate("sender", "username email role")
          .populate("receiver", "username email role");

        io.emit("new_message", full);
      } catch (e) {
        socket.emit("send_error", { message: e.message });
      }
    });

    socket.on("disconnect", () => {
      if (socket.userId) io.onlineUsers.delete(socket.userId);
      io.emit("online_count", { count: io.onlineUsers.size });
    });
  });
};
