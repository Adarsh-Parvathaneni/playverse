
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

type GameModule = {
  default: ComponentType<GameRendererProps>;
};

function loadGame(
  importer: () => Promise<{ default?: ComponentType<GameRendererProps> }>,
  gameName: string
): Promise<GameModule> {
  return importer().then((module) => {
    if (!module.default) {
      throw new Error(
        `${gameName} does not have a valid default export.`
      );
    }

    return { default: module.default };
  });
}

type GameComponent = LazyExoticComponent<
  ComponentType<GameRendererProps>
>;

const RhythmRush = lazy(() =>
  loadGame(
    () => import("../games/rhythm-rush/RhythmRush"),
    "Rhythm Rush"
  )
);

const FruitFrenzy = lazy(() =>
  loadGame(
    () => import("../games/fruit-frenzy/FruitFrenzy"),
    "Fruit Frenzy"
  )
);

const SwordClash = lazy(() =>
  loadGame(
    () => import("../games/sword-clash/SwordClash"),
    "Sword Clash"
  )
);

const ReflexWars = lazy(() =>
  loadGame(
    () => import("../games/reflex-wars/ReflexWars"),
    "Reflex Wars"
  )
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
