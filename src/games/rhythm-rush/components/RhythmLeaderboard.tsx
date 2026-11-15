
import type { PlayerStats } from "../hooks/UseRhythmEngine.ts";

interface RhythmLeaderboardProps {
  players: PlayerStats[];
}

export default function RhythmLeaderboard({
  players,
}: RhythmLeaderboardProps) {
  const rankedPlayers = [...players].sort(
    (a, b) => b.score - a.score
  );

  return (
    <div className="rr-leaderboard">
      <div className="rr-leaderboard-heading">
        LIVE LEADERBOARD
      </div>

      {rankedPlayers.length === 0 ? (
        <p className="rr-empty">
          Waiting for player scores...
        </p>
      ) : (
        <div className="rr-leaderboard-list">
          {rankedPlayers.map((player, index) => (
            <div
              key={player.playerId}
              className="rr-leaderboard-row"
            >
              <div className="rr-leaderboard-player">
                <span className="rr-rank">
                  #{index + 1}
                </span>

                <span className="rr-leaderboard-name">
                  {player.nickname}
                </span>
              </div>

              <strong>
                {player.score.toLocaleString()}
              </strong>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
