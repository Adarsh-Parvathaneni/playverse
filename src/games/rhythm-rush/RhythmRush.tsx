
import { useCallback } from "react";
import { useRhythmEngine } from "./hooks/UseRhythmEngine";
import GameLane from "./components/GameLane";
import PlayerScore from "./components/PlayerScore";
import RhythmLeaderboard from "./components/RhythmLeaderboard";
import "./rhythm-rush.css";

interface RhythmNote {
  id: number;
  lane: number;
  time: number;
}

interface RhythmConfig {
  durationMs: number;
  approachTime: number;
  beatInterval: number;
  firstNoteTime: number;
  perfectWindow: number;
  goodWindow: number;
}

interface RhythmRushProps {
  sessionId: string;
  players: any[];
  socket: any;
  settings?: Record<string, any>;
  beatChart?: RhythmNote[];
  startAt?: number;
  rhythmConfig?: RhythmConfig;
  onEnd: (result: any) => void;
}

const laneColors = [
  "#9B7BFF",
  "#F472B6",
  "#FB923C",
  "#5EEAD4",
];

// ==========================================
// GAME BOARD
// ==========================================

function GameBoard({
  engine,
  playerId,
  playerName,
}: {
  engine: ReturnType<typeof useRhythmEngine>;
  playerId: string;
  playerName: string;
}) {
  const playerNotes = engine.getNotesForPlayer(playerId);
  const feedback = engine.hitFeedback[playerId];

  return (
    <div className="rr-board">
      <div className="rr-board-header">
        <span>{playerName}</span>
        <span className="rr-board-label">
          RHYTHM RUSH
        </span>
      </div>

      <div className="rr-lanes">
        {[0, 1, 2, 3].map((lane) => (
          <GameLane
            key={lane}
            laneIndex={lane}
            notes={playerNotes}
            elapsedMs={engine.elapsedMs}
            approachTime={engine.approachTime}
            hitActive={feedback?.lane === lane}
            hitTrigger={feedback?.trigger}
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

// ==========================================
// RHYTHM RUSH
// ==========================================

export default function RhythmRush({
  sessionId,
  players,
  socket,
  settings = {},
  beatChart,
  startAt,
  rhythmConfig,
  onEnd,
}: RhythmRushProps) {
  const durationSeconds =
    Number(settings.durationSeconds) || 60;

  // ----------------------------------------
  // GAME COMPLETION
  // ----------------------------------------

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

  // ----------------------------------------
  // RHYTHM ENGINE
  // ----------------------------------------

  const engine = useRhythmEngine({
    players,
    socket,
    durationSeconds,
    beatChart,
    startAt,
    rhythmConfig,
    onComplete: handleComplete,
  });

  // ----------------------------------------
  // TIMER
  // ----------------------------------------

  const remainingSeconds = Math.max(
    0,
    Math.ceil(
      (engine.durationMs - engine.elapsedMs) / 1000
    )
  );

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;

  // ----------------------------------------
  // PLAYER SCORES
  // ----------------------------------------

  const playerStats = players
    .map((player) =>
      engine.scores.find(
        (score) => score.playerId === player.id
      )
    )
    .filter(Boolean);

  // ----------------------------------------
  // GAME PROGRESS
  // ----------------------------------------

  const progress = Math.min(
    100,
    (engine.elapsedMs / engine.durationMs) * 100
  );

  // ========================================
  // RENDER
  // ========================================

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
            playerId={player.id}
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
