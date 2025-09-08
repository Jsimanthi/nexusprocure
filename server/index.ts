// Replace the entire server/index.ts with this:

import { Server } from "socket.io";
import { createServer } from "http";
import { NextApiRequest, NextApiResponse } from "next";

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

const userSockets = new Map<string, string>();

io.on("connection", (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  socket.on("register", (userId: string) => {
    if (userId) {
      console.log(`Registering user ${userId} to socket ${socket.id}`);
      userSockets.set(userId, socket.id);
    }
  });

  socket.on("disconnect", () => {
    console.log(`Socket disconnected: ${socket.id}`);
    for (const [userId, socketId] of userSockets.entries()) {
      if (socketId === socket.id) {
        userSockets.delete(userId);
        break;
      }
    }
  });
});

// Handle notification requests
httpServer.on('request', (req, res) => {
  if (req.method === 'POST' && req.url === '/notify') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        const { userId, message } = JSON.parse(body);
        const socketId = userSockets.get(userId);
        if (socketId) {
          io.to(socketId).emit("notification", { message });
          console.log(`Sent notification to user ${userId} (socket ${socketId}): ${message}`);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true }));
        } else {
          console.log(`User ${userId} not connected, notification not sent.`);
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'User not connected' }));
        }
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Invalid JSON' }));
      }
    });
  } else {
    res.writeHead(404);
    res.end();
  }
});

const PORT = process.env.SOCKET_PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Socket.IO server with notification endpoint listening on port ${PORT}`);
});