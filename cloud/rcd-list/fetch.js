import fetch from 'node-fetch';
import ytdl from 'ytdl-secktor'; // Ensure ytdl-secktor is installed

const fetchData = async (m, Matrix) => {
  const prefixMatch = m.body.match(/^[\\/!#.]/);
  const prefix = prefixMatch ? prefixMatch[0] : '/';
  const cmd = m.body.startsWith(prefix) ? m.body.slice(prefix.length).split(' ')[0].toLowerCase() : '';
  const text = m.body.slice(prefix.length + cmd.length).trim();

  if (cmd === 'ytdl') {
    if (!/^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\/watch\?v=/.test(text)) {
      return m.reply('Please provide a valid YouTube URL.');
    }

    try {
      const videoUrl = text;

      // Download video and audio streams
      const videoStream = ytdl(videoUrl, { quality: 'highestvideo' });
      const audioStream = ytdl(videoUrl, { quality: 'highestaudio' });

      // Try sending the video
      try {
        await Matrix.sendMedia(m.from, videoStream, 'video.mp4', '> Video Downloaded from YouTube', m);
      } catch (error) {
        console.error('Error sending video:', error.message);
        return m.reply('Error sending the video. Please try again later.');
      }

      // Try sending the audio
      try {
        await Matrix.sendMedia(m.from, audioStream, 'audio.mp3', '> Audio Downloaded from YouTube', m);
      } catch (error) {
        console.error('Error sending audio:', error.message);
        return m.reply('Error sending the audio. Please try again later.');
      }
    } catch (error) {
      console.error('Error downloading video/audio:', error.message);
      return m.reply('Error downloading the YouTube video or audio. Please check the URL and try again.');
    }
  }
};

export default fetchData;
