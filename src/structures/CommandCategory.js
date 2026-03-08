const config = require("@root/config");

module.exports = {
  OWNER: {
    name: "Owner",
    image: "https://www.pinclipart.com/picdir/middle/531-5318253_web-designing-icon-png-clipart.png",
    emoji: "🤴",
  },
  ANTINUKE: {
    name: "Antinuke",
    image: "https://icons.iconarchive.com/icons/paomedia/small-n-flat/128/shield-icon.png",
    emoji: "🛡️",
    enabled: true,
  },
  SECURITY: {
    name: "Security",
    image: "https://icons.iconarchive.com/icons/paomedia/small-n-flat/128/shield-icon.png",
    emoji: "🛡️",
    enabled: true,
  },
  AUTOMOD: {
    name: "Auto Moderation",
    enabled: config.AUTOMOD.ENABLED,
    image: "https://icons.iconarchive.com/icons/dakirby309/simply-styled/256/Settings-icon.png",
    emoji: "🤖",
  },
  MUSIC: {
    name: "Music",
    enabled: config.MUSIC.ENABLED,
    image: "https://icons.iconarchive.com/icons/wwalczyszyn/iwindows/256/Music-Library-icon.png",
    emoji: "🎵",
  },
  PARTY: {
    name: "Party",
    enabled: false,
    image: "https://icons.iconarchive.com/icons/wwalczyszyn/iwindows/256/Music-Library-icon.png",
    emoji: "🎉",
  },
  MODERATION: {
    name: "Moderation",
    enabled: config.MODERATION.ENABLED,
    image: "https://icons.iconarchive.com/icons/lawyerwordpress/law/128/Gavel-Law-icon.png",
    emoji: "🔨",
  },
  INFORMATION: {
    name: "Information",
    image: "https://icons.iconarchive.com/icons/graphicloads/100-flat/128/information-icon.png",
    emoji: "🪧",
  },
  GIVEAWAY: {
    name: "Giveaway",
    enabled: config.GIVEAWAYS.ENABLED,
    image: "https://cdn-icons-png.flaticon.com/512/4470/4470928.png",
    emoji: "🎉",
  },
  TICKET: {
    name: "Ticket",
    enabled: config.TICKET.ENABLED,
    image: "https://icons.iconarchive.com/icons/custom-icon-design/flatastic-2/512/ticket-icon.png",
    emoji: "🎫",
  },
  UTILITY: {
    name: "Utility",
    image: "https://icons.iconarchive.com/icons/blackvariant/button-ui-system-folders-alt/128/Utilities-icon.png",
    emoji: "🛠",
  },
  GATEWAY: {
    name: "Gateway",
    image: "https://cdn-icons-png.flaticon.com/512/2991/2991148.png",
    emoji: "🚪",
  },
  PROFILE: {
    name: "Profile",
    image: "https://icons.iconarchive.com/icons/papirus-team/papirus-apps/128/system-users-icon.png",
    emoji: "👤",
  },
  LEADERBOARD: {
    name: "Leaderboard",
    enabled: config.STATS.ENABLED,
    image: "https://icons.iconarchive.com/icons/graphicloads/100-flat/128/analytics-icon.png",
    emoji: "📈",
  },
  SUGGESTION: {
    name: "Suggestions",
    enabled: config.SUGGESTIONS.ENABLED,
    image: "https://cdn-icons-png.flaticon.com/512/1484/1484815.png",
    emoji: "📝",
  },
  BOT: {
    name: "Bot",
    image: "https://icons.iconarchive.com/icons/paomedia/small-n-flat/128/robot-icon.png",
    emoji: "🤖",
  },
  PFP: {
    name: "Profile & Customization",
    image: "https://icons.iconarchive.com/icons/paomedia/small-n-flat/128/profile-icon.png",
    emoji: "🎭",
    enabled: true,
  },
  // Hidden categories (not shown in help menu)
  ADMIN: {
    name: "Admin",
    image: "https://icons.iconarchive.com/icons/dakirby309/simply-styled/256/Settings-icon.png",
    emoji: "⚙️",
    enabled: false,
  },
  ANIME: {
    name: "Anime",
    image: "https://wallpaperaccess.com/full/5680679.jpg",
    emoji: "🎨",
    enabled: false,
  },
  ECONOMY: {
    name: "Economy",
    enabled: false,
    image: "https://icons.iconarchive.com/icons/custom-icon-design/pretty-office-11/128/coins-icon.png",
    emoji: "🪙",
  },
  FUN: {
    name: "Fun",
    image: "https://icons.iconarchive.com/icons/flameia/aqua-smiles/128/make-fun-icon.png",
    emoji: "😂",
    enabled: false,
  },
  IMAGE: {
    name: "Image",
    enabled: false,
    image: "https://icons.iconarchive.com/icons/dapino/summer-holiday/128/photo-icon.png",
    emoji: "🖼️",
  },
  INVITE: {
    name: "Invite",
    enabled: false,
    image: "https://cdn4.iconfinder.com/data/icons/general-business/150/Invite-512.png",
    emoji: "📨",
  },
  SOCIAL: {
    name: "Social",
    image: "https://icons.iconarchive.com/icons/dryicons/aesthetica-2/128/community-users-icon.png",
    emoji: "🫂",
    enabled: true,
  },
  STATS: {
    name: "Statistics",
    enabled: false,
    image: "https://icons.iconarchive.com/icons/graphicloads/100-flat/128/analytics-icon.png",
    emoji: "📈",
  },
  GRAPHICS: {
    name: "Graphics",
    image: "https://cdn-icons-png.flaticon.com/512/3342/3342137.png",
    emoji: "🎨",
    enabled: false,
  },
  LOGS: {
    name: "Logs",
    enabled: config.LOGS ? config.LOGS.ENABLED : true,
    image: "https://icons.iconarchive.com/icons/paomedia/small-n-flat/128/file-icon.png",
    emoji: "📋",
  },
};