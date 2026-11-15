
import {
  lazy,
  Suspense,
  type ComponentType,
  type LazyExoticComponent,
} from "react";

export interface RhythmNote {
  id: number;
  lane: number;
  time: number;
}

export interface RhythmConfig {
  durationMs: number;
  approachTime: number;
  beatInterval: number;
  firstNoteTime: number;
  perfectWindow: number;
  goodWindow: number;
}

export interface GameRendererProps {
  sessionId: string;
  players: any[];
  socket: any;
  settings?: Record<string, any>;
  beatChart?: RhythmNote[];
  startAt?: number;
  rhythmConfig?: RhythmConfig;
  onEnd: (result: any) => void;
}

type GameComponent = LazyExoticComponent<
  ComponentType<GameRendererProps>
>;

const RhythmRush: GameComponent = lazy(() =>
  import("../games/rhythm-rush/RhythmRush").then((module) => ({
    default: module.default as ComponentType<GameRendererProps>,
  }))
);

const FruitFrenzy: GameComponent = lazy(() =>
  import("../games/fruit-frenzy/FruitFrenzy").then((module) => ({
    default: module.default as ComponentType<GameRendererProps>,
  }))
);

const SwordClash: GameComponent = lazy(() =>
  import("../games/sword-clash/SwordClash").then((module) => ({
    default: module.default as ComponentType<GameRendererProps>,
  }))
);

const ReflexWars: GameComponent = lazy(() =>
  import("../games/reflex-wars/ReflexWars").then((module) => ({
    default: module.default as ComponentType<GameRendererProps>,
  }))
);

interface Props {
  gameId: string;
  sessionId: string;
  players: any[];
  socket: any;
  settings?: Record<string, any>;
  beatChart?: RhythmNote[];
  startAt?: number;
  rhythmConfig?: RhythmConfig;
  onEnd: (result: any) => void;
}

export default function GameRenderer({
  gameId,
  sessionId,
  players,
  socket,
  settings = {},
  beatChart,
  startAt,
  rhythmConfig,
  onEnd,
}: Props) {
  const gameProps: GameRendererProps = {
    sessionId,
    players,
    socket,
    settings,
    beatChart,
    startAt,
    rhythmConfig,
    onEnd,
  };

  let SelectedGame: GameComponent;

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
