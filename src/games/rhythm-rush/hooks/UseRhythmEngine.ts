
import { useCallback, useEffect, useRef, useState } from "react";

export interface RhythmNote {
  id: number;
  lane: number;
  time: number;
}

export interface ActiveNote extends RhythmNote {
  status: "pending" | "perfect" | "good" | "missed";
}

export interface PlayerStats {
  playerId: string;
  nickname: string;
  score: number;
  combo: number;
  bestCombo: number;
  perfect: number;
  good: number;
  misses: number;
  incorrect: number;
  accuracy: number;
}

export interface RhythmInputEvent {
  playerId: string;
  lane: number;
  timestamp: number;
  result: "perfect" | "good" | "miss" | "incorrect";
  points: number;
}

interface UseRhythmEngineProps {
  players: any[];
  socket: any;
  durationSeconds?: number;
  beatChart?: RhythmNote[];
  startAt?: number;
  rhythmConfig?: {
    durationMs: number;
    approachTime: number;
    beatInterval: number;
    firstNoteTime: number;
    perfectWindow: number;
    goodWindow: number;
  };
  onComplete?: (result: any) => void;
}

// ==========================================
// DEFAULT GAME CONFIGURATION
// ==========================================

const APPROACH_TIME = 3500;
const PERFECT_WINDOW = 150;
const GOOD_WINDOW = 300;

const LANES = 4;
const BEAT_INTERVAL = 500;

// ==========================================
// FALLBACK BEAT CHART
// ==========================================

function generateBeatChart(durationMs: number): RhythmNote[] {
  const notes: RhythmNote[] = [];

  let id = 0;

  for (
    let time = 3500;
    time < durationMs;
    time += BEAT_INTERVAL
  ) {
    const lane = (id * 3 + Math.floor(id / 4)) % LANES;

    notes.push({
      id,
      lane,
      time,
    });

    id++;
  }

  return notes;
}

// ==========================================
// INITIAL PLAYER STATS
// ==========================================

function createInitialStats(players: any[]): PlayerStats[] {
  return players.map((player) => ({
    playerId: player.id,
    nickname: player.nickname,
    score: 0,
    combo: 0,
    bestCombo: 0,
    perfect: 0,
    good: 0,
    misses: 0,
    incorrect: 0,
    accuracy: 100,
  }));
}

// ==========================================
// RHYTHM ENGINE
// ==========================================

export function useRhythmEngine({
  players,
  socket,
  durationSeconds = 60,
  beatChart,
  startAt,
  rhythmConfig,
  onComplete,
}: UseRhythmEngineProps) {
  const durationMs =
    rhythmConfig?.durationMs ?? durationSeconds * 1000;

  const approachTime =
    rhythmConfig?.approachTime ?? APPROACH_TIME;

  const perfectWindow =
    rhythmConfig?.perfectWindow ?? PERFECT_WINDOW;

  const goodWindow =
    rhythmConfig?.goodWindow ?? GOOD_WINDOW;

  // ----------------------------------------
  // REACT STATE
  // ----------------------------------------

  const [elapsedMs, setElapsedMs] = useState(0);
  const [notes, setNotes] = useState<ActiveNote[]>([]);

  const [scores, setScores] = useState<PlayerStats[]>(() =>
    createInitialStats(players)
  );

  const [finished, setFinished] = useState(false);

  const [hitFeedback, setHitFeedback] = useState<
    Record<string, { lane: number; trigger: number }>
  >({});

  // ----------------------------------------
  // ENGINE REFS
  // ----------------------------------------

  const frameRef = useRef<number | null>(null);

  const inputEventsRef = useRef<RhythmInputEvent[]>([]);

  const statsRef = useRef<PlayerStats[]>(
    createInitialStats(players)
  );

  const finishedRef = useRef(false);

  // Use the backend-generated chart when available.
  const chartRef = useRef<RhythmNote[]>(
    beatChart?.length
      ? beatChart
      : generateBeatChart(durationMs)
  );

  // Use the backend's official start timestamp.
  const officialStartAtRef = useRef<number>(
    startAt ?? Date.now()
  );

  const processedNotesRef = useRef<Set<string>>(new Set());

  const playersRef = useRef(players);
  const onCompleteRef = useRef(onComplete);

  playersRef.current = players;
  onCompleteRef.current = onComplete;

  // ----------------------------------------
  // UPDATE PLAYER STATS
  // ----------------------------------------

  const updatePlayerStats = useCallback(
    (
      playerId: string,
      update: (stats: PlayerStats) => PlayerStats
    ) => {
      const nextStats = statsRef.current.map((player) =>
        player.playerId === playerId
          ? update(player)
          : player
      );

      statsRef.current = nextStats;
      setScores(nextStats);
    },
    []
  );

  // ----------------------------------------
  // HANDLE PHONE INPUT
  // ----------------------------------------

  const handleInput = useCallback(
    (event: any) => {
      if (finishedRef.current) return;

      const playerId = event?.playerId;
      const lane = event?.input?.lane;

      if (
        typeof playerId !== "string" ||
        !Number.isInteger(lane) ||
        lane < 0 ||
        lane >= LANES
      ) {
        return;
      }

      const currentPlayer = statsRef.current.find(
        (player) => player.playerId === playerId
      );

      if (!currentPlayer) return;

      // Use the backend's input receipt timestamp.
      const receivedAt =
        typeof event.receivedAt === "number"
          ? event.receivedAt
          : Date.now();

      const currentTime =
        receivedAt - officialStartAtRef.current;

      // Ignore taps before the official game start.
      if (currentTime < 0 || currentTime > durationMs) {
        return;
      }

      // Find the closest unprocessed note
      // in the lane the player pressed.
      const matchingNotes = chartRef.current
        .filter((note) => {
          const key = `${playerId}-${note.id}`;

          return (
            note.lane === lane &&
            !processedNotesRef.current.has(key) &&
            Math.abs(note.time - currentTime) <= goodWindow
          );
        })
        .sort(
          (a, b) =>
            Math.abs(a.time - currentTime) -
            Math.abs(b.time - currentTime)
        );

      const note = matchingNotes[0];

      // --------------------------------------
      // INCORRECT INPUT
      // --------------------------------------

      if (!note) {
        updatePlayerStats(playerId, (stats) => ({
          ...stats,
          score: Math.max(0, stats.score - 15),
          combo: 0,
          incorrect: stats.incorrect + 1,
        }));

        inputEventsRef.current.push({
          playerId,
          lane,
          timestamp: currentTime,
          result: "incorrect",
          points: -15,
        });

        return;
      }

      // --------------------------------------
      // SUCCESSFUL HIT
      // --------------------------------------

      const difference = Math.abs(
        note.time - currentTime
      );

      const isPerfect = difference <= perfectWindow;

      const points = isPerfect ? 100 : 60;

      const result = isPerfect ? "perfect" : "good";

      // Each player has independent note processing.
      processedNotesRef.current.add(
        `${playerId}-${note.id}`
      );

      // Trigger the lane hit animation.
      setHitFeedback((current) => ({
        ...current,
        [playerId]: {
          lane,
          trigger: performance.now(),
        },
      }));

      // Update score.
      updatePlayerStats(playerId, (stats) => {
        const combo = stats.combo + 1;

        return {
          ...stats,
          score: stats.score + points,
          combo,
          bestCombo: Math.max(stats.bestCombo, combo),
          perfect: stats.perfect + (isPerfect ? 1 : 0),
          good: stats.good + (isPerfect ? 0 : 1),
        };
      });

      // Record input event.
      inputEventsRef.current.push({
        playerId,
        lane,
        timestamp: currentTime,
        result,
        points,
      });
    },
    [
      durationMs,
      goodWindow,
      perfectWindow,
      updatePlayerStats,
    ]
  );

  // ----------------------------------------
  // SOCKET LISTENER
  // ----------------------------------------

  useEffect(() => {
    if (!socket) return;

    socket.on("game:input", handleInput);

    return () => {
      socket.off("game:input", handleInput);
    };
  }, [socket, handleInput]);

  // ----------------------------------------
  // MAIN GAME LOOP
  // ----------------------------------------

  useEffect(() => {
    finishedRef.current = false;

    const gameLoop = () => {
      if (finishedRef.current) return;

      // Synchronize the game clock with the backend.
      const currentTime =
        Date.now() - officialStartAtRef.current;

      // Do not display negative elapsed time
      // while waiting for the official start.
      setElapsedMs(Math.max(0, currentTime));

      // ------------------------------------
      // VISIBLE NOTES
      // ------------------------------------

      const visibleNotes = chartRef.current
        .filter((note) => {
          return (
            note.time - approachTime <= currentTime &&
            note.time >= currentTime - goodWindow
          );
        })
        .map((note) => ({
          ...note,
          status: "pending" as const,
        }));

      setNotes(visibleNotes);

      // ------------------------------------
      // MISSED NOTES
      // ------------------------------------

      chartRef.current.forEach((note) => {
        if (currentTime <= note.time + goodWindow) {
          return;
        }

        playersRef.current.forEach((player) => {
          const key = `${player.id}-${note.id}`;

          if (processedNotesRef.current.has(key)) {
            return;
          }

          processedNotesRef.current.add(key);

          updatePlayerStats(player.id, (stats) => ({
            ...stats,
            score: Math.max(0, stats.score - 30),
            combo: 0,
            misses: stats.misses + 1,
          }));

          inputEventsRef.current.push({
            playerId: player.id,
            lane: note.lane,
            timestamp: note.time,
            result: "miss",
            points: -30,
          });
        });
      });

      // ------------------------------------
      // GAME FINISH
      // ------------------------------------

      if (currentTime >= durationMs + approachTime) {
        finishedRef.current = true;

        setFinished(true);

        const finalScores = statsRef.current.map((player) => {
          const total =
            player.perfect +
            player.good +
            player.misses;

          const accuracy =
            total === 0
              ? 100
              : ((player.perfect + player.good) / total) * 100;

          return {
            ...player,
            accuracy: Number(accuracy.toFixed(2)),
          };
        });

        statsRef.current = finalScores;

        setScores(finalScores);

        onCompleteRef.current?.({
          duration: durationMs,
          scores: finalScores,
          inputEvents: inputEventsRef.current,
          completed: true,
        });

        return;
      }

      frameRef.current = requestAnimationFrame(gameLoop);
    };

    frameRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, [
    durationMs,
    approachTime,
    goodWindow,
    updatePlayerStats,
  ]);

  // ----------------------------------------
  // NOTES FOR EACH PLAYER
  // ----------------------------------------

  const getNotesForPlayer = useCallback(
    (playerId: string) => {
      return notes.filter(
        (note) =>
          !processedNotesRef.current.has(
            `${playerId}-${note.id}`
          )
      );
    },
    [notes]
  );

  // ----------------------------------------
  // RETURN ENGINE DATA
  // ----------------------------------------

  return {
    elapsedMs,
    durationMs,
    notes,
    scores,
    finished,
    hitFeedback,
    getNotesForPlayer,
    inputEvents: inputEventsRef.current,
    approachTime,
  };
}
