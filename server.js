const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

app.use(express.static("public")); // Serve static files from 'public' folder

io.on("connection", (socket) => {
  socket.on("join", (roomId) => {
    socket.join(roomId);
    socket.to(roomId).emit("user-connected", socket.id);

    socket.on("signal", (data) => {
      io.to(data.target).emit("signal", {
        sender: socket.id,
        signal: data.signal,
      });
    });

    socket.on("disconnect", () => {
      socket.to(roomId).emit("user-disconnected", socket.id);
    });
  });
});

http.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
