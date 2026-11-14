
import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Gamepad2, ArrowRight, Users, CheckCircle2 } from "lucide-react";
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

export default function Join() {
  const { roomCode } = useParams();

  const [nickname, setNickname] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [joined, setJoined] = useState(false);

  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, []);

  const handleJoin = () => {
    const name = nickname.trim();
    const code = roomCode?.trim().toUpperCase();

    if (!name || !code || loading || joined) return;

    setLoading(true);
    setError("");

    const serverUrl = `http://${window.location.hostname}:3001`;

    console.log("Connecting to:", serverUrl);

    socketRef.current?.disconnect();

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
        (timeoutError: Error | null, response: JoinResponse) => {
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

    socket.on("connect_error", (connectionError) => {
      console.error("Connection failed:", connectionError.message);

      setError(
        "Cannot reach the Playverse server. Check your connection."
      );
      setLoading(false);
      socket.disconnect();
    });

    socket.on("disconnect", () => {
      setJoined(false);
      setLoading(false);
    });

    socket.connect();
  };

  return (
    <main className="join-page">
      <div className="join-brand">
        <Gamepad2 size={29} />
        <span>
          PLAYVERSE<span className="brand-dot">.</span>
        </span>
      </div>

      <section className="join-content">
        {joined ? (
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
                  style={{
                    color: "#ff7777",
                    fontSize: "13px",
                  }}
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
