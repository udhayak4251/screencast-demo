"use client";

import { useEffect, useState } from "react";
import { io as ioClient, type Socket } from "socket.io-client";

type ServerToClientEvents = {
  frame: (base64: string) => void;
};

type ClientToServerEvents = {
  frame: (base64: string) => void;
};

export default function LiveStreamPage() {
  const [frameSrc, setFrameSrc] = useState("");
  const [status, setStatus] = useState("initializing");

  useEffect(() => {
    let socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;

    const connect = async () => {
      await fetch("/api/socket");

      socket = ioClient({
        path: "/api/socket_io",
        transports: ["websocket", "polling"],
      }) as Socket<ServerToClientEvents, ClientToServerEvents>;

      socket.on("connect", () => setStatus("connected"));
      socket.on("disconnect", () => setStatus("disconnected"));
      socket.on("frame", (base64: string) => {
        setFrameSrc(`data:image/jpeg;base64,${base64}`);
        setStatus("receiving frames");
      });
    };

    void connect();

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, []);

  return (
    <main className="container">
      <section className="card">
        <div className="streamHeader">
          <h1>Live Stream</h1>
          <span className="status">Status: {status}</span>
        </div>
        <div className="frameWrap">{frameSrc ? <img src={frameSrc} alt="Live frame" className="frame" /> : <p>Waiting for first frame...</p>}</div>
      </section>
    </main>
  );
}
