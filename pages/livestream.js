import { useEffect, useState } from "react";
import { io as ioClient } from "socket.io-client";

export default function LiveStreamPage() {
  const [frameSrc, setFrameSrc] = useState("");
  const [status, setStatus] = useState("initializing");

  useEffect(() => {
    let socket;

    const connect = async () => {
      await fetch("/api/socket");

      socket = ioClient({
        path: "/api/socket_io",
        transports: ["websocket", "polling"],
      });

      socket.on("connect", () => setStatus("connected"));
      socket.on("disconnect", () => setStatus("disconnected"));
      socket.on("frame", (base64) => {
        setFrameSrc(`data:image/jpeg;base64,${base64}`);
        setStatus("receiving frames");
      });
    };

    connect();

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
        <div className="frameWrap">
          {frameSrc ? <img src={frameSrc} alt="Live frame" className="frame" /> : <p>Waiting for first frame...</p>}
        </div>
      </section>
    </main>
  );
}
