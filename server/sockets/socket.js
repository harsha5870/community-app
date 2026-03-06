const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const onlineUsers = new Map(); // userId -> socketId

module.exports = function initSocket(io) {
  const Message = mongoose.model("Message");
  const SecurityEvent = mongoose.model("SecurityEvent");

  const userMsgWindow = new Map();
  const WINDOW_MS = 10 * 1000;
  const MAX_MSG = 8;

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) {
        await SecurityEvent.create({
          eventType: "SOCKET_NO_TOKEN",
          severity: "medium",
          ip: socket.handshake.address,
        });
        return next(new Error("NO_TOKEN"));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded;
      next();
    } catch (err) {
      try {
        await SecurityEvent.create({
          eventType: "SOCKET_INVALID_TOKEN",
          severity: "high",
          ip: socket.handshake.address,
          details: { message: err.message },
        });
      } catch (_) {}
      next(new Error("INVALID_TOKEN"));
    }
  });

  function isSpamming(userId) {
    const now = Date.now();
    const entry = userMsgWindow.get(userId);
    if (!entry || now - entry.windowStart > WINDOW_MS) {
      userMsgWindow.set(userId, { count: 1, windowStart: now });
      return false;
    }
    entry.count += 1;
    return entry.count > MAX_MSG;
  }

  io.on("connection", (socket) => {
    // mark online
    onlineUsers.set(socket.user.userId, socket.id);

    // join personal room
    socket.join(socket.user.userId);

    socket.on("disconnect", () => {
      onlineUsers.delete(socket.user.userId);
    });

    socket.on("private_message", async ({ toUserId, content }) => {
      try {
        if (!toUserId || !content) return;

        if (!mongoose.isValidObjectId(toUserId)) {
          await SecurityEvent.create({
            user: socket.user.userId,
            ip: socket.handshake.address,
            eventType: "PRIVATE_MESSAGE_BAD_RECEIVER_ID",
            severity: "medium",
            details: { toUserId },
          });
          return;
        }

        if (isSpamming(socket.user.userId)) {
          await SecurityEvent.create({
            user: socket.user.userId,
            ip: socket.handshake.address,
            eventType: "SPAM_DETECTED_PRIVATE",
            severity: "high",
            details: { toUserId },
          });
          return;
        }

        const msg = await Message.create({
          sender: socket.user.userId,
          receiver: toUserId,
          content: String(content).trim(),
        });

        io.to(toUserId).emit("private_message", msg);
        io.to(socket.user.userId).emit("private_message", msg);
      } catch (err) {
        console.error("private_message error:", err.message);
      }
    });

    socket.on("join_room", ({ roomId }) => {
      if (!roomId) return;
      const safeRoomId = String(roomId).trim();
      if (!safeRoomId) return;
      socket.join(safeRoomId);
    });

    socket.on("room_message", async ({ roomId, content }) => {
      try {
        if (!roomId || !content) return;

        const safeRoomId = String(roomId).trim();
        const safeContent = String(content).trim();
        if (!safeRoomId || !safeContent) return;

        if (isSpamming(socket.user.userId)) {
          await SecurityEvent.create({
            user: socket.user.userId,
            ip: socket.handshake.address,
            eventType: "SPAM_DETECTED_ROOM",
            severity: "high",
            details: { roomId: safeRoomId },
          });
          return;
        }

        const msg = await Message.create({
          sender: socket.user.userId,
          roomId: safeRoomId,
          content: safeContent,
        });

        io.to(safeRoomId).emit("room_message", msg);
      } catch (err) {
        console.error("room_message error:", err.message);
      }
    });
  });
};

// ✅ export helper for admin routes
module.exports.getOnlineUsers = () => Array.from(onlineUsers.keys());
