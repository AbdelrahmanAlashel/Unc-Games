const starterGames = [
  { name: "Sudoku", status: "Planned" },
  { name: "Minesweeper", status: "Planned" },
  { name: "Solitaire", status: "Idea" },
  { name: "2048", status: "Idea" },
];

export default function App() {
  return (
    <main className="app-shell">
      <section className="intro">
        <p className="eyebrow">Classic games, one cozy browser arcade</p>
        <h1>Unc Games</h1>
        <p className="summary">
          A growing collection of timeless puzzle, card, and board games. We will choose the
          first playable games next and build them one at a time.
        </p>
      </section>

      <section className="game-board" aria-label="Starter game list">
        {starterGames.map((game) => (
          <article className="game-card" key={game.name}>
            <span>{game.status}</span>
            <h2>{game.name}</h2>
          </article>
        ))}
      </section>
    </main>
  );
}
