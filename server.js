
  import express from "express";
  import { createServer } from "http";
  import { randomUUID } from "crypto";
  import { Server } from "socket.io";
  import cors from "cors";

  const app = express();
  app.use(cors());
  app.use(express.json());

  const httpServer = createServer(app);

  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  const PORT = process.env.PORT || 3001;
  const rooms = new Map();
  const GAME_START_DELAY = 3000;
  const MAX_PLAYERS = 8;

  // --------------------------------------------------
  // ROOM HELPERS
  // --------------------------------------------------

  function generateRoomCode() {
    const characters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";

    for (let i = 0; i < 6; i++) {
      code += characters.charAt(
        Math.floor(Math.random() * characters.length)
      );
    }

    return code;
  }

  function createRoom(hostId) {
    let roomCode = generateRoomCode();

    while (rooms.has(roomCode)) {
      roomCode = generateRoomCode();
    }

    const room = {
      code: roomCode,
      hostId,
      hostRemoteId: null,
      pairingToken: randomUUID(),
      players: new Map(),
      game: null,
      createdAt: Date.now(),
    };

    rooms.set(roomCode, room);
    return room;
  }

  function getRoom(roomCode) {
    if (!roomCode) return null;
    return rooms.get(roomCode.toUpperCase()) || null;
  }

  function getPlayers(room) {
    return Array.from(room.players.values()).filter(
      (player) => player.connected
    );
  }

  function getPublicPlayers(room) {
    return getPlayers(room).map((player) => ({
      id: player.id,
      nickname: player.nickname,
      connected: player.connected,
      isHost: Boolean(player.isHost),
    }));
  }

  function emitPlayersUpdate(room) {
    io.to(room.hostId).emit("players:update", {
      players: getPublicPlayers(room),
    });
  }

  function deleteRoom(roomCode) {
    const room = rooms.get(roomCode);
    if (!room) return;

    rooms.delete(roomCode);
    io.to(roomCode).emit("room:closed");
  }

  // --------------------------------------------------
  // HEALTH CHECK
  // --------------------------------------------------

  app.get("/", (req, res) => {
    res.json({
      status: "online",
      service: "Playverse Server",
      rooms: rooms.size,
    });
  });

  // --------------------------------------------------
  // SOCKET CONNECTION
  // --------------------------------------------------

  io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);

    // --------------------------------------------------
    // HOST REGISTRATION
    // --------------------------------------------------

    socket.on("host:register", (callback) => {
      const room = createRoom(socket.id);

      socket.join(room.code);
      socket.data.role = "host";
      socket.data.roomCode = room.code;

      console.log("Host registered:", room.code);

      if (typeof callback === "function") {
        callback({
          success: true,
          roomCode: room.code,
          pairingToken: room.pairingToken,
          players: getPublicPlayers(room),
        });
      }
    });

    // --------------------------------------------------
    // HOST REMOTE PAIRING
    // --------------------------------------------------

    socket.on("host-remote:pair", ({ roomCode, pairingToken }, callback) => {
      const room = getRoom(roomCode);

      if (!room) {
        return callback?.({
          success: false,
          message: "Room not found",
        });
      }

      if (room.pairingToken !== pairingToken) {
        return callback?.({
          success: false,
          message: "Invalid pairing token",
        });
      }

      if (room.hostRemoteId && room.hostRemoteId !== socket.id) {
        return callback?.({
          success: false,
          message: "A host remote is already connected",
        });
      }

      room.hostRemoteId = socket.id;
      socket.join(room.code);

      socket.data.role = "hostRemote";
      socket.data.roomCode = room.code;

      // Register the host remote as a player too.
      // The socket retains its hostRemote role.
      const hostPlayer = {
        id: socket.id,
        nickname: "Host",
        connected: true,
        isHost: true,
      };

      room.players.set(socket.id, hostPlayer);

      io.to(room.hostId).emit("host-remote:connected", {
        remoteId: socket.id,
      });

      io.to(room.hostId).emit("player:joined", {
        player: hostPlayer,
      });

      emitPlayersUpdate(room);

      callback?.({
        success: true,
        roomCode: room.code,
        players: getPublicPlayers(room),
        game: room.game,
      });

      console.log("Host remote paired:", room.code);
    });

    // --------------------------------------------------
    // HOST REMOTE NAVIGATION
    // --------------------------------------------------

    socket.on("remote:navigate", ({ action }) => {
      if (socket.data.role !== "hostRemote") return;

      const room = getRoom(socket.data.roomCode);
      if (!room) return;
      if (room.hostRemoteId !== socket.id) return;

      if (action !== "back" && action !== "home") return;

      io.to(room.hostId).emit("remote:navigate", {
        action,
      });
    });

    // --------------------------------------------------
    // HOST REMOTE CURSOR
    // --------------------------------------------------

    

  socket.on("remote:cursor", (data = {}, callback) => {
    if (socket.data.role !== "hostRemote") {
      return callback?.({
        success: false,
        message: "Invalid remote",
      });
    }

    const room = getRoom(socket.data.roomCode);

    if (!room || room.hostRemoteId !== socket.id) {
      return callback?.({
        success: false,
        message: "Remote is not paired",
      });
    }

    if (data.type === "move") {
      const { dx, dy } = data;

      if (
        typeof dx !== "number" ||
        typeof dy !== "number" ||
        !Number.isFinite(dx) ||
        !Number.isFinite(dy) ||
        Math.abs(dx) > 1 ||
        Math.abs(dy) > 1
      ) {
        return callback?.({
          success: false,
          message: "Invalid movement",
        });
      }

      io.to(room.hostId).emit("remote:cursor", {
        type: "move",
        dx,
        dy,
      });

      return callback?.({ success: true });
    }

    if (data.type === "click") {
      io.to(room.hostId).emit("remote:cursor", {
        type: "click",
      });

      return callback?.({ success: true });
    }

    callback?.({
      success: false,
      message: "Unknown cursor event",
    });
  });



    // --------------------------------------------------
    // PLAYER JOIN
    // --------------------------------------------------

    socket.on("player:join", ({ roomCode, nickname }, callback) => {
      const room = getRoom(roomCode);

      if (!room) {
        return callback?.({
          success: false,
          message: "Room not found",
        });
      }

      if (!nickname || !nickname.trim()) {
        return callback?.({
          success: false,
          message: "Please enter a nickname",
        });
      }

      if (room.players.size >= MAX_PLAYERS) {
        return callback?.({
          success: false,
          message: "Room is full",
        });
      }

      const normalizedNickname = nickname.trim().toLowerCase();

      const duplicate = getPlayers(room).some(
        (player) =>
          player.nickname.trim().toLowerCase() === normalizedNickname
      );

      if (duplicate) {
        return callback?.({
          success: false,
          message: "Nickname already taken",
        });
      }

      const player = {
        id: socket.id,
        nickname: nickname.trim(),
        connected: true,
        isHost: false,
      };

      room.players.set(socket.id, player);
      socket.join(room.code);

      socket.data.role = "player";
      socket.data.roomCode = room.code;

      io.to(room.hostId).emit("player:joined", {
        player,
      });

      emitPlayersUpdate(room);

      callback?.({
        success: true,
        player,
        roomCode: room.code,
      });

      console.log(`${player.nickname} joined ${room.code}`);
    });

    // --------------------------------------------------
    // PLAYER LEAVE
    // --------------------------------------------------

    socket.on("player:leave", () => {
      if (socket.data.role !== "player") return;

      const room = getRoom(socket.data.roomCode);
      if (!room) return;

      const player = room.players.get(socket.id);
      if (!player) return;

      room.players.delete(socket.id);

      if (room.game) {
        room.game.playerIds = room.game.playerIds.filter(
          (id) => id !== socket.id
        );
      }

      io.to(room.hostId).emit("player:left", {
        playerId: socket.id,
      });

      emitPlayersUpdate(room);

      socket.leave(room.code);
      socket.data.role = null;
      socket.data.roomCode = null;
    });

    // --------------------------------------------------
    // GAME START
    // --------------------------------------------------

    socket.on("game:start", ({ gameId, config }, callback) => {
      if (socket.data.role !== "host") {
        return callback?.({
          success: false,
          message: "Only the host can start a game",
        });
      }

      const room = getRoom(socket.data.roomCode);

      if (!room) {
        return callback?.({
          success: false,
          message: "Room not found",
        });
      }

      if (room.game) {
        return callback?.({
          success: false,
          message: "A game is already running",
        });
      }

      const players = getPlayers(room);

      if (players.length === 0) {
        return callback?.({
          success: false,
          message: "At least one player is required",
        });
      }

      const sessionId = randomUUID();
      const startTime = Date.now() + GAME_START_DELAY;

      const game = {
        gameId,
        sessionId,
        startTime,
        playerIds: players.map((player) => player.id),
        config: config || {},
        startedAt: Date.now(),
        status: "running",
        results: new Map(),
      };

      // Rhythm Rush chart generation.
      if (gameId === "rhythm-rush") {
        const chart = [];
        const beatInterval = 60000 / (config?.bpm || 120);
        const totalNotes = config?.totalNotes || 40;

        for (let i = 0; i < totalNotes; i++) {
          chart.push({
            id: i,
            lane: Math.floor(Math.random() * 4),
            time: i * beatInterval,
          });
        }

        game.chart = chart;
      }

      room.game = game;

      const gamePayload = {
        gameId: game.gameId,
        sessionId: game.sessionId,
        startTime: game.startTime,
        config: game.config,
        players: getPublicPlayers(room),
        chart: game.chart,
      };

      // Notify TV host.
      io.to(room.hostId).emit("game:started", gamePayload);

      // Notify every player, including the host remote.
      for (const player of players) {
        io.to(player.id).emit("game:started", gamePayload);
      }

      callback?.({
        success: true,
        sessionId,
        startTime,
      });

      console.log(
        `Game ${gameId} started in ${room.code} with ${players.length} players`
      );
    });

    // --------------------------------------------------
    // GAME INPUT
    // --------------------------------------------------

    socket.on("game:input", (input) => {
      const role = socket.data.role;

      // Both regular players and the host remote can send game inputs.
      if (role !== "player" && role !== "hostRemote") return;

      const room = getRoom(socket.data.roomCode);

      if (!room || !room.game) return;
      if (room.game.status !== "running") return;
      if (!room.game.playerIds.includes(socket.id)) return;

      io.to(room.hostId).emit("game:input", {
        playerId: socket.id,
        input,
      });
    });

    // --------------------------------------------------
    // GAME RESULT SUBMISSION
    // --------------------------------------------------

    socket.on("game:result:submit", (result, callback) => {
      if (socket.data.role !== "host") {
        return callback?.({
          success: false,
          message: "Only the host can submit results",
        });
      }

      const room = getRoom(socket.data.roomCode);

      if (!room || !room.game) {
        return callback?.({
          success: false,
          message: "No active game",
        });
      }

      const game = room.game;

      if (game.status !== "running") {
        return callback?.({
          success: false,
          message: "Game is not running",
        });
      }

      const playerId = result?.playerId;

      if (!game.playerIds.includes(playerId)) {
        return callback?.({
          success: false,
          message: "Invalid player",
        });
      }

      game.results.set(playerId, result);

      io.to(playerId).emit("game:result:accepted", {
        sessionId: game.sessionId,
      });

      callback?.({
        success: true,
      });
    });

    // --------------------------------------------------
    // GAME END
    // --------------------------------------------------

    socket.on("game:end", (callback) => {
      if (socket.data.role !== "host") {
        return callback?.({
          success: false,
          message: "Only the host can end the game",
        });
      }

      const room = getRoom(socket.data.roomCode);

      if (!room || !room.game) {
        return callback?.({
          success: false,
          message: "No active game",
        });
      }

      const game = room.game;
      game.status = "ended";

      io.to(room.code).emit("game:ended", {
        gameId: game.gameId,
        sessionId: game.sessionId,
      });

      room.game = null;

      callback?.({
        success: true,
      });

      console.log(`Game ended in ${room.code}`);
    });

    // --------------------------------------------------
    // PLAYER KICK
    // --------------------------------------------------

    socket.on("player:kick", ({ playerId }, callback) => {
      if (socket.data.role !== "host") {
        return callback?.({
          success: false,
          message: "Only the host can kick players",
        });
      }

      const room = getRoom(socket.data.roomCode);

      if (!room) {
        return callback?.({
          success: false,
          message: "Room not found",
        });
      }

      if (playerId === room.hostRemoteId) {
        return callback?.({
          success: false,
          message: "Cannot kick the host remote",
        });
      }

      const player = room.players.get(playerId);

      if (!player) {
        return callback?.({
          success: false,
          message: "Player not found",
        });
      }

      room.players.delete(playerId);

      if (room.game) {
        room.game.playerIds = room.game.playerIds.filter(
          (id) => id !== playerId
        );
      }

      io.to(playerId).emit("player:kicked");

      const playerSocket = io.sockets.sockets.get(playerId);

      if (playerSocket) {
        playerSocket.leave(room.code);
        playerSocket.data.role = null;
        playerSocket.data.roomCode = null;
      }

      io.to(room.hostId).emit("player:left", {
        playerId,
      });

      emitPlayersUpdate(room);

      callback?.({
        success: true,
      });
    });

    // --------------------------------------------------
    // ROOM STATE REQUEST
    // --------------------------------------------------

    socket.on("room:state", (callback) => {
      const room = getRoom(socket.data.roomCode);

      if (!room) {
        return callback?.({
          success: false,
          message: "Room not found",
        });
      }

      callback?.({
        success: true,
        roomCode: room.code,
        players: getPublicPlayers(room),
        game: room.game
          ? {
              gameId: room.game.gameId,
              sessionId: room.game.sessionId,
              startTime: room.game.startTime,
              status: room.game.status,
            }
          : null,
        remoteConnected: Boolean(room.hostRemoteId),
      });
    });

    // --------------------------------------------------
    // DISCONNECT
    // --------------------------------------------------

    socket.on("disconnect", () => {
      console.log("Socket disconnected:", socket.id);

      const role = socket.data.role;
      const roomCode = socket.data.roomCode;
      const room = getRoom(roomCode);

      if (!room) return;

      // HOST REMOTE DISCONNECT
      if (role === "hostRemote") {
        if (room.hostRemoteId === socket.id) {
          room.hostRemoteId = null;
        }

        const hostPlayer = room.players.get(socket.id);
        room.players.delete(socket.id);

        if (room.game) {
          room.game.playerIds = room.game.playerIds.filter(
            (id) => id !== socket.id
          );
        }

        io.to(room.hostId).emit("host-remote:disconnected");

        if (hostPlayer) {
          io.to(room.hostId).emit("player:left", {
            playerId: socket.id,
          });
        }

        emitPlayersUpdate(room);

        console.log("Host remote disconnected:", room.code);
        return;
      }

      // NORMAL PLAYER DISCONNECT
      if (role === "player") {
        const player = room.players.get(socket.id);
        room.players.delete(socket.id);

        if (room.game) {
          room.game.playerIds = room.game.playerIds.filter(
            (id) => id !== socket.id
          );
        }

        if (player) {
          io.to(room.hostId).emit("player:left", {
            playerId: socket.id,
          });
        }

        emitPlayersUpdate(room);

        console.log("Player disconnected:", socket.id);
        return;
      }

      // HOST DISCONNECT
      if (role === "host") {
        if (room.hostRemoteId) {
          io.to(room.hostRemoteId).emit("room:closed");
        }

        io.to(room.code).emit("room:closed");
        deleteRoom(room.code);

        console.log("Host disconnected. Room deleted:", roomCode);
        return;
      }
    });
  });

  // --------------------------------------------------
  // SERVER START
  // --------------------------------------------------

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Playverse server running on port ${PORT}`);
  });
