import { useState } from "react";

type Category = "Puzzle" | "Cards" | "Board" | "Arcade" | "Word";
type GameStatus = "Planned" | "Idea";
type PreviewType = "sudoku" | "mines" | "cards" | "numbers" | "chess" | "snake" | "words" | "memory";

type Game = {
  name: string;
  category: Category;
  status: GameStatus;
  mood: string;
  preview: PreviewType;
};

const games: Game[] = [
  { name: "Sudoku", category: "Puzzle", status: "Planned", mood: "Quiet logic", preview: "sudoku" },
  { name: "Minesweeper", category: "Puzzle", status: "Planned", mood: "Careful clicks", preview: "mines" },
  { name: "Solitaire", category: "Cards", status: "Idea", mood: "Coffee-table cards", preview: "cards" },
  { name: "2048", category: "Puzzle", status: "Idea", mood: "Number stacking", preview: "numbers" },
  { name: "Chess", category: "Board", status: "Idea", mood: "Classic strategy", preview: "chess" },
  { name: "Snake", category: "Arcade", status: "Idea", mood: "Old phone reflexes", preview: "snake" },
  { name: "Word Search", category: "Word", status: "Idea", mood: "Circle the hidden word", preview: "words" },
  { name: "Memory Match", category: "Puzzle", status: "Idea", mood: "Flip and remember", preview: "memory" },
];

const categories = ["All", "Puzzle", "Cards", "Board", "Arcade", "Word"] as const;

function GamePreview({ type }: { type: PreviewType }) {
  if (type === "sudoku") {
    return (
      <div className="preview preview-sudoku" aria-hidden="true">
        {["5", "", "9", "", "2", "", "7", "", "4"].map((value, index) => (
          <span key={`${value}-${index}`}>{value}</span>
        ))}
      </div>
    );
  }

  if (type === "mines") {
    return (
      <div className="preview preview-mines" aria-hidden="true">
        {["", "1", "", "2", "", "", "3", "", ""].map((value, index) => (
          <span className={index === 4 ? "mine" : ""} key={`${value}-${index}`}>
            {value}
          </span>
        ))}
      </div>
    );
  }

  if (type === "cards") {
    return (
      <div className="preview preview-cards" aria-hidden="true">
        <span>A</span>
        <span>7</span>
        <span>K</span>
      </div>
    );
  }

  if (type === "numbers") {
    return (
      <div className="preview preview-numbers" aria-hidden="true">
        {[2, 4, 8, 16].map((value) => (
          <span key={value}>{value}</span>
        ))}
      </div>
    );
  }

  if (type === "chess") {
    return (
      <div className="preview preview-chess" aria-hidden="true">
        {Array.from({ length: 16 }, (_, index) => (
          <span className={index === 1 || index === 10 ? "piece" : ""} key={index} />
        ))}
      </div>
    );
  }

  if (type === "snake") {
    return (
      <div className="preview preview-snake" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
        <span className="snack" />
      </div>
    );
  }

  if (type === "words") {
    return (
      <div className="preview preview-words" aria-hidden="true">
        {["G", "A", "M", "E", "S", "U", "N", "C", "L"].map((letter, index) => (
          <span className={index < 5 ? "found" : ""} key={`${letter}-${index}`}>
            {letter}
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className="preview preview-memory" aria-hidden="true">
      {Array.from({ length: 6 }, (_, index) => (
        <span className={index === 1 || index === 4 ? "open" : ""} key={index} />
      ))}
    </div>
  );
}

export default function App() {
  const [activeCategory, setActiveCategory] = useState<(typeof categories)[number]>("All");
  const visibleGames =
    activeCategory === "All" ? games : games.filter((game) => game.category === activeCategory);
  const plannedCount = games.filter((game) => game.status === "Planned").length;

  return (
    <main className="app-shell">
      <header className="top-bar">
        <a className="brand" href="/" aria-label="Unc Games home">
          <span className="brand-mark">UG</span>
          <span>Unc Games</span>
        </a>
        <span className="version-pill">v0.1 lobby</span>
      </header>

      <section className="lobby">
        <div className="lobby-copy">
          <p className="eyebrow">Classic browser game room</p>
          <h1>Pick a table. Start with the classics.</h1>
        </div>

        <dl className="lobby-stats" aria-label="Project stats">
          <div>
            <dt>{games.length}</dt>
            <dd>Games on the shelf</dd>
          </div>
          <div>
            <dt>{plannedCount}</dt>
            <dd>Ready to build first</dd>
          </div>
          <div>
            <dt>1</dt>
            <dd>Shared website home</dd>
          </div>
        </dl>
      </section>

      <section className="library" aria-label="Game library">
        <div className="library-header">
          <h2>Game Shelf</h2>
          <div className="category-tabs" role="group" aria-label="Filter games by category">
            {categories.map((category) => (
              <button
                aria-pressed={activeCategory === category}
                className="category-tab"
                key={category}
                onClick={() => setActiveCategory(category)}
                type="button"
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        <div className="game-grid">
          {visibleGames.map((game) => (
            <article className="game-card" key={game.name}>
              <div className="game-card-art">
                <GamePreview type={game.preview} />
              </div>
              <div className="game-card-copy">
                <div className="card-meta">
                  <span>{game.category}</span>
                  <span>{game.status}</span>
                </div>
                <h3>{game.name}</h3>
                <p>{game.mood}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
