const { Client } = require('whatsapp-web.js');

const client = new Client();

const qrcode = require('qrcode');
const fs = require('fs');
const path = require('path');

const qrPath = path.join(__dirname, 'qr.png'); // Save QR in the current directory


client.on('qr', async qr => {
    console.log("QR Code generated. Saving as qr.png...");

    try {
        await qrcode.toFile(qrPath, qr);
        console.log(`✅ QR Code saved successfully: ${qrPath}`);
    } catch (err) {
        console.error("❌ Failed to save QR Code:", err);
    }

    // Also display the QR code in the terminal for quick scanning
    qrcode.toString(qr, { type: 'terminal' }, (err, qrText) => {
        if (err) console.error("Error generating terminal QR:", err);
        console.log(qrText);
    });
});

client.on('ready', () => {
    console.log('Client is ready!');
});

client.on('message', msg => {
    if (msg.body == '!ping') {
        msg.reply('pong');
    }
});

client.initialize();