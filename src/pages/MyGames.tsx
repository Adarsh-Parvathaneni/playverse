
import { useState } from "react";
import { Gamepad2, Heart, Clock3, Library, Play } from "lucide-react";

const games = [
  {
    id: 1,
    title: "Fruit Frenzy",
    category: "ARCADE",
    players: "1-4 Players",
    color: "orange",
  },
  {
    id: 2,
    title: "Sword Clash",
    category: "ACTION",
    players: "2 Players",
    color: "purple",
  },
  {
    id: 3,
    title: "Rhythm Rush",
    category: "MUSIC",
    players: "1-4 Players",
    color: "pink",
  },
  {
    id: 4,
    title: "Reflex Wars",
    category: "COMPETITIVE",
    players: "2-4 Players",
    color: "blue",
  },
];

export default function MyGames() {
  const [favourites, setFavourites] = useState<number[]>([]);
  const [notification, setNotification] = useState("");

  const toggleFavourite = (id: number) => {
    setFavourites((current) =>
      current.includes(id)
        ? current.filter((gameId) => gameId !== id)
        : [...current, id]
    );
  };

  const handlePlay = (title: string) => {
    setNotification(`${title} is not playable yet. Game development is coming soon!`);
    window.setTimeout(() => setNotification(""), 3000);
  };

  return (
    <main className="my-games-page">
      <div className="my-games-heading">
        <div>
          <span className="section-eyebrow">YOUR COLLECTION</span>
          <h1>My Games</h1>
          <p>Your games, ready when you are.</p>
        </div>
      </div>

      <div className="library-stats">
        <div className="library-stat">
          <Library />
          <div>
            <strong>{games.length}</strong>
            <span>Games owned</span>
          </div>
        </div>

        <div className="library-stat">
          <Heart />
          <div>
            <strong>{favourites.length}</strong>
            <span>Favourites</span>
          </div>
        </div>

        <div className="library-stat">
          <Clock3 />
          <div>
            <strong>0h</strong>
            <span>Play time</span>
          </div>
        </div>
      </div>

      <section className="my-games-section">
        <div className="my-games-section-heading">
          <div>
            <h2>Your Library</h2>
            <p>All your saved games in one place.</p>
          </div>
          <span>{games.length} GAMES</span>
        </div>

        <div className="my-games-grid">
          {games.map((game) => {
            const isFavourite = favourites.includes(game.id);

            return (
              <article className="game-card" key={game.id}>
                <div className={`game-card-art ${game.color}`}>
                  <Gamepad2 size={42} />

                  <button
                    className={`favourite-button ${isFavourite ? "active" : ""}`}
                    onClick={() => toggleFavourite(game.id)}
                    aria-label={isFavourite ? "Remove from favourites" : "Add to favourites"}
                  >
                    <Heart
                      size={19}
                      fill={isFavourite ? "currentColor" : "none"}
                    />
                  </button>
                </div>

                <div className="game-card-info">
                  <span>{game.category}</span>
                  <h3>{game.title}</h3>
                  <p>{game.players}</p>

                  <button
                    className="game-play-button"
                    onClick={() => handlePlay(game.title)}
                  >
                    <Play size={15} fill="currentColor" />
                    Play Game
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {notification && (
        <div className="game-notification">
          {notification}
        </div>
      )}
    </main>
  );
}
