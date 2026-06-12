const express = require("express");
const http = require("http");
const fs = require("fs");
const multer = require("multer");
const mongoose = require("mongoose");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

/* ================= PORT ================= */
const PORT = process.env.PORT || 3000;

/* ================= MONGODB CONNECT ================= */
mongoose.connect(process.env.MONGO_URL)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.log("Mongo Error:", err));

/* ================= MIDDLEWARE ================= */
app.use(express.json());
app.use(express.static("public"));
app.use("/uploads", express.static("uploads"));

if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads");
}

/* ================= FILE UPLOAD ================= */
const upload = multer({
  storage: multer.diskStorage({
    destination: "uploads",
    filename: (req, file, cb) => {
      cb(null, Date.now() + "-" + file.originalname);
    }
  })
});

/* ================= DATABASE MODELS ================= */
const Post = mongoose.model("Post", {
  user: String,
  text: String,
  image: String,
  time: Number
});

const Chat = mongoose.model("Chat", {
  room: String,
  user: String,
  msg: String,
  time: Number
});

/* ================= POSTS API ================= */
app.get("/posts", async (req, res) => {
  const posts = await Post.find().sort({ time: -1 });
  res.json(posts);
});

app.post("/post", upload.single("image"), async (req, res) => {
  const post = new Post({
    user: req.body.user,
    text: req.body.text,
    image: req.file ? "/uploads/" + req.file.filename : null,
    time: Date.now()
  });

  await post.save();
  io.emit("new-post", post);

  res.json({ success: true });
});

/* ================= SOCKET CHAT ================= */
io.on("connection", (socket) => {

  console.log("User connected:", socket.id);

  socket.on("join", async (room) => {
    socket.join(room);

    const history = await Chat.find({ room }).sort({ time: 1 });
    socket.emit("history", history);
  });

  socket.on("msg", async (data) => {

    const message = new Chat({
      room: data.room,
      user: data.user,
      msg: data.msg,
      time: Date.now()
    });

    await message.save();

    io.to(data.room).emit("new", message);
  });

});

/* ================= START SERVER ================= */
server.listen(PORT, () => {
  console.log("AfricaUni running on port", PORT);
});
