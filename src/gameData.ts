export type Category = "Puzzle" | "Cards" | "Board" | "Arcade" | "Word";
export type GameStatus = "Playable";
export type GameSlug =
  | "sudoku"
  | "minesweeper"
  | "solitaire"
  | "2048"
  | "chess"
  | "snake"
  | "word-search"
  | "memory-match";
export type PreviewType = "sudoku" | "mines" | "cards" | "numbers" | "chess" | "snake" | "words" | "memory";

export type Game = {
  name: string;
  slug: GameSlug;
  category: Category;
  status: GameStatus;
  mood: string;
  preview: PreviewType;
};

export const games: Game[] = [
  { name: "Sudoku", slug: "sudoku", category: "Puzzle", status: "Playable", mood: "Quiet logic", preview: "sudoku" },
  {
    name: "Minesweeper",
    slug: "minesweeper",
    category: "Puzzle",
    status: "Playable",
    mood: "Careful clicks",
    preview: "mines",
  },
  {
    name: "Solitaire",
    slug: "solitaire",
    category: "Cards",
    status: "Playable",
    mood: "Coffee-table cards",
    preview: "cards",
  },
  { name: "2048", slug: "2048", category: "Puzzle", status: "Playable", mood: "Number stacking", preview: "numbers" },
  { name: "Chess", slug: "chess", category: "Board", status: "Playable", mood: "Classic strategy", preview: "chess" },
  { name: "Snake", slug: "snake", category: "Arcade", status: "Playable", mood: "Old phone reflexes", preview: "snake" },
  {
    name: "Word Search",
    slug: "word-search",
    category: "Word",
    status: "Playable",
    mood: "Circle the hidden word",
    preview: "words",
  },
  {
    name: "Memory Match",
    slug: "memory-match",
    category: "Puzzle",
    status: "Playable",
    mood: "Flip and remember",
    preview: "memory",
  },
];

export const categories = ["All", "Puzzle", "Cards", "Board", "Arcade", "Word"] as const;
