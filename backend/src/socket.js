module.exports = function setupSocket(io) {
  io.on('connection', (socket) => {
    console.log(`[socket] client connected: ${socket.id}`);

    socket.on('join_match', (matchId) => {
      const room = `match_${matchId}`;
      socket.join(room);
      console.log(`[socket] ${socket.id} joined ${room}`);
    });

    socket.on('disconnect', () => {
      console.log(`[socket] client disconnected: ${socket.id}`);
    });
  });
};
