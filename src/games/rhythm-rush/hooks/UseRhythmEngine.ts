
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
  onComplete?: (result: any) => void;
}

const APPROACH_TIME = 2000;
const PERFECT_WINDOW = 100;
const GOOD_WINDOW = 220;

const LANES = 4;
const BEAT_INTERVAL = 500;

function generateBeatChart(durationMs: number): RhythmNote[] {
  const notes: RhythmNote[] = [];

  let id = 0;

  for (
    let time = 2500;
    time < durationMs + APPROACH_TIME;
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

export function useRhythmEngine({
  players,
  socket,
  durationSeconds = 60,
  onComplete,
}: UseRhythmEngineProps) {
  const durationMs = durationSeconds * 1000;

  const [elapsedMs, setElapsedMs] = useState(0);
  const [notes, setNotes] = useState<ActiveNote[]>([]);
  const [scores, setScores] = useState<PlayerStats[]>(() =>
    createInitialStats(players)
  );
  const [finished, setFinished] = useState(false);

  const startTimeRef = useRef<number>(0);
  const frameRef = useRef<number>(0);
  const inputEventsRef = useRef<RhythmInputEvent[]>([]);
  const statsRef = useRef<PlayerStats[]>(createInitialStats(players));
  const finishedRef = useRef(false);

  const chartRef = useRef<RhythmNote[]>(
    generateBeatChart(durationMs)
  );

  const processedNotesRef = useRef<Set<string>>(new Set());

  const updatePlayerStats = useCallback(
    (
      playerId: string,
      update: (stats: PlayerStats) => PlayerStats
    ) => {
      const nextStats = statsRef.current.map((player) =>
        player.playerId === playerId ? update(player) : player
      );

      statsRef.current = nextStats;
      setScores(nextStats);
    },
    []
  );

  const handleInput = useCallback(
    (event: any) => {
      if (finishedRef.current) return;

      if (event.sessionId !== undefined && event.sessionId === null) {
        return;
      }

      const playerId = event.playerId;
      const lane = event.input?.lane;

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

      const currentTime = Math.min(
        performance.now() - startTimeRef.current,
        durationMs
      );

      const matchingNotes = chartRef.current
        .filter((note) => {
          const key = `${playerId}-${note.id}`;

          return (
            note.lane === lane &&
            !processedNotesRef.current.has(key) &&
            Math.abs(note.time - currentTime) <= GOOD_WINDOW
          );
        })
        .sort(
          (a, b) =>
            Math.abs(a.time - currentTime) -
            Math.abs(b.time - currentTime)
        );

      const note = matchingNotes[0];

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

      const difference = Math.abs(note.time - currentTime);

      const isPerfect = difference <= PERFECT_WINDOW;
      const points = isPerfect ? 100 : 60;
      const result = isPerfect ? "perfect" : "good";

      processedNotesRef.current.add(`${playerId}-${note.id}`);

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

      inputEventsRef.current.push({
        playerId,
        lane,
        timestamp: currentTime,
        result,
        points,
      });
    },
    [durationMs, updatePlayerStats]
  );

  useEffect(() => {
    if (!socket) return;

    socket.on("game:input", handleInput);

    return () => {
      socket.off("game:input", handleInput);
    };
  }, [socket, handleInput]);

  useEffect(() => {
    startTimeRef.current = performance.now();

    const gameLoop = () => {
      if (finishedRef.current) return;

      const elapsed = performance.now() - startTimeRef.current;

      const currentTime = Math.min(elapsed, durationMs);

      setElapsedMs(currentTime);

      const visibleNotes = chartRef.current
        .filter((note) => {
          return (
            note.time - APPROACH_TIME <= currentTime &&
            note.time >= currentTime - GOOD_WINDOW
          );
        })
        .map((note) => ({
          ...note,
          status: "pending" as const,
        }));

      setNotes(visibleNotes);

      chartRef.current.forEach((note) => {
        if (currentTime <= note.time + GOOD_WINDOW) return;

        players.forEach((player) => {
          const key = `${player.id}-${note.id}`;

          if (processedNotesRef.current.has(key)) return;

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

      if (currentTime >= durationMs + APPROACH_TIME) {
        finishedRef.current = true;
        setFinished(true);

        const finalScores = statsRef.current.map((player) => {
          const total =
            player.perfect + player.good + player.misses;

          const accuracy =
            total === 0
              ? 100
              : ((player.perfect + player.good) / total) * 100;

          return {
            ...player,
            accuracy: Number(accuracy.toFixed(2)),
          };
        });

        setScores(finalScores);

        onComplete?.({
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
      cancelAnimationFrame(frameRef.current);
    };
  }, [durationMs, players, updatePlayerStats, onComplete]);

  return {
    elapsedMs,
    durationMs,
    notes,
    scores,
    finished,
    inputEvents: inputEventsRef.current,
    approachTime: APPROACH_TIME,
  };
}
