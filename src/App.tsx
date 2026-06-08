import { useEffect, useState } from "react";

type Category = "Puzzle" | "Cards" | "Board" | "Arcade" | "Word";
type GameStatus = "Planned" | "Idea";
type PreviewType = "sudoku" | "mines" | "cards" | "numbers" | "chess" | "snake" | "words" | "memory";

type Game = {
  name: string;
  slug: string;
  category: Category;
  status: GameStatus;
  mood: string;
  preview: PreviewType;
};

const games: Game[] = [
  { name: "Sudoku", slug: "sudoku", category: "Puzzle", status: "Planned", mood: "Quiet logic", preview: "sudoku" },
  {
    name: "Minesweeper",
    slug: "minesweeper",
    category: "Puzzle",
    status: "Planned",
    mood: "Careful clicks",
    preview: "mines",
  },
  { name: "Solitaire", slug: "solitaire", category: "Cards", status: "Idea", mood: "Coffee-table cards", preview: "cards" },
  { name: "2048", slug: "2048", category: "Puzzle", status: "Idea", mood: "Number stacking", preview: "numbers" },
  { name: "Chess", slug: "chess", category: "Board", status: "Idea", mood: "Classic strategy", preview: "chess" },
  { name: "Snake", slug: "snake", category: "Arcade", status: "Idea", mood: "Old phone reflexes", preview: "snake" },
  {
    name: "Word Search",
    slug: "word-search",
    category: "Word",
    status: "Idea",
    mood: "Circle the hidden word",
    preview: "words",
  },
  {
    name: "Memory Match",
    slug: "memory-match",
    category: "Puzzle",
    status: "Idea",
    mood: "Flip and remember",
    preview: "memory",
  },
];

const categories = ["All", "Puzzle", "Cards", "Board", "Arcade", "Word"] as const;

function getGameSlugFromHash() {
  return window.location.hash.replace(/^#\/?/, "");
}

function GamePreview({ type, size = "small" }: { type: PreviewType; size?: "small" | "large" }) {
  const className = `preview preview-${size}`;

  if (type === "sudoku") {
    return (
      <div className={`${className} preview-sudoku`} aria-hidden="true">
        {["5", "", "9", "", "2", "", "7", "", "4"].map((value, index) => (
          <span key={`${value}-${index}`}>{value}</span>
        ))}
      </div>
    );
  }

  if (type === "mines") {
    return (
      <div className={`${className} preview-mines`} aria-hidden="true">
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
      <div className={`${className} preview-cards`} aria-hidden="true">
        <span>A</span>
        <span>7</span>
        <span>K</span>
      </div>
    );
  }

  if (type === "numbers") {
    return (
      <div className={`${className} preview-numbers`} aria-hidden="true">
        {[2, 4, 8, 16].map((value) => (
          <span key={value}>{value}</span>
        ))}
      </div>
    );
  }

  if (type === "chess") {
    return (
      <div className={`${className} preview-chess`} aria-hidden="true">
        {Array.from({ length: 16 }, (_, index) => (
          <span className={index === 1 || index === 10 ? "piece" : ""} key={index} />
        ))}
      </div>
    );
  }

  if (type === "snake") {
    return (
      <div className={`${className} preview-snake`} aria-hidden="true">
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
      <div className={`${className} preview-words`} aria-hidden="true">
        {["G", "A", "M", "E", "S", "U", "N", "C", "L"].map((letter, index) => (
          <span className={index < 5 ? "found" : ""} key={`${letter}-${index}`}>
            {letter}
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className={`${className} preview-memory`} aria-hidden="true">
      {Array.from({ length: 6 }, (_, index) => (
        <span className={index === 1 || index === 4 ? "open" : ""} key={index} />
      ))}
    </div>
  );
}

function GameRoom({ game, onBack }: { game: Game; onBack: () => void }) {
  return (
    <section className="game-room" aria-labelledby="game-room-title">
      <div className="game-room-top">
        <button className="back-button" onClick={onBack} type="button">
          Back
        </button>
        <div className="game-room-status">
          <span>{game.category}</span>
          <span>{game.status}</span>
        </div>
      </div>

      <div className="game-room-stage">
        <div className="game-room-copy">
          <p className="eyebrow">Now seating</p>
          <h1 id="game-room-title">{game.name}</h1>
          <p>{game.mood}</p>
        </div>

        <div className="play-table" aria-label={`${game.name} play area`}>
          <GamePreview type={game.preview} size="large" />
          <span className="table-badge">Coming soon</span>
        </div>
      </div>
    </section>
  );
}

export default function App() {
  const [activeCategory, setActiveCategory] = useState<(typeof categories)[number]>("All");
  const [activeGameSlug, setActiveGameSlug] = useState(getGameSlugFromHash);
  const selectedGame = games.find((game) => game.slug === activeGameSlug);
  const visibleGames =
    activeCategory === "All" ? games : games.filter((game) => game.category === activeCategory);
  const plannedCount = games.filter((game) => game.status === "Planned").length;

  useEffect(() => {
    const updateActiveGame = () => setActiveGameSlug(getGameSlugFromHash());

    window.addEventListener("hashchange", updateActiveGame);
    return () => window.removeEventListener("hashchange", updateActiveGame);
  }, []);

  function openGame(game: Game) {
    window.location.hash = game.slug;
    setActiveGameSlug(game.slug);
  }

  function returnToShelf() {
    window.history.pushState("", document.title, window.location.pathname + window.location.search);
    setActiveGameSlug("");
  }

  return (
    <main className={`app-shell ${selectedGame ? "game-mode" : ""}`}>
      <header className="top-bar">
        <button className="brand" onClick={returnToShelf} type="button" aria-label="Unc Games home">
          <span className="brand-mark">UG</span>
          <span>Unc Games</span>
        </button>
        <span className="version-pill">v0.2 tables</span>
      </header>

      {selectedGame ? (
        <GameRoom game={selectedGame} onBack={returnToShelf} />
      ) : (
        <>
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
                <button className="game-card" key={game.name} onClick={() => openGame(game)} type="button">
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
                    <span className="game-card-action">Open table</span>
                  </div>
                </button>
              ))}
            </div>
          </section>
        </>
      )}
    </main>
  );
}
