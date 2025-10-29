const fs = require("fs");
const path = require("path");

const EMOJI_FILE = path.join(__dirname, "../../emojis.json");

class EmojiManager {
  constructor() {
    this.emojis = this.loadEmojis();
    this.lastLoadTime = Date.now();
    this.cacheTimeout = 60000;
  }

  loadEmojis() {
    try {
      const data = fs.readFileSync(EMOJI_FILE, "utf8");
      this.lastLoadTime = Date.now();
      return JSON.parse(data);
    } catch (error) {
      console.error("Error loading emojis:", error);
      return {
        success: "<:success:1424072640829722745>",
        error: "<:error:1424072711671382076>",
        warning: "⚠️",
        info: "ℹ️",
        loading: "⏳"
      };
    }
  }

  saveEmojis() {
    try {
      fs.writeFileSync(EMOJI_FILE, JSON.stringify(this.emojis, null, 2));
      return true;
    } catch (error) {
      console.error("Error saving emojis:", error);
      return false;
    }
  }

  get(key, fallback = "") {
    if (Date.now() - this.lastLoadTime > this.cacheTimeout) {
      this.reload();
    }
    return this.emojis[key] || fallback;
  }
  
  has(key) {
    return key in this.emojis;
  }
  
  getAll() {
    if (Date.now() - this.lastLoadTime > this.cacheTimeout) {
      this.reload();
    }
    return { ...this.emojis };
  }
  
  format(name, text) {
    const emoji = this.get(name);
    return emoji ? `${emoji} ${text}` : text;
  }

  set(key, value) {
    this.emojis[key] = value;
    return this.saveEmojis();
  }

  remove(key) {
    if (this.emojis[key]) {
      delete this.emojis[key];
      return this.saveEmojis();
    }
    return false;
  }

  list() {
    return this.emojis;
  }

  reload() {
    this.emojis = this.loadEmojis();
    return true;
  }

  getSuccess() {
    return this.emojis.success || "✅";
  }

  getError() {
    return this.emojis.error || "❌";
  }

  getWarning() {
    return this.emojis.warning || "⚠️";
  }

  getInfo() {
    return this.emojis.info || "ℹ️";
  }

  getLoading() {
    return this.emojis.loading || "⏳";
  }

  // Convenient getters for common emojis
  get success() { return this.getSuccess(); }
  get error() { return this.getError(); }
  get warning() { return this.getWarning(); }
  get info() { return this.getInfo(); }
  get loading() { return this.getLoading(); }

  // Music emojis
  get music() { return this.get('music', '🎵'); }
  get play() { return this.get('play', '▶️'); }
  get pause() { return this.get('pause', '⏸️'); }
  get stop() { return this.get('stop', '⏹️'); }
  get skip() { return this.get('skip', '⏭️'); }
  get previous() { return this.get('previous', '⏮️'); }
  get shuffle() { return this.get('shuffle', '🔀'); }
  get repeat() { return this.get('repeat', '🔁'); }
  get volume_up() { return this.get('volume_up', '🔊'); }
  get volume_down() { return this.get('volume_down', '🔉'); }
  get mute() { return this.get('mute', '🔇'); }
  get queue() { return this.get('queue', '📝'); }
  get headphones() { return this.get('headphones', '🎧'); }
  get microphone() { return this.get('microphone', '🎤'); }
  get speaker() { return this.get('speaker', '🔊'); }
  get equalizer() { return this.get('equalizer', '🎛️'); }
  get filter() { return this.get('filter', '🎚️'); }
  
  // Status emojis
  get online() { return this.get('online', '🟢'); }
  get offline() { return this.get('offline', '⚫'); }
  get idle() { return this.get('idle', '🟡'); }
  get dnd() { return this.get('dnd', '🔴'); }
  
  // Action emojis
  get check() { return this.get('check', '✓'); }
  get cross() { return this.get('cross', '✕'); }
  get yes() { return this.get('yes', '✅'); }
  get no() { return this.get('no', '❌'); }
  
  // Category emojis
  get moderation() { return this.get('moderation', '🔨'); }
  get admin() { return this.get('admin', '🔒'); }
  get giveaway() { return this.get('giveaway', '🎁'); }
  get ticket() { return this.get('ticket', '🎟️'); }
  get utility() { return this.get('utility', '⚙️'); }
  get fun() { return this.get('fun', '✨'); }
  get economy() { return this.get('economy', '💰'); }
  get stats() { return this.get('stats', '📊'); }
  get bot() { return this.get('bot', '🤖'); }
  get premium() { return this.get('premium', '⭐'); }
  get owner() { return this.get('owner', '👑'); }
  
  // Misc emojis
  get search() { return this.get('search', '🔍'); }
  get fire() { return this.get('fire', '🔥'); }
  get sparkles() { return this.get('sparkles', '✨'); }
  get star() { return this.get('star', '⭐'); }
  get trophy() { return this.get('trophy', '🏆'); }
  get crown() { return this.get('crown', '👑'); }
  get gem() { return this.get('gem', '💎'); }
  get money() { return this.get('money', '💰'); }
  get gift() { return this.get('gift', '🎁'); }
  get party() { return this.get('party', '🎉'); }
  get bolt() { return this.get('bolt', '⚡'); }
  get shield() { return this.get('shield', '🛡️'); }
  get hammer() { return this.get('hammer', '🔨'); }
  get lock() { return this.get('lock', '🔒'); }
  get unlock() { return this.get('unlock', '🔓'); }
  get key() { return this.get('key', '🔑'); }
  get clock() { return this.get('clock', '🕐'); }
  get calendar() { return this.get('calendar', '📅'); }
  get timer() { return this.get('timer', '⏱️'); }
  get chart() { return this.get('chart', '📈'); }
  get graph() { return this.get('graph', '📊'); }
  get user() { return this.get('user', '👤'); }
  get users() { return this.get('users', '👥'); }
  get wave() { return this.get('wave', '👋'); }
  get heart() { return this.get('heart', '❤️'); }
  get link() { return this.get('link', '🔗'); }
  get home() { return this.get('home', '🏠'); }
  get refresh() { return this.get('refresh', '🔄'); }
  get arrow_right() { return this.get('arrow_right', '▶️'); }
  get arrow_left() { return this.get('arrow_left', '◀️'); }
}

module.exports = new EmojiManager();
