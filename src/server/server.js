const express = require('express');
const webpack = require('webpack');
const webpackDevMiddleware = require('webpack-dev-middleware');
const socketio = require('socket.io');

const Constants = require('../shared/constants');
const Game = require('./game');
const webpackConfig = require('../../webpack.dev.js');

const log = require('./logging');

// Setup an Express server
const app = express();
// app.use(express.static('public'));

if (process.env.NODE_ENV === 'development') {
  // Setup Webpack for development
  const compiler = webpack(webpackConfig);
  app.use(webpackDevMiddleware(compiler));
} //else {
  // served by nginx
  // Static serve the dist/ folder in production
  // app.use(express.static('dist'));
//

// Listen on port
const port = process.env.PORT || 3000;
const server = process.env.NODE_ENV === 'development' ? 
  app.listen(port, "0.0.0.0") : app.listen(port)
console.log(`Server listening on port ${port}`);

// Setup socket.io
const io = socketio(server);

// Listen for socket.io connections
io.on('connection', socket => {
  console.log('Player connected!', socket.id);

  socket.on(Constants.MSG_TYPES.JOIN_GAME, joinGame);
  socket.on(Constants.MSG_TYPES.INPUT, handleInput);
  socket.on('disconnect', onDisconnect);
});

// Setup the Game
const game = new Game();

function joinGame(user) {
  // max name length
  user.name = user.name.slice(0, 15);
  log(user.name);
  
  game.addPlayer(this, user);
}

function handleInput(dir) {
  game.handleInput(this, dir);
}

function onDisconnect() {
  game.removePlayer(this);
}
