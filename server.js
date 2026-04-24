const path = require("path");
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

let latestFrame = null;

io.on("connection", (socket) => {
  console.log(`Client connected: ${socket.id}`);

  if (latestFrame) {
    socket.emit("frame", latestFrame);
  }

  socket.on("frame", (base64Image) => {
    latestFrame = base64Image;
    socket.broadcast.emit("frame", base64Image);
  });

  socket.on("disconnect", () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

app.use(express.static(path.join(__dirname, "public")));

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`Socket listener server running on http://localhost:${port}`);
});
