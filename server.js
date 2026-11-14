
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const rooms = new Map();

function getRoom(roomCode) {
  return rooms.get(roomCode);
}

function getPlayers(room) {
  return Array.from(room.players.values());
}

io.on("connection", (socket) => {
  console.log("Device connected:", socket.id);

  // Laptop registers itself as the host.
  socket.on("host:register", ({ roomCode }, callback) => {
    const code = String(roomCode || "").toUpperCase();

    if (!code) {
      return callback?.({ success: false, error: "Invalid room code" });
    }

    let room = getRoom(code);

    if (!room) {
      room = {
        hostId: null,
        players: new Map(),
      };
      rooms.set(code, room);
    }

    if (room.hostId && room.hostId !== socket.id) {
      return callback?.({
        success: false,
        error: "This room already has an active host",
      });
    }

    room.hostId = socket.id;
    socket.join(code);
    socket.data.roomCode = code;
    socket.data.role = "host";

    callback?.({
      success: true,
      players: getPlayers(room),
    });

    console.log(`Host registered for room ${code}`);
  });

  // Phone joins using its nickname.
  socket.on("player:join", ({ roomCode, nickname }, callback) => {
    const code = String(roomCode || "").toUpperCase();
    const name = String(nickname || "").trim();

    const room = getRoom(code);

    if (!room || !room.hostId) {
      return callback?.({
        success: false,
        error: "This room is not currently available",
      });
    }

    if (!name || name.length > 16) {
      return callback?.({
        success: false,
        error: "Enter a nickname between 1 and 16 characters",
      });
    }

    const existingPlayer = Array.from(room.players.values()).find(
      (player) => player.nickname.toLowerCase() === name.toLowerCase()
    );

    if (existingPlayer) {
      return callback?.({
        success: false,
        error: "That nickname is already taken",
      });
    }

    const player = {
      id: socket.id,
      nickname: name,
      connected: true,
    };

    room.players.set(socket.id, player);

    socket.join(code);
    socket.data.roomCode = code;
    socket.data.role = "player";

    callback?.({
      success: true,
      player,
    });

    io.to(room.hostId).emit("player:joined", player);

    console.log(`${name} joined room ${code}`);
  });

  // Remove disconnected players from the room.
  socket.on("disconnect", () => {
    const code = socket.data.roomCode;
    const role = socket.data.role;

    if (!code) return;

    const room = getRoom(code);
    if (!room) return;

    if (role === "player") {
      const player = room.players.get(socket.id);

      if (player) {
        room.players.delete(socket.id);
        io.to(room.hostId).emit("player:left", player);
        console.log(`${player.nickname} disconnected`);
      }
    }

    if (role === "host" && room.hostId === socket.id) {
      room.hostId = null;
      console.log(`Host disconnected from room ${code}`);
    }

    if (!room.hostId && room.players.size === 0) {
      rooms.delete(code);
    }
  });
});

const PORT = 3001;

httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`Playverse server running on port ${PORT}`);
});
