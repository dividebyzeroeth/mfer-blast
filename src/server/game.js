const Constants = require('../shared/constants');
const Player = require('./player');
const AidKit = require('./aidkit');
const {applyBullets, applyAidKits} = require('./collisions');

let aidKitSpawnTimes = [];

class Game {
  constructor() {
    this.sockets = {};
    this.players = {};
    this.aidkits = [];
    this.bullets = [];
    this.lastUpdateTime = Date.now();
    this.shouldSendUpdate = false;
    this.messages = [];
    setInterval(this.update.bind(this), 1000 / 60);
  }

  addPlayer(socket, user) {
    this.sockets[socket.id] = socket;

    const x = Math.random()*(Constants.MAP_SIZE-Constants.AID_KIT_RADIUS);
    const y = Math.random()*(Constants.MAP_SIZE-Constants.AID_KIT_RADIUS);

    this.players[socket.id] = new Player(socket.id, user, x, y);

    this.messages.push(`${user.name} enters the chat`);
  }

  removePlayer(socket) {
    delete this.sockets[socket.id];
    delete this.players[socket.id];
  }

  handleInput(socket, dir) {
    if (this.players[socket.id]) {
      this.players[socket.id].setDirection(dir);
    }
  }

  update() {
    // Calculate time elapsed
    const now = Date.now();
    const dt = (now - this.lastUpdateTime) / 1000;
    this.lastUpdateTime = now;

    // Update each bullet
    const bulletsToRemove = [];
    this.bullets.forEach(bullet => {
      if (bullet.update(dt)) {
        // Destroy this bullet
        bulletsToRemove.push(bullet);
      }
    });
    this.bullets = this.bullets.filter(bullet => !bulletsToRemove.includes(bullet));

    // Update each player
    Object.keys(this.sockets).forEach(playerID => {
      const player = this.players[playerID];
      const newBullet = player.update(dt);
      if (newBullet) {
        this.bullets.push(newBullet);
        //this.messages.push(`${player.user.name} fires ${Math.random()}`);
      }
    });

    // Apply collisions, give players score for hitting bullets
    const destroyedBullets = applyBullets(Object.values(this.players), this.bullets);
    this.bullets = this.bullets.filter(bullet => !destroyedBullets.includes(bullet.bullet));

    // Check if any mfers are freshly dead, and sweep floor
    Object.keys(this.sockets).forEach(playerID => {
      const socket = this.sockets[playerID];
      const player = this.players[playerID];

      if (player.hp <= 0) {
        
        if (player.color === "dead") {
          // game over - removed from game
          socket.emit(Constants.MSG_TYPES.GAME_OVER);
          this.removePlayer(socket);
        }
        else {
          // mfer is now dead!
          const killer_bullet = destroyedBullets.find(d => d.hitId === player.id)
          
          const killer = this.players[killer_bullet.bullet.parentID];

          // award player kill score
          killer?.onDealtDamage();

          this.messages.push(`${player.user.name} blasted by ${killer?.user.name}`);

          // hp is punked for after-death sequence countdown
          player.hp = Constants.AFTER_DEATH_COUNTDOWN;
          player.color = "dead";
        }
      }

      // countdown back to zero before removal
      if (player.color === "dead") {
        player.hp -= 1;
      }
    });

    // Check if any players get healed
    const usedAidKits = applyAidKits(Object.values(this.players), this.aidkits);
    this.aidkits = this.aidkits.filter(aidkit => !usedAidKits.includes(aidkit));

    // maximum number of aid kits depends on number of players
    const aidkit_to_player_ratio = 0.33;
    const max_aid_kits = Object.keys(this.players).length > 1 ? parseInt(aidkit_to_player_ratio*Object.keys(this.players).length + 0.5) : 1;

    // Check if we need another AidKit
    if (this.aidkits.length < max_aid_kits) {

      const x = Math.random()*(Constants.MAP_SIZE-Constants.AID_KIT_RADIUS);
      const y = Math.random()*(Constants.MAP_SIZE-Constants.AID_KIT_RADIUS);

      const hp = Constants.PLAYER_MAX_HP;
      const t0 = now + 2000*(Math.random() + 5*Math.random());
      this.aidkits.push(new AidKit(x, y, hp, t0));
    }

    // check if aidkit exists yet
    this.aidkits.forEach(kit => {
      kit.update(now);
    });
    
    // Send a game update to each player every other time
    if (this.shouldSendUpdate) {
      const leaderboard = this.getLeaderboard();
      Object.keys(this.sockets).forEach(playerID => {
        const socket = this.sockets[playerID];
        const player = this.players[playerID];
        socket.emit(
          Constants.MSG_TYPES.GAME_UPDATE, 
          this.createUpdate(
            player, 
            leaderboard, 
            this.messages
          )
        );
      });
      this.messages = []; // messages sent!
      this.shouldSendUpdate = false;
    } else {
      this.shouldSendUpdate = true;
    }
  }

  getLeaderboard() {
    return Object.values(this.players)
      .sort((p1, p2) => p2.score - p1.score)
      .slice(0, 5)
      .map(p => ({ name: p.user.name, score: Math.round(p.score) }));
  }

  createUpdate(player, leaderboard, messages) {
    const nearbyPlayers = Object.values(this.players).filter(
      p => p !== player && p.distanceTo(player) <= 0.5*Constants.MAP_SIZE,
    );
    const nearbyBullets = this.bullets.filter(
      b => b.distanceTo(player) <= 0.5*Constants.MAP_SIZE,
    );
    const existingAidKits = this.aidkits.filter(b => b.exist);
    const nearbyAidKits = existingAidKits.filter(
      b => b.distanceTo(player) <= 0.5*Constants.MAP_SIZE,
    );

    return {
      t: Date.now(),
      me: player.serializeForUpdate(),
      others: nearbyPlayers.map(p => p.serializeForUpdate()),
      bullets: nearbyBullets.map(b => b.serializeForUpdate()),
      aidkits: nearbyAidKits.map(a => a.serializeForUpdate()),
      leaderboard,
      messages: messages,
      playercount:Object.values(this.players).length
    };
  }
}

module.exports = Game;
