// app.js

const express = require("express");
const http = require("http");         // For creating an HTTP server
const cors = require("cors");
const socketIO = require("socket.io"); // Socket.IO for real-time
require("dotenv").config();

// Import the notes router and initIO function from routes/notes.js
const { router: notesRouter, initIO } = require("./routes/notes");

const app = express();
app.use(cors());
app.use(express.json());

// REST routes
app.use("/api/notes", notesRouter);

// Simple test endpoint
app.get("/", (req, res) => {
  res.send("Backend is running!");
});

// Create an HTTP server instead of using app.listen
const server = http.createServer(app);

// Attach Socket.IO to the same server
const io = socketIO(server, {
  cors: {
    origin: "*", // In production, restrict this to your frontend domain
  },
});

// Pass the Socket.IO instance to notes.js so it can emit events later
initIO(io);

// Listen for new Socket.IO connections
io.on("connection", (socket) => {
  console.log("New client connected:", socket.id);

  // Example: join a room for a specific note
  socket.on("joinNote", (noteId) => {
    socket.join(noteId);
    console.log(`Socket ${socket.id} joined note room: ${noteId}`);
  });

  // Example: broadcast note changes to others in the same room
  socket.on("noteUpdated", (data) => {
    // data is expected to be an object like { noteId, content, ... }
    socket.to(data.noteId).emit("noteUpdated", data);
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
