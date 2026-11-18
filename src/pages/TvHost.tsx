import { QRCodeSVG } from "qrcode.react";
import { createPortal } from "react-dom";
import { useState, useEffect } from "react";



import {

  Gamepad2,

  UserRound,

  UserX,

  Check,

  Play,

  ShieldCheck,

} from "lucide-react";



import GameRenderer from "../components/GameRenderer";

import { useHostSession } from "../context/HostSessionContext";



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

    startedAt?: number;

    startAt?: number;

    playerIds?: string[];

    settings?: Record<string, unknown>;

    beatChart?: {

      id: number;

      lane: number;

      time: number;

    }[];

    rhythmConfig?: {

      durationMs: number;

      approachTime: number;

      beatInterval: number;

      firstNoteTime: number;

      perfectWindow: number;

      goodWindow: number;

    };

  };

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



export default function TvHost() {

  const {

    socket,

    roomCode,

    players,

    remoteConnected,

  } = useHostSession();



  const [kickError, setKickError] = useState("");



  const [selectedGame, setSelectedGame] = useState<string | null>(null);



  const [activeGame, setActiveGame] =

    useState<GameResponse["game"] | null>(null);



  const [gameStarted, setGameStarted] = useState(false);

  const [gameError, setGameError] = useState("");

  const [startingGame, setStartingGame] = useState(false);

  const enterFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }
    } catch (error) {
      console.warn("Fullscreen could not be activated:", error);
    }
  };

  const exitFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
    } catch (error) {
      console.warn("Could not exit fullscreen:", error);
    }
  };



  // Listen for game events using the shared host socket.*

  useEffect(() => {

    if (!socket) return;



    const handleGameStarted = (game: GameResponse["game"]) => {

      if (!game) return;



      console.log("Game started:", game);



      setActiveGame(game);

      setGameStarted(true);

      setStartingGame(false);

      setGameError("");

    };



    const handleGameEnded = () => {

      console.log("Game ended");



      setGameStarted(false);

      setActiveGame(null);

      setStartingGame(false);

      setGameError("");
      void exitFullscreen();

    };



    socket.on("game:started", handleGameStarted);

    socket.on("game:ended", handleGameEnded);



    return () => {

      socket.off("game:started", handleGameStarted);

      socket.off("game:ended", handleGameEnded);

    };

  }, [socket]);



  // ----------------------------------

  // KICK PLAYER*

  // ----------------------------------



  const handleKick = (player: Player) => {

    setKickError("");



    if (!socket?.connected) {

      setKickError("Host connection lost. Please refresh.");

      return;

    }



    socket.emit(

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

  // START GAME*

  // ----------------------------------



  const handleStartGame = () => {

    if (!selectedGame || gameStarted || startingGame) {

      return;

    }



    if (!socket?.connected) {

      setGameError(

        "Host is disconnected from the server. Please refresh."

      );

      return;

    }



    setGameError("");

    setStartingGame(true);
    void enterFullscreen();



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



        if (response?.success && response.game) {

          console.log("Game started:", response.game);



          setActiveGame(response.game);

          setGameStarted(true);

          setGameError("");

        } else {

          setGameError(

            response?.error || "Unable to start the game."

          );

        }

      }

    );

  };



  // ----------------------------------

  // GAME RESULTS*

  // ----------------------------------



  const handleGameEnd = (result: any) => {

    if (!socket?.connected) {

      setGameError(

        "Connection lost. Unable to submit game results."

      );

      return;

    }



    setGameError("");



    socket.timeout(5000).emit(

      "game:result:submit",

      result,

      (timeoutError: Error | null, response: any) => {

        if (timeoutError) {

          setGameError(

            "Server timed out while submitting game results."

          );

          return;

        }



        if (!response?.success) {

          setGameError(

            response?.error || "Unable to submit game results."

          );

          return;

        }



        console.log("Game results accepted:", response);

      }

    );

  };



  // ----------------------------------

  // RETURN TO LOBBY*

  // ----------------------------------



  const handleReturnToLobby = () => {

    if (!socket?.connected) {

      setGameError(

        "Connection lost. Unable to return to lobby."

      );

      return;

    }



    setGameError("");



    socket.timeout(5000).emit(

      "game:end",

      (timeoutError: Error | null, response: any) => {

        if (timeoutError) {

          setGameError(

            "Server timed out. Please try again."

          );

          return;

        }



        if (!response?.success) {

          setGameError(

            response?.error ||

              response?.message ||

              "Unable to return to lobby."

          );

          return;

        }



        console.log("Returned to lobby successfully.");
        void exitFullscreen();

      }

    );

  };



  const selectedGameDetails = availableGames.find(

    (game) => game.id === selectedGame

  );



  // ----------------------------------

  // GAME DISPLAY*

  // --------------------------------



// ==========================================
// FULLSCREEN GAME DISPLAY
// ==========================================

// ==========================================
// FULLSCREEN GAME DISPLAY
// ==========================================

if (gameStarted && activeGame) {
  return createPortal(
    <div
      className="playverse-game-stage"
      style={{
        position: "fixed",
        inset: 0,
        width: "100vw",
        height: "100dvh",
        zIndex: 2147483647,
        margin: 0,
        padding: 0,
        overflow: "hidden",
        background: "#0b0912",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <GameRenderer
        gameId={activeGame.gameId}
        sessionId={activeGame.sessionId || ""}
        players={players.filter((player) =>
          activeGame.playerIds
            ? activeGame.playerIds.includes(player.id)
            : player.connected
        )}
        socket={socket}
        settings={activeGame.settings || {}}
        beatChart={activeGame.beatChart}
        startAt={activeGame.startAt ?? activeGame.startedAt}
        rhythmConfig={activeGame.rhythmConfig}
        onEnd={handleGameEnd}
        onReturnToLobby={handleReturnToLobby}
      />

      {gameError && (
        <div
          role="alert"
          style={{
            position: "fixed",
            bottom: "20px",
            left: "50%",
            transform: "translateX(-50%)",
            background: "#351b27",
            border: "1px solid #ff858c",
            color: "#ffb0b5",
            padding: "12px 20px",
            borderRadius: "10px",
            zIndex: 2147483647,
            fontSize: "14px",
            maxWidth: "90vw",
            textAlign: "center",
          }}
        >
          {gameError}
        </div>
      )}
    </div>,
    document.body
  );
}



  // ----------------------------------

  // HOST LOBBY DISPLAY*

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



      <footer className="tv-host-bottom">

        <h1>Ready to play?</h1>



        <p>

          Your Playverse remote is connected. Choose a game

          and get everyone ready.

        </p>



        {/* HOST CONNECTION STATUS */}



        <div

          style={{

            marginTop: "14px",

            display: "inline-flex",

            alignItems: "center",

            gap: "8px",

            padding: "9px 14px",

            borderRadius: "20px",

            background: remoteConnected

              ? "rgba(80, 200, 120, 0.12)"

              : "rgba(255, 255, 255, 0.06)",

            color: remoteConnected ? "#8fce9d" : "#aaa",

            fontSize: "13px",

            fontWeight: 600,

          }}

        >

          <span

            style={{

              width: "8px",

              height: "8px",

              borderRadius: "50%",

              background: remoteConnected ? "#65d68a" : "#888",

            }}

          />



          {remoteConnected

            ? "REMOTE CONNECTED"

            : "REMOTE DISCONNECTED"}

        </div>



        <div className="tv-host-info">

          <div>

            <ShieldCheck size={19} />

            <span>You're the Host</span>

          </div>



          <div style={{ marginTop: "8px", color: "#aaa" }}>

            Room code: {roomCode}

          </div>

        </div>

        {/* PLAYER JOIN QR CODE */}



{roomCode && (

  <section

    style={{

      width: "min(680px, 92vw)",

      margin: "25px auto",

      padding: "25px",

      display: "flex",

      flexDirection: "column",

      alignItems: "center",

      gap: "14px",

      border: "1px solid rgba(180, 150, 255, 0.2)",

      borderRadius: "18px",

      background: "rgba(255,255,255,0.035)",

    }}

  >

    <h2 style={{ margin: 0, fontSize: "20px" }}>

      Scan to Join PlayVerse

    </h2>



    <p

      style={{

        color: "#aaa",

        fontSize: "13px",

        textAlign: "center",

        margin: 0,

      }}

    >

      Scan this QR code with your phone camera.

    </p>



    <div

      style={{

        padding: "14px",

        background: "white",

        borderRadius: "14px",

      }}

    >

      <QRCodeSVG
  value={`${window.location.protocol}//${window.location.host}/join/${roomCode}`}
  size={210}
  level="H"
  includeMargin
/>

    </div>



    <div style={{ textAlign: "center" }}>

      <span

        style={{

          color: "#aaa",

          fontSize: "11px",

          letterSpacing: "2px",

        }}

      >

        ROOM CODE

      </span>



      <h2

        style={{

          margin: "5px 0",

          color: "#b99aff",

          fontSize: "30px",

          letterSpacing: "6px",

        }}

      >

        {roomCode}

      </h2>

    </div>

  </section>

)}

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

                  disabled={startingGame}

                  onClick={() => setSelectedGame(game.id)}

                  style={{

                    padding: "18px",

                    borderRadius: "15px",

                    textAlign: "left",

                    cursor: startingGame ? "not-allowed" : "pointer",

                    border: isSelected

                      ? "2px solid #a47aff"

                      : "1px solid rgba(180, 150, 255, 0.2)",

                    background: isSelected

                      ? "rgba(157, 111, 255, 0.15)"

                      : "rgba(255, 255, 255, 0.035)",

                    color: "white",

                    transition: "all 0.2s ease",

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

                color: selectedGame ? "#b99aff" : "#777",

                fontSize: "12px",

                fontWeight: 700,

              }}

            >

              {selectedGame ? "READY" : "WAITING"}

            </span>

          </div>



          {/* START GAME */}



          <button

            type="button"

            onClick={handleStartGame}

            disabled={!selectedGame || startingGame}

            style={{

              width: "100%",

              marginTop: "14px",

              padding: "16px",

              borderRadius: "12px",

              border: "none",

              background: selectedGame

                ? "linear-gradient(135deg, #8955e8, #6336bc)"

                : "rgba(255, 255, 255, 0.07)",

              color: selectedGame ? "white" : "#777",

              fontSize: "14px",

              fontWeight: 700,

              letterSpacing: "1px",

              cursor:

                selectedGame && !startingGame

                  ? "pointer"

                  : "not-allowed",

              display: "flex",

              alignItems: "center",

              justifyContent: "center",

              gap: "9px",

            }}

          >

            <Play size={17} />

            {startingGame ? "STARTING GAME..." : "START GAME"}

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

        </section>

      </footer>

    </main>

  );

}
