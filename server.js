const express = require("express");
const http = require("http");
const fs = require("fs");
const multer = require("multer");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static("public"));
app.use("/uploads", express.static("uploads"));

if (!fs.existsSync("uploads")) fs.mkdirSync("uploads");

/* ---------------- DATA ---------------- */
let posts = [];
let chats = {};
let users = [];

/* ---------------- FILE UPLOAD ---------------- */
const upload = multer({
  storage: multer.diskStorage({
    destination: "uploads",
    filename: (req, file, cb) => {
      cb(null, Date.now() + "-" + file.originalname);
    }
  })
});

/* ---------------- POSTS ---------------- */
app.get("/posts", (req, res) => {
  res.json(posts);
});

app.post("/post", upload.single("image"), (req, res) => {
  const post = {
    id: Date.now(),
    user: req.body.user,
    text: req.body.text,
    image: req.file ? "/uploads/" + req.file.filename : null,
    time: Date.now()
  };

  posts.unshift(post);
  io.emit("new-post", post);

  res.json({ success: true, post });
});

/* ---------------- SOCKET CHAT ---------------- */
io.on("connection", (socket) => {

  socket.on("join", (room) => {
    socket.join(room);

    if (!chats[room]) chats[room] = [];

    socket.emit("history", chats[room]);
  });

  socket.on("msg", ({ room, user, msg }) => {
    if (!chats[room]) chats[room] = [];

    const message = { user, msg, time: Date.now() };
    chats[room].push(message);

    io.to(room).emit("new", message);
  });
});

server.listen(PORT, () => {
  console.log("AfricaUni running on port", PORT);
});
