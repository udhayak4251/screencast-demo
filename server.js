const http = require("node:http");
const next = require("next");
const { Server } = require("socket.io");

const dev = process.env.NODE_ENV !== "production";
const port = Number(process.env.PORT || 3000);
const app = next({ dev, port });
const handle = app.getRequestHandler();

let latestFrame = null;

app.prepare().then(() => {
  const server = http.createServer((req, res) => {
    handle(req, res);
  });

  const io = new Server(server, {
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

  server.listen(port, () => {
    console.log(`Server ready on http://localhost:${port}`);
  });
});
