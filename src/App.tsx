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
          <span className="brand-mark" aria-hidden="true">
            <svg className="uncle-logo-svg" viewBox="0 0 96 96" role="img" aria-label="">
              <rect className="logo-badge" x="5" y="5" width="86" height="86" rx="20" />
              <path className="logo-corner" d="M15 81L81 15v66z" />
              <path className="logo-hair" d="M24 36c1-14 12-23 25-23 14 0 25 9 26 23-6-5-12-5-17-1-5-7-14-7-19 0-5-4-10-4-15 1z" />
              <circle className="logo-ear logo-ear-left" cx="23" cy="50" r="7" />
              <circle className="logo-ear logo-ear-right" cx="73" cy="50" r="7" />
              <path className="logo-face" d="M24 43c0-17 49-17 49 0v9c0 17-10 27-24 27S24 69 24 52z" />
              <path className="logo-cap" d="M31 20c8-8 29-8 37 0l-4 12H35z" />
              <text className="logo-cap-text" x="48" y="30" textAnchor="middle">
                UG
              </text>
              <path className="logo-brow" d="M31 43c5-4 11-4 16-1" />
              <path className="logo-brow" d="M50 42c5-3 11-3 16 1" />
              <path className="logo-glasses" d="M27 48h10m22 0h10M37 48c0-5 5-8 10-6 3 1 5 3 5 6s-2 6-5 7c-5 2-10-1-10-7zm15 0c0-5 5-8 10-6 3 1 5 3 5 6s-2 6-5 7c-5 2-10-1-10-7z" />
              <path className="logo-nose" d="M49 51c-2 5-1 8 3 9" />
              <path className="logo-mustache" d="M35 62c6-6 13-4 14 2 2-6 10-8 16-2-3 8-12 9-16 3-4 6-13 5-14-3z" />
              <path className="logo-controller" d="M27 75c4-6 11-8 21-5 10-3 17-1 21 5 2 4-1 9-6 8l-8-3H41l-8 3c-5 1-8-4-6-8z" />
              <path className="logo-dpad" d="M37 73v7m-4-3h8" />
              <circle className="logo-button logo-button-red" cx="57" cy="76" r="2.8" />
              <circle className="logo-button logo-button-blue" cx="64" cy="74" r="2.8" />
            </svg>
          </span>
          <span className="brand-text">Unc Games</span>
        </button>
        <span className="version-pill">v1.1 arcade</span>
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
