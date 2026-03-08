const config = require("@root/config");
const { EmbedBuilder, WebhookClient } = require("discord.js");
const pino = require("pino");
const fs = require("fs");
const path = require("path");

const webhookLogger = process.env.ERROR_LOGS ? new WebhookClient({ url: process.env.ERROR_LOGS }) : undefined;

const today = new Date();
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const pinoLogger = pino(
  {
    level: "debug",
    transport: {
      target: "pino/file",
      options: {
        destination: `${logsDir}/combined-${today.getFullYear()}.${today.getMonth() + 1}.${today.getDate()}.log`
      }
    }
  }
);

function sendWebhook(content, err) {
  if (!content && !err) return;
  const errString = err?.stack || err;

  const embed = new EmbedBuilder().setColor(config.EMBED_COLORS.ERROR).setAuthor({ name: err?.name || "Error" });

  if (errString)
    embed.setDescription(
      "```js\n" + (errString.length > 4096 ? `${errString.substr(0, 4000)}...` : errString) + "\n```"
    );

  embed.addFields({ name: "Description", value: content || err?.message || "NA" });
  webhookLogger.send({ username: "Logs", embeds: [embed] }).catch((ex) => {});
}

module.exports = class Logger {
  /**
   * @param {string} content
   */
  static success(content) {
    pinoLogger.info(content);
  }

  /**
   * @param {string} content
   */
  static log(content) {
    pinoLogger.info(content);
  }

  /**
   * @param {string} content
   */
  static warn(content) {
    pinoLogger.warn(content);
  }

  /**
   * @param {string} content
   * @param {object} ex
   */
  static error(content, ex) {
    if (ex) {
      pinoLogger.error(ex, `${content}: ${ex?.message || 'Unknown error'}`);
    } else {
      pinoLogger.error(content);
    }
    if (webhookLogger) {
      try {
        sendWebhook(content, ex);
      } catch (err) {
        pinoLogger.warn('Failed to send error webhook:', err);
      }
    }
  }

  /**
   * @param {string} content
   */
  static debug(content) {
    pinoLogger.debug(content);
  }
};
