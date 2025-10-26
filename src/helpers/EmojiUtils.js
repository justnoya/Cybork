const EMOJIS = require("@root/emojis.json");

/**
 * Get an emoji from the emojis.json file
 * @param {string} key - The emoji key
 * @returns {string} The emoji
 */
function getEmoji(key) {
  return EMOJIS[key] || "";
}

/**
 * Status emoji helper
 * @param {boolean} enabled - Whether the feature is enabled
 * @returns {string} Success or error emoji
 */
function statusEmoji(enabled) {
  return enabled ? getEmoji("success") : getEmoji("error");
}

module.exports = {
  getEmoji,
  statusEmoji,
  EMOJIS,
};
