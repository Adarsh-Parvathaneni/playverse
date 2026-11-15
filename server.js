
import express from "express";
import { createServer } from "http";
import { randomUUID } from "crypto";
import { Server } from "socket.io";

const app = express();
const httpServer = createServer(app);

const PORT = process.env.PORT || 3001;

const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Temporary local room storage.
// Redis integration will be added when implementing multi-instance deployment.
const rooms = new Map();

const ALLOWED_GAMES = [
  "fruit-frenzy",
  "sword-clash",
  "rhythm-rush",
  "reflex-wars",
];

function getRoom(roomCode) {
  return rooms.get(roomCode);
}

function getPlayers(room) {
  return Array.from(room.players.values());
}

function sendError(callback, error) {
  callback?.({ success: false, error });
}

function createRoom() {
  return {
    hostId: null,
    players: new Map(),
    game: null,
  };
}

// Basic validation of submitted game results.
function validateGameResult(result, game) {
  if (!result || typeof result !== "object") {
    return "Invalid game result";
  }

  if (result.sessionId !== game.sessionId) {
    return "Game session does not match";
  }

  if (result.gameId !== game.gameId) {
    return "Game ID does not match";
  }

  if (!Array.isArray(result.players)) {
    return "Invalid player results";
  }

  if (result.players.length !== game.playerIds.length) {
    return "Player count does not match the session";
  }

  if (
    !Number.isFinite(result.durationMs) ||
    result.durationMs < 0 ||
    result.durationMs > 60 * 60 * 1000
  ) {
    return "Invalid game duration";
  }

  const submittedPlayerIds = new Set();

  for (const player of result.players) {
    if (!game.playerIds.includes(player.playerId)) {
      return "Unknown player in game results";
    }

    if (submittedPlayerIds.has(player.playerId)) {
      return "Duplicate player in game results";
    }

    submittedPlayerIds.add(player.playerId);

    if (
      !Number.isFinite(player.score) ||
      !Number.isFinite(player.accuracy) ||
      player.accuracy < 0 ||
      player.accuracy > 100
    ) {
      return "Invalid player score or accuracy";
    }

    for (const field of ["perfect", "good", "misses", "incorrect"]) {
      if (!Number.isInteger(player[field]) || player[field] < 0) {
        return `Invalid ${field} count`;
      }
    }

    if (
      !Array.isArray(player.inputEvents) ||
      player.inputEvents.length > 20000
    ) {
      return "Invalid input event log";
    }

    for (const event of player.inputEvents) {
      if (
        !Number.isFinite(event.atMs) ||
        event.atMs < 0 ||
        event.atMs > result.durationMs
      ) {
        return "Invalid input event timestamp";
      }
    }
  }

  return null;
}

io.on("connection", (socket) => {
  console.log("Device connected:", socket.id);

  // ----------------------------------
  // HOST REGISTRATION
  // ----------------------------------

  socket.on("host:register", (data = {}, callback) => {
    const code = String(data.roomCode || "").trim().toUpperCase();

    if (!code) {
      return sendError(callback, "Invalid room code");
    }

    let room = getRoom(code);

    if (!room) {
      room = createRoom();
      rooms.set(code, room);
    }

    if (room.hostId && room.hostId !== socket.id) {
      return sendError(callback, "This room already has an active host");
    }

    room.hostId = socket.id;

    socket.join(code);
    socket.data.roomCode = code;
    socket.data.role = "host";

    callback?.({
      success: true,
      players: getPlayers(room),
      game: room.game,
    });

    console.log(`Host registered for room ${code}`);
  });

  // ----------------------------------
  // PLAYER JOIN
  // ----------------------------------

  socket.on("player:join", (data = {}, callback) => {
    const code = String(data.roomCode || "").trim().toUpperCase();
    const name = String(data.nickname || "").trim();

    const room = getRoom(code);

    if (!room || !room.hostId) {
      return sendError(callback, "This room is not currently available");
    }

    if (room.game?.status === "playing") {
      return sendError(callback, "A game is already in progress");
    }

    if (!name || name.length > 16) {
      return sendError(
        callback,
        "Enter a nickname between 1 and 16 characters"
      );
    }

    const existingPlayer = getPlayers(room).find(
      (player) => player.nickname.toLowerCase() === name.toLowerCase()
    );

    if (existingPlayer) {
      return sendError(callback, "That nickname is already taken");
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
    console.log(`Player socket: ${socket.id}`);
  });

  // ----------------------------------
  // GAME START
  // ----------------------------------

  socket.on("game:start", (data = {}, callback) => {
    if (socket.data.role !== "host") {
      return sendError(callback, "Only the host can start a game");
    }

    const code = socket.data.roomCode;
    const room = getRoom(code);

    if (!room) {
      return sendError(callback, "Room not found");
    }

    const gameId = String(data.gameId || "").trim();

    if (!ALLOWED_GAMES.includes(gameId)) {
      return sendError(callback, "Invalid game selection");
    }

    if (room.game?.status === "playing") {
      return sendError(callback, "A game is already running");
    }

    const players = getPlayers(room);

    if (players.length === 0) {
      return sendError(
        callback,
        "At least one player must join first"
      );
    }

    const sessionId = randomUUID();

    const game = {
      sessionId,
      gameId,
      status: "playing",
      startedAt: Date.now(),
      playerIds: players.map((player) => player.id),
    };

    room.game = game;

    // Keep the payload explicit and consistent with Join.tsx.
    const publicGame = {
      sessionId: game.sessionId,
      gameId: game.gameId,
      status: game.status,
      startedAt: game.startedAt,
      playerIds: [...game.playerIds],
      players: players.map((player) => ({
        id: player.id,
        nickname: player.nickname,
        connected: player.connected,
      })),
    };

    console.log("----------------------------------");
    console.log(`Starting ${gameId} in room ${code}`);
    console.log(`Session: ${sessionId}`);
    console.log(`Players to notify: ${players.length}`);

    // Explicitly notify the host.
    io.to(socket.id).emit("game:started", publicGame);
    console.log("Start event sent to host:", socket.id);

    // Explicitly notify each player.
    for (const player of players) {
      const playerSocket = io.sockets.sockets.get(player.id);

      if (playerSocket?.connected) {
        io.to(player.id).emit("game:started", publicGame);
        console.log(
          `Start event sent to player: ${player.nickname} (${player.id})`
        );
      } else {
        console.log(
          `Player is disconnected: ${player.nickname} (${player.id})`
        );
      }
    }

    callback?.({
      success: true,
      game: publicGame,
    });

    console.log(`Game successfully started in room ${code}`);
    console.log("----------------------------------");
  });

  // ----------------------------------
  // CONTROLLER INPUT RELAY
  // ----------------------------------

  socket.on("game:input", (input, callback) => {
    if (socket.data.role !== "player") {
      return sendError(
        callback,
        "Only connected players can send game inputs"
      );
    }

    const code = socket.data.roomCode;
    const room = getRoom(code);
    const game = room?.game;

    if (!game || game.status !== "playing") {
      return sendError(callback, "No active game");
    }

    if (!game.playerIds.includes(socket.id)) {
      return sendError(callback, "You are not part of this game");
    }

    if (
      !input ||
      typeof input !== "object" ||
      Array.isArray(input)
    ) {
      return sendError(callback, "Invalid game input");
    }

    // The display receives the input and handles gameplay.
    io.to(room.hostId).emit("game:input", {
      sessionId: game.sessionId,
      gameId: game.gameId,
      playerId: socket.id,
      nickname: room.players.get(socket.id)?.nickname,
      input,
      receivedAt: Date.now(),
    });

    callback?.({ success: true });
  });

  // ----------------------------------
  // GAME RESULT SUBMISSION
  // ----------------------------------

  socket.on("game:result:submit", (result, callback) => {
    if (socket.data.role !== "host") {
      return sendError(
        callback,
        "Only the display host can submit game results"
      );
    }

    const code = socket.data.roomCode;
    const room = getRoom(code);
    const game = room?.game;

    if (!game || game.status !== "playing") {
      return sendError(callback, "No active game session");
    }

    if (game.resultSubmitted) {
      return sendError(
        callback,
        "Results have already been submitted"
      );
    }

    const validationError = validateGameResult(result, game);

    if (validationError) {
      return sendError(callback, validationError);
    }

    game.status = "finished";
    game.resultSubmitted = true;

    game.result = {
      ...result,
      acceptedAt: Date.now(),
    };

    const acceptedResult = {
      sessionId: game.sessionId,
      gameId: game.gameId,
      players: result.players,
      durationMs: result.durationMs,
    };

    io.to(code).emit("game:result:accepted", acceptedResult);
    io.to(code).emit("game:ended");

    callback?.({
      success: true,
      message: "Game result accepted",
      sessionId: game.sessionId,
    });

    console.log(`Results accepted for ${game.gameId} in room ${code}`);
  });

  // ----------------------------------
  // MANUAL GAME END
  // ----------------------------------

  socket.on("game:end", (callback) => {
    if (socket.data.role !== "host") {
      return sendError(callback, "Only the host can end a game");
    }

    const code = socket.data.roomCode;
    const room = getRoom(code);

    if (!room || !room.game) {
      return sendError(callback, "No active game found");
    }

    if (room.game.status !== "playing") {
      return sendError(callback, "Game is not currently running");
    }

    room.game.status = "ended";
    room.game.endedAt = Date.now();

    io.to(code).emit("game:ended");

    callback?.({ success: true });

    console.log(`Game ended in room ${code}`);
  });

  // ----------------------------------
  // PLAYER KICK
  // ----------------------------------

  socket.on("player:kick", (data = {}, callback) => {
    if (socket.data.role !== "host") {
      return sendError(
        callback,
        "Only the host can remove players"
      );
    }

    const code = socket.data.roomCode;
    const room = getRoom(code);

    if (!room) {
      return sendError(callback, "Room not found");
    }

    const player = room.players.get(data.playerId);

    if (!player) {
      return sendError(callback, "Player not found");
    }

    room.players.delete(data.playerId);

    if (room.game?.status === "playing") {
      room.game.playerIds = room.game.playerIds.filter(
        (id) => id !== data.playerId
      );
    }

    const playerSocket = io.sockets.sockets.get(data.playerId);

    if (playerSocket) {
      playerSocket.emit("player:kicked", {
        message: "The host removed you from this room.",
      });

      playerSocket.disconnect(true);
    }

    io.to(socket.id).emit("player:left", player);

    callback?.({ success: true });

    console.log(`${player.nickname} was kicked from room ${code}`);
  });

  // ----------------------------------
  // DISCONNECTION
  // ----------------------------------

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

        if (room.game?.status === "playing") {
          room.game.playerIds = room.game.playerIds.filter(
            (id) => id !== socket.id
          );
        }

        if (room.hostId) {
          io.to(room.hostId).emit("player:left", player);
        }

        console.log(`${player.nickname} disconnected`);
      }
    }

    if (role === "host" && room.hostId === socket.id) {
      room.hostId = null;

      if (room.game?.status === "playing") {
        room.game.status = "paused";
      }

      console.log(`Host disconnected from room ${code}`);
    }

    if (!room.hostId && room.players.size === 0) {
      rooms.delete(code);
    }
  });
});

// ----------------------------------
// HEALTH CHECK
// ----------------------------------

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "playverse-server",
    activeRooms: rooms.size,
    uptime: process.uptime(),
  });
});

// ----------------------------------
// START SERVER
// ----------------------------------

httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`Playverse server running on port ${PORT}`);
});
