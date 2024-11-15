import config from '../../config.cjs';

const Callupdate = async (json, sock) => {
   for (const id of json) {
      if (id.status === 'offer' && config.REJECT_CALL ) {
         // Reject the call first
         await sock.rejectCall(id.id, id.from);

         // Image URL to be sent as caption
         const imageUrl = 'https://i.ibb.co/SNH3sRH/20241112-142424.jpg';

         // Sending the image with the caption
         let msg = await sock.sendMessage(id.from, {
            image: { url: imageUrl },  // Image URL
            caption: `*📞 Auto Reject Call Mode Activated* \n\n📵 *No Calls Allowed* \n\n🌟 *_Please note: Incoming calls are automatically rejected_* 📍`,  // Caption text
            mentions: [id.from],
         });
      }
   }
};

export default Callupdate;
