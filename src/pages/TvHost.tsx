
import { useState, useEffect, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  Gamepad2,
  ShieldCheck,
  UserRound,
  UserX,
  Check,
  Play,
  CheckCircle2,
} from "lucide-react";
import { io, type Socket } from "socket.io-client";

interface Player {
  id: string;
  nickname: string;
  connected: boolean;
}

interface KickResponse {
  success: boolean;
  error?: string;
}

interface GameResponse {
  success: boolean;
  error?: string;
  game?: {
    sessionId?: string;
    gameId: string;
    status: string;
    startedAt: number;
  };
}

interface ControllerInput {
  sessionId: string;
  gameId: string;
  playerId: string;
  nickname?: string;
  input: {
    type?: string;
    lane?: number;
  };
  receivedAt: number;
}

const availableGames = [
  {
    id: "fruit-frenzy",
    name: "Fruit Frenzy",
    category: "ARCADE",
    description: "Slice, score and beat your opponents.",
    icon: "🍉",
  },
  {
    id: "sword-clash",
    name: "Sword Clash",
    category: "ACTION",
    description: "Compete in fast-paced sword battles.",
    icon: "⚔️",
  },
  {
    id: "rhythm-rush",
    name: "Rhythm Rush",
    category: "MUSIC",
    description: "Hit the beats and master the rhythm.",
    icon: "🎵",
  },
  {
    id: "reflex-wars",
    name: "Reflex Wars",
    category: "COMPETITION",
    description: "Test your reaction speed against others.",
    icon: "⚡",
  },
];

const laneNames = [
  "AMETHYST",
  "ROSE",
  "APRICOT",
  "AQUA",
];

function generateRoomCode() {
  return Math.random().toString(36).substring(2, 6).toUpperCase();
}

export default function TvHost() {
  const [roomCode] = useState(() => {
    const existingRoom = localStorage.getItem("playverse_room_code");

    if (existingRoom) return existingRoom;

    const newRoom = generateRoomCode();
    localStorage.setItem("playverse_room_code", newRoom);

    return newRoom;
  });

  const [players, setPlayers] = useState<Player[]>([]);
  const [kickError, setKickError] = useState("");

  const [selectedGame, setSelectedGame] = useState<string | null>(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameError, setGameError] = useState("");
  const [startingGame, setStartingGame] = useState(false);

  const [lastControllerInput, setLastControllerInput] =
    useState<ControllerInput | null>(null);

  const socketRef = useRef<Socket | null>(null);

  const joinUrl = `${window.location.origin}/join/${roomCode}`;

  // ----------------------------------
  // SOCKET CONNECTION
  // ----------------------------------

  useEffect(() => {
    const socket = io(
      `http://${window.location.hostname}:3001`
    );

    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit(
        "host:register",
        { roomCode },
        (response: {
          success: boolean;
          error?: string;
          players?: Player[];
        }) => {
          if (response?.success) {
            setPlayers(response.players || []);
            console.log("Host registered successfully");
          } else {
            console.error(response?.error);
            setGameError(
              response?.error || "Unable to register host."
            );
          }
        }
      );
    });

    socket.on("connect_error", (error) => {
      console.error("Host connection error:", error.message);
      setGameError("Unable to connect to the Playverse server.");
    });

    // A player joins the room.
    socket.on("player:joined", (player: Player) => {
      setPlayers((current) => {
        if (current.some((p) => p.id === player.id)) {
          return current;
        }

        return [...current, player];
      });
    });

    // A player leaves or is removed.
    socket.on("player:left", (player: Player) => {
      setPlayers((current) =>
        current.filter((p) => p.id !== player.id)
      );
    });

    // Game starts.
    socket.on("game:started", (game: GameResponse["game"]) => {
      console.log("Game started:", game);

      setGameStarted(true);
      setGameError("");
      setLastControllerInput(null);
    });

    // Receive controller input from the backend.
    socket.on("game:input", (event: ControllerInput) => {
      console.log("Controller input received:", event);

      setLastControllerInput(event);
    });

    // Game ends.
    socket.on("game:ended", () => {
      setGameStarted(false);
      setStartingGame(false);
      setGameError("");
      setLastControllerInput(null);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [roomCode]);

  // ----------------------------------
  // KICK PLAYER
  // ----------------------------------

  const handleKick = (player: Player) => {
    setKickError("");

    socketRef.current?.emit(
      "player:kick",
      { playerId: player.id },
      (response: KickResponse) => {
        if (!response?.success) {
          setKickError(
            response?.error || "Unable to remove player."
          );
        }
      }
    );
  };

  // ----------------------------------
  // START GAME
  // ----------------------------------

  const handleStartGame = () => {
    if (!selectedGame || gameStarted || startingGame) {
      return;
    }

    const socket = socketRef.current;

    if (!socket?.connected) {
      setGameError(
        "Host is disconnected from the server. Please refresh."
      );
      return;
    }

    setGameError("");
    setLastControllerInput(null);
    setStartingGame(true);

    socket.timeout(5000).emit(
      "game:start",
      { gameId: selectedGame },
      (
        timeoutError: Error | null,
        response: GameResponse
      ) => {
        setStartingGame(false);

        if (timeoutError) {
          setGameError(
            "The server did not respond. Please try again."
          );
          return;
        }

        if (response?.success) {
          setGameStarted(true);
          console.log("Game started:", response.game);
        } else {
          setGameError(
            response?.error || "Unable to start the game."
          );
        }
      }
    );
  };

  const selectedGameDetails = availableGames.find(
    (game) => game.id === selectedGame
  );

  const laneNumber =
    lastControllerInput?.input.lane;

  const validLane =
    typeof laneNumber === "number" &&
    Number.isInteger(laneNumber) &&
    laneNumber >= 0 &&
    laneNumber < 4;

  // ----------------------------------
  // DISPLAY
  // ----------------------------------

  return (
    <main className="tv-host-page">
      <header className="tv-host-header">
        <div className="tv-host-brand">
          <Gamepad2 size={30} />
          <span>
            PLAYVERSE<span className="brand-dot">.</span>
          </span>
        </div>

        <div className="host-status">
          <span className="status-dot" />
          HOST ACTIVE
        </div>
      </header>

      {/* ROOM PAIRING */}

      <section className="tv-pairing-center">
        <div className="room-code-label">
          YOUR ROOM CODE
        </div>

        <div className="room-code">
          {roomCode.split("").join(" ")}
        </div>

        <div className="qr-container">
          <QRCodeSVG
            value={joinUrl}
            size={250}
            level="H"
            includeMargin
          />
        </div>
      </section>

      <footer className="tv-host-bottom">
        <h1>Ready to play?</h1>

        <p>
          Scan the QR code with your phone to join the game.
        </p>

        <div className="tv-host-info">
          <div>
            <ShieldCheck size={19} />
            <span>You're the Host</span>
          </div>
        </div>

        {/* PLAYER LOBBY */}

        <section
          className="player-lobby"
          style={{
            width: "min(680px, 92vw)",
            margin: "32px auto 0",
            textAlign: "left",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "16px",
            }}
          >
            <div>
              <h2 style={{ margin: 0, fontSize: "18px" }}>
                Players in room
              </h2>

              <span style={{ color: "#aaa", fontSize: "13px" }}>
                Manage the players connected to your session
              </span>
            </div>

            <div
              style={{
                padding: "7px 12px",
                borderRadius: "20px",
                background: "rgba(157, 111, 255, 0.14)",
                color: "#b99aff",
                fontSize: "13px",
                fontWeight: 700,
              }}
            >
              {players.length}{" "}
              {players.length === 1 ? "PLAYER" : "PLAYERS"}
            </div>
          </div>

          {players.length === 0 ? (
            <div
              style={{
                padding: "24px",
                border: "1px dashed rgba(180, 150, 255, 0.3)",
                borderRadius: "14px",
                color: "#aaa",
                textAlign: "center",
              }}
            >
              Waiting for players to join...
            </div>
          ) : (
            <div style={{ display: "grid", gap: "10px" }}>
              {players.map((player, index) => (
                <div
                  key={player.id}
                  className="player-card"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "14px",
                    padding: "14px 16px",
                    borderRadius: "14px",
                    border: "1px solid rgba(180, 150, 255, 0.2)",
                    background: "rgba(255, 255, 255, 0.035)",
                  }}
                >
                  <div
                    style={{
                      width: "42px",
                      height: "42px",
                      borderRadius: "12px",
                      background: "rgba(157, 111, 255, 0.15)",
                      color: "#b99aff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <UserRound size={21} />
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <strong
                      style={{
                        display: "block",
                        fontSize: "15px",
                      }}
                    >
                      {player.nickname}
                    </strong>

                    <span
                      style={{
                        color: "#8fce9d",
                        fontSize: "12px",
                      }}
                    >
                      {player.connected
                        ? "Connected"
                        : "Disconnected"}
                      {" · "}Player {index + 1}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleKick(player)}
                    title={`Remove ${player.nickname}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "7px",
                      padding: "9px 12px",
                      borderRadius: "9px",
                      border: "1px solid rgba(255, 100, 110, 0.25)",
                      background: "rgba(255, 75, 85, 0.09)",
                      color: "#ff858c",
                      cursor: "pointer",
                      fontSize: "13px",
                      fontWeight: 600,
                    }}
                  >
                    <UserX size={16} />
                    Kick
                  </button>
                </div>
              ))}
            </div>
          )}

          {kickError && (
            <p style={{ color: "#ff858c", fontSize: "13px" }}>
              {kickError}
            </p>
          )}
        </section>

        {/* GAME SELECTION */}

        <section
          style={{
            width: "min(680px, 92vw)",
            margin: "40px auto 20px",
            textAlign: "left",
          }}
        >
          <div style={{ marginBottom: "18px" }}>
            <h2 style={{ margin: 0, fontSize: "20px" }}>
              Choose your game
            </h2>

            <p style={{ color: "#aaa", fontSize: "13px" }}>
              Select a game to prepare your session.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: "12px",
            }}
          >
            {availableGames.map((game) => {
              const isSelected = selectedGame === game.id;

              return (
                <button
                  key={game.id}
                  type="button"
                  disabled={gameStarted || startingGame}
                  onClick={() => setSelectedGame(game.id)}
                  style={{
                    padding: "18px",
                    borderRadius: "15px",
                    textAlign: "left",
                    cursor:
                      gameStarted || startingGame
                        ? "not-allowed"
                        : "pointer",
                    border: isSelected
                      ? "2px solid #a47aff"
                      : "1px solid rgba(180, 150, 255, 0.2)",
                    background: isSelected
                      ? "rgba(157, 111, 255, 0.15)"
                      : "rgba(255, 255, 255, 0.035)",
                    color: "white",
                    transition: "all 0.2s ease",
                    opacity: gameStarted ? 0.65 : 1,
                  }}
                >
                  <div
                    style={{
                      fontSize: "30px",
                      marginBottom: "12px",
                    }}
                  >
                    {game.icon}
                  </div>

                  <div
                    style={{
                      fontSize: "10px",
                      letterSpacing: "1.5px",
                      color: "#b99aff",
                      marginBottom: "6px",
                    }}
                  >
                    {game.category}
                  </div>

                  <strong style={{ fontSize: "16px" }}>
                    {game.name}
                  </strong>

                  <p
                    style={{
                      color: "#aaa",
                      fontSize: "12px",
                      lineHeight: 1.5,
                      margin: "7px 0 0",
                    }}
                  >
                    {game.description}
                  </p>

                  {isSelected && (
                    <div
                      style={{
                        marginTop: "12px",
                        color: "#b99aff",
                        fontSize: "12px",
                        fontWeight: 700,
                      }}
                    >
                      <Check
                        size={14}
                        style={{
                          display: "inline",
                          verticalAlign: "middle",
                          marginRight: "5px",
                        }}
                      />
                      SELECTED
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* SELECTED GAME SUMMARY */}

          <div
            style={{
              marginTop: "18px",
              padding: "18px",
              borderRadius: "13px",
              background: "rgba(255, 255, 255, 0.04)",
              border: "1px solid rgba(180, 150, 255, 0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
            }}
          >
            <div>
              <strong style={{ fontSize: "15px" }}>
                {selectedGameDetails
                  ? selectedGameDetails.name
                  : "No game selected"}
              </strong>

              <p
                style={{
                  color: "#aaa",
                  fontSize: "12px",
                  margin: "5px 0 0",
                }}
              >
                {selectedGameDetails
                  ? "Your game is ready to launch."
                  : "Choose a game to continue."}
              </p>
            </div>

            <span
              style={{
                color: gameStarted
                  ? "#8fce9d"
                  : selectedGame
                    ? "#b99aff"
                    : "#777",
                fontSize: "12px",
                fontWeight: 700,
              }}
            >
              {gameStarted
                ? "PLAYING"
                : selectedGame
                  ? "READY"
                  : "WAITING"}
            </span>
          </div>

          {/* START GAME */}

          <button
            type="button"
            onClick={handleStartGame}
            disabled={
              !selectedGame || gameStarted || startingGame
            }
            style={{
              width: "100%",
              marginTop: "14px",
              padding: "16px",
              borderRadius: "12px",
              border: "none",
              background:
                selectedGame && !gameStarted
                  ? "linear-gradient(135deg, #8955e8, #6336bc)"
                  : "rgba(255, 255, 255, 0.07)",
              color:
                selectedGame && !gameStarted ? "white" : "#777",
              fontSize: "14px",
              fontWeight: 700,
              letterSpacing: "1px",
              cursor:
                selectedGame && !gameStarted && !startingGame
                  ? "pointer"
                  : "not-allowed",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "9px",
            }}
          >
            {gameStarted ? (
              <>
                <CheckCircle2 size={17} />
                GAME STARTED
              </>
            ) : (
              <>
                <Play size={17} />
                {startingGame ? "STARTING GAME..." : "START GAME"}
              </>
            )}
          </button>

          {gameError && (
            <p
              role="alert"
              style={{
                color: "#ff858c",
                fontSize: "13px",
                marginTop: "10px",
              }}
            >
              {gameError}
            </p>
          )}

          {/* TEMPORARY CONTROLLER INPUT TEST */}

          {gameStarted && (
            <div
              style={{
                marginTop: "20px",
                padding: "18px",
                borderRadius: "14px",
                background: "rgba(157, 111, 255, 0.08)",
                border: "1px solid rgba(180, 150, 255, 0.2)",
              }}
            >
              <h3
                style={{
                  margin: "0 0 12px",
                  fontSize: "15px",
                }}
              >
                Controller connection test
              </h3>

              {lastControllerInput ? (
                <>
                  <p
                    style={{
                      color: "#b99aff",
                      fontWeight: 700,
                    }}
                  >
                    {lastControllerInput.nickname || "Player"}{" "}
                    pressed{" "}
                    {validLane
                      ? `lane ${laneNumber + 1} (${laneNames[laneNumber]})`
                      : "a controller button"}
                  </p>

                  <span
                    style={{
                      color: "#aaa",
                      fontSize: "12px",
                    }}
                  >
                    Input received successfully
                  </span>
                </>
              ) : (
                <p
                  style={{
                    color: "#aaa",
                    fontSize: "13px",
                  }}
                >
                  Waiting for controller input...
                </p>
              )}
            </div>
          )}
        </section>
      </footer>
    </main>
  );
}
