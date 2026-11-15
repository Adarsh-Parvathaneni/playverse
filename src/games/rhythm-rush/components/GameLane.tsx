
import FallingNote from "./FallingNote";
import type { ActiveNote } from "../hooks/UseRhythmEngine.ts";

interface GameLaneProps {
  laneIndex: number;
  notes: ActiveNote[];
  elapsedMs: number;
  approachTime: number;
  onHit?: (lane: number) => void;
}

const lanes = [
  {
    name: "AMETHYST",
    color: "#9B7BFF",
    background: "rgba(155, 123, 255, 0.08)",
  },
  {
    name: "ROSE",
    color: "#F472B6",
    background: "rgba(244, 114, 182, 0.08)",
  },
  {
    name: "APRICOT",
    color: "#FB923C",
    background: "rgba(251, 146, 60, 0.08)",
  },
  {
    name: "AQUA",
    color: "#5EEAD4",
    background: "rgba(94, 234, 212, 0.08)",
  },
];

export default function GameLane({
  laneIndex,
  notes,
  elapsedMs,
  approachTime,
}: GameLaneProps) {
  const lane = lanes[laneIndex];

  if (!lane) return null;

  const laneNotes = notes.filter(
    (note) => note.lane === laneIndex
  );

  return (
    <div
      className="rr-lane"
      style={{ background: lane.background }}
    >
      <div
        className="rr-lane-heading"
        style={{ color: lane.color }}
      >
        {lane.name}
      </div>

      {laneNotes.map((note) => (
        <FallingNote
          key={note.id}
          lane={note.lane}
          time={note.time}
          elapsedMs={elapsedMs}
          approachTime={approachTime}
          status={note.status}
        />
      ))}

      <div className="rr-hit-zone">
        <div
          className="rr-hit-line"
          style={{
            background: lane.color,
            boxShadow: `0 0 18px ${lane.color}90`,
          }}
        />

        <div
          className="rr-hit-box"
          style={{
            borderColor: `${lane.color}90`,
            background: `${lane.color}15`,
          }}
        />
      </div>
    </div>
  );
}
