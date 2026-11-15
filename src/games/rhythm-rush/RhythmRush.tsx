
function FinalComparison({ players }: { players: any[] }) {
  const sortedPlayers = [...players].sort(
    (a, b) => b.score - a.score
  );

  const winner = sortedPlayers[0];

  const stats = [
    { label: "Perfect", key: "perfect" },
    { label: "Good", key: "good" },
    { label: "Missed", key: "misses" },
    { label: "Incorrect", key: "incorrect" },
    { label: "Accuracy", key: "accuracy" },
    { label: "Final Score", key: "score" },
  ];

  const formatValue = (player: any, key: string) => {
    const value = Number(player[key] || 0);

    if (key === "accuracy") return `${value.toFixed(1)}%`;
    return value.toLocaleString();
  };

  return (
    <div className="rr-final-comparison">
      <div className="rr-champion">
        <div className="rr-champion-glow" />

        <div className="rr-champion-label">
          <span>🏆</span> PLAYVERSE CHAMPION
        </div>

        <div className="rr-champion-name">
          {winner?.nickname || "Winner"}
        </div>

        <div className="rr-champion-score">
          {Number(winner?.score || 0).toLocaleString()}
        </div>

        <div className="rr-champion-caption">
          FINAL SCORE
        </div>
      </div>

      <div className="rr-comparison-table-section">
        <div className="rr-comparison-title">
          <div className="rr-eyebrow">THE FINAL RESULTS</div>
          <h2>MATCH COMPARISON</h2>
        </div>

        <div className="rr-comparison-table-wrap">
          <table className="rr-comparison-table">
            <thead>
              <tr>
                <th>STATISTICS</th>

                {sortedPlayers.map((player, index) => (
                  <th
                    key={player.playerId}
                    className={index === 0 ? "rr-winner-column" : ""}
                  >
                    <span className="rr-table-player-rank">
                      {index === 0 ? "🥇" : `#${index + 1}`}
                    </span>
                    {player.nickname || player.playerId}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {stats.map((stat) => (
                <tr key={stat.key}>
                  <td>{stat.label}</td>

                  {sortedPlayers.map((player, index) => (
                    <td
                      key={player.playerId}
                      className={index === 0 ? "rr-winner-column" : ""}
                    >
                      {formatValue(player, stat.key)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rr-comparison-footer">
        PLAYVERSE ORIGINAL · RHYTHM RUSH
      </div>
    </div>
  );
}
