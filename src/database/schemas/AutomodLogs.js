const { pool } = require("../pg");

const TABLE = "automod_logs";

module.exports = {
  addAutoModLogToDb: async (member, content, reason, strikes) => {
    if (!member) throw new Error("Member is undefined");
    const data = {
      guild_id: member.guild.id,
      member_id: member.id,
      content,
      reason,
      strikes,
      created_at: new Date().toISOString(),
    };
    await pool.query(
      `INSERT INTO "${TABLE}" (guild_id, member_id, data) VALUES ($1, $2, $3::jsonb)`,
      [member.guild.id, member.id, JSON.stringify(data)]
    );
  },
};
