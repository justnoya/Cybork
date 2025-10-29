const MusicPlayerView = require("@helpers/MusicPlayerView");
const { ApplicationCommandOptionType } = require("discord.js");

/**
 * @type {import("@structures/Command")}
 */
module.exports = {
  name: "queue",
  description: "displays the current music queue",
  category: "MUSIC",
  botPermissions: ["EmbedLinks"],
  command: {
    enabled: true,
    usage: "[page]",
  },
  slashCommand: {
    enabled: true,
    options: [
      {
        name: "page",
        description: "page number",
        type: ApplicationCommandOptionType.Integer,
        required: false,
      },
    ],
  },

  async messageRun(message, args) {
    const page = args.length && Number(args[0]) ? Number(args[0]) : 1;
    const response = getQueue(message, page);
    await message.safeReply(response);
  },

  async interactionRun(interaction) {
    const page = interaction.options.getInteger("page") || 1;
    const response = getQueue(interaction, page);
    await interaction.followUp(response);
  },
};

/**
 * @param {import("discord.js").CommandInteraction|import("discord.js").Message} arg0
 * @param {number} pgNo
 */
function getQueue({ client, guild, member, author }, pgNo) {
  const player = client.musicManager.getPlayer(guild.id);
  if (!player || !player.current) {
    return MusicPlayerView.createEmptyQueueDisplay();
  }

  const page = pgNo || 1;
  const track = player.current;
  const requester = track.requester?.username || track.requester || (member?.user?.username ? `${member.user.username}` : (author ? `${author.username}` : "User"));

  return MusicPlayerView.createQueueDisplay(player, requester, page);
}
