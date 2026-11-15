
import { useCallback } from "react";
import { useRhythmEngine } from "./hooks/UseRhythmEngine.ts";
import GameLane from "./components/GameLane";
import PlayerScore from "./components/PlayerScore";
import RhythmLeaderboard from "./components/RhythmLeaderboard";
import "./rhythm-rush.css";

interface RhythmRushProps {
  sessionId: string;
  players: any[];
  socket: any;
  settings?: Record<string, any>;
  onEnd: (result: any) => void;
}

const laneColors = [
  "#9B7BFF",
  "#F472B6",
  "#FB923C",
  "#5EEAD4",
];

function GameBoard({
  engine,
  playerName,
}: {
  engine: ReturnType<typeof useRhythmEngine>;
  playerName: string;
}) {
  return (
    <div className="rr-board">
      <div className="rr-board-header">
        <span>{playerName}</span>
        <span className="rr-board-label">RHYTHM RUSH</span>
      </div>

      <div className="rr-lanes">
        {[0, 1, 2, 3].map((lane) => (
          <GameLane
            key={lane}
            laneIndex={lane}
            notes={engine.notes}
            elapsedMs={engine.elapsedMs}
            approachTime={engine.approachTime}
          />
        ))}
      </div>

      <div className="rr-lane-keys">
        {laneColors.map((color, index) => (
          <div key={index} style={{ color }}>
            {["A", "B", "C", "D"][index]}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function RhythmRush({
  sessionId,
  players,
  socket,
  settings = {},
  onEnd,
}: RhythmRushProps) {
  const durationSeconds =
    Number(settings.durationSeconds) || 60;

  const handleComplete = useCallback(
    (result: any) => {
      onEnd({
        sessionId,
        gameId: "rhythm-rush",
        ...result,
      });
    },
    [sessionId, onEnd]
  );

  const engine = useRhythmEngine({
    players,
    socket,
    durationSeconds,
    onComplete: handleComplete,
  });

  const remainingSeconds = Math.max(
    0,
    Math.ceil(
      (engine.durationMs - engine.elapsedMs) / 1000
    )
  );

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;

  const playerStats = players
    .map((player) =>
      engine.scores.find(
        (score) => score.playerId === player.id
      )
    )
    .filter(Boolean);

  const progress = Math.min(
    100,
    (engine.elapsedMs / engine.durationMs) * 100
  );

  return (
    <main className="rhythm-game">
      <header className="rr-header">
        <div>
          <div className="rr-eyebrow">
            PLAYVERSE ORIGINAL
          </div>
          <h1>RHYTHM RUSH</h1>
          <p className="rr-subtitle">
            Hit the beats. Own the rhythm.
          </p>
        </div>

        <div className="rr-timer">
          <span>TIME LEFT</span>
          <strong>
            {minutes}:{String(seconds).padStart(2, "0")}
          </strong>
        </div>
      </header>

      <div className="rr-progress-track">
        <div
          className="rr-progress-fill"
          style={{ width: `${progress}%` }}
        />
      </div>

      <section className="rr-scores">
        {playerStats.map((player, index) =>
          player ? (
            <PlayerScore
              key={player.playerId}
              player={player}
              playerNumber={index + 1}
            />
          ) : null
        )}
      </section>

      <section
        className={`rr-game-boards ${
          players.length === 2 ? "rr-two-player" : ""
        }`}
      >
        {players.map((player) => (
          <GameBoard
            key={player.id}
            engine={engine}
            playerName={player.nickname}
          />
        ))}
      </section>

      {players.length === 2 && (
        <section className="rr-leaderboard-section">
          <RhythmLeaderboard players={engine.scores} />
        </section>
      )}

      {engine.finished && (
        <div className="rr-results-overlay">
          <div className="rr-results">
            <div className="rr-eyebrow">
              PLAYVERSE
            </div>

            <h2>GAME OVER</h2>

            <RhythmLeaderboard players={engine.scores} />

            <p>Final results are ready.</p>
          </div>
        </div>
      )}
    </main>
  );
}
