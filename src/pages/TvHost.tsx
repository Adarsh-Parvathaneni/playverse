
import { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Gamepad2, Users, ShieldCheck } from "lucide-react";
import { io } from "socket.io-client";

interface Player {
  id: string;
  nickname: string;
  connected: boolean;
}

function generateRoomCode() {
  return Math.random().toString(36).substring(2, 6).toUpperCase();
}

export default function TvHost() {
  const [roomCode] = useState(() => {
    const existingRoom = localStorage.getItem("playverse_room_code");

    if (existingRoom) {
      return existingRoom;
    }

    const newRoom = generateRoomCode();
    localStorage.setItem("playverse_room_code", newRoom);

    return newRoom;
  });

  const [players, setPlayers] = useState<Player[]>([]);

  const joinUrl = `${window.location.origin}/join/${roomCode}`;

  useEffect(() => {
    const socket = io(`http://${window.location.hostname}:3001`);

    socket.on("connect", () => {
      socket.emit("host:register", { roomCode }, (response: any) => {
        if (response.success) {
          setPlayers(response.players);
          console.log("Host registered successfully");
        } else {
          console.error(response.error);
        }
      });
    });

    socket.on("player:joined", (player: Player) => {
      setPlayers((current) => [...current, player]);
    });

    socket.on("player:left", (player: Player) => {
      setPlayers((current) =>
        current.filter((p) => p.id !== player.id)
      );
    });

    return () => {
      socket.disconnect();
    };
  }, [roomCode]);

  return (
    <main className="tv-host-page">

      <header className="tv-host-header">
        <div className="tv-host-brand">
          <Gamepad2 size={30} />
          <span>
            PLAYVERSE<span className="brand-dot">.</span>
          </span>
        </div>

        <div className="host-status">
          <span className="status-dot" />
          HOST ACTIVE
        </div>
      </header>

      <section className="tv-pairing-center">
        <div className="room-code-label">YOUR ROOM CODE</div>

        <div className="room-code">
          {roomCode.split("").join(" ")}
        </div>

        <div className="qr-container">
          <QRCodeSVG
            value={joinUrl}
            size={250}
            level="H"
            includeMargin
          />
        </div>
      </section>

      <footer className="tv-host-bottom">
        <h1>Ready to play?</h1>

        <p>
          Scan the QR code with your phone to join the game.
        </p>

        <div className="tv-host-info">

          <div>
            <ShieldCheck size={19} />
            <span>You're the Host</span>
          </div>

          <div className="host-info">
            <Users size={20} />
            <div>
              <strong>{players.length} Players Connected</strong>
              <span>
                {players.length > 0
                  ? players.map((player) => player.nickname).join(", ")
                  : "Waiting for players"}
              </span>
            </div>
          </div>

        </div>
      </footer>

    </main>
  );
}
