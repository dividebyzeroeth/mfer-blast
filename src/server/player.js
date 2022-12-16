const fs = require('fs');
const ObjectClass = require('./object');
const Bullet = require('./bullet');
const Constants = require('../shared/constants');

const rawData = fs.readFileSync(require.resolve("./mfer-traits.json"));
const mferTraits = JSON.parse(rawData.toString());

class Player extends ObjectClass {
  constructor(id, user, x, y) {
    super(id, x, y, Math.random() * 2 * Math.PI, Constants.PLAYER_SPEED);
    // this.username = user.name;
    // this.tokenId = user.tokenId;
    this.user = user;
    this.hp = Constants.PLAYER_MAX_HP;
    this.fireCooldown = 0;
    this.score = 0;
    this.color = mferTraits[this.user?.tokenId]?.attributes.find(t => t.trait_type === 'background')?.value || 'white';
  }

  // Returns a newly created bullet, or null.
  update(dt) {
    if (this.color === "dead") return;

    super.update(dt);

    // Make sure the player stays in bounds
    this.x = Math.max(Constants.PLAYER_RADIUS, Math.min(Constants.MAP_SIZE-Constants.PLAYER_RADIUS, this.x));
    this.y = Math.max(Constants.PLAYER_RADIUS, Math.min(Constants.MAP_SIZE-Constants.PLAYER_RADIUS, this.y));

    // Fire a bullet, if needed
    this.fireCooldown -= dt;
    if (this.fireCooldown <= 0) {
      this.fireCooldown += Constants.PLAYER_FIRE_COOLDOWN;
      return new Bullet(this.id, this.x, this.y, this.direction, this.color);
    }

    return null;
  }

  takeBulletDamage() {
    this.hp -= Constants.BULLET_DAMAGE;
  }

  onDealtDamage() {
    this.score += 1;
  }

  useAidKit(aidkit) {
    this.hp += aidkit.hp;
    if (this.hp > Constants.PLAYER_MAX_HP) {
      this.hp = Constants.PLAYER_MAX_HP;
    }
  }

  serializeForUpdate() {
    return {
      ...(super.serializeForUpdate()),
      direction: this.direction,
      hp: this.hp,
      user:this.user,
      color:this.color
    };
  }
}

module.exports = Player;
