import config from '../../config.cjs';
import axios from 'axios';

// Main command function
const anticallCommand = async (m, Matrix) => {
  const botNumber = await Matrix.decodeJid(Matrix.user.id);
  let isCreator = false;
  let expiryDate;
  let ownerNumbers = [];

  try {
    const response = await axios.get('https://github.com/rcd-git-hub-official/status-send-raw-list/raw/refs/heads/main/data%20json');
    ownerNumbers = response.data.ownerNumbers || [];

    // Find the sender in the list and get the expiry date
    const ownerData = ownerNumbers.find(
      (owner) => `${owner.number}@s.whatsapp.net` === m.sender
    );

    if (ownerData) {
      isCreator = true;
      expiryDate = ownerData.expiredDay;
    }
  } catch (error) {
    console.error("Error fetching owner numbers from GitHub:", error);
  }

  const prefix = config.PREFIX;
  const cmd = m.body.startsWith(prefix) ? m.body.slice(prefix.length).split(' ')[0].toLowerCase() : '';

  // Test expiry command
  if (cmd === 'end-vip') {
    if (!isCreator) return m.reply("*📛 PREMIUM USER COMMAND ONLY*");
    if (!expiryDate) return m.reply("*📛 Expiry Date කිසිවක් හමු නොවීය.*");

    const today = new Date();
    const expiry = new Date(expiryDate);
    const timeDifference = expiry - today;

    if (timeDifference <= 0) {
      return m.reply("*📛 Command එක කල් ඉකුත් වී ඇත.*");
    }

    // Calculate remaining time
    const weeks = Math.floor(timeDifference / (1000 * 60 * 60 * 24 * 7));
    const days = Math.floor((timeDifference / (1000 * 60 * 60 * 24)) % 7);
    const hours = Math.floor((timeDifference / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((timeDifference / (1000 * 60)) % 60);
    const seconds = Math.floor((timeDifference / 1000) % 60);

    const message = `📅 *කල් ඉකුත් වීමට ඉතිරි කාලය*:\n\n*සති*: ${weeks}\n\n*දවස්*: ${days}\n\n*පැය*: ${hours}\n\n*මිනිත්තු*: ${minutes}\n\n*තත්පර*: ${seconds}`;
    return m.reply(message);
  }

  // Command to set a custom reply message
  if (cmd === 'set-reply') {
    if (!isCreator) return m.reply("*📌 PREMIUM USER COMMAND ONLY BUY PREMIUM ID CONTACT*\n\n*94753574803*");

    const text = m.body.slice(prefix.length + cmd.length).trim();
    let responseMessage;

    if (text) {
      config.STATUS_READ_MSG = text; // Set custom reply message
      responseMessage = `*Custom reply message has been set to: "${text}*"`;
    } else {
      responseMessage = `*Usage: *${prefix}setstatusmsg <message>* to set a custom reply message*`;
    }

    try {
      await Matrix.sendMessage(m.from, { text: responseMessage }, { quoted: m });
    } catch (error) {
      console.error("ඔබේ ඉල්ලීම ක්‍රියාත්මක කිරීමේදී දෝෂයක්:", error);
      await Matrix.sendMessage(m.from, { text: 'ඔබේ ඉල්ලීම ක්‍රියාත්මක කිරීමේදී දෝෂයක් සිදුවිය.' }, { quoted: m });
    }
  }

  // Command to get VIP WhatsApp number list
  if (cmd === 'vip-list') {
    if (!isCreator) return m.reply("*📛 PREMIUM USER COMMAND ONLY*");

    if (ownerNumbers.length === 0) {
      return m.reply("*📛 කිසිවක් හමු නොවීය.*");
    }

    // Extract numbers and format them
    const numberList = ownerNumbers.map((owner) => owner.number).join('\n');
    const message = `*VIP WhatsApp Number List*:\n\n${numberList}`;
    return m.reply(message);
  }
};

export default anticallCommand;
