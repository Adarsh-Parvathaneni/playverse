
import { useEffect, useRef, useState } from "react";
import {
  Gamepad2,
  ArrowRight,
  Users,
  CheckCircle2,
  UserX,
} from "lucide-react";
import { io, type Socket } from "socket.io-client";

type JoinResponse = {
  success: boolean;
  error?: string;
  player?: {
    id: string;
    nickname: string;
    connected: boolean;
  };
};

type ActiveGame = {
  sessionId: string;
  gameId: string;
  status: string;
  startedAt: number;
  playerIds?: string[];
};

type ControllerInput = {
  eventId: string;
  sequence: number;
  lane: number;
  clientPressedAt: number;
};

const controllerLanes = [
  { id: 0, color: "#9B7BFF" },
  { id: 1, color: "#F472B6" },
  { id: 2, color: "#FB923C" },
  { id: 3, color: "#5EEAD4" },
];

export default function Join() {
  const roomCode = window.location.pathname
    .split("/")
    .filter(Boolean)
    .at(-1)
    ?.toUpperCase();

  const [nickname, setNickname] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [joined, setJoined] = useState(false);
  const [kicked, setKicked] = useState(false);
  const [activeGame, setActiveGame] =
    useState<ActiveGame | null>(null);

  const [pressedLane, setPressedLane] =
    useState<number | null>(null);

  const socketRef = useRef<Socket | null>(null);

  // Controller input tracking
  const inputSequenceRef = useRef(0);
  const inputQueueRef = useRef<ControllerInput[]>([]);

  // Clean up connection on unmount
  useEffect(() => {
    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, []);

  // ==========================================
  // JOIN ROOM
  // ==========================================

  const handleJoin = () => {
    const name = nickname.trim();
    const code = roomCode?.trim().toUpperCase();

    if (!name || !code || loading || joined) return;

    setLoading(true);
    setError("");
    setKicked(false);

    socketRef.current?.disconnect();

    const serverUrl = `http://${window.location.hostname}:3001`;

    const socket = io(serverUrl, {
      autoConnect: false,
      timeout: 5000,
      reconnection: false,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("Connected to Playverse server");

      socket.timeout(5000).emit(
        "player:join",
        {
          roomCode: code,
          nickname: name,
        },
        (
          timeoutError: Error | null,
          response: JoinResponse
        ) => {
          if (timeoutError) {
            setError("Server did not respond. Please try again.");
            setLoading(false);
            socket.disconnect();
            return;
          }

          if (response?.success) {
            console.log("Successfully joined room:", code);
            setJoined(true);
            setLoading(false);
          } else {
            setError(response?.error || "Unable to join room.");
            setLoading(false);
            socket.disconnect();
          }
        }
      );
    });

    // Game starts
    socket.on("game:started", (game: ActiveGame) => {
      console.log("Game started event received:", game);

      if (!game?.gameId || !game?.sessionId) {
        console.error("Invalid game start payload:", game);
        setError("Could not load the game. Please reconnect.");
        return;
      }

      inputSequenceRef.current = 0;
      inputQueueRef.current = [];

      setActiveGame(game);
      setError("");
    });

    // Game ends
    socket.on("game:ended", () => {
      setActiveGame(null);
      inputQueueRef.current = [];
      setPressedLane(null);
    });

    socket.on("game:result:accepted", () => {
      setActiveGame(null);
      inputQueueRef.current = [];
      setPressedLane(null);
    });

    socket.on("connect_error", (connectionError) => {
      console.error("Connection failed:", connectionError.message);

      setError("Cannot reach the Playverse server. Check your connection.");
      setLoading(false);
      socket.disconnect();
    });

    socket.on("player:kicked", (data: { message?: string }) => {
      setKicked(true);
      setJoined(false);
      setActiveGame(null);
      setLoading(false);
      setError(data?.message || "The host removed you from this room.");

      socket.disconnect();
    });

    socket.on("disconnect", () => {
      setJoined(false);
      setActiveGame(null);
      setLoading(false);
      setPressedLane(null);
    });

    socket.connect();
  };

  // ==========================================
  // HAPTIC FEEDBACK
  // ==========================================

  const triggerHaptic = () => {
    if (
      typeof navigator !== "undefined" &&
      typeof navigator.vibrate === "function"
    ) {
      navigator.vibrate(12);
    }
  };

  // ==========================================
  // CONTROLLER INPUT
  // ==========================================

  const handleControllerTap = (lane: number) => {
    const socket = socketRef.current;

    if (
      !socket?.connected ||
      !activeGame ||
      activeGame.gameId !== "rhythm-rush"
    ) {
      console.warn("Controller input blocked:", {
        connected: socket?.connected,
        activeGame,
      });

      return;
    }

    // Immediate physical feedback
    triggerHaptic();

    const sequence = ++inputSequenceRef.current;

    const eventId =
      typeof crypto !== "undefined" &&
      typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}-${sequence}-${Math.random()
            .toString(36)
            .slice(2)}`;

    const inputEvent: ControllerInput = {
      eventId,
      sequence,
      lane,
      clientPressedAt: Date.now(),
    };

    inputQueueRef.current.push(inputEvent);

    console.log("Sending controller input:", inputEvent);

    socket.emit(
      "game:input",
      {
        type: "tap",
        ...inputEvent,
      },
      (response: { success: boolean; error?: string }) => {
        if (!response?.success) {
          console.error("Input rejected:", response?.error);
          setError(
            response?.error || "Unable to send controller input."
          );
        } else {
          setError("");
        }
      }
    );
  };

  const isRhythmRush =
    activeGame?.gameId === "rhythm-rush";

  // ==========================================
  // RHYTHM RUSH CONTROLLER
  // ==========================================

  if (joined && isRhythmRush) {
    return (
      <main
        style={{
          position: "fixed",
          inset: 0,
          width: "100%",
          height: "100dvh",
          minHeight: "100dvh",
          background: "#100D19",
          display: "flex",
          flexDirection: "column",
          padding:
            "max(14px, env(safe-area-inset-top)) 12px max(14px, env(safe-area-inset-bottom))",
          boxSizing: "border-box",
          overflow: "hidden",
          userSelect: "none",
          WebkitUserSelect: "none",
        }}
      >
        {/* SCORE AND COMBO */}

        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "12px 8px 22px",
            flexShrink: 0,
          }}
        >
          <div>
            <div
              style={{
                color: "#A99ABF",
                fontSize: "11px",
                fontWeight: 800,
                letterSpacing: "2px",
                marginBottom: "4px",
              }}
            >
              SCORE
            </div>

            <div
              style={{
                color: "#FFFFFF",
                fontSize: "30px",
                fontWeight: 900,
                lineHeight: 1,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              0
            </div>
          </div>

          <div style={{ textAlign: "right" }}>
            <div
              style={{
                color: "#A99ABF",
                fontSize: "11px",
                fontWeight: 800,
                letterSpacing: "2px",
                marginBottom: "4px",
              }}
            >
              COMBO
            </div>

            <div
              style={{
                color: "#FFFFFF",
                fontSize: "30px",
                fontWeight: 900,
                lineHeight: 1,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              0
            </div>
          </div>
        </header>

        {/* FOUR HORIZONTAL CONTROLLER BUTTONS */}

        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
            gridTemplateRows: "minmax(0, 1fr)",
            gap: "9px",
            alignItems: "stretch",
          }}
        >
          {controllerLanes.map((lane) => {
            const isPressed = pressedLane === lane.id;

            return (
              <button
                key={lane.id}
                type="button"
                aria-label={`Tap lane ${lane.id + 1}`}
                onPointerDown={(event) => {
                  event.preventDefault();

                  setPressedLane(lane.id);
                  handleControllerTap(lane.id);
                }}
                onPointerUp={() => setPressedLane(null)}
                onPointerLeave={() => setPressedLane(null)}
                onPointerCancel={() => setPressedLane(null)}
                onContextMenu={(event) => event.preventDefault()}
                style={{
                  width: "100%",
                  height: "100%",
                  minWidth: 0,
                  minHeight: 0,
                  border: isPressed
                    ? "3px solid rgba(255,255,255,0.8)"
                    : "3px solid transparent",
                  borderRadius: "20px",
                  background: lane.color,
                  color: "#171321",
                  fontSize: "clamp(25px, 8vw, 48px)",
                  fontWeight: 900,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  touchAction: "none",
                  userSelect: "none",
                  WebkitUserSelect: "none",
                  WebkitTapHighlightColor: "transparent",
                  transform: isPressed
                    ? "scale(0.94)"
                    : "scale(1)",
                  filter: isPressed
                    ? "brightness(1.2)"
                    : "brightness(1)",
                  transition:
                    "transform 70ms ease, filter 70ms ease, border 70ms ease",
                  boxShadow: isPressed
                    ? `0 0 28px ${lane.color}80, inset 0 0 15px rgba(255,255,255,0.2)`
                    : `0 8px 25px ${lane.color}30`,
                  outline: "none",
                  padding: "0",
                  WebkitAppearance: "none",
                }}
              >
                {lane.id + 1}
              </button>
            );
          })}
        </div>

        {error && (
          <div
            role="alert"
            style={{
              color: "#FF7777",
              fontSize: "12px",
              textAlign: "center",
              paddingTop: "8px",
              flexShrink: 0,
            }}
          >
            {error}
          </div>
        )}
      </main>
    );
  }

  // ==========================================
  // JOIN / WAITING / KICKED SCREENS
  // ==========================================

  return (
    <main className="join-page">
      <div className="join-brand">
        <Gamepad2 size={29} />
        <span>
          PLAYVERSE<span className="brand-dot">.</span>
        </span>
      </div>

      <section className="join-content">
        {kicked ? (
          <>
            <div className="join-icon">
              <UserX size={34} />
            </div>

            <span className="section-eyebrow">
              ROOM {roomCode}
            </span>

            <h1>Removed from room</h1>

            <p>
              The host has removed you from this room.
              You can try joining again.
            </p>

            <div className="controller-waiting">
              Your previous connection has ended.
            </div>

            {error && (
              <span
                role="alert"
                style={{ color: "#ff7777", fontSize: "13px" }}
              >
                {error}
              </span>
            )}

            <button
              type="button"
              onClick={() => {
                setKicked(false);
                setError("");
                handleJoin();
              }}
              disabled={loading}
            >
              {loading ? "Reconnecting..." : "Rejoin Room"}
              {!loading && <ArrowRight size={18} />}
            </button>
          </>
        ) : joined ? (
          <>
            <div className="join-icon">
              <CheckCircle2 size={34} />
            </div>

            <span className="section-eyebrow">
              ROOM {roomCode}
            </span>

            <h1>You're connected!</h1>

            <p>
              Welcome, {nickname.trim()}.
              Your controller is connected to Playverse.
            </p>

            <div className="controller-waiting">
              Waiting for the host to start a game...
            </div>
          </>
        ) : (
          <>
            <div className="join-icon">
              <Users size={30} />
            </div>

            <span className="section-eyebrow">
              ROOM {roomCode}
            </span>

            <h1>Ready to play?</h1>

            <p>
              Choose a nickname so everyone knows who's
              joining the game.
            </p>

            <form
              className="join-form"
              onSubmit={(event) => {
                event.preventDefault();
                handleJoin();
              }}
            >
              <label htmlFor="nickname">
                YOUR NICKNAME
              </label>

              <input
                id="nickname"
                type="text"
                placeholder="Enter your nickname"
                maxLength={16}
                value={nickname}
                onChange={(event) =>
                  setNickname(event.target.value)
                }
                autoComplete="off"
                disabled={loading}
              />

              {error && (
                <span
                  role="alert"
                  style={{ color: "#ff7777", fontSize: "13px" }}
                >
                  {error}
                </span>
              )}

              <button
                type="submit"
                disabled={!nickname.trim() || loading}
              >
                {loading ? "Connecting..." : "Join Game"}
                {!loading && <ArrowRight size={18} />}
              </button>
            </form>
          </>
        )}

        <span className="join-footer">
          MOVE. PLAY. COMPETE.
        </span>
      </section>
    </main>
  );
}
