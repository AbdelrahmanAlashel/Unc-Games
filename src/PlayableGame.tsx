import { useEffect, useMemo, useRef, useState, type CSSProperties, type DragEvent, type ReactNode } from "react";
import { Chess, type Square } from "chess.js";
import type { Game, GameSlug } from "./gameData";

function GamePanel({
  title,
  status,
  children,
  actions,
  className = "",
  meta,
}: {
  title: string;
  status: string;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
  meta?: ReactNode;
}) {
  return (
    <div className={`play-panel ${className}`}>
      <div className="play-panel-header">
        <div>
          <p className="panel-label">{title}</p>
          <strong>{status}</strong>
        </div>
        {actions ? <div className="panel-actions">{actions}</div> : null}
      </div>
      {meta ? <div className="timer-strip">{meta}</div> : null}
      {children}
    </div>
  );
}

function ControlButton({
  children,
  onClick,
  disabled,
  className = "",
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button className={`control-button ${className}`.trim()} disabled={disabled} onClick={() => onClick()} type="button">
      {children}
    </button>
  );
}

type Difficulty = "Easy" | "Medium" | "Hard";
type TimerStatsRecord = {
  best: number | null;
  count: number;
  started: number;
  total: number;
};
type ScoreStatsRecord = {
  best: number | null;
  count: number;
  total: number;
};
type Outcome = "wins" | "losses" | "draws";
type OutcomeStatsRecord = Record<Outcome, number>;

const timeStatsStorageKey = "unc-games-time-stats-v1";
const scoreStatsStorageKey = "unc-games-score-stats-v1";
const outcomeStatsStorageKey = "unc-games-outcome-stats-v1";
const standardDifficulty = "Standard";
const difficultyOptions: Difficulty[] = ["Easy", "Medium", "Hard"];
const recentGameStarts = new Map<string, number>();

function formatTime(seconds: number | null) {
  if (seconds === null) {
    return "--:--";
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

function emptyTimerStats(): TimerStatsRecord {
  return { best: null, count: 0, started: 0, total: 0 };
}

function emptyScoreStats(): ScoreStatsRecord {
  return { best: null, count: 0, total: 0 };
}

function emptyOutcomeStats(): OutcomeStatsRecord {
  return { wins: 0, losses: 0, draws: 0 };
}

function getTimerStatsKey(game: GameSlug, difficulty: string) {
  return `${game}:${difficulty}`;
}

function getPersistentStatsKey(game: GameSlug, difficulty: string) {
  return `${game}:${difficulty}`;
}

function readTimerStats() {
  try {
    const stored = JSON.parse(localStorage.getItem(timeStatsStorageKey) || "{}") as Record<string, Partial<TimerStatsRecord>>;

    return Object.fromEntries(
      Object.entries(stored).map(([key, value]) => [
        key,
        {
          best: typeof value.best === "number" ? value.best : null,
          count: typeof value.count === "number" ? value.count : 0,
          started: typeof value.started === "number" ? value.started : typeof value.count === "number" ? value.count : 0,
          total: typeof value.total === "number" ? value.total : 0,
        },
      ]),
    ) as Record<string, TimerStatsRecord>;
  } catch {
    return {};
  }
}

function saveTimerStats(key: string, stats: TimerStatsRecord) {
  const allStats = readTimerStats();
  localStorage.setItem(timeStatsStorageKey, JSON.stringify({ ...allStats, [key]: stats }));
  return stats;
}

function readScoreStats() {
  try {
    const stored = JSON.parse(localStorage.getItem(scoreStatsStorageKey) || "{}") as Record<string, Partial<ScoreStatsRecord>>;

    return Object.fromEntries(
      Object.entries(stored).map(([key, value]) => [
        key,
        {
          best: typeof value.best === "number" ? value.best : null,
          count: typeof value.count === "number" ? value.count : 0,
          total: typeof value.total === "number" ? value.total : 0,
        },
      ]),
    ) as Record<string, ScoreStatsRecord>;
  } catch {
    return {};
  }
}

function saveScoreStats(key: string, stats: ScoreStatsRecord) {
  const allStats = readScoreStats();
  localStorage.setItem(scoreStatsStorageKey, JSON.stringify({ ...allStats, [key]: stats }));
  return stats;
}

function readOutcomeStats() {
  try {
    const stored = JSON.parse(localStorage.getItem(outcomeStatsStorageKey) || "{}") as Record<string, Partial<OutcomeStatsRecord>>;

    return Object.fromEntries(
      Object.entries(stored).map(([key, value]) => [
        key,
        {
          wins: typeof value.wins === "number" ? value.wins : 0,
          losses: typeof value.losses === "number" ? value.losses : 0,
          draws: typeof value.draws === "number" ? value.draws : 0,
        },
      ]),
    ) as Record<string, OutcomeStatsRecord>;
  } catch {
    return {};
  }
}

function saveOutcomeStats(key: string, stats: OutcomeStatsRecord) {
  const allStats = readOutcomeStats();
  localStorage.setItem(outcomeStatsStorageKey, JSON.stringify({ ...allStats, [key]: stats }));
  return stats;
}

function saveGameStart(game: GameSlug, difficulty: string, resetKey: number) {
  const key = getTimerStatsKey(game, difficulty);
  const dedupeKey = `${key}:${resetKey}`;
  const now = Date.now();
  const recentStart = recentGameStarts.get(dedupeKey);

  if (recentStart && now - recentStart < 1500) {
    return readTimerStats()[key] ?? emptyTimerStats();
  }

  recentGameStarts.set(dedupeKey, now);
  const current = readTimerStats()[key] ?? emptyTimerStats();
  return saveTimerStats(key, { ...current, started: current.started + 1 });
}

function saveTimerResult(game: GameSlug, difficulty: string, seconds: number) {
  const key = getTimerStatsKey(game, difficulty);
  const current = readTimerStats()[key] ?? emptyTimerStats();
  const next = {
    best: current.best === null ? seconds : Math.min(current.best, seconds),
    count: current.count + 1,
    started: Math.max(current.started, current.count + 1),
    total: current.total + seconds,
  };

  return saveTimerStats(key, next);
}

function saveScoreResult(game: GameSlug, difficulty: string, score: number) {
  const key = getPersistentStatsKey(game, difficulty);
  const current = readScoreStats()[key] ?? emptyScoreStats();
  const next = {
    best: current.best === null ? score : Math.max(current.best, score),
    count: current.count + 1,
    total: current.total + score,
  };

  return saveScoreStats(key, next);
}

function saveOutcomeResult(game: GameSlug, difficulty: string, outcome: Outcome) {
  const key = getPersistentStatsKey(game, difficulty);
  const current = readOutcomeStats()[key] ?? emptyOutcomeStats();
  return saveOutcomeStats(key, { ...current, [outcome]: current[outcome] + 1 });
}

function useGameTimerStats(game: GameSlug, difficulty: string, completed: boolean, resetKey: number) {
  const [seconds, setSeconds] = useState(0);
  const [stats, setStats] = useState<TimerStatsRecord>(() => readTimerStats()[getTimerStatsKey(game, difficulty)] ?? emptyTimerStats());
  const recordedRef = useRef(false);

  useEffect(() => {
    setSeconds(0);
    setStats(saveGameStart(game, difficulty, resetKey));
    recordedRef.current = false;
  }, [difficulty, game, resetKey]);

  useEffect(() => {
    if (completed) {
      return;
    }

    const timer = window.setInterval(() => setSeconds((current) => current + 1), 1000);
    return () => window.clearInterval(timer);
  }, [completed, difficulty, game, resetKey]);

  useEffect(() => {
    if (!completed || recordedRef.current) {
      return;
    }

    recordedRef.current = true;
    setStats(saveTimerResult(game, difficulty, Math.max(1, seconds)));
  }, [completed, difficulty, game, seconds]);

  return {
    average: stats.count ? Math.round(stats.total / stats.count) : null,
    best: stats.best,
    difficulty,
    plays: stats.started,
    seconds,
  };
}

function useScoreStats(game: GameSlug, difficulty: string, completed: boolean, score: number, resetKey: number) {
  const [stats, setStats] = useState<ScoreStatsRecord>(() => readScoreStats()[getPersistentStatsKey(game, difficulty)] ?? emptyScoreStats());
  const recordedRef = useRef(false);

  useEffect(() => {
    setStats(readScoreStats()[getPersistentStatsKey(game, difficulty)] ?? emptyScoreStats());
    recordedRef.current = false;
  }, [difficulty, game, resetKey]);

  useEffect(() => {
    if (!completed || recordedRef.current) {
      return;
    }

    recordedRef.current = true;
    setStats(saveScoreResult(game, difficulty, score));
  }, [completed, difficulty, game, score]);

  return {
    average: stats.count ? Math.round(stats.total / stats.count) : null,
    best: stats.best,
    games: stats.count,
  };
}

function useOutcomeStats(game: GameSlug, difficulty: string, outcome: Outcome | null, resetKey: number) {
  const [stats, setStats] = useState<OutcomeStatsRecord>(() => readOutcomeStats()[getPersistentStatsKey(game, difficulty)] ?? emptyOutcomeStats());
  const recordedRef = useRef(false);

  useEffect(() => {
    setStats(readOutcomeStats()[getPersistentStatsKey(game, difficulty)] ?? emptyOutcomeStats());
    recordedRef.current = false;
  }, [difficulty, game, resetKey]);

  useEffect(() => {
    if (!outcome || recordedRef.current) {
      return;
    }

    recordedRef.current = true;
    setStats(saveOutcomeResult(game, difficulty, outcome));
  }, [difficulty, game, outcome]);

  return stats;
}

function TimerStats({
  stats,
  showDifficulty = true,
  showHistory = true,
}: {
  stats: ReturnType<typeof useGameTimerStats>;
  showDifficulty?: boolean;
  showHistory?: boolean;
}) {
  return (
    <>
      <span>Time {formatTime(stats.seconds)}</span>
      {showDifficulty && showHistory ? <span>{stats.difficulty}</span> : null}
      {showHistory ? (
        <>
          <span>Best {formatTime(stats.best)}</span>
          <span>Average {formatTime(stats.average)}</span>
          <span>Games {stats.plays}</span>
        </>
      ) : null}
    </>
  );
}

function ScoreStats({ stats }: { stats: ReturnType<typeof useScoreStats> }) {
  return (
    <>
      <span>Best score {stats.best ?? 0}</span>
      <span>Average score {stats.average ?? 0}</span>
      <span>Scored games {stats.games}</span>
    </>
  );
}

function OutcomeStats({ stats }: { stats: OutcomeStatsRecord }) {
  return (
    <>
      <span>Wins {stats.wins}</span>
      <span>Losses {stats.losses}</span>
      <span>Draws {stats.draws}</span>
    </>
  );
}

function OptionTabs<T extends string>({
  active,
  label = "Choose difficulty",
  onChange,
  options,
}: {
  active: T;
  label?: string;
  onChange: (option: T) => void;
  options: readonly T[];
}) {
  return (
    <div className="difficulty-tabs" role="group" aria-label={label}>
      {options.map((option) => (
        <button aria-pressed={active === option} className="difficulty-tab" key={option} onClick={() => onChange(option)} type="button">
          {option}
        </button>
      ))}
    </div>
  );
}

function DifficultyTabs({
  active,
  onChange,
}: {
  active: Difficulty;
  onChange: (difficulty: Difficulty) => void;
}) {
  return <OptionTabs active={active} onChange={onChange} options={difficultyOptions} />;
}

const sudokuCluesByDifficulty: Record<Difficulty, number> = {
  Easy: 42,
  Medium: 34,
  Hard: 27,
};

function range(length: number) {
  return Array.from({ length }, (_, index) => index);
}

function shuffle<T>(items: T[]) {
  const next = [...items];

  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }

  return next;
}

function generateSudokuPuzzle(difficulty: Difficulty) {
  const rowOrder = shuffle(range(3)).flatMap((band) => shuffle(range(3)).map((row) => band * 3 + row));
  const colOrder = shuffle(range(3)).flatMap((stack) => shuffle(range(3)).map((col) => stack * 3 + col));
  const numbers = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  const solution = rowOrder.flatMap((row) =>
    colOrder.map((col) => numbers[(row * 3 + Math.floor(row / 3) + col) % 9]),
  );
  const puzzle = [...solution];
  const hiddenCells = shuffle(range(81)).slice(0, 81 - sudokuCluesByDifficulty[difficulty]);

  hiddenCells.forEach((index) => {
    puzzle[index] = 0;
  });

  return { puzzle, solution };
}

function SudokuGame() {
  const [difficulty, setDifficulty] = useState<Difficulty>("Easy");
  const [round, setRound] = useState(0);
  const [game, setGame] = useState(() => generateSudokuPuzzle("Easy"));
  const [values, setValues] = useState(game.puzzle);
  const [selected, setSelected] = useState<number | null>(null);
  const errors = values.filter((value, index) => value !== 0 && value !== game.solution[index]).length;
  const complete = values.every((value, index) => value === game.solution[index]);
  const filled = values.filter(Boolean).length;
  const selectedValue = selected === null ? 0 : values[selected];
  const correctCounts = [1, 2, 3, 4, 5, 6, 7, 8, 9].reduce<Record<number, number>>((counts, value) => {
    counts[value] = values.filter((cell, index) => cell === value && cell === game.solution[index]).length;
    return counts;
  }, {});
  const timerStats = useGameTimerStats("sudoku", difficulty, complete, round);

  function startNewPuzzle(nextDifficulty = difficulty) {
    const nextGame = generateSudokuPuzzle(nextDifficulty);
    setDifficulty(nextDifficulty);
    setGame(nextGame);
    setValues(nextGame.puzzle);
    setSelected(null);
    setRound((current) => current + 1);
  }

  useEffect(() => {
    if (!complete) {
      return;
    }

    const timer = window.setTimeout(() => startNewPuzzle(), 1400);
    return () => window.clearTimeout(timer);
  }, [complete]);

  function setCellValue(value: number) {
    if (selected === null || game.puzzle[selected] !== 0) {
      return;
    }

    setValues((current) => current.map((cell, index) => (index === selected ? (cell === value ? 0 : value) : cell)));
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key >= "1" && event.key <= "9") {
        event.preventDefault();
        setCellValue(Number(event.key));
      }

      if (event.key === "Backspace" || event.key === "Delete" || event.key === "0") {
        event.preventDefault();
        setCellValue(0);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  return (
    <GamePanel
      title="Sudoku"
      status={complete ? "Solved, loading next puzzle" : `${filled}/81 filled, ${errors} mistakes`}
      actions={<ControlButton onClick={() => startNewPuzzle()}>New puzzle</ControlButton>}
      meta={<TimerStats stats={timerStats} />}
    >
      <div className="sudoku-layout">
        <DifficultyTabs active={difficulty} onChange={startNewPuzzle} />
        <div className="sudoku-board">
          {values.map((value, index) => {
            const locked = game.puzzle[index] !== 0;
            const wrong = value !== 0 && value !== game.solution[index];
            const sameNumber = selectedValue !== 0 && value === selectedValue;
            const dimmed = selectedValue !== 0 && value !== 0 && value !== selectedValue;

            return (
              <button
                aria-label={`Sudoku cell ${Math.floor(index / 9) + 1}, ${(index % 9) + 1}`}
                className={`sudoku-cell ${locked ? "locked" : ""} ${wrong ? "wrong" : ""} ${selected === index ? "selected" : ""} ${
                  sameNumber ? "same-number" : ""
                } ${dimmed ? "dimmed-number" : ""}`}
                key={index}
                onClick={() => setSelected(index)}
                type="button"
              >
                {value || ""}
              </button>
            );
          })}
        </div>
        <div className="number-pad" aria-label="Sudoku number pad">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((value) => {
            const completedNumber = correctCounts[value] >= 9;

            return (
              <ControlButton
                className={completedNumber ? "complete-number" : ""}
                disabled={completedNumber}
                key={value}
                onClick={() => setCellValue(value)}
              >
                {value}
              </ControlButton>
            );
          })}
          <ControlButton onClick={() => setCellValue(0)}>Clear</ControlButton>
        </div>
      </div>
    </GamePanel>
  );
}

type MineCell = {
  mine: boolean;
  adjacent: number;
  revealed: boolean;
  flagged: boolean;
};

type MineConfig = {
  mines: number;
  size: number;
};

const mineConfigs: Record<Difficulty, MineConfig> = {
  Easy: { size: 9, mines: 10 },
  Medium: { size: 12, mines: 24 },
  Hard: { size: 16, mines: 45 },
};

function createEmptyMineBoard(size: number): MineCell[] {
  return Array.from({ length: size * size }, () => ({ mine: false, adjacent: 0, revealed: false, flagged: false }));
}

function neighbors(index: number, size: number) {
  const row = Math.floor(index / size);
  const col = index % size;
  const cells: number[] = [];

  for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
    for (let colOffset = -1; colOffset <= 1; colOffset += 1) {
      if (rowOffset === 0 && colOffset === 0) {
        continue;
      }

      const nextRow = row + rowOffset;
      const nextCol = col + colOffset;

      if (nextRow >= 0 && nextRow < size && nextCol >= 0 && nextCol < size) {
        cells.push(nextRow * size + nextCol);
      }
    }
  }

  return cells;
}

function createMineBoard(safeIndex: number, config: MineConfig): MineCell[] {
  const board = createEmptyMineBoard(config.size);
  const blocked = new Set([safeIndex, ...neighbors(safeIndex, config.size)]);
  let placed = 0;

  while (placed < config.mines) {
    const index = Math.floor(Math.random() * board.length);

    if (!board[index].mine && !blocked.has(index)) {
      board[index] = { ...board[index], mine: true };
      placed += 1;
    }
  }

  return board.map((cell, index) => ({
    ...cell,
    adjacent: cell.mine ? 0 : neighbors(index, config.size).filter((neighbor) => board[neighbor].mine).length,
  }));
}

function revealMineCells(board: MineCell[], start: number, size: number) {
  const next = board.map((cell) => ({ ...cell }));
  const queue = [start];
  const visited = new Set<number>();

  while (queue.length) {
    const index = queue.shift()!;

    if (visited.has(index) || next[index].flagged) {
      continue;
    }

    visited.add(index);
    next[index].revealed = true;

    if (!next[index].mine && next[index].adjacent === 0) {
      neighbors(index, size).forEach((neighbor) => {
        if (!next[neighbor].revealed) {
          queue.push(neighbor);
        }
      });
    }
  }

  return next;
}

function MinesweeperGame() {
  const [difficulty, setDifficulty] = useState<Difficulty>("Easy");
  const [round, setRound] = useState(0);
  const config = mineConfigs[difficulty];
  const [board, setBoard] = useState(() => createEmptyMineBoard(config.size));
  const [started, setStarted] = useState(false);
  const [state, setState] = useState<"playing" | "won" | "lost">("playing");
  const flags = board.filter((cell) => cell.flagged).length;
  const revealed = board.filter((cell) => cell.revealed).length;
  const timerStats = useGameTimerStats("minesweeper", difficulty, state === "won", round);

  function reset(nextDifficulty = difficulty) {
    const nextConfig = mineConfigs[nextDifficulty];
    setDifficulty(nextDifficulty);
    setBoard(createEmptyMineBoard(nextConfig.size));
    setStarted(false);
    setState("playing");
    setRound((current) => current + 1);
  }

  function reveal(index: number) {
    if (state !== "playing" || board[index].flagged || board[index].revealed) {
      return;
    }

    const activeBoard = started ? board : createMineBoard(index, config);
    setStarted(true);

    if (activeBoard[index].mine) {
      setBoard(activeBoard.map((cell) => (cell.mine ? { ...cell, revealed: true } : cell)));
      setState("lost");
      return;
    }

    const next = revealMineCells(activeBoard, index, config.size);
    const won = next.every((cell) => cell.mine || cell.revealed);
    setBoard(next);
    setState(won ? "won" : "playing");
  }

  function toggleFlag(index: number) {
    if (state !== "playing" || board[index].revealed) {
      return;
    }

    setBoard((current) => current.map((cell, cellIndex) => (cellIndex === index ? { ...cell, flagged: !cell.flagged } : cell)));
  }

  return (
    <GamePanel
      title="Minesweeper"
      status={state === "won" ? "Cleared" : state === "lost" ? "Mine hit" : `${config.mines - flags} flags left, ${revealed} open`}
      actions={<ControlButton onClick={() => reset()}>New board</ControlButton>}
      meta={<TimerStats stats={timerStats} />}
    >
      <div className="mine-layout">
        <DifficultyTabs active={difficulty} onChange={reset} />
      </div>
      <div className="mine-board" style={{ "--mine-size": config.size } as CSSProperties}>
        {board.map((cell, index) => (
          <button
            aria-label={`Mine cell ${index + 1}`}
            className={`mine-cell ${cell.revealed ? "revealed" : ""} ${cell.flagged ? "flagged" : ""} ${
              cell.revealed && cell.mine ? "mined" : ""
            } ${cell.revealed && !cell.mine && cell.adjacent === 0 ? "empty" : ""} mine-count-${cell.adjacent}`}
            key={index}
            onClick={() => reveal(index)}
            onContextMenu={(event) => {
              event.preventDefault();
              toggleFlag(index);
            }}
            type="button"
          >
            {cell.flagged && !cell.revealed ? "F" : cell.revealed && cell.mine ? "X" : cell.revealed && cell.adjacent ? cell.adjacent : ""}
          </button>
        ))}
      </div>
    </GamePanel>
  );
}

type Direction = "up" | "right" | "down" | "left";
type Board2048 = number[][];

function empty2048Board(): Board2048 {
  return Array.from({ length: 4 }, () => Array.from({ length: 4 }, () => 0));
}

function addRandomTile(board: Board2048): Board2048 {
  const emptyCells = board.flatMap((row, rowIndex) =>
    row.map((value, colIndex) => (value === 0 ? [rowIndex, colIndex] : null)).filter(Boolean),
  ) as number[][];

  if (!emptyCells.length) {
    return board;
  }

  const [row, col] = emptyCells[Math.floor(Math.random() * emptyCells.length)];
  return board.map((line, rowIndex) =>
    line.map((value, colIndex) => (rowIndex === row && colIndex === col ? (Math.random() > 0.9 ? 4 : 2) : value)),
  );
}

function start2048Board() {
  return addRandomTile(addRandomTile(empty2048Board()));
}

function slideLine(line: number[]) {
  const compact = line.filter(Boolean);
  const result: number[] = [];
  let gained = 0;

  for (let index = 0; index < compact.length; index += 1) {
    if (compact[index] === compact[index + 1]) {
      const merged = compact[index] * 2;
      result.push(merged);
      gained += merged;
      index += 1;
    } else {
      result.push(compact[index]);
    }
  }

  while (result.length < 4) {
    result.push(0);
  }

  return { line: result, gained };
}

function move2048(board: Board2048, direction: Direction) {
  let gained = 0;
  let next = empty2048Board();

  if (direction === "left" || direction === "right") {
    next = board.map((row) => {
      const working = direction === "left" ? row : [...row].reverse();
      const result = slideLine(working);
      gained += result.gained;
      return direction === "left" ? result.line : result.line.reverse();
    });
  } else {
    for (let col = 0; col < 4; col += 1) {
      const column = board.map((row) => row[col]);
      const working = direction === "up" ? column : [...column].reverse();
      const result = slideLine(working);
      gained += result.gained;
      const finalColumn = direction === "up" ? result.line : result.line.reverse();

      finalColumn.forEach((value, row) => {
        next[row][col] = value;
      });
    }
  }

  return { board: next, moved: JSON.stringify(next) !== JSON.stringify(board), gained };
}

function canMove2048(board: Board2048) {
  return (["up", "right", "down", "left"] as Direction[]).some((direction) => move2048(board, direction).moved);
}

function TwentyFortyEightGame() {
  const [board, setBoard] = useState(start2048Board);
  const [score, setScore] = useState(0);
  const [lost, setLost] = useState(false);
  const [won, setWon] = useState(false);
  const [round, setRound] = useState(0);
  const [moveTick, setMoveTick] = useState(0);
  const timerStats = useGameTimerStats("2048", standardDifficulty, won, round);
  const scoreStats = useScoreStats("2048", standardDifficulty, won || lost, score, round);

  function reset() {
    setBoard(start2048Board());
    setScore(0);
    setLost(false);
    setWon(false);
    setMoveTick(0);
    setRound((current) => current + 1);
  }

  function move(direction: Direction) {
    if (lost || won) {
      return;
    }

    setBoard((current) => {
      const result = move2048(current, direction);

      if (!result.moved) {
        return current;
      }

      const withTile = addRandomTile(result.board);
      setMoveTick((currentTick) => currentTick + 1);
      setScore((currentScore) => currentScore + result.gained);
      setWon(withTile.flat().some((value) => value >= 2048));
      setLost(!canMove2048(withTile));
      return withTile;
    });
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const map: Record<string, Direction | undefined> = {
        ArrowUp: "up",
        ArrowRight: "right",
        ArrowDown: "down",
        ArrowLeft: "left",
      };
      const direction = map[event.key];

      if (direction) {
        event.preventDefault();
        move(direction);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  return (
    <GamePanel
      title="2048"
      status={won ? `2048 reached, score ${score}` : lost ? `No moves, score ${score}` : `Score ${score}`}
      actions={<ControlButton onClick={reset}>New game</ControlButton>}
      meta={
        <>
          <TimerStats showDifficulty={false} showHistory={false} stats={timerStats} />
          <ScoreStats stats={scoreStats} />
        </>
      }
    >
      <div className="number-game-layout">
        <div className="twenty-board">
          {board.flatMap((row, rowIndex) =>
            row.map((value, colIndex) => (
              <div
                className={`twenty-cell value-${value} ${value >= 1000 ? "large-number" : ""} ${value ? "tile-pop" : ""}`}
                key={`${rowIndex}-${colIndex}-${moveTick}`}
              >
                {value || ""}
              </div>
            )),
          )}
        </div>
        <div className="d-pad">
          <span />
          <ControlButton onClick={() => move("up")}>Up</ControlButton>
          <span />
          <ControlButton onClick={() => move("left")}>Left</ControlButton>
          <ControlButton onClick={() => move("down")}>Down</ControlButton>
          <ControlButton onClick={() => move("right")}>Right</ControlButton>
        </div>
      </div>
    </GamePanel>
  );
}

type MemoryCard = {
  id: number;
  label: string;
  matched: boolean;
};

type MemoryDifficulty = "Easy" | "Hard";

const memoryDifficultyOptions = ["Easy", "Hard"] as const;
const memoryConfigs: Record<MemoryDifficulty, { columns: number; pairs: number; rows: number }> = {
  Easy: { columns: 4, pairs: 8, rows: 4 },
  Hard: { columns: 6, pairs: 12, rows: 4 },
};

function createMemoryDeck(pairCount: number): MemoryCard[] {
  return "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    .slice(0, pairCount)
    .split("")
    .flatMap((label) => [label, label])
    .map((label, id) => ({ id, label, matched: false }))
    .sort(() => Math.random() - 0.5);
}

function MemoryMatchGame() {
  const [difficulty, setDifficulty] = useState<MemoryDifficulty>("Easy");
  const config = memoryConfigs[difficulty];
  const [cards, setCards] = useState(() => createMemoryDeck(memoryConfigs.Easy.pairs));
  const [flipped, setFlipped] = useState<number[]>([]);
  const [previewing, setPreviewing] = useState(true);
  const [moves, setMoves] = useState(0);
  const [round, setRound] = useState(0);
  const won = cards.every((card) => card.matched);
  const timerStats = useGameTimerStats("memory-match", difficulty, won, round);

  function reset(nextDifficulty = difficulty) {
    const nextConfig = memoryConfigs[nextDifficulty];
    setDifficulty(nextDifficulty);
    setCards(createMemoryDeck(nextConfig.pairs));
    setFlipped([]);
    setPreviewing(true);
    setMoves(0);
    setRound((current) => current + 1);
  }

  function flip(index: number) {
    if (previewing || cards[index].matched || flipped.includes(index) || flipped.length === 2) {
      return;
    }

    setFlipped((current) => [...current, index]);
  }

  useEffect(() => {
    if (!previewing) {
      return;
    }

    const timer = window.setTimeout(() => setPreviewing(false), difficulty === "Hard" ? 3500 : 2800);
    return () => window.clearTimeout(timer);
  }, [difficulty, previewing, round]);

  useEffect(() => {
    if (flipped.length !== 2) {
      return;
    }

    setMoves((current) => current + 1);
    const [first, second] = flipped;
    const timer = window.setTimeout(() => {
      if (cards[first].label === cards[second].label) {
        setCards((current) => current.map((card, index) => (index === first || index === second ? { ...card, matched: true } : card)));
      }

      setFlipped([]);
    }, 650);

    return () => window.clearTimeout(timer);
  }, [cards, flipped]);

  return (
    <GamePanel
      title="Memory Match"
      status={previewing ? "Memorize the cards" : won ? `Cleared in ${moves} moves` : `${moves} moves`}
      actions={<ControlButton onClick={reset}>Shuffle</ControlButton>}
      meta={<TimerStats stats={timerStats} />}
    >
      <OptionTabs active={difficulty} onChange={reset} options={memoryDifficultyOptions} />
      <div className="memory-board" style={{ "--memory-columns": config.columns, "--memory-rows": config.rows } as CSSProperties}>
        {cards.map((card, index) => {
          const open = previewing || card.matched || flipped.includes(index);

          return (
            <button className={`memory-card ${open ? "open" : ""}`} key={card.id} onClick={() => flip(index)} type="button">
              {open ? card.label : ""}
            </button>
          );
        })}
      </div>
    </GamePanel>
  );
}

type WordCell = { row: number; col: number };
type WordTarget = { word: string; path: WordCell[] };
type WordDifficulty = "Easy" | "Hard";

const wordDifficultyOptions = ["Easy", "Hard"] as const;
const easyWordRows = [
  "UNCGAMESQZ",
  "XPQRTYUIOA",
  "SUDOKUABCD",
  "LNOPQRSTUV",
  "MATRIXWYZB",
  "ICHESSLMNO",
  "NPQRABCDEF",
  "EGHIJKLMNO",
  "SSNAKEPQRT",
  "CHESSBOARD",
];

const easyWordTargets: WordTarget[] = [
  { word: "UNC", path: [0, 1, 2].map((col) => ({ row: 0, col })) },
  { word: "GAMES", path: [3, 4, 5, 6, 7].map((col) => ({ row: 0, col })) },
  { word: "SUDOKU", path: [0, 1, 2, 3, 4, 5].map((col) => ({ row: 2, col })) },
  { word: "MINES", path: [4, 5, 6, 7, 8].map((row) => ({ row, col: 0 })) },
  { word: "CHESS", path: [1, 2, 3, 4, 5].map((col) => ({ row: 5, col })) },
  { word: "SNAKE", path: [1, 2, 3, 4, 5].map((col) => ({ row: 8, col })) },
];

const hardWordRows = [
  "UNCGAMESPLAY",
  "ZXQWORDHUNTS",
  "SUDOKUABCDR",
  "LMNOPQRSTUVX",
  "MATRIXWYZABC",
  "ICHESSLMNOPQ",
  "NPQRABCDEFST",
  "EGHIJKLMNOUL",
  "SSNAKEPQRTKI",
  "CHESSBOARDER",
  "MEMORYMATCHX",
  "SOLITAIREBOX",
];

const hardWordTargets: WordTarget[] = [
  { word: "UNC", path: [0, 1, 2].map((col) => ({ row: 0, col })) },
  { word: "GAMES", path: [3, 4, 5, 6, 7].map((col) => ({ row: 0, col })) },
  { word: "PLAY", path: [8, 9, 10, 11].map((col) => ({ row: 0, col })) },
  { word: "WORD", path: [3, 4, 5, 6].map((col) => ({ row: 1, col })) },
  { word: "SUDOKU", path: [0, 1, 2, 3, 4, 5].map((col) => ({ row: 2, col })) },
  { word: "MINES", path: [4, 5, 6, 7, 8].map((row) => ({ row, col: 0 })) },
  { word: "CHESS", path: [1, 2, 3, 4, 5].map((col) => ({ row: 5, col })) },
  { word: "SNAKE", path: [1, 2, 3, 4, 5].map((col) => ({ row: 8, col })) },
  { word: "BOARD", path: [5, 6, 7, 8, 9].map((col) => ({ row: 9, col })) },
  { word: "MEMORY", path: [0, 1, 2, 3, 4, 5].map((col) => ({ row: 10, col })) },
  { word: "MATCH", path: [6, 7, 8, 9, 10].map((col) => ({ row: 10, col })) },
  { word: "SOLITAIRE", path: [0, 1, 2, 3, 4, 5, 6, 7, 8].map((col) => ({ row: 11, col })) },
];

const wordPuzzles: Record<WordDifficulty, { rows: string[]; targets: WordTarget[] }> = {
  Easy: { rows: easyWordRows, targets: easyWordTargets },
  Hard: { rows: hardWordRows, targets: hardWordTargets },
};

function pathKey(path: WordCell[]) {
  return path.map((cell) => `${cell.row}-${cell.col}`).join("|");
}

function cellKey(cell: WordCell) {
  return `${cell.row}-${cell.col}`;
}

function sameCell(a: WordCell, b: WordCell) {
  return a.row === b.row && a.col === b.col;
}

function adjacentWordCell(a: WordCell, b: WordCell) {
  return !sameCell(a, b) && Math.abs(a.row - b.row) <= 1 && Math.abs(a.col - b.col) <= 1;
}

function WordSearchGame() {
  const [difficulty, setDifficulty] = useState<WordDifficulty>("Easy");
  const [selected, setSelected] = useState<WordCell[]>([]);
  const [found, setFound] = useState<string[]>([]);
  const [dragging, setDragging] = useState(false);
  const [round, setRound] = useState(0);
  const puzzle = wordPuzzles[difficulty];
  const maxWordLength = Math.max(...puzzle.targets.map((target) => target.path.length));
  const foundCellKeys = new Set(puzzle.targets.filter((target) => found.includes(target.word)).flatMap((target) => target.path.map(cellKey)));
  const selectedCellKeys = new Set(selected.map(cellKey));
  const complete = found.length === puzzle.targets.length;
  const timerStats = useGameTimerStats("word-search", difficulty, complete, round);

  function reset(nextDifficulty = difficulty) {
    setDifficulty(nextDifficulty);
    setSelected([]);
    setFound([]);
    setDragging(false);
    setRound((current) => current + 1);
  }

  function chooseCell(cell: WordCell) {
    if (complete) {
      return;
    }

    setSelected((current) => {
      const lastCell = current.at(-1);
      const nextSelection =
        !lastCell || current.length >= maxWordLength || !adjacentWordCell(lastCell, cell)
          ? [cell]
          : sameCell(lastCell, cell)
            ? current
            : [...current, cell];
      const nextKey = pathKey(nextSelection);
      const match = puzzle.targets.find((target) => {
        const forward = pathKey(target.path);
        const backward = pathKey([...target.path].reverse());
        return (nextKey === forward || nextKey === backward) && !found.includes(target.word);
      });

      if (match) {
        setFound((currentFound) => (currentFound.includes(match.word) ? currentFound : [...currentFound, match.word]));
        return [];
      }

      return nextSelection;
    });
  }

  useEffect(() => {
    if (!dragging) {
      return;
    }

    function stopDragging() {
      setDragging(false);
    }

    window.addEventListener("pointerup", stopDragging);
    window.addEventListener("pointercancel", stopDragging);
    return () => {
      window.removeEventListener("pointerup", stopDragging);
      window.removeEventListener("pointercancel", stopDragging);
    };
  }, [dragging]);

  return (
    <GamePanel
      title="Word Search"
      status={complete ? "All words found" : `${found.length}/${puzzle.targets.length} found`}
      actions={
        <>
          <ControlButton onClick={() => setSelected([])}>Clear picks</ControlButton>
          <ControlButton onClick={reset}>Reset</ControlButton>
        </>
      }
      meta={<TimerStats stats={timerStats} />}
    >
      <div className="word-layout">
        <OptionTabs active={difficulty} onChange={reset} options={wordDifficultyOptions} />
        <div className="word-board" style={{ "--word-size": puzzle.rows.length } as CSSProperties}>
          {puzzle.rows.flatMap((row, rowIndex) =>
            row.split("").map((letter, colIndex) => {
              const key = `${rowIndex}-${colIndex}`;
              const cell = { row: rowIndex, col: colIndex };
              const isSelected = selectedCellKeys.has(key);
              const isFound = foundCellKeys.has(key);

              return (
                <button
                  className={`word-cell ${isSelected ? "selected" : ""} ${isFound ? "found" : ""}`}
                  key={key}
                  onClick={() => chooseCell(cell)}
                  onPointerDown={(event) => {
                    event.preventDefault();
                    setDragging(true);
                    chooseCell(cell);
                  }}
                  onPointerEnter={() => {
                    if (dragging) {
                      chooseCell(cell);
                    }
                  }}
                  type="button"
                >
                  {letter}
                </button>
              );
            }),
          )}
        </div>
        <div className="word-list">
          {puzzle.targets.map((target) => (
            <span className={found.includes(target.word) ? "found" : ""} key={target.word}>
              {target.word}
            </span>
          ))}
        </div>
      </div>
    </GamePanel>
  );
}

type Point = { x: number; y: number };
const snakeSize = 16;
const initialSnake = [
  { x: 8, y: 8 },
  { x: 7, y: 8 },
  { x: 6, y: 8 },
];

function samePoint(a: Point, b: Point) {
  return a.x === b.x && a.y === b.y;
}

function pointKey(point: Point) {
  return `${point.x}-${point.y}`;
}

function randomFood(snake: Point[], blocked: Point[] = []) {
  const unavailable = new Set([...snake, ...blocked].map(pointKey));
  const available = Array.from({ length: snakeSize * snakeSize }, (_, index) => ({ x: index % snakeSize, y: Math.floor(index / snakeSize) })).filter(
    (point) => !unavailable.has(pointKey(point)),
  );

  return available[Math.floor(Math.random() * available.length)] ?? { x: 0, y: 0 };
}

function SnakeGame() {
  const [snake, setSnake] = useState(initialSnake);
  const [food, setFood] = useState(() => randomFood(initialSnake));
  const [bigFood, setBigFood] = useState<{ expiresAt: number; point: Point } | null>(null);
  const [foodEaten, setFoodEaten] = useState(0);
  const [direction, setDirection] = useState<Direction>("right");
  const [running, setRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(0);
  const won = snake.length >= snakeSize * snakeSize;
  const timerStats = useGameTimerStats("snake", standardDifficulty, won, round);
  const scoreStats = useScoreStats("snake", standardDifficulty, gameOver || won, score, round);
  const directionRef = useRef(direction);
  const growthRef = useRef(0);
  const bigFoodRef = useRef(bigFood);
  const snakeDelay = Math.max(55, 150 - Math.floor(snake.length / 7) * 6);

  useEffect(() => {
    bigFoodRef.current = bigFood;
  }, [bigFood]);

  function reset() {
    directionRef.current = "right";
    growthRef.current = 0;
    setSnake(initialSnake);
    setFood(randomFood(initialSnake));
    setBigFood(null);
    setFoodEaten(0);
    setDirection("right");
    setRunning(false);
    setGameOver(false);
    setScore(0);
    setRound((current) => current + 1);
  }

  function changeDirection(next: Direction) {
    if (gameOver || won) {
      return;
    }

    const opposite: Record<Direction, Direction> = { up: "down", right: "left", down: "up", left: "right" };

    if (opposite[directionRef.current] === next) {
      return;
    }

    directionRef.current = next;
    setDirection(next);
    setRunning(true);
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const map: Record<string, Direction | undefined> = {
        ArrowUp: "up",
        ArrowRight: "right",
        ArrowDown: "down",
        ArrowLeft: "left",
      };
      const next = map[event.key];

      if (next) {
        event.preventDefault();
        changeDirection(next);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  useEffect(() => {
    if (!bigFood) {
      return;
    }

    const timer = window.setTimeout(() => setBigFood(null), Math.max(0, bigFood.expiresAt - Date.now()));
    return () => window.clearTimeout(timer);
  }, [bigFood]);

  useEffect(() => {
    if (!running || gameOver || won) {
      return;
    }

    const timer = window.setInterval(() => {
      setSnake((current) => {
        const head = current[0];
        const vector: Record<Direction, Point> = {
          up: { x: 0, y: -1 },
          right: { x: 1, y: 0 },
          down: { x: 0, y: 1 },
          left: { x: -1, y: 0 },
        };
        const nextHead = {
          x: (head.x + vector[directionRef.current].x + snakeSize) % snakeSize,
          y: (head.y + vector[directionRef.current].y + snakeSize) % snakeSize,
        };
        const currentBigFood = bigFoodRef.current && bigFoodRef.current.expiresAt > Date.now() ? bigFoodRef.current : null;
        const ate = samePoint(nextHead, food);
        const ateBigFood = Boolean(currentBigFood && samePoint(nextHead, currentBigFood.point));
        const willGrow = ate || ateBigFood || growthRef.current > 0;
        const collisionBody = willGrow ? current : current.slice(0, -1);
        const hitSelf = collisionBody.some((segment) => samePoint(segment, nextHead));

        if (hitSelf) {
          setGameOver(true);
          setRunning(false);
          return current;
        }

        const nextSnake = willGrow ? [nextHead, ...current] : [nextHead, ...current.slice(0, -1)];

        if (ate) {
          setFoodEaten((currentFoodEaten) => {
            const nextFoodEaten = currentFoodEaten + 1;

            if (nextFoodEaten % 10 === 0 && nextSnake.length < snakeSize * snakeSize - 1) {
              setBigFood({ expiresAt: Date.now() + 5000, point: randomFood(nextSnake, [food]) });
            }

            return nextFoodEaten;
          });
          setScore((currentScore) => {
            const nextScore = currentScore + 1;
            return nextScore;
          });
          if (nextSnake.length < snakeSize * snakeSize) {
            setFood(randomFood(nextSnake, currentBigFood ? [currentBigFood.point] : []));
          }
        }

        if (ateBigFood) {
          growthRef.current += 2;
          setBigFood(null);
          setScore((currentScore) => currentScore + 3);
        } else if (growthRef.current > 0 && !ate) {
          growthRef.current -= 1;
        }

        if (nextSnake.length >= snakeSize * snakeSize) {
          setRunning(false);
        }

        return nextSnake;
      });
    }, snakeDelay);

    return () => window.clearInterval(timer);
  }, [food, gameOver, running, snakeDelay, won]);

  return (
    <GamePanel
      title="Snake"
      status={
        won
          ? `Board filled, score ${score}`
          : gameOver
            ? `Game over, score ${score}`
            : running
              ? `Moving ${direction}, score ${score}`
              : `Ready, score ${score}`
      }
      actions={<ControlButton onClick={reset}>Reset</ControlButton>}
      meta={
        <>
          <TimerStats showDifficulty={false} showHistory={false} stats={timerStats} />
          <ScoreStats stats={scoreStats} />
        </>
      }
    >
      <div className="snake-layout">
        <div className="snake-board">
          {Array.from({ length: snakeSize * snakeSize }, (_, index) => {
            const point = { x: index % snakeSize, y: Math.floor(index / snakeSize) };
            const isSnake = snake.some((segment) => samePoint(segment, point));
            const isHead = samePoint(snake[0], point);
            const isFood = samePoint(food, point);
            const isBigFood = Boolean(bigFood && samePoint(bigFood.point, point));

            return (
              <span
                className={`${isSnake ? "snake-body" : ""} ${isHead ? "snake-head" : ""} ${isFood ? "snake-food" : ""} ${
                  isBigFood ? "snake-big-food" : ""
                }`}
                key={index}
              />
            );
          })}
        </div>
        <div className="d-pad">
          <span />
          <ControlButton onClick={() => changeDirection("up")}>Up</ControlButton>
          <span />
          <ControlButton onClick={() => changeDirection("left")}>Left</ControlButton>
          <ControlButton onClick={() => setRunning((current) => !current)}>{running ? "Pause" : "Start"}</ControlButton>
          <ControlButton onClick={() => changeDirection("right")}>Right</ControlButton>
          <span />
          <ControlButton onClick={() => changeDirection("down")}>Down</ControlButton>
          <span />
        </div>
      </div>
    </GamePanel>
  );
}

type Suit = "spades" | "hearts" | "diamonds" | "clubs";
type Card = { id: string; suit: Suit; rank: number; faceUp: boolean };
type SolitaireDifficulty = "Easy" | "Hard";
type SolitaireState = {
  stock: Card[];
  waste: Card[];
  foundations: Record<Suit, Card[]>;
  tableau: Card[][];
  selected: SolitaireSelection | null;
};
type SolitaireSelection =
  | { source: "waste" }
  | { source: "foundation"; suit: Suit }
  | { source: "tableau"; pile: number; index: number };

const suits: Suit[] = ["spades", "hearts", "diamonds", "clubs"];
const solitaireDifficultyOptions = ["Easy", "Hard"] as const;
const solitaireDragType = "application/x-unc-solitaire-selection";
const suitSymbols: Record<Suit, string> = { spades: "\u2660", hearts: "\u2665", diamonds: "\u2666", clubs: "\u2663" };
const redSuits = new Set<Suit>(["hearts", "diamonds"]);

function cardRankLabel(card: Card) {
  return card.rank === 1 ? "A" : card.rank === 11 ? "J" : card.rank === 12 ? "Q" : card.rank === 13 ? "K" : String(card.rank);
}

function CardFace({ card }: { card: Card }) {
  const rank = cardRankLabel(card);
  const suit = suitSymbols[card.suit];

  return (
    <>
      <span className="card-corner card-top">{rank}</span>
      <span className="card-suit">{suit}</span>
      <span className="card-corner card-bottom">{rank}</span>
    </>
  );
}

function createSolitaireState(): SolitaireState {
  const deck = suits
    .flatMap((suit) => Array.from({ length: 13 }, (_, index) => ({ id: `${suit}-${index + 1}`, suit, rank: index + 1, faceUp: false })))
    .sort(() => Math.random() - 0.5);
  const tableau: Card[][] = Array.from({ length: 7 }, () => []);

  for (let pile = 0; pile < 7; pile += 1) {
    for (let offset = 0; offset <= pile; offset += 1) {
      const card = deck.shift()!;
      tableau[pile].push({ ...card, faceUp: offset === pile });
    }
  }

  return {
    stock: deck,
    waste: [],
    foundations: { spades: [], hearts: [], diamonds: [], clubs: [] },
    tableau,
    selected: null,
  };
}

function flipTopTableauCard(state: SolitaireState, pile: number) {
  const target = state.tableau[pile];

  if (target.length && !target[target.length - 1].faceUp) {
    target[target.length - 1] = { ...target[target.length - 1], faceUp: true };
  }
}

function selectedCards(state: SolitaireState, selection: SolitaireSelection) {
  if (selection.source === "waste") {
    const card = state.waste[state.waste.length - 1];
    return card ? [card] : [];
  }

  if (selection.source === "foundation") {
    const card = state.foundations[selection.suit].at(-1);
    return card ? [card] : [];
  }

  return state.tableau[selection.pile].slice(selection.index);
}

function removeSelection(state: SolitaireState, selection: SolitaireSelection) {
  if (selection.source === "waste") {
    state.waste.pop();
    return;
  }

  if (selection.source === "foundation") {
    state.foundations[selection.suit].pop();
    return;
  }

  state.tableau[selection.pile] = state.tableau[selection.pile].slice(0, selection.index);
  flipTopTableauCard(state, selection.pile);
}

function canPlaceOnTableau(cards: Card[], target: Card[]) {
  if (!cards.length) {
    return false;
  }

  const moving = cards[0];
  const top = target.at(-1);

  if (!top) {
    return moving.rank === 13;
  }

  return top.faceUp && redSuits.has(top.suit) !== redSuits.has(moving.suit) && top.rank === moving.rank + 1;
}

function canPlaceOnFoundation(card: Card, foundation: Card[], suit: Suit) {
  if (card.suit !== suit) {
    return false;
  }

  const top = foundation.at(-1);
  return top ? card.rank === top.rank + 1 : card.rank === 1;
}

function allTableauCardsFaceUp(state: SolitaireState) {
  return state.tableau.every((pile) => pile.every((card) => card.faceUp));
}

function autoCompleteSolitaireState(current: SolitaireState) {
  const next: SolitaireState = structuredClone({ ...current, selected: null });
  const allCards = [
    ...next.stock,
    ...next.waste,
    ...next.tableau.flat(),
    ...suits.flatMap((suit) => next.foundations[suit]),
  ].map((card) => ({ ...card, faceUp: true }));

  next.stock = [];
  next.waste = [];
  next.tableau = Array.from({ length: 7 }, () => []);
  next.foundations = { spades: [], hearts: [], diamonds: [], clubs: [] };

  suits.forEach((suit) => {
    next.foundations[suit] = allCards.filter((card) => card.suit === suit).sort((first, second) => first.rank - second.rank);
  });

  return next;
}

function SolitaireGame() {
  const [difficulty, setDifficulty] = useState<SolitaireDifficulty>("Easy");
  const [state, setState] = useState(createSolitaireState);
  const [round, setRound] = useState(0);
  const won = suits.every((suit) => state.foundations[suit].length === 13);
  const readyToAutoComplete = !won && state.stock.length === 0 && allTableauCardsFaceUp(state);
  const timerStats = useGameTimerStats("solitaire", difficulty, won, round);
  const waterfallCards = suits.flatMap((suit) => state.foundations[suit]);

  function reset(nextDifficulty = difficulty) {
    setDifficulty(nextDifficulty);
    setState(createSolitaireState());
    setRound((current) => current + 1);
  }

  useEffect(() => {
    if (!readyToAutoComplete) {
      return;
    }

    const timer = window.setTimeout(() => setState(autoCompleteSolitaireState), 400);
    return () => window.clearTimeout(timer);
  }, [readyToAutoComplete]);

  function draw() {
    setState((current) => {
      const next: SolitaireState = structuredClone({ ...current, selected: null });

      if (next.stock.length) {
        const drawCount = difficulty === "Hard" ? 3 : 1;

        for (let index = 0; index < drawCount && next.stock.length; index += 1) {
          const card = next.stock.pop()!;
          next.waste.push({ ...card, faceUp: true });
        }
      } else {
        next.stock = next.waste.reverse().map((card) => ({ ...card, faceUp: false }));
        next.waste = [];
      }

      return next;
    });
  }

  function select(selection: SolitaireSelection | null) {
    setState((current) => ({ ...current, selected: selection }));
  }

  function startCardDrag(event: DragEvent<HTMLElement>, selection: SolitaireSelection) {
    event.stopPropagation();
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData(solitaireDragType, JSON.stringify(selection));
    select(selection);
  }

  function readDraggedSelection(event: DragEvent<HTMLElement>) {
    const raw = event.dataTransfer.getData(solitaireDragType);

    if (!raw) {
      return null;
    }

    try {
      const selection = JSON.parse(raw) as SolitaireSelection;

      if (
        selection.source === "waste" ||
        selection.source === "foundation" ||
        (selection.source === "tableau" && Number.isInteger(selection.pile) && Number.isInteger(selection.index))
      ) {
        return selection;
      }
    } catch {
      return null;
    }

    return null;
  }

  function allowCardDrop(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }

  function moveToTableau(pile: number, incomingSelection?: SolitaireSelection) {
    setState((current) => {
      const selection = incomingSelection ?? current.selected;

      if (!selection) {
        return current;
      }

      const next: SolitaireState = structuredClone(current);
      const cards = selectedCards(next, selection);

      if (selection.source === "tableau" && selection.pile === pile) {
        next.selected = null;
        return next;
      }

      if (!canPlaceOnTableau(cards, next.tableau[pile])) {
        return current;
      }

      removeSelection(next, selection);
      next.tableau[pile].push(...cards.map((card) => ({ ...card, faceUp: true })));
      next.selected = null;
      return next;
    });
  }

  function moveToFoundation(suit: Suit, incomingSelection?: SolitaireSelection) {
    setState((current) => {
      const selection = incomingSelection ?? current.selected;

      if (!selection) {
        return current;
      }

      const next: SolitaireState = structuredClone(current);
      const cards = selectedCards(next, selection);

      if (cards.length !== 1 || !canPlaceOnFoundation(cards[0], next.foundations[suit], suit)) {
        return current;
      }

      removeSelection(next, selection);
      next.foundations[suit].push({ ...cards[0], faceUp: true });
      next.selected = null;
      return next;
    });
  }

  function moveSelectionToAnyFoundation(selection: SolitaireSelection) {
    setState((current) => {
      const next: SolitaireState = structuredClone(current);
      const cards = selectedCards(next, selection);
      const targetSuit = cards.length === 1 ? suits.find((suit) => canPlaceOnFoundation(cards[0], next.foundations[suit], suit)) : undefined;

      if (!targetSuit) {
        return current;
      }

      removeSelection(next, selection);
      next.foundations[targetSuit].push({ ...cards[0], faceUp: true });
      next.selected = null;
      return next;
    });
  }

  const visibleWaste = state.waste.slice(-3);
  const topWasteCard = state.waste.at(-1);

  return (
    <GamePanel
      className="solitaire-panel"
      title="Solitaire"
      status={won ? "All foundations complete" : `${difficulty} draw, ${state.stock.length} stock, ${state.waste.length} waste`}
      actions={<ControlButton onClick={reset}>New deal</ControlButton>}
      meta={<TimerStats stats={timerStats} />}
    >
      <div className="solitaire">
        <OptionTabs active={difficulty} onChange={reset} options={solitaireDifficultyOptions} />
        <div className="solitaire-top">
          <button className="playing-card card-back" onClick={draw} type="button">
            {state.stock.length ? state.stock.length : "Deal"}
          </button>
          <div className="waste-stack" aria-label="Waste pile">
            {visibleWaste.length ? (
              visibleWaste.map((card, index) => {
                const isTop = card.id === topWasteCard?.id;

                return (
                  <button
                    className={`playing-card waste-card ${redSuits.has(card.suit) ? "red" : ""} ${
                      state.selected?.source === "waste" && isTop ? "selected" : ""
                    } ${isTop ? "" : "covered"}`}
                    disabled={!isTop}
                    draggable={isTop}
                    key={card.id}
                    onClick={() => (isTop ? select({ source: "waste" }) : undefined)}
                    onDoubleClick={() => (isTop ? moveSelectionToAnyFoundation({ source: "waste" }) : undefined)}
                    onDragStart={(event) => startCardDrag(event, { source: "waste" })}
                    style={{ "--waste-index": index } as CSSProperties}
                    type="button"
                  >
                    <CardFace card={card} />
                  </button>
                );
              })
            ) : (
              <button className="playing-card empty-waste" onClick={() => select(null)} type="button" aria-label="Waste pile empty" />
            )}
          </div>
          <div className="foundation-row">
            {suits.map((suit) => (
              <button
                className={`playing-card foundation ${redSuits.has(suit) ? "red" : ""} ${
                  state.selected?.source === "foundation" && state.selected.suit === suit ? "selected" : ""
                }`}
                draggable={Boolean(state.foundations[suit].at(-1))}
                key={suit}
                onClick={() => (state.selected ? moveToFoundation(suit) : state.foundations[suit].at(-1) ? select({ source: "foundation", suit }) : select(null))}
                onDragOver={allowCardDrop}
                onDragStart={(event) => startCardDrag(event, { source: "foundation", suit })}
                onDrop={(event) => {
                  const selection = readDraggedSelection(event);

                  if (selection) {
                    event.preventDefault();
                    moveToFoundation(suit, selection);
                  }
                }}
                type="button"
              >
                {state.foundations[suit].at(-1) ? <CardFace card={state.foundations[suit].at(-1)!} /> : suitSymbols[suit]}
              </button>
            ))}
          </div>
        </div>
        <div className="tableau">
          {state.tableau.map((pile, pileIndex) => (
            <div
              className="tableau-pile"
              key={pileIndex}
              onClick={() => moveToTableau(pileIndex)}
              onDragOver={allowCardDrop}
              onDrop={(event) => {
                const selection = readDraggedSelection(event);

                if (selection) {
                  event.preventDefault();
                  moveToTableau(pileIndex, selection);
                }
              }}
            >
              {pile.length === 0 ? <span className="empty-pile">K</span> : null}
              {pile.map((card, cardIndex) => (
                <button
                  className={`playing-card ${card.faceUp ? "" : "card-back"} ${redSuits.has(card.suit) ? "red" : ""} ${
                    state.selected?.source === "tableau" && state.selected.pile === pileIndex && cardIndex >= state.selected.index ? "selected" : ""
                  }`}
                  disabled={!card.faceUp}
                  draggable={card.faceUp}
                  key={card.id}
                  onClick={(event) => {
                    event.stopPropagation();
                    if (state.selected) {
                      moveToTableau(pileIndex);
                    } else {
                      select({ source: "tableau", pile: pileIndex, index: cardIndex });
                    }
                  }}
                  onDoubleClick={(event) => {
                    event.stopPropagation();
                    moveSelectionToAnyFoundation({ source: "tableau", pile: pileIndex, index: cardIndex });
                  }}
                  onDragStart={(event) => startCardDrag(event, { source: "tableau", pile: pileIndex, index: cardIndex })}
                  style={{ top: `${cardIndex * 32}px` }}
                  type="button"
                >
                  {card.faceUp ? <CardFace card={card} /> : ""}
                </button>
              ))}
            </div>
          ))}
        </div>
        {won ? (
          <div className="solitaire-waterfall" aria-hidden="true">
            {waterfallCards.map((card, index) => (
              <span
                className={`waterfall-card ${redSuits.has(card.suit) ? "red" : ""}`}
                key={`${card.id}-fall`}
                style={{ "--fall-index": index } as CSSProperties}
              >
                <CardFace card={card} />
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </GamePanel>
  );
}

const pieceSymbols: Record<string, string> = {
  wp: "\u2659",
  wn: "\u2658",
  wb: "\u2657",
  wr: "\u2656",
  wq: "\u2655",
  wk: "\u2654",
  bp: "\u265F",
  bn: "\u265E",
  bb: "\u265D",
  br: "\u265C",
  bq: "\u265B",
  bk: "\u265A",
};

type ChessDifficulty = "Beginner" | "Intermediate" | "Expert";

const chessDifficultyOptions = ["Beginner", "Intermediate", "Expert"] as const;
const pieceValues: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

function scoreChessBoard(game: Chess) {
  return game
    .board()
    .flat()
    .reduce((score, piece) => {
      if (!piece) {
        return score;
      }

      const value = pieceValues[piece.type] ?? 0;
      return score + (piece.color === "b" ? value : -value);
    }, 0);
}

function chooseAiMove(game: Chess, difficulty: ChessDifficulty) {
  const moves = game.moves({ verbose: true });

  if (!moves.length) {
    return null;
  }

  if (difficulty === "Beginner") {
    return moves[Math.floor(Math.random() * moves.length)].san;
  }

  const scoredMoves = moves.map((move) => {
    const next = new Chess(game.fen());
    next.move(move.san);

    const capturedValue = move.captured ? pieceValues[move.captured] ?? 0 : 0;
    const promotionValue = move.promotion ? pieceValues[move.promotion] ?? 0 : 0;
    const centerBonus = ["d4", "d5", "e4", "e5"].includes(move.to) ? 5 : 0;
    const checkBonus = next.isCheckmate() ? 10000 : next.inCheck() ? 30 : 0;
    const materialBonus = difficulty === "Expert" ? scoreChessBoard(next) * 8 : 0;

    return {
      san: move.san,
      score: capturedValue * 70 + promotionValue * 25 + centerBonus + checkBonus + materialBonus + Math.random(),
    };
  });

  return scoredMoves.sort((first, second) => second.score - first.score)[0].san;
}

function ChessGame() {
  const [difficulty, setDifficulty] = useState<ChessDifficulty>("Beginner");
  const [fen, setFen] = useState(new Chess().fen());
  const [selected, setSelected] = useState<Square | null>(null);
  const [round, setRound] = useState(0);
  const game = useMemo(() => new Chess(fen), [fen]);
  const complete = game.isCheckmate() || game.isDraw();
  const outcome: Outcome | null = game.isCheckmate() ? (game.turn() === "b" ? "wins" : "losses") : game.isDraw() ? "draws" : null;
  const outcomeStats = useOutcomeStats("chess", difficulty, outcome, round);
  const legalTargets = selected && game.turn() === "w" ? game.moves({ square: selected, verbose: true }).map((move) => move.to) : [];
  const status = game.isCheckmate()
    ? game.turn() === "b"
      ? "Checkmate, you win"
      : "Checkmate, AI wins"
    : game.isDraw()
      ? "Draw"
      : game.inCheck()
        ? game.turn() === "w"
          ? "Your move, check"
          : "AI thinking, check"
        : game.turn() === "w"
          ? "Your move"
          : "AI thinking";

  function reset(nextDifficulty = difficulty) {
    setDifficulty(nextDifficulty);
    setFen(new Chess().fen());
    setSelected(null);
    setRound((current) => current + 1);
  }

  useEffect(() => {
    if (complete || game.turn() !== "b") {
      return;
    }

    const timer = window.setTimeout(
      () => {
        const next = new Chess(fen);
        const aiMove = chooseAiMove(next, difficulty);

        if (aiMove) {
          next.move(aiMove);
          setFen(next.fen());
          setSelected(null);
        }
      },
      difficulty === "Expert" ? 420 : 260,
    );

    return () => window.clearTimeout(timer);
  }, [complete, difficulty, fen, game]);

  function clickSquare(square: Square) {
    if (complete || game.turn() !== "w") {
      return;
    }

    const piece = game.get(square);

    if (piece && piece.color === "w") {
      setSelected(selected === square ? null : square);
      return;
    }

    if (selected) {
      const next = new Chess(game.fen());
      const move = next.move({ from: selected, to: square, promotion: "q" });

      if (move) {
        setFen(next.fen());
        setSelected(null);
        return;
      }
    }

    setSelected(null);
  }

  return (
    <GamePanel title="Chess" status={status} actions={<ControlButton onClick={reset}>Reset board</ControlButton>} meta={<OutcomeStats stats={outcomeStats} />}>
      <OptionTabs active={difficulty} onChange={reset} options={chessDifficultyOptions} />
      <div className="chess-board">
        {game.board().flatMap((row, rowIndex) =>
          row.map((piece, colIndex) => {
            const square = `${"abcdefgh"[colIndex]}${8 - rowIndex}` as Square;
            const light = (rowIndex + colIndex) % 2 === 0;
            const isSelected = selected === square;
            const isTarget = legalTargets.includes(square);

            return (
              <button
                className={`chess-square ${light ? "light" : "dark"} ${isSelected ? "selected" : ""} ${isTarget ? "target" : ""} ${
                  piece ? `piece-${piece.color === "w" ? "white" : "black"}` : ""
                }`}
                key={square}
                onClick={() => clickSquare(square)}
                type="button"
              >
                {piece ? pieceSymbols[`${piece.color}${piece.type}`] : ""}
              </button>
            );
          }),
        )}
      </div>
    </GamePanel>
  );
}

export function PlayableGame({ slug }: { slug: GameSlug }) {
  const games: Record<GameSlug, ReactNode> = {
    sudoku: <SudokuGame />,
    minesweeper: <MinesweeperGame />,
    solitaire: <SolitaireGame />,
    "2048": <TwentyFortyEightGame />,
    chess: <ChessGame />,
    snake: <SnakeGame />,
    "word-search": <WordSearchGame />,
    "memory-match": <MemoryMatchGame />,
  };

  return games[slug];
}

export function GameInstructions({ game }: { game: Game }) {
  const instructions: Record<GameSlug, string> = {
    sudoku: "Pick an empty cell, then use the number pad or keyboard. Matching numbers highlight, and solved puzzles roll into a fresh one.",
    minesweeper: "Choose a difficulty, click to reveal, right-click to flag. Your first click is protected.",
    solitaire: "Choose Easy or Hard draw, move cards onto tableau piles, or double-click a card to send it to a foundation when it fits.",
    "2048": "Use arrow keys or the buttons. Merge matching tiles to grow the score.",
    chess: "Play white against the AI. Choose a difficulty, select a piece, then choose a legal destination.",
    snake: "Use arrow keys or the buttons. Walls wrap around; keep eating until the board fills or you run into yourself.",
    "word-search": "Click or drag through neighboring letters to find each word. A non-neighboring pick starts a fresh path.",
    "memory-match": "Choose a difficulty, flip two cards at a time, and match all pairs.",
  };

  return <p>{instructions[game.slug]}</p>;
}
