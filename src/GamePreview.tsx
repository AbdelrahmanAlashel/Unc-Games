import type { PreviewType } from "./gameData";

export function GamePreview({ type, size = "small" }: { type: PreviewType; size?: "small" | "large" }) {
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
