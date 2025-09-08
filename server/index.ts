import { Server } from "socket.io";
import { createServer } from "http";

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:3000", // Allow requests from the Next.js app
    methods: ["GET", "POST"],
  },
});

const userSockets = new Map<string, string>(); // Map<userId, socketId>

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
    // Find and remove the user from the map
    for (const [userId, socketId] of userSockets.entries()) {
      if (socketId === socket.id) {
        userSockets.delete(userId);
        break;
      }
    }
  });
});

// This is a simple way for the main app to send notifications.
// The main app will make an HTTP POST request to this server.
// This is an alternative to having the main app connect as a socket client.
const notificationServer = createServer((req, res) => {
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
  console.log(`Socket.IO server listening on port ${PORT}`);
});

const NOTIFICATION_PORT = process.env.NOTIFICATION_PORT || 3002;
notificationServer.listen(NOTIFICATION_PORT, () => {
    console.log(`Notification server listening on port ${NOTIFICATION_PORT}`);
});
