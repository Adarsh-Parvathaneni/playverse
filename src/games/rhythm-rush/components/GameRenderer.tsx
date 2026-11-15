
import { lazy, Suspense } from "react";

const RhythmRush = lazy(
  () => import("../games/rhythm-rush/RhythmRush")
);

const FruitFrenzy = lazy(
  () => import("../games/fruit-frenzy/FruitFrenzy")
);

const SwordClash = lazy(
  () => import("../games/sword-clash/SwordClash")
);

const ReflexWars = lazy(
  () => import("../games/reflex-wars/ReflexWars")
);

interface GameRendererProps {
  gameId: string;
  sessionId: string;
  players: any[];
  socket: any;
  settings?: Record<string, any>;
  onEnd: (result: any) => void;
}

export default function GameRenderer({
  gameId,
  sessionId,
  players,
  socket,
  settings = {},
  onEnd,
}: GameRendererProps) {
  const gameProps = {
    sessionId,
    players,
    socket,
    settings,
    onEnd,
  };

  let SelectedGame;

  switch (gameId) {
    case "rhythm-rush":
      SelectedGame = RhythmRush;
      break;

    case "fruit-frenzy":
      SelectedGame = FruitFrenzy;
      break;

    case "sword-clash":
      SelectedGame = SwordClash;
      break;

    case "reflex-wars":
      SelectedGame = ReflexWars;
      break;

    default:
      return (
        <div className="flex min-h-screen items-center justify-center bg-black text-white">
          Game not found.
        </div>
      );
  }

  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-black text-white">
          Loading game...
        </div>
      }
    >
      <SelectedGame {...gameProps} />
    </Suspense>
  );
}
