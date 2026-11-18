import { useEffect, useRef, useState } from "react";
import type { TouchEvent } from "react";
import { io, type Socket } from "socket.io-client";
import {
  Home,
  Fingerprint,
  Wifi,
  WifiOff,
  ArrowLeft,
} from "lucide-react";

interface TouchStart {
  x: number;
  y: number;
  time: number;
  fingers: number;
  moved: boolean;
}

interface ActiveGame {
  gameId: string;
  sessionId: string;
  startedAt?: number;
  startAt?: number;
  [key: string]: unknown;
}

export default function Remote() {
  const socketRef = useRef<Socket | null>(null);
  const touchStartRef = useRef<TouchStart | null>(null);
  const inputSequenceRef = useRef(0);

  const [connected, setConnected] = useState(false);
  const [paired, setPaired] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [activeGame, setActiveGame] = useState<ActiveGame | null>(null);
  const [pressedLane, setPressedLane] = useState<number | null>(null);

  const roomCode =
    window.location.pathname.split("/").filter(Boolean).pop()?.toUpperCase() || "";
  const pairingToken =
    new URLSearchParams(window.location.search).get("token") || "";

  const vibrate = (duration = 12) => {
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      navigator.vibrate(duration);
    }
  };

  const sendAction = (action: "back" | "home") => {
    const socket = socketRef.current;
    if (!socket?.connected || !paired) {
      setError("Remote is not connected.");
      return;
    }

    socket.emit(
      "remote:navigate",
      { action },
      (response: { success: boolean; error?: string }) => {
        if (!response?.success) setError(response?.error || "Action could not be sent.");
        else setError("");
      }
    );

    setFeedback(action.toUpperCase());
    vibrate(10);
  };

  const sendCursorMove = (dx: number, dy: number) => {
    const socket = socketRef.current;
    if (!socket?.connected || !paired || activeGame) return;

    socket.emit(
      "remote:cursor",
      { type: "move", dx: Math.max(-1, Math.min(1, dx)), dy: Math.max(-1, Math.min(1, dy)) },
      (response: { success: boolean; error?: string }) => {
        if (response && !response.success) setError(response.error || "Cursor movement failed.");
      }
    );
  };

  const sendCursorClick = () => {
    const socket = socketRef.current;
    if (!socket?.connected || !paired || activeGame) return;

    socket.emit(
      "remote:cursor",
      { type: "click" },
      (response: { success: boolean; error?: string }) => {
        if (response && !response.success) setError(response.error || "Click could not be sent.");
        else setError("");
      }
    );

    setFeedback("CLICK");
    vibrate(20);
  };

  useEffect(() => {
    if (!roomCode || !pairingToken) {
      setError("Invalid remote link. Scan the TV QR code again.");
      return;
    }

    const socket = io(`http://${window.location.hostname}:3001`, {
      reconnection: true,
    });
    socketRef.current = socket;

    const pairRemote = () => {
      setConnected(true);
      setPaired(false);
      setError("");

      socket.emit(
        "host-remote:pair",
        { roomCode, pairingToken },
        (response: { success: boolean; error?: string }) => {
          if (response?.success) {
            setPaired(true);
            setError("");
            vibrate(25);
          } else {
            setPaired(false);
            setError(response?.error || "Unable to pair remote.");
          }
        }
      );
    };

    socket.on("connect", pairRemote);
    socket.on("disconnect", () => {
      setConnected(false);
      setPaired(false);
      setActiveGame(null);
    });
    socket.on("connect_error", () => {
      setConnected(false);
      setPaired(false);
      setError("Unable to connect to Playverse.");
    });
    socket.on("host-remote:disconnected", () => {
      setPaired(false);
      setActiveGame(null);
      setError("The TV display has disconnected.");
    });

    socket.on("game:started", (game: ActiveGame) => {
      if (!game?.gameId || !game?.sessionId) {
        setError("Could not load the game controller. Please reconnect.");
        return;
      }
      inputSequenceRef.current = 0;
      setActiveGame(game);
      setPressedLane(null);
      setError("");
      setFeedback("");
      vibrate(35);
    });

    const returnToTouchpad = () => {
      setActiveGame(null);
      setPressedLane(null);
      setError("");
      setFeedback("");
    };

    socket.on("game:ended", returnToTouchpad);
    socket.on("game:result:accepted", returnToTouchpad);

    if (socket.connected) pairRemote();

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [roomCode, pairingToken]);

  const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    event.preventDefault();
    const touch = event.touches[0];
    if (!touch) return;

    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
      fingers: event.touches.length,
      moved: false,
    };
  };

  const handleTouchMove = (event: TouchEvent<HTMLDivElement>) => {
    event.preventDefault();
    const start = touchStartRef.current;
    const touch = event.touches[0];
    if (!start || !touch || start.fingers >= 2 || activeGame) return;

    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;
    if (Math.abs(deltaX) < 0.5 && Math.abs(deltaY) < 0.5) return;

    start.moved = true;
    const rect = event.currentTarget.getBoundingClientRect();
    const sensitivity = 2.2;
    sendCursorMove(
      (deltaX / rect.width) * sensitivity,
      (deltaY / rect.height) * sensitivity
    );
    start.x = touch.clientX;
    start.y = touch.clientY;
  };

  const handleTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    event.preventDefault();
    const start = touchStartRef.current;
    if (!start) return;

    const elapsed = Date.now() - start.time;
    if (start.fingers >= 2) {
      if (elapsed < 500 && !start.moved && !activeGame) sendAction("back");
    } else if (!start.moved && elapsed < 500 && !activeGame) {
      sendCursorClick();
    }
    touchStartRef.current = null;
  };

  const handleTouchCancel = () => {
    touchStartRef.current = null;
  };

  const handleControllerTap = (lane: number) => {
    const socket = socketRef.current;
    if (!socket?.connected || !paired || !activeGame || activeGame.gameId !== "rhythm-rush") {
      return;
    }

    const sequence = ++inputSequenceRef.current;
    const eventId =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}-${sequence}-${Math.random().toString(36).slice(2)}`;

    setPressedLane(lane);
    vibrate(12);

    socket.emit(
      "game:input",
      {
        type: "tap",
        eventId,
        sequence,
        lane,
        clientPressedAt: Date.now(),
      },
      (response: { success: boolean; error?: string }) => {
        if (!response?.success) {
          setError(response?.error || "Unable to send controller input.");
        } else {
          setError("");
        }
      }
    );

    window.setTimeout(() => {
      setPressedLane((current) => (current === lane ? null : current));
    }, 100);
  };

  const laneColors = [
    {
      name: "AMETHYST",
      color: "#A477FF",
      background: "rgba(164, 119, 255, 0.16)",
      border: "rgba(164, 119, 255, 0.55)",
      glow: "rgba(164, 119, 255, 0.4)",
    },
    {
      name: "ROSE",
      color: "#F05AA6",
      background: "rgba(240, 90, 166, 0.16)",
      border: "rgba(240, 90, 166, 0.55)",
      glow: "rgba(240, 90, 166, 0.4)",
    },
    {
      name: "APRICOT",
      color: "#FF923D",
      background: "rgba(255, 146, 61, 0.16)",
      border: "rgba(255, 146, 61, 0.55)",
      glow: "rgba(255, 146, 61, 0.4)",
    },
    {
      name: "AQUA",
      color: "#42DCCB",
      background: "rgba(66, 220, 203, 0.16)",
      border: "rgba(66, 220, 203, 0.55)",
      glow: "rgba(66, 220, 203, 0.4)",
    },
  ];

  const isRhythmRush = activeGame?.gameId === "rhythm-rush";

  if (activeGame && isRhythmRush) {
    return (
      <main
        style={{
          position: "fixed",
          inset: 0,
          width: "100%",
          height: "100dvh",
          minHeight: "100dvh",
          background: "#100D19",
          color: "#fff",
          display: "flex",
          flexDirection: "column",
          padding: "max(14px, env(safe-area-inset-top)) 14px max(14px, env(safe-area-inset-bottom))",
          boxSizing: "border-box",
          overflow: "hidden",
          userSelect: "none",
        }}
      >
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 8px 18px" }}>
          <div>
            <div style={{ fontSize: "18px", fontWeight: 800, letterSpacing: "1px" }}>
              PLAYVERSE<span style={{ color: "#A47AFF" }}>.</span>
            </div>
            <div style={{ color: "#9B91AE", fontSize: "11px", letterSpacing: "2px", marginTop: "5px" }}>
              RHYTHM RUSH
            </div>
          </div>
          <div style={{ color: paired ? "#8fce9d" : "#ff858c", fontSize: "11px", fontWeight: 700 }}>
            {paired ? "CONNECTED" : "OFFLINE"}
          </div>
        </header>

        <div style={{ textAlign: "center", color: "#B9AEC9", fontSize: "12px", letterSpacing: "1px", marginBottom: "16px" }}>
          TAP THE LANE THAT MATCHES THE TV
        </div>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
            gap: "10px",
            flex: 1,
            minHeight: 0,
            paddingBottom: "12px",
          }}
        >
          {[0, 1, 2, 3].map((lane) => (
            <button
              key={lane}
              type="button"
              onPointerDown={(event) => {
                event.preventDefault();
                handleControllerTap(lane);
              }}
              style={{
                borderRadius: "22px",
                border: `2px solid ${
                  pressedLane === lane
                    ? laneColors[lane].color
                    : laneColors[lane].border
                }`,
                background:
                  pressedLane === lane
                    ? laneColors[lane].color
                    : `linear-gradient(180deg, ${laneColors[lane].background}, rgba(20, 16, 29, 0.95))`,
                color: pressedLane === lane ? "#100D19" : laneColors[lane].color,
                fontSize: "clamp(24px, 7vw, 42px)",
                fontWeight: 800,
                boxShadow:
                  pressedLane === lane
                    ? `0 0 30px ${laneColors[lane].glow}`
                    : "inset 0 1px 0 rgba(255,255,255,0.05)",
                touchAction: "none",
                WebkitTapHighlightColor: "transparent",
                transition: "all 120ms ease",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                <span>{lane + 1}</span>
                <span style={{ fontSize: "10px", letterSpacing: "1.5px" }}>
                  {laneColors[lane].name}
                </span>
              </div>
            </button>
          ))}
        </section>

        <footer style={{ textAlign: "center", color: "#777181", fontSize: "11px", padding: "8px" }}>
          YOUR PHONE IS NOW THE GAME CONTROLLER
        </footer>

        {error && <div style={{ color: "#ff858c", textAlign: "center", fontSize: "12px", padding: "8px" }}>{error}</div>}
      </main>
    );
  }

  if (activeGame) {
    return (
      <main style={{ minHeight: "100dvh", background: "#101014", color: "#fff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px", textAlign: "center" }}>
        <div style={{ fontSize: "18px", fontWeight: 800 }}>PLAYVERSE<span style={{ color: "#A47AFF" }}>.</span></div>
        <h1 style={{ fontSize: "22px", marginTop: "28px" }}>{String(activeGame.gameId).replaceAll("-", " ").toUpperCase()}</h1>
        <p style={{ color: "#aaa", lineHeight: 1.6 }}>This game's phone controller layout has not been added yet.</p>
        <p style={{ color: "#777", fontSize: "12px" }}>The touchpad will return when the game ends.</p>
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100dvh",
        background: "#101014",
        color: "#fff",
        display: "flex",
        flexDirection: "column",
        padding: "22px",
        boxSizing: "border-box",
        fontFamily: "inherit",
        overflow: "hidden",
      }}
    >
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 2px 22px" }}>
        <div>
          <div style={{ fontSize: "19px", fontWeight: 800, letterSpacing: "1px" }}>
            PLAYVERSE<span style={{ color: "#A47AFF" }}>.</span>
          </div>
          <div style={{ fontSize: "11px", color: "#85858f", marginTop: "4px", letterSpacing: "1.5px" }}>
            UNIVERSAL REMOTE
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "7px", padding: "9px 12px", borderRadius: "30px", background: paired ? "rgba(80, 200, 120, 0.12)" : "rgba(255,255,255,0.06)", color: paired ? "#8fce9d" : "#aaa", fontSize: "11px", fontWeight: 700 }}>
          {paired ? <Wifi size={14} /> : <WifiOff size={14} />}
          {paired ? "CONNECTED" : connected ? "PAIRING" : "OFFLINE"}
        </div>
      </header>

      <div style={{ textAlign: "center", marginBottom: "24px" }}>
        <div style={{ color: "#85858f", fontSize: "11px", letterSpacing: "2px" }}>CONNECTED TO ROOM</div>
        <div style={{ fontSize: "21px", fontWeight: 700, letterSpacing: "5px", marginTop: "6px" }}>{roomCode}</div>
      </div>

      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchCancel}
        style={{
          flex: 1,
          minHeight: "320px",
          maxHeight: "620px",
          borderRadius: "30px",
          background: "radial-gradient(circle at 50% 40%, #282333 0%, #1b1a24 55%, #17161e 100%)",
          border: "1px solid rgba(190, 160, 255, 0.16)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04), 0 18px 50px rgba(0,0,0,0.25)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "18px",
          touchAction: "none",
          userSelect: "none",
          WebkitUserSelect: "none",
          WebkitTapHighlightColor: "transparent",
        }}
      >
        <div style={{ width: "68px", height: "68px", borderRadius: "50%", background: "rgba(164, 122, 255, 0.12)", border: "1px solid rgba(164, 122, 255, 0.2)", display: "flex", alignItems: "center", justifyContent: "center", color: "#C4A8FF" }}>
          <Fingerprint size={34} strokeWidth={1.4} />
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "17px", fontWeight: 600, letterSpacing: "0.3px" }}>Touch to navigate</div>
          <div style={{ fontSize: "12px", color: "#92909f", marginTop: "9px", lineHeight: 1.8 }}>
            Move your finger to control the cursor<br />
            Tap to click<br />
            Two-finger tap to go back
          </div>
        </div>
        <div style={{ marginTop: "12px", minHeight: "20px", color: "#B99AFF", fontSize: "11px", fontWeight: 700, letterSpacing: "2px" }}>{feedback}</div>
      </div>

      <footer style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "22px 4px 8px" }}>
        <button type="button" onClick={() => sendAction("back")} aria-label="Go back" style={{ width: "54px", height: "54px", borderRadius: "18px", border: "1px solid rgba(255,255,255,0.09)", background: "#1c1b24", color: "#ccc", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <ArrowLeft size={21} />
        </button>
        <div style={{ fontSize: "11px", color: "#777681", letterSpacing: "1px" }}>PLAYVERSE REMOTE</div>
        <button type="button" onClick={() => sendAction("home")} aria-label="Go home" style={{ width: "54px", height: "54px", borderRadius: "18px", border: "1px solid rgba(164, 122, 255, 0.2)", background: "rgba(164, 122, 255, 0.12)", color: "#C4A8FF", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Home size={21} />
        </button>
      </footer>

      {error && <div style={{ textAlign: "center", color: "#ff858c", fontSize: "12px", padding: "8px" }}>{error}</div>}
    </main>
  );
}
