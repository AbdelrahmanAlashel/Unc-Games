import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
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
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button className="control-button" disabled={disabled} onClick={onClick} type="button">
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

const timeStatsStorageKey = "unc-games-time-stats-v1";
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

function getTimerStatsKey(game: GameSlug, difficulty: string) {
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

function TimerStats({ stats }: { stats: ReturnType<typeof useGameTimerStats> }) {
  return (
    <>
      <span>Time {formatTime(stats.seconds)}</span>
      <span>{stats.difficulty}</span>
      <span>Best {formatTime(stats.best)}</span>
      <span>Average {formatTime(stats.average)}</span>
      <span>Games {stats.plays}</span>
    </>
  );
}

function DifficultyTabs({
  active,
  onChange,
}: {
  active: Difficulty;
  onChange: (difficulty: Difficulty) => void;
}) {
  return (
    <div className="difficulty-tabs" role="group" aria-label="Choose difficulty">
      {difficultyOptions.map((difficulty) => (
        <button
          aria-pressed={active === difficulty}
          className="difficulty-tab"
          key={difficulty}
          onClick={() => onChange(difficulty)}
          type="button"
        >
          {difficulty}
        </button>
      ))}
    </div>
  );
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

    setValues((current) => current.map((cell, index) => (index === selected ? value : cell)));
  }

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
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((value) => (
            correctCounts[value] < 9 ? (
              <ControlButton key={value} onClick={() => setCellValue(value)}>
                {value}
              </ControlButton>
            ) : null
          ))}
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
  const timerStats = useGameTimerStats("2048", standardDifficulty, won, round);

  function reset() {
    setBoard(start2048Board());
    setScore(0);
    setLost(false);
    setWon(false);
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
      meta={<TimerStats stats={timerStats} />}
    >
      <div className="number-game-layout">
        <div className="twenty-board">
          {board.flatMap((row, rowIndex) =>
            row.map((value, colIndex) => (
              <div className={`twenty-cell value-${value}`} key={`${rowIndex}-${colIndex}`}>
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

function createMemoryDeck(): MemoryCard[] {
  return ["A", "B", "C", "D", "E", "F", "G", "H"]
    .flatMap((label) => [label, label])
    .map((label, id) => ({ id, label, matched: false }))
    .sort(() => Math.random() - 0.5);
}

function MemoryMatchGame() {
  const [cards, setCards] = useState(createMemoryDeck);
  const [flipped, setFlipped] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [round, setRound] = useState(0);
  const won = cards.every((card) => card.matched);
  const timerStats = useGameTimerStats("memory-match", standardDifficulty, won, round);

  function reset() {
    setCards(createMemoryDeck());
    setFlipped([]);
    setMoves(0);
    setRound((current) => current + 1);
  }

  function flip(index: number) {
    if (cards[index].matched || flipped.includes(index) || flipped.length === 2) {
      return;
    }

    setFlipped((current) => [...current, index]);
  }

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
      status={won ? `Cleared in ${moves} moves` : `${moves} moves`}
      actions={<ControlButton onClick={reset}>Shuffle</ControlButton>}
      meta={<TimerStats stats={timerStats} />}
    >
      <div className="memory-board">
        {cards.map((card, index) => {
          const open = card.matched || flipped.includes(index);

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

const wordRows = [
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

const wordTargets: WordTarget[] = [
  { word: "UNC", path: [0, 1, 2].map((col) => ({ row: 0, col })) },
  { word: "GAMES", path: [3, 4, 5, 6, 7].map((col) => ({ row: 0, col })) },
  { word: "SUDOKU", path: [0, 1, 2, 3, 4, 5].map((col) => ({ row: 2, col })) },
  { word: "MINES", path: [4, 5, 6, 7, 8].map((row) => ({ row, col: 0 })) },
  { word: "CHESS", path: [1, 2, 3, 4, 5].map((col) => ({ row: 5, col })) },
  { word: "SNAKE", path: [1, 2, 3, 4, 5].map((col) => ({ row: 8, col })) },
];

function pathKey(path: WordCell[]) {
  return path.map((cell) => `${cell.row}-${cell.col}`).join("|");
}

function WordSearchGame() {
  const [selected, setSelected] = useState<WordCell[]>([]);
  const [found, setFound] = useState<string[]>([]);
  const [round, setRound] = useState(0);
  const maxWordLength = Math.max(...wordTargets.map((target) => target.path.length));
  const foundCellKeys = new Set(wordTargets.filter((target) => found.includes(target.word)).flatMap((target) => target.path.map((cell) => `${cell.row}-${cell.col}`)));
  const selectedKey = pathKey(selected);
  const complete = found.length === wordTargets.length;
  const timerStats = useGameTimerStats("word-search", standardDifficulty, complete, round);

  function reset() {
    setSelected([]);
    setFound([]);
    setRound((current) => current + 1);
  }

  function chooseCell(cell: WordCell) {
    if (complete) {
      return;
    }

    const nextSelection = selected.length >= maxWordLength ? [cell] : [...selected, cell];
    const nextKey = pathKey(nextSelection);
    const match = wordTargets.find((target) => {
      const forward = pathKey(target.path);
      const backward = pathKey([...target.path].reverse());
      return (nextKey === forward || nextKey === backward) && !found.includes(target.word);
    });

    if (match) {
      setFound((current) => [...current, match.word]);
      setSelected([]);
      return;
    }

    setSelected(nextSelection);
  }

  return (
    <GamePanel
      title="Word Search"
      status={complete ? "All words found" : `${found.length}/${wordTargets.length} found`}
      actions={
        <>
          <ControlButton onClick={() => setSelected([])}>Clear picks</ControlButton>
          <ControlButton onClick={reset}>Reset</ControlButton>
        </>
      }
      meta={<TimerStats stats={timerStats} />}
    >
      <div className="word-layout">
        <div className="word-board">
          {wordRows.flatMap((row, rowIndex) =>
            row.split("").map((letter, colIndex) => {
              const key = `${rowIndex}-${colIndex}`;
              const isSelected = selectedKey.includes(key);
              const isFound = foundCellKeys.has(key);

              return (
                <button
                  className={`word-cell ${isSelected ? "selected" : ""} ${isFound ? "found" : ""}`}
                  key={key}
                  onClick={() => chooseCell({ row: rowIndex, col: colIndex })}
                  type="button"
                >
                  {letter}
                </button>
              );
            }),
          )}
        </div>
        <div className="word-list">
          {wordTargets.map((target) => (
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
const snakeGoal = 10;
const initialSnake = [
  { x: 8, y: 8 },
  { x: 7, y: 8 },
  { x: 6, y: 8 },
];

function samePoint(a: Point, b: Point) {
  return a.x === b.x && a.y === b.y;
}

function randomFood(snake: Point[]) {
  let food = { x: 3, y: 3 };

  do {
    food = { x: Math.floor(Math.random() * snakeSize), y: Math.floor(Math.random() * snakeSize) };
  } while (snake.some((segment) => samePoint(segment, food)));

  return food;
}

function SnakeGame() {
  const [snake, setSnake] = useState(initialSnake);
  const [food, setFood] = useState(() => randomFood(initialSnake));
  const [direction, setDirection] = useState<Direction>("right");
  const [running, setRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(0);
  const won = score >= snakeGoal;
  const timerStats = useGameTimerStats("snake", standardDifficulty, won, round);
  const directionRef = useRef(direction);

  function reset() {
    directionRef.current = "right";
    setSnake(initialSnake);
    setFood(randomFood(initialSnake));
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
        const hitSelf = current.some((segment) => samePoint(segment, nextHead));

        if (hitSelf) {
          setGameOver(true);
          setRunning(false);
          return current;
        }

        const ate = samePoint(nextHead, food);
        const nextSnake = ate ? [nextHead, ...current] : [nextHead, ...current.slice(0, -1)];

        if (ate) {
          setScore((currentScore) => {
            const nextScore = currentScore + 1;

            if (nextScore >= snakeGoal) {
              setRunning(false);
            }

            return nextScore;
          });
          setFood(randomFood(nextSnake));
        }

        return nextSnake;
      });
    }, 140);

    return () => window.clearInterval(timer);
  }, [food, gameOver, running, won]);

  return (
    <GamePanel
      title="Snake"
      status={
        won
          ? `Goal reached, score ${score}`
          : gameOver
            ? `Game over, score ${score}`
            : running
              ? `Moving ${direction}, score ${score}/${snakeGoal}`
              : `Ready, score ${score}/${snakeGoal}`
      }
      actions={<ControlButton onClick={reset}>Reset</ControlButton>}
      meta={<TimerStats stats={timerStats} />}
    >
      <div className="snake-layout">
        <div className="snake-board">
          {Array.from({ length: snakeSize * snakeSize }, (_, index) => {
            const point = { x: index % snakeSize, y: Math.floor(index / snakeSize) };
            const isSnake = snake.some((segment) => samePoint(segment, point));
            const isHead = samePoint(snake[0], point);
            const isFood = samePoint(food, point);

            return <span className={`${isSnake ? "snake-body" : ""} ${isHead ? "snake-head" : ""} ${isFood ? "snake-food" : ""}`} key={index} />;
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
const suitSymbols: Record<Suit, string> = { spades: "♠", hearts: "♥", diamonds: "♦", clubs: "♣" };
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

function SolitaireGame() {
  const [state, setState] = useState(createSolitaireState);
  const [round, setRound] = useState(0);
  const won = suits.every((suit) => state.foundations[suit].length === 13);
  const timerStats = useGameTimerStats("solitaire", standardDifficulty, won, round);

  function reset() {
    setState(createSolitaireState());
    setRound((current) => current + 1);
  }

  function draw() {
    setState((current) => {
      const next: SolitaireState = structuredClone({ ...current, selected: null });

      if (next.stock.length) {
        const card = next.stock.pop()!;
        next.waste.push({ ...card, faceUp: true });
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

  function moveToTableau(pile: number) {
    setState((current) => {
      const selection = current.selected;

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

  function moveToFoundation(suit: Suit) {
    setState((current) => {
      const selection = current.selected;

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

  return (
    <GamePanel
      className="solitaire-panel"
      title="Solitaire"
      status={won ? "All foundations complete" : `${state.stock.length} stock, ${state.waste.length} waste`}
      actions={<ControlButton onClick={reset}>New deal</ControlButton>}
      meta={<TimerStats stats={timerStats} />}
    >
      <div className="solitaire">
        <div className="solitaire-top">
          <button className="playing-card card-back" onClick={draw} type="button">
            {state.stock.length ? state.stock.length : "Deal"}
          </button>
          <button
            className={`playing-card ${redSuits.has(state.waste.at(-1)?.suit ?? "spades") ? "red" : ""} ${
              state.selected?.source === "waste" ? "selected" : ""
            }`}
            onClick={() => (state.waste.at(-1) ? select({ source: "waste" }) : select(null))}
            onDoubleClick={() => (state.waste.at(-1) ? moveSelectionToAnyFoundation({ source: "waste" }) : undefined)}
            type="button"
          >
            {state.waste.at(-1) ? <CardFace card={state.waste.at(-1)!} /> : ""}
          </button>
          <div className="foundation-row">
            {suits.map((suit) => (
              <button
                className={`playing-card foundation ${redSuits.has(suit) ? "red" : ""} ${
                  state.selected?.source === "foundation" && state.selected.suit === suit ? "selected" : ""
                }`}
                key={suit}
                onClick={() => (state.selected ? moveToFoundation(suit) : state.foundations[suit].at(-1) ? select({ source: "foundation", suit }) : select(null))}
                type="button"
              >
                {state.foundations[suit].at(-1) ? <CardFace card={state.foundations[suit].at(-1)!} /> : suitSymbols[suit]}
              </button>
            ))}
          </div>
        </div>
        <div className="tableau">
          {state.tableau.map((pile, pileIndex) => (
            <div className="tableau-pile" key={pileIndex} onClick={() => moveToTableau(pileIndex)}>
              {pile.length === 0 ? <span className="empty-pile">K</span> : null}
              {pile.map((card, cardIndex) => (
                <button
                  className={`playing-card ${card.faceUp ? "" : "card-back"} ${redSuits.has(card.suit) ? "red" : ""} ${
                    state.selected?.source === "tableau" && state.selected.pile === pileIndex && cardIndex >= state.selected.index ? "selected" : ""
                  }`}
                  disabled={!card.faceUp}
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
                  style={{ top: `${cardIndex * 38}px` }}
                  type="button"
                >
                  {card.faceUp ? <CardFace card={card} /> : ""}
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
    </GamePanel>
  );
}

const pieceSymbols: Record<string, string> = {
  wp: "P",
  wn: "N",
  wb: "B",
  wr: "R",
  wq: "Q",
  wk: "K",
  bp: "p",
  bn: "n",
  bb: "b",
  br: "r",
  bq: "q",
  bk: "k",
};

function ChessGame() {
  const [fen, setFen] = useState(new Chess().fen());
  const [selected, setSelected] = useState<Square | null>(null);
  const [round, setRound] = useState(0);
  const game = useMemo(() => new Chess(fen), [fen]);
  const complete = game.isCheckmate() || game.isDraw();
  const timerStats = useGameTimerStats("chess", standardDifficulty, complete, round);
  const legalTargets = selected ? game.moves({ square: selected, verbose: true }).map((move) => move.to) : [];
  const status = game.isCheckmate()
    ? `Checkmate, ${game.turn() === "w" ? "black" : "white"} wins`
    : game.isDraw()
      ? "Draw"
      : game.inCheck()
        ? `${game.turn() === "w" ? "White" : "Black"} to move, check`
        : `${game.turn() === "w" ? "White" : "Black"} to move`;

  function reset() {
    setFen(new Chess().fen());
    setSelected(null);
    setRound((current) => current + 1);
  }

  function clickSquare(square: Square) {
    const piece = game.get(square);

    if (selected) {
      const next = new Chess(game.fen());
      const move = next.move({ from: selected, to: square, promotion: "q" });

      if (move) {
        setFen(next.fen());
        setSelected(null);
        return;
      }
    }

    if (piece && piece.color === game.turn()) {
      setSelected(square);
    } else {
      setSelected(null);
    }
  }

  return (
    <GamePanel title="Chess" status={status} actions={<ControlButton onClick={reset}>Reset board</ControlButton>} meta={<TimerStats stats={timerStats} />}>
      <div className="chess-board">
        {game.board().flatMap((row, rowIndex) =>
          row.map((piece, colIndex) => {
            const square = `${"abcdefgh"[colIndex]}${8 - rowIndex}` as Square;
            const light = (rowIndex + colIndex) % 2 === 0;
            const isSelected = selected === square;
            const isTarget = legalTargets.includes(square);

            return (
              <button
                className={`chess-square ${light ? "light" : "dark"} ${isSelected ? "selected" : ""} ${isTarget ? "target" : ""}`}
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
    sudoku: "Pick an empty cell, then use the number pad. Matching numbers highlight, and solved puzzles roll into a fresh one.",
    minesweeper: "Choose a difficulty, click to reveal, right-click to flag. Your first click is protected.",
    solitaire: "Draw from stock, move cards onto tableau piles, or double-click a card to send it to a foundation when it fits.",
    "2048": "Use arrow keys or the buttons. Merge matching tiles to grow the score.",
    chess: "Select one of the current side's pieces, then choose a legal destination.",
    snake: "Use arrow keys or the buttons. Walls wrap around; eat 10 food before running into yourself.",
    "word-search": "Click letters in order to find each word. Clear picks if the path is wrong.",
    "memory-match": "Flip two cards at a time and match all pairs.",
  };

  return <p>{instructions[game.slug]}</p>;
}
