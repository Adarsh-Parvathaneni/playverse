
import { useCallback, useEffect, useState } from "react";
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
        <span className="rr-board-label">RHYTHM RUSH</span>
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
// FINAL PLAYER COMPARISON
// ==========================================

function FinalComparison({ players }: { players: any[] }) {
  const sortedPlayers = [...players].sort(
    (a, b) => b.score - a.score
  );

  const stats = [
    {
      label: "PERFECT",
      key: "perfect",
      color: "#5EE6A8",
    },
    {
      label: "GOOD",
      key: "good",
      color: "#FBBF64",
    },
    {
      label: "MISSED",
      key: "misses",
      color: "#FB7185",
    },
    {
      label: "INCORRECT",
      key: "incorrect",
      color: "#F472B6",
    },
    {
      label: "ACCURACY",
      key: "accuracy",
      color: "#5EEAD4",
      suffix: "%",
    },
    {
      label: "FINAL SCORE",
      key: "score",
      color: "#B69BFA",
    },
  ];

  return (
    <div className="rr-final-comparison">
      <div className="rr-comparison-heading">
        <div className="rr-eyebrow">PLAYVERSE</div>
        <h2>PLAYER COMPARISON</h2>
        <p>Here's how everyone performed.</p>
      </div>

      <div className="rr-comparison-players">
        {sortedPlayers.map((player, index) => (
          <div
            className="rr-comparison-player"
            key={player.playerId}
          >
            <div className="rr-comparison-player-header">
              <div>
                <span className="rr-comparison-rank">
                  #{index + 1}
                </span>
                <h3>{player.nickname || player.playerId}</h3>
              </div>

              <strong className="rr-comparison-score">
                {Number(player.score || 0).toLocaleString()}
              </strong>
            </div>

            <div className="rr-comparison-stats">
              {stats.map((stat) => (
                <div
                  className="rr-comparison-stat"
                  key={stat.key}
                >
                  <span>{stat.label}</span>
                  <strong style={{ color: stat.color }}>
                    {stat.key === "accuracy"
                      ? `${Number(player[stat.key] || 0).toFixed(1)}%`
                      : Number(player[stat.key] || 0).toLocaleString()}
                  </strong>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <p className="rr-comparison-footer">
        Thanks for playing Rhythm Rush.
      </p>
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
  const [resultsStage, setResultsStage] = useState<
    "leaderboard" | "comparison"
  >("leaderboard");

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
    beatChart,
    startAt,
    rhythmConfig,
    onComplete: handleComplete,
  });

  // Switch from leaderboard to comparison after one second.
  useEffect(() => {
    if (!engine.finished) return;

    const timeout = window.setTimeout(() => {
      setResultsStage("comparison");
    }, 1000);

    return () => window.clearTimeout(timeout);
  }, [engine.finished]);

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

  // ========================================
  // RESULTS SCREEN
  // ========================================

  if (engine.finished) {
    return (
      <div className="rr-results-overlay">
        {resultsStage === "leaderboard" ? (
          <div className="rr-results">
            <div className="rr-eyebrow">PLAYVERSE</div>

            <h2>GAME OVER</h2>

            <RhythmLeaderboard players={engine.scores} />

            <p>Final results are ready.</p>
          </div>
        ) : (
          <FinalComparison players={engine.scores} />
        )}
      </div>
    );
  }

  // ========================================
  // GAME SCREEN
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
    </main>
  );
}
