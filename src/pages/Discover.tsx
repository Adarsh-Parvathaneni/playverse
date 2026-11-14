
import { useState } from "react";
import { Search, Users, ArrowUpRight, Gamepad2, Sparkles } from "lucide-react";

const games = [
  {
    name: "Fruit Frenzy",
    category: "Arcade",
    players: "1–4 Players",
    description: "Slice fruits, dodge bombs and chase the highest score.",
    icon: "🍉",
    color: "fruit",
  },
  {
    name: "Sword Clash",
    category: "Action",
    players: "2 Players",
    description: "Challenge your friends in a battle of speed and reflexes.",
    icon: "⚔️",
    color: "sword",
  },
  {
    name: "Rhythm Rush",
    category: "Rhythm",
    players: "1–4 Players",
    description: "Follow the beat and move to the rhythm.",
    icon: "🎵",
    color: "rhythm",
  },
  {
    name: "Reflex Wars",
    category: "Competitive",
    players: "2–6 Players",
    description: "Test your reaction time against your friends.",
    icon: "⚡",
    color: "reflex",
  },
];

const categories = ["All Games", "Arcade", "Action", "Rhythm", "Competitive"];

export default function Discover() {
  const [category, setCategory] = useState("All Games");
  const [search, setSearch] = useState("");

  const filteredGames = games.filter((game) => {
    const matchesCategory =
      category === "All Games" || game.category === category;

    const matchesSearch =
      game.name.toLowerCase().includes(search.toLowerCase());

    return matchesCategory && matchesSearch;
  });

  return (
    <div className="discover-page">
      <div className="discover-heading">
        <div>
          <div className="eyebrow">
            <Sparkles size={14} />
            EXPLORE THE PLAYVERSE
          </div>
          <h1>DISCOVER <span>GAMES.</span></h1>
          <p>Find your next favourite way to play.</p>
        </div>
        <div className="discover-count">
          <Gamepad2 size={19} />
          {filteredGames.length} GAMES
        </div>
      </div>

      <div className="discover-toolbar">
        <div className="discover-search">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search games..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="category-filters">
          {categories.map((item) => (
            <button
              key={item}
              className={category === item ? "selected" : ""}
              onClick={() => setCategory(item)}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="discover-grid">
        {filteredGames.map((game) => (
          <article className={`game-card ${game.color}`} key={game.name}>
            <div className="game-art">
              <div className="game-art-glow" />
              <span className="game-emoji">{game.icon}</span>
              <span className="game-status">COMING SOON</span>
            </div>

            <div className="game-info">
              <div className="game-category">{game.category}</div>
              <h3>{game.name}</h3>
              <p>{game.description}</p>

              <div className="game-card-footer">
                <span><Users size={14} /> {game.players}</span>
                <button
                  aria-label={`View ${game.name}`}
                  title="Coming soon"
                  onClick={() => window.alert(`${game.name} is coming soon!`)}
                >
                  <ArrowUpRight size={18} />
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>

      {filteredGames.length === 0 && (
        <div className="empty-games">
          <Gamepad2 size={35} />
          <h3>No games found</h3>
          <p>Try another search or category.</p>
        </div>
      )}
    </div>
  );
}
