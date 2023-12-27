const mongoose = require("mongoose");
const dotenv = require("dotenv");
const socketIO = require("socket.io");

process.on("uncaughtException", (err) => {
  console.log("UNCAUGHT EXCEPTION! Shutting down...");
  console.log(err.name, err.message);
  process.exit(1);
});

dotenv.config({ path: "./config.env" });
const app = require("./app");

const DB = process.env.DATABASE.replace(
  "<PASSWORD>",
  process.env.DATABASE_PASSWORD
);

mongoose.set("strictQuery", false);
mongoose
  .connect(DB, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("DB connection successful!"));

const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
  console.log(`App running on http://localhost:${port}`);
});

const io = socketIO(server);

let activUsers = [];

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);
  // socket.emit('chat message', 'Hello there!');
  socket.on("add-new-user", (newUserId) => {
    if (!activUsers.includes(newUserId)) {
      activUsers.push({ userId: newUserId, socketId: socket.id });
    }
    console.log("New user connected", activUsers);
    io.emit("get-users", activUsers);
  });
  socket.on("chat message", (data) => {
    // socket.emit('chat message', 'Hello there!');
    // io.emit('chat message', data);
    // const message = new Message(data);
    //     message.save((err) => {
    //         if (err) {
    //             console.error('Error saving message to MongoDB:', err);
    //         } else {
    //             io.emit('chat message', data);
    //         }
    //     });
    console.log(data);
    console.log("message saved");
  });

  io.on("send-message", (data) => {
    const { receiverId } = data;

    console.log("Sending from socket to :", receiverId);
    const user = activUsers.find((user) => user.userId === receiverId);
    console.log("Sending from socket to :", receiverId);
    console.log("Data: ", data);
    if (user) {
      io.to(user.socketId).emit("recieve-message", data);
    }
  });

  socket.on("buy-product", (data) => {
    console.log("Buy product: ", data);
    const { sellerId } = data;

    console.log("Sending from socket to :", sellerId);
    const user = activUsers.find((user) => user.userId === sellerId);
    console.log("Sending from socket to :", sellerId);
    console.log("Data: ", data);
    if (user) {
      io.to(user.socketId).emit("recieve-buy", data);
    }
  });

  socket.on("notification", (data) => {
    io.emit("notification", data);
  });

  socket.on("disconnect", () => {
    activUsers = activUsers.filter((user) => user.socketId !== socket.id);
    console.log("User disconnected", activUsers);
    io.emit("get-users", activUsers);
  });
});

process.on("unhandledRejection", (err) => {
  console.log("UNHANDLED REJECTION!  Shutting down...");
  console.log(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});

module.exports = { io, server };
