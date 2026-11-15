
  interface FallingNoteProps {
    lane: number;
    time: number;
    elapsedMs: number;
    approachTime: number;
    status?: "pending" | "perfect" | "good" | "missed";
  }

  const laneColors = [
    "#9B7BFF",
    "#F472B6",
    "#FB923C",
    "#5EEAD4",
  ];

  export default function FallingNote({
    lane,
    time,
    elapsedMs,
    approachTime,
    status = "pending",
  }: FallingNoteProps) {
    const progress = Math.max(
      0,
      Math.min(1, 1 - (time - elapsedMs) / approachTime)
    );

    // Hit line is positioned at 85% of the lane.
    const position = progress * 85;

    const color = laneColors[lane] ?? "#FFFFFF";

    return (
      <div
        className={`rr-note ${status === "missed" ? "rr-note-missed" : ""}`}
        style={{
          top: `${position}%`,
          backgroundColor: color,
          boxShadow: `0 0 18px ${color}80`,
        }}
      />
    );
  }
