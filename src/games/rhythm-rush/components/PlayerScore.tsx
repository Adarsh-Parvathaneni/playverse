
import type { PlayerStats } from "../hooks/UseRhythmEngine.ts";

interface PlayerScoreProps {
  player: PlayerStats;
  playerNumber: number;
}

export default function PlayerScore({
  player,
  playerNumber,
}: PlayerScoreProps) {
  const accuracy = player.accuracy ?? 100;

  return (
    <div className="rr-player-score">
      <div className="rr-player-identity">
        <span className="rr-stat-label">
          PLAYER {playerNumber}
        </span>
        <strong>{player.nickname}</strong>
      </div>

      <div className="rr-stat">
        <span className="rr-stat-label">SCORE</span>
        <strong className="rr-score-number">
          {player.score.toLocaleString()}
        </strong>
      </div>

      <div className="rr-stat">
        <span className="rr-stat-label">COMBO</span>
        <strong className="rr-combo">
          {player.combo}x
        </strong>
      </div>

      <div className="rr-stat">
        <span className="rr-stat-label">ACCURACY</span>
        <strong className="rr-accuracy">
          {accuracy.toFixed(1)}%
        </strong>
      </div>

      <div className="rr-hit-stats">
        <div>
          <span className="rr-perfect">PERFECT</span>
          <strong>{player.perfect}</strong>
        </div>

        <div>
          <span className="rr-good">GOOD</span>
          <strong>{player.good}</strong>
        </div>

        <div>
          <span className="rr-miss">MISS</span>
          <strong>{player.misses}</strong>
        </div>
      </div>
    </div>
  );
}
