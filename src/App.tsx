import { useEffect, useState } from "react";
import { GamePreview } from "./GamePreview";
import { GameInstructions, PlayableGame } from "./PlayableGame";
import { categories, games, type Game } from "./gameData";

function getGameSlugFromHash() {
  return window.location.hash.replace(/^#\/?/, "");
}

function GameRoom({ game, onBack }: { game: Game; onBack: () => void }) {
  return (
    <section className={`game-room game-room-${game.slug}`} aria-labelledby="game-room-title">
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
          <p className="eyebrow">Now playing</p>
          <h1 id="game-room-title">{game.name}</h1>
          <GameInstructions game={game} />
        </div>

        <PlayableGame slug={game.slug} />
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
        <span className="version-pill">v1.0 playable</span>
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
                <dd>Playable games</dd>
              </div>
              <div>
                <dt>8</dt>
                <dd>Tables open today</dd>
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
                    <span className="game-card-action">Play</span>
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
