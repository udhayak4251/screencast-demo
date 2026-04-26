import { Server } from "socket.io";

let latestFrame = null;

export default function handler(_req, res) {
  if (!res.socket.server.io) {
    const io = new Server(res.socket.server, {
      path: "/api/socket_io",
      cors: {
        origin: "*",
        methods: ["GET", "POST"],
      },
    });

    io.on("connection", (socket) => {
      if (latestFrame) {
        socket.emit("frame", latestFrame);
      }

      socket.on("frame", (base64Image) => {
        latestFrame = base64Image;
        socket.broadcast.emit("frame", base64Image);
      });
    });

    res.socket.server.io = io;
  }

  res.status(200).json({ ok: true });
}
