
import config from '../../config.cjs';
import fetch from 'node-fetch';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import fs from 'fs';
import path from 'path';

const audioMappingsUrl = 'https://raw.githubusercontent.com/darkewing/AUTO-VOICE-NOTE/refs/heads/main/Auto%20reply.js';

const gcEvent = async (m, Matrix) => {
  const prefixMatch = m.body.match(/^[\\/!#.]/);
  const prefix = prefixMatch ? prefixMatch[0] : '/';
  const cmd = m.body.startsWith(prefix) ? m.body.slice(prefix.length).split(' ')[0].toLowerCase() : '';
  const text = m.body.slice(prefix.length + cmd.length).trim().toLowerCase();

  if (cmd === 'autoreply') {
    if (!m.isGroup) return m.reply("📛 THIS COMMAND CAN ONLY BE USED IN GROUPS");
    const groupMetadata = await Matrix.groupMetadata(m.from);
    const participants = groupMetadata.participants;
    const botNumber = await Matrix.decodeJid(Matrix.user.id);
    const botAdmin = participants.find(p => p.id === botNumber)?.admin;
    const senderAdmin = participants.find(p => p.id === m.sender)?.admin;

    if (!botAdmin) return m.reply("📛 BOT MUST BE AN ADMIN TO USE THIS COMMAND");
    if (!senderAdmin) return m.reply("📛 YOU MUST BE AN ADMIN TO USE THIS COMMAND");
    let responseMessage;

    if (text === 'on') {
      config.AUTO_VOICE_REPLY = true;
      responseMessage = "Auto Voice Reply has been enabled.";
    } else if (text === 'off') {
      config.AUTO_VOICE_REPLY = false;
      responseMessage = "Auto Voice Reply has been disabled.";
    } else {
      responseMessage = "Usage:\n- *AUTOREPLY on: Enable Auto Voice Reply*\n- *AUTOREPLY off: Disable Auto Voice Reply*";
    }

    try {
      await Matrix.sendMessage(m.from, { text: responseMessage }, { quoted: m });
    } catch (error) {
      console.error("Error processing your request:", error);
      await Matrix.sendMessage(m.from, { text: 'Error processing your request.' }, { quoted: m });
    }
  }

  if (config.AUTO_VOICE_REPLY) {
    try {
      const response = await fetch(audioMappingsUrl);
      const audioMappings = await response.json();

      for (const mapping of audioMappings) {
        const { triggerMessages, audioUrl } = mapping;

        // Check if the incoming message matches any of the trigger messages
        if (triggerMessages.some(trigger => trigger.toLowerCase() === m.body.toLowerCase())) {
          if (audioUrl) {
            const audioResponse = await fetch(audioUrl);
            const audioBuffer = await audioResponse.buffer();

            // Save audio buffer to a temporary file
            const tempInputFile = path.join(__dirname, 'input-audio.mp3');
            const tempOutputFile = path.join(__dirname, 'output-audio.mp3');
            fs.writeFileSync(tempInputFile, audioBuffer);

            // Compress the audio using FFmpeg
            await new Promise((resolve, reject) => {
              ffmpeg(tempInputFile)
                .setFfmpegPath(ffmpegStatic)
                .audioBitrate('64k') // Reduce bitrate for compression
                .save(tempOutputFile)
                .on('end', resolve)
                .on('error', reject);
            });

            // Read the compressed audio file
            const compressedAudioBuffer = fs.readFileSync(tempOutputFile);

            // Send the compressed audio as a voice note
            await Matrix.sendMessage(
              m.from,
              { audio: compressedAudioBuffer, mimetype: 'audio/mp4', ptt: true },
              { quoted: m }
            );

            // Clean up temporary files
            fs.unlinkSync(tempInputFile);
            fs.unlinkSync(tempOutputFile);

            break;
          }
        }
      }
    } catch (error) {
      console.error("Error sending auto voice reply:", error);
    }
  }
};

export default gcEvent;
