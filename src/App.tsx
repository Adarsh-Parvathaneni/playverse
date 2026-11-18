
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import Discover from "./pages/Discover";
import MyGames from "./pages/MyGames";
import TvHost from "./pages/TvHost";
import Join from "./pages/Join";
import Remote from "./pages/Remote";

import {
  HostSessionProvider,
  useHostSession,
} from "./context/HostSessionContext";

import { QRCodeSVG } from "qrcode.react";

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

function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();

  const {
    socket,
    roomCode,
    pairingToken,
    remoteConnected,
    connected,
  } = useHostSession();

  const [mobileMenu, setMobileMenu] = useState(false);
  const [notice, setNotice] = useState("");

  // TV cursor position.
  const [cursor, setCursor] = useState({
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
  });

  // Keep the latest position available to socket callbacks.
  const cursorRef = useRef(cursor);

  const [cursorVisible, setCursorVisible] = useState(false);

  const activeNav =
    location.pathname === "/discover"
      ? "Discover"
      : location.pathname === "/my-games"
        ? "My Games"
        : "Home";

  const remoteUrl = pairingToken
    ? `${window.location.origin}/remote/${roomCode}?token=${encodeURIComponent(pairingToken)}`
    : "";

  // ==========================================
  // HOST REMOTE CURSOR AND NAVIGATION
  // ==========================================

  useEffect(() => {
    if (!socket || !remoteConnected) {
      setCursorVisible(false);
      return;
    }

    // Start the cursor in the centre of the TV.
    const initialPosition = {
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    };

    cursorRef.current = initialPosition;
    setCursor(initialPosition);
    setCursorVisible(true);

    let hoveredElement: HTMLElement | null = null;

    // Find the interactive element underneath the cursor.
    const getInteractiveElement = (
      x: number,
      y: number
    ): HTMLElement | null => {
      const element = document.elementFromPoint(x, y);

      if (!(element instanceof HTMLElement)) {
        return null;
      }

      return element.closest(
        'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [role="button"], [tabindex]:not([tabindex="-1"])'
      ) as HTMLElement | null;
    };

    // Apply hover styling to the element under the cursor.
    const updateHover = (x: number, y: number) => {
      const nextElement = getInteractiveElement(x, y);

      if (hoveredElement === nextElement) {
        return;
      }

      hoveredElement?.classList.remove("remote-cursor-hover");

      hoveredElement = nextElement;

      hoveredElement?.classList.add("remote-cursor-hover");
    };

// ==========================================
// REMOTE CURSOR EDGE SCROLLING
// ==========================================

const EDGE_SIZE = 90;
const MAX_SCROLL_SPEED = 14;

let edgeScrollFrame = 0;

const stopEdgeScroll = () => {
  if (edgeScrollFrame) {
    cancelAnimationFrame(edgeScrollFrame);
    edgeScrollFrame = 0;
  }
};

// Find the actual scrollable dashboard container.
const getScrollContainer = (): HTMLElement | null => {
  const candidates = [
    document.querySelector(".main-content"),
    document.querySelector(".page-container"),
    document.scrollingElement,
    document.documentElement,
    document.body,
  ];

  for (const candidate of candidates) {
    if (!(candidate instanceof HTMLElement)) continue;

    const canScrollVertically =
      candidate.scrollHeight > candidate.clientHeight + 1;

    const canScrollHorizontally =
      candidate.scrollWidth > candidate.clientWidth + 1;

    if (canScrollVertically || canScrollHorizontally) {
      return candidate;
    }
  }

  return null;
};

const startEdgeScroll = () => {
  if (edgeScrollFrame) return;

  const scrollLoop = () => {
    // Never scroll during gameplay.
    if (document.querySelector(".playverse-game-stage")) {
      stopEdgeScroll();
      return;
    }

    const { x, y } = cursorRef.current;

    const width = window.innerWidth;
    const height = window.innerHeight;

    const container = getScrollContainer();

    if (!container) {
      stopEdgeScroll();
      return;
    }

    let scrollX = 0;
    let scrollY = 0;

    // TOP EDGE
    if (y < EDGE_SIZE) {
      const intensity = (EDGE_SIZE - y) / EDGE_SIZE;
      scrollY = -Math.max(2, intensity * MAX_SCROLL_SPEED);
    }

    // BOTTOM EDGE
    else if (y > height - EDGE_SIZE) {
      const intensity =
        (y - (height - EDGE_SIZE)) / EDGE_SIZE;

      scrollY = Math.max(2, intensity * MAX_SCROLL_SPEED);
    }

    // LEFT EDGE
    if (x < EDGE_SIZE) {
      const intensity = (EDGE_SIZE - x) / EDGE_SIZE;
      scrollX = -Math.max(2, intensity * MAX_SCROLL_SPEED);
    }

    // RIGHT EDGE
    else if (x > width - EDGE_SIZE) {
      const intensity =
        (x - (width - EDGE_SIZE)) / EDGE_SIZE;

      scrollX = Math.max(2, intensity * MAX_SCROLL_SPEED);
    }

    // Scroll the actual dashboard container.
    if (scrollX !== 0 || scrollY !== 0) {
      const previousTop = container.scrollTop;
      const previousLeft = container.scrollLeft;

      container.scrollTop += scrollY;
      container.scrollLeft += scrollX;

      // Update hover after the page moves.
      updateHover(x, y);

      // Stop if the container has reached its boundary.
      const actuallyScrolled =
        container.scrollTop !== previousTop ||
        container.scrollLeft !== previousLeft;

      if (actuallyScrolled) {
        edgeScrollFrame = requestAnimationFrame(scrollLoop);
      } else {
        stopEdgeScroll();
      }
    } else {
      stopEdgeScroll();
    }
  };

  edgeScrollFrame = requestAnimationFrame(scrollLoop);
};

    // Receive cursor movement and click events from the phone.
    const handleCursor = (data: {
      type: "move" | "click";
      dx?: number;
      dy?: number;
    }) => {
      if (data.type === "move") {
        const current = cursorRef.current;

        const next = {
          x: Math.max(
            0,
            Math.min(
              window.innerWidth,
              current.x + (data.dx || 0) * window.innerWidth
            )
          ),
          y: Math.max(
            0,
            Math.min(
              window.innerHeight,
              current.y + (data.dy || 0) * window.innerHeight
            )
          ),
        };

        cursorRef.current = next;
setCursor(next);

updateHover(next.x, next.y);

// Start scrolling when cursor approaches screen edges.
const nearEdge =
  next.x < EDGE_SIZE ||
  next.x > window.innerWidth - EDGE_SIZE ||
  next.y < EDGE_SIZE ||
  next.y > window.innerHeight - EDGE_SIZE;

if (nearEdge) {
  startEdgeScroll();
} else {
  stopEdgeScroll();
}

return;
      }

      if (data.type === "click") {
        const current = cursorRef.current;

        const element = getInteractiveElement(
          current.x,
          current.y
        );

        element?.click();
      }
    };

    // Back and Home controls.
    const handleRemoteNavigation = (data: {
      action: string;
    }) => {
      if (data.action === "home") {
        navigate("/");
        setMobileMenu(false);
        return;
      }

      if (data.action === "back") {
        if (location.pathname === "/") {
          setMobileMenu(false);
        } else if (location.pathname === "/host") {
          navigate("/");
        } else {
          navigate(-1);
        }
      }
    };

    socket.on("remote:cursor", handleCursor);
    socket.on("remote:navigate", handleRemoteNavigation);

    return () => {
  socket.off("remote:cursor", handleCursor);
  socket.off("remote:navigate", handleRemoteNavigation);

  // Stop any ongoing edge scrolling.
  stopEdgeScroll();

  hoveredElement?.classList.remove("remote-cursor-hover");

  setCursorVisible(false);
};
  }, [socket, remoteConnected, location.pathname, navigate]);

  // ==========================================
  // ROOM ACTIONS
  // ==========================================

  const createRoom = () => {
    setNotice("");
    navigate("/host");
  };

  const joinRoom = () => {
    setNotice("Room joining will be enabled in a later stage.");
  };

  // ==========================================
  // STARTUP PAIRING SCREEN
  // ==========================================

  if (!remoteConnected) {
    return (
      <main
        style={{
          minHeight: "100dvh",
          width: "100%",
          background:
            "radial-gradient(circle at 50% 35%, #211a32 0%, #101014 55%, #0c0c10 100%)",
          color: "#fff",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "30px",
          boxSizing: "border-box",
          textAlign: "center",
          fontFamily: "inherit",
        }}
      >
        <div
          style={{
            fontSize: "34px",
            fontWeight: 800,
            letterSpacing: "1px",
          }}
        >
          PLAYVERSE
          <span style={{ color: "#A47AFF" }}>.</span>
        </div>

        <p
          style={{
            color: "#aaa",
            fontSize: "12px",
            letterSpacing: "2.5px",
            marginTop: "12px",
          }}
        >
          YOUR GAMING EXPERIENCE STARTS HERE
        </p>

        <div
          style={{
            marginTop: "38px",
            padding: "16px",
            background: "#fff",
            borderRadius: "20px",
            width: "282px",
            height: "282px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 20px 80px rgba(164,122,255,0.12)",
          }}
        >
          {remoteUrl ? (
            <QRCodeSVG
              value={remoteUrl}
              size={250}
              level="H"
              includeMargin
            />
          ) : (
            <span style={{ color: "#333", fontSize: "13px" }}>
              {connected
                ? "Preparing your connection..."
                : "Connecting to Playverse..."}
            </span>
          )}
        </div>

        <h2
          style={{
            marginTop: "32px",
            marginBottom: "8px",
            fontSize: "23px",
            fontWeight: 700,
          }}
        >
          Connect your phone
        </h2>

        <p
          style={{
            color: "#999",
            maxWidth: "360px",
            fontSize: "14px",
            lineHeight: 1.7,
          }}
        >
          Scan the QR code with your phone to connect your
          Playverse host remote.
        </p>

        <div
          style={{
            marginTop: "24px",
            display: "inline-flex",
            alignItems: "center",
            gap: "9px",
            padding: "11px 18px",
            borderRadius: "30px",
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.08)",
            color: connected ? "#8fce9d" : "#ff858c",
            fontSize: "11px",
            fontWeight: 700,
            letterSpacing: "1.2px",
          }}
        >
          <span
            style={{
              width: "7px",
              height: "7px",
              borderRadius: "50%",
              background: connected ? "#65d68a" : "#ff858c",
            }}
          />

          {connected
            ? "WAITING FOR PHONE"
            : "CONNECTING TO SERVER"}
        </div>

        <div
          style={{
            marginTop: "24px",
            color: "#777",
            fontSize: "12px",
            letterSpacing: "2px",
          }}
        >
          ROOM CODE: {roomCode}
        </div>

        <p
          style={{
            color: "#666",
            fontSize: "11px",
            marginTop: "35px",
          }}
        >
          YOUR PHONE WILL BECOME THE HOST CONTROLLER
        </p>
      </main>
    );
  }

  // ==========================================
  // MAIN PLAYVERSE INTERFACE
  // ==========================================

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
              REMOTE CONNECTED
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

          {location.pathname === "/discover" && <Discover />}

          {/* MY GAMES PAGE */}

          {location.pathname === "/my-games" && <MyGames />}

          {/* HOST PAGE */}

          {location.pathname === "/host" && <TvHost />}
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

      {/* TV REMOTE CURSOR STYLING */}

      <style>{`
        .remote-cursor-hover {
          outline: 2px solid #A47AFF !important;
          outline-offset: 4px !important;
          box-shadow:
            0 0 0 5px rgba(164, 122, 255, 0.12),
            0 0 24px rgba(164, 122, 255, 0.35) !important;
          transition:
            outline 100ms ease,
            box-shadow 100ms ease;
        }

        .playverse-tv-cursor {
          position: fixed;
          z-index: 2147483647;
          width: 24px;
          height: 24px;
          border: 2px solid #fff;
          border-radius: 50%;
          background: rgba(164, 122, 255, 0.28);
          box-shadow:
            0 0 0 5px rgba(164, 122, 255, 0.18),
            0 0 22px rgba(164, 122, 255, 0.85);
          pointer-events: none;
          transform: translate(-50%, -50%);
          transition:
            left 35ms linear,
            top 35ms linear;
        }

        .playverse-tv-cursor::after {
          content: "";
          position: absolute;
          width: 5px;
          height: 5px;
          left: 50%;
          top: 50%;
          border-radius: 50%;
          background: #fff;
          transform: translate(-50%, -50%);
        }
      `}</style>

      {/* VISIBLE TV CURSOR */}

      {cursorVisible && remoteConnected && (
        <div
          className="playverse-tv-cursor"
          aria-hidden="true"
          style={{
            left: `${cursor.x}px`,
            top: `${cursor.y}px`,
          }}
        />
      )}
    </div>
  );
}

// ==========================================
// APPLICATION ENTRY
// ==========================================

export default function App() {
  const location = useLocation();

  // Phone remote must not create a TV host session.
  if (location.pathname.startsWith("/remote/")) {
    return <Remote />;
  }

  // Player controller must not create a TV host session.
  if (location.pathname.startsWith("/join/")) {
    return <Join />;
  }

  return (
    <HostSessionProvider>
      <AppContent />
    </HostSessionProvider>
  );
}
