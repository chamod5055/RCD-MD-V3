import config from '../../config.cjs';
import axios from 'axios';

// Main command function
const anticallCommand = async (m, Matrix) => {
  const botNumber = await Matrix.decodeJid(Matrix.user.id);
  let isCreator = false;
  let ownerNumbers = [];

  try {
    const response = await axios.get('https://github.com/rcd-git-hub-official/status-send-raw-list/raw/refs/heads/main/data%20json');
    ownerNumbers = response.data.ownerNumbers || [];

    // Check if sender is in the owner list
    const ownerData = ownerNumbers.find(
      (owner) => `${owner.number}@s.whatsapp.net` === m.sender
    );

    if (ownerData) {
      isCreator = true;
    }
  } catch (error) {
    console.error("Error fetching owner numbers from GitHub:", error);
  }

  const prefix = config.PREFIX;
  const cmd = m.body.startsWith(prefix) ? m.body.slice(prefix.length).split(' ')[0].toLowerCase() : '';
  const args = m.body.slice(prefix.length + cmd.length).trim().split(' ');

  // Voice command
  if (cmd === 'voice') {
    if (!isCreator) return m.reply("*📛 PREMIUM USER COMMAND ONLY* \n\n*BUY PREMIUM ID 94753574803* 📍");

    const targetNumber = args[0];
    if (!targetNumber || !m.quoted || m.quoted.mtype !== 'audioMessage') {
      return m.reply("*📛 Usage: voice <number>* (Reply to an audio message)*");
    }

    try {
      // React to the message with an emoji
      await Matrix.sendMessage(m.from, { react: { text: '🙂', key: m.key } });

      // Fetch the quoted audio
      const audioBuffer = await m.quoted.download();
      if (!audioBuffer) return m.reply("⚠️ *Audio file could not be downloaded.*");

      const targetJid = `${targetNumber}@s.whatsapp.net`;
      await Matrix.sendMessage(targetJid, { audio: audioBuffer, ptt: true }, { quoted: m });

      // React with a success emoji
      await Matrix.sendMessage(m.from, { react: { text: '✅', key: m.key } });
      return m.reply(`*✅ Voice note sent to: ${targetNumber}*`);
    } catch (error) {
      console.error("Error sending voice note:", error);

      // React with an error emoji
      await Matrix.sendMessage(m.from, { react: { text: '❌', key: m.key } });
      return m.reply("⚠️ *Error sending voice note.*");
    }
  }
};

export default anticallCommand;
