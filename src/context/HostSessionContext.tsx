
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { io, type Socket } from "socket.io-client";

interface Player {
  id: string;
  nickname: string;
  connected: boolean;
  isHost?: boolean;
}

interface HostSessionContextType {
  socket: Socket | null;
  roomCode: string;
  pairingToken: string;
  remoteConnected: boolean;
  players: Player[];
  connected: boolean;
}

const HostSessionContext =
  createContext<HostSessionContextType | null>(null);

export function HostSessionProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [roomCode, setRoomCode] = useState("");
  const [pairingToken, setPairingToken] = useState("");
  const [remoteConnected, setRemoteConnected] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const newSocket = io(
  `http://${window.location.hostname}:3001`,
  {
    reconnection: true,
  }
);
    setSocket(newSocket);

    newSocket.on("connect", () => {
      console.log("Connected to Playverse server:", newSocket.id);
      setConnected(true);

      // Backend generates the room code and pairing token.
      newSocket.emit(
        "host:register",
        (response: {
          success: boolean;
          roomCode?: string;
          pairingToken?: string;
          players?: Player[];
          message?: string;
        }) => {
          if (!response?.success) {
            console.error(
              "Host registration failed:",
              response?.message
            );
            return;
          }

          console.log("Host registered:", response.roomCode);

          setRoomCode(response.roomCode || "");
          setPairingToken(response.pairingToken || "");
          setPlayers(response.players || []);
        }
      );
    });

    newSocket.on("disconnect", () => {
      console.log("Disconnected from Playverse server");

      setConnected(false);
      setRemoteConnected(false);
      setRoomCode("");
      setPairingToken("");
      setPlayers([]);
    });

    newSocket.on("connect_error", (error) => {
      console.error("Host connection error:", error.message);
      setConnected(false);
    });

    newSocket.on(
      "host-remote:connected",
      (data: { remoteId: string }) => {
        console.log("Host remote connected:", data.remoteId);
        setRemoteConnected(true);
      }
    );

    newSocket.on("host-remote:disconnected", () => {
      setRemoteConnected(false);
    });

    newSocket.on(
      "player:joined",
      (data: { player: Player }) => {
        const player = data.player;

        if (!player) return;

        setPlayers((current) => {
          if (current.some((p) => p.id === player.id)) {
            return current;
          }

          return [...current, player];
        });
      }
    );

    newSocket.on(
      "player:left",
      (data: { playerId: string }) => {
        setPlayers((current) =>
          current.filter((p) => p.id !== data.playerId)
        );
      }
    );

    newSocket.on(
      "players:update",
      (data: { players: Player[] }) => {
        setPlayers(data.players || []);
      }
    );

    return () => {
      newSocket.disconnect();
    };
  }, []);

  return (
    <HostSessionContext.Provider
      value={{
        socket,
        roomCode,
        pairingToken,
        remoteConnected,
        players,
        connected,
      }}
    >
      {children}
    </HostSessionContext.Provider>
  );
}

export function useHostSession() {
  const context = useContext(HostSessionContext);

  if (!context) {
    throw new Error(
      "useHostSession must be used inside HostSessionProvider"
    );
  }

  return context;
}
