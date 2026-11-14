
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Discover from "./pages/Discover";

import {
  Gamepad2,
  Home,
  Compass,
  Library,
  Settings,
  Users,
  Zap,
  ArrowUpRight,
  Plus,
  Smartphone,
  Monitor,
  Menu,
  X,
  ChevronRight,
  Sparkles,
  Trophy,
} from "lucide-react";

const games = [
  {
    id: 1,
    name: "Fruit Frenzy",
    category: "ARCADE",
    players: "1–4 PLAYERS",
    description: "Slice, score and survive. How high can you go?",
    icon: "🍉",
    color: "fruit",
    status: "COMING SOON",
  },
  {
    id: 2,
    name: "Sword Clash",
    category: "ACTION",
    players: "2 PLAYERS",
    description: "Challenge your friends in a battle of reflexes.",
    icon: "⚔️",
    color: "sword",
    status: "COMING SOON",
  },
  {
    id: 3,
    name: "Rhythm Rush",
    category: "RHYTHM",
    players: "1–4 PLAYERS",
    description: "Find the beat. Move with the music.",
    icon: "🎵",
    color: "rhythm",
    status: "COMING SOON",
  },
  {
    id: 4,
    name: "Reflex Wars",
    category: "COMPETITIVE",
    players: "2–6 PLAYERS",
    description: "Speed, precision and lightning-fast reactions.",
    icon: "⚡",
    color: "reflex",
    status: "COMING SOON",
  },
];

const navItems = [
  { name: "Home", icon: Home, path: "/" },
  { name: "Discover", icon: Compass, path: "/discover" },
  { name: "My Games", icon: Library, path: "/my-games" },
];

function App() {
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileMenu, setMobileMenu] = useState(false);
  const [notice, setNotice] = useState("");

  const activeNav =
    location.pathname === "/discover"
      ? "Discover"
      : location.pathname === "/my-games"
        ? "My Games"
        : "Home";

  const createRoom = () => {
    setNotice("Room creation will be enabled when we build the backend.");
  };

  const joinRoom = () => {
    setNotice("Room joining will be enabled when we build QR pairing.");
  };

  return (
    <div className="app-shell">

      {/* SIDEBAR */}

      <aside className={`sidebar ${mobileMenu ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-icon">
            <Gamepad2 size={23} />
          </div>

          <span>
            PLAYVERSE<span className="brand-dot">.</span>
          </span>

          <button
            className="mobile-close"
            onClick={() => setMobileMenu(false)}
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        <div className="nav-label">WORKSPACE</div>

        <nav className="nav-list">
          {navItems.map(({ name, icon: Icon, path }) => (
            <button
              key={name}
              className={`nav-item ${activeNav === name ? "active" : ""}`}
              onClick={() => {
                navigate(path);
                setMobileMenu(false);
              }}
            >
              <Icon size={19} />
              <span>{name}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-promo">
            <Sparkles size={19} />
            <p>Your next favourite game is waiting.</p>
            <span>EXPLORE PLAYVERSE</span>
          </div>

          <button
            className="nav-item"
            onClick={() =>
              setNotice("Settings will be available in a later version.")
            }
          >
            <Settings size={19} />
            <span>Settings</span>
          </button>

          <div className="sidebar-footer">
            <div className="online-indicator" />
            <span>PLAYVERSE NETWORK</span>
            <span className="version">BETA</span>
          </div>
        </div>
      </aside>

      {/* MOBILE OVERLAY */}

      {mobileMenu && (
        <button
          className="mobile-overlay"
          onClick={() => setMobileMenu(false)}
          aria-label="Close navigation"
        />
      )}

      {/* MAIN CONTENT */}

      <main className="main-content">

        {/* TOP NAVIGATION */}

        <header className="topbar">
          <button
            className="mobile-menu-button"
            onClick={() => setMobileMenu(true)}
            aria-label="Open navigation"
          >
            <Menu size={22} />
          </button>

          <div className="breadcrumb">
            PLAYVERSE <ChevronRight size={14} />
            <span>{activeNav.toUpperCase()}</span>
          </div>

          <div className="topbar-right">
            <div className="network-status">
              <span className="online-indicator" />
              PREVIEW MODE
            </div>

            <div className="profile-avatar">P</div>
          </div>
        </header>

        {/* PAGE CONTENT */}

        <div className="page-container">

          {/* HOME PAGE */}

          {location.pathname === "/" && (
            <>
              <section className="hero">
                <div className="hero-content">
                  <div className="eyebrow">
                    <Sparkles size={14} />
                    THE NEXT GENERATION OF PLAY
                  </div>

                  <h1>
                    YOUR WORLD.
                    <br />
                    <span>YOUR GAMES.</span>
                  </h1>

                  <p className="hero-description">
                    Forget controllers. Grab your phone, connect to
                    the screen and turn any room into an arcade.
                  </p>

                  <div className="hero-actions">
                    <button
                      className="primary-button"
                      onClick={createRoom}
                    >
                      <Plus size={19} />
                      CREATE A ROOM
                      <ArrowUpRight size={17} />
                    </button>

                    <button
                      className="secondary-button"
                      onClick={joinRoom}
                    >
                      JOIN A ROOM
                      <ChevronRight size={17} />
                    </button>
                  </div>

                  <div className="hero-meta">
                    <span>
                      <Users size={15} /> PLAY WITH FRIENDS
                    </span>

                    <span>
                      <Zap size={15} /> PHONE POWERED
                    </span>
                  </div>
                </div>

                <div className="hero-visual">
                  <div className="orb orb-one" />
                  <div className="orb orb-two" />

                  <div className="visual-ring ring-one" />
                  <div className="visual-ring ring-two" />

                  <div className="visual-core">
                    <Gamepad2 size={100} strokeWidth={1.1} />
                  </div>

                  <div className="floating-tag tag-top">
                    <Smartphone size={17} />
                    <span>MOTION CONTROL</span>
                  </div>

                  <div className="floating-tag tag-bottom">
                    <Monitor size={17} />
                    <span>BIG SCREEN GAMING</span>
                  </div>

                  <div className="visual-caption">
                    <span>01 / 04</span>
                    <span>THE PLAYVERSE EXPERIENCE</span>
                  </div>
                </div>
              </section>

              <section className="stats-strip">
                <div>
                  <span className="stat-label">GAMES</span>
                  <strong>04</strong>
                </div>

                <div>
                  <span className="stat-label">CONTROLLER</span>
                  <strong>YOUR PHONE</strong>
                </div>

                <div>
                  <span className="stat-label">PLATFORM</span>
                  <strong>ANY SCREEN</strong>
                </div>

                <div>
                  <span className="stat-label">ENTRY</span>
                  <strong>NO DOWNLOADS</strong>
                </div>
              </section>

              <section className="games-section" id="games">
                <div className="section-heading">
                  <div>
                    <div className="eyebrow">
                      <Zap size={14} />
                      THE GAME LIBRARY
                    </div>

                    <h2>
                      CHOOSE YOUR <span>GAME.</span>
                    </h2>

                    <p>
                      Something for every player, every mood and every moment.
                    </p>
                  </div>

                  <button
                    className="view-all"
                    onClick={() => navigate("/discover")}
                  >
                    EXPLORE ALL <ArrowUpRight size={16} />
                  </button>
                </div>

                <div className="game-grid">
                  {games.map((game, index) => (
                    <article
                      className={`game-card ${game.color}`}
                      key={game.id}
                    >
                      <div className="game-art">
                        <div className="game-art-glow" />

                        <div className="game-art-number">
                          0{index + 1}
                        </div>

                        <span className="game-emoji">
                          {game.icon}
                        </span>

                        <span className="game-status">
                          {game.status}
                        </span>
                      </div>

                      <div className="game-info">
                        <div className="game-category">
                          {game.category}
                        </div>

                        <h3>{game.name}</h3>

                        <p>{game.description}</p>

                        <div className="game-card-footer">
                          <span>
                            <Users size={14} />
                            {game.players}
                          </span>

                          <button
                            aria-label={`Learn about ${game.name}`}
                            onClick={() =>
                              setNotice(
                                `${game.name} will be playable in a future development stage.`
                              )
                            }
                          >
                            <ArrowUpRight size={18} />
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </section>

              <section className="how-section">
                <div className="section-heading">
                  <div>
                    <div className="eyebrow">
                      <Sparkles size={14} />
                      SIMPLE BY DESIGN
                    </div>

                    <h2>
                      THREE STEPS. <span>ENDLESS PLAY.</span>
                    </h2>
                  </div>
                </div>

                <div className="steps-grid">
                  <div className="step-card">
                    <span className="step-number">01</span>
                    <Monitor size={25} />
                    <h3>OPEN PLAYVERSE</h3>
                    <p>
                      Launch the gaming experience on your TV or laptop.
                    </p>
                  </div>

                  <div className="step-card">
                    <span className="step-number">02</span>
                    <Smartphone size={25} />
                    <h3>CONNECT YOUR PHONE</h3>
                    <p>
                      Scan a QR code and turn your phone into a controller.
                    </p>
                  </div>

                  <div className="step-card">
                    <span className="step-number">03</span>
                    <Trophy size={25} />
                    <h3>LET THE GAMES BEGIN</h3>
                    <p>
                      Choose a game, challenge friends and make memories.
                    </p>
                  </div>
                </div>
              </section>

              <footer className="footer">
                <div className="footer-brand">
                  PLAYVERSE<span>.</span>
                </div>

                <p>MOVE. PLAY. COMPETE.</p>

                <span>© 2026 PLAYVERSE. BUILT FOR PLAY.</span>
              </footer>
            </>
          )}

          {/* DISCOVER PAGE */}

          {location.pathname === "/discover" && (
            <Discover />
          )}

          {/* MY GAMES PAGE */}

          {location.pathname === "/my-games" && (
            <div className="discover-page">
              <div className="discover-heading">
                <div>
                  <div className="eyebrow">
                    <Library size={14} />
                    YOUR COLLECTION
                  </div>

                  <h1>
                    MY <span>GAMES.</span>
                  </h1>

                  <p>
                    Your saved and recently played games will appear here.
                  </p>
                </div>
              </div>

              <div className="empty-games">
                <Gamepad2 size={35} />
                <h3>Your collection is waiting</h3>
                <p>
                  Explore the game library to discover your next favourite.
                </p>

                <button
                  className="primary-button"
                  onClick={() => navigate("/discover")}
                >
                  EXPLORE GAMES
                  <ArrowUpRight size={17} />
                </button>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* NOTIFICATION */}

      {notice && (
        <div className="notice" role="status">
          <span>{notice}</span>

          <button
            onClick={() => setNotice("")}
            aria-label="Dismiss notification"
          >
            <X size={17} />
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
