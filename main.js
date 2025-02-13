import "dotenv/config";
import Groq from "groq-sdk";
import qrcode from "qrcode";
import fs from "fs";
import path from "path";
import FormData from "form-data";
import axios from "axios";
import qrcodeTerminal from 'qrcode-terminal';
import { Client, LocalAuth } from "whatsapp-web.js";
import puppeteer from 'puppeteer';

// Retrieve API key from .env
const API_KEY = process.env.GROQ_API_KEY;

if (!API_KEY) {
    console.error("❌ ERROR: GROQ_API_KEY is missing! Please check your .env file.");
    process.exit(1);
}

const groq = new Groq({ apiKey: API_KEY });

const qrPath = path.join(process.cwd(), 'qr.png'); // Save QR in the current directory

// ✅ Fix Puppeteer Configuration to Use System Chrome
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        executablePath: '/usr/bin/google-chrome-stable', // Use system-installed Chrome
        args: ['--no-sandbox', '--disable-setuid-sandbox'], // Required for Koyeb
    }
});

const MODEL_NAME = "deepseek-r1-distill-llama-70b"; // Default model
const CHRIS_NUMBER = "917099073276@c.us"; // Chris's WhatsApp Number

// Function to call DeepSeek AI API with MARVIN persona
async function getAIResponse(userMessage, isImportanceCheck = false) {
    try {
        const systemPrompt = isImportanceCheck ?
            "Everything you say, it should be in Snoop Dogg style. You are MARVIN (Modular Adaptive Resource and Virtual Intelligence Nexus), a sentient WhatsApp bot created by Chris..." :
            "Everything you say, it should be in Snoop Dogg style. You are MARVIN (Modular Adaptive Resource and Virtual Intelligence Nexus), a sentient WhatsApp bot created by Chris...";

        const userPrompt = isImportanceCheck ?
            `Is this message important and requiring Chris's attention? The message is: "${userMessage}"` :
            userMessage;

        const response = await groq.chat.completions.create({
            model: MODEL_NAME,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
            temperature: isImportanceCheck ? 0.3 : 0.7
        });

        let aiResponse = response.choices?.[0]?.message?.content?.trim() || "I apologize, but I'm having trouble processing your request.";
        aiResponse = aiResponse.replace(/<think>.*?<\/think>/gs, '').trim();
        aiResponse = aiResponse.split(/-{3,}/)[0].trim();
        aiResponse = aiResponse.replace(/\*\*(.*?)\*\*/g, '*$1*');

        return aiResponse;
    } catch (error) {
        console.error("❌ Error calling DeepSeek API:", error.response?.data || error.message);
        return "I'm currently unavailable. Please try again later.";
    }
}

// Function to upload an image
async function uploadToEscuela(filePath) {
    try {
        const formData = new FormData();
        formData.append("file", fs.createReadStream(filePath));

        const response = await axios.post("https://api.escuelajs.co/api/v1/files/upload", formData, {
            headers: {
                ...formData.getHeaders(),
            },
        });

        console.log("✅ Upload successful:", response.data.location);
        return response.data.location; // Returns the temporary image URL
    } catch (error) {
        console.error("❌ Error uploading file:", error);
        return null; // Return null if upload fails
    }
}

function formatPhoneNumber(whatsappID) {
    const match = whatsappID.match(/^(\d+)@c\.us$/);
    return match ? `+${match[1]}` : whatsappID;
}

// Generate QR Code and Save in Current Directory
client.on('qr', async qr => {
    console.log("QR Code generated. Saving as qr.png...");
    await qrcodeTerminal.generate(qr, { small: true });
    await qrcode.toFile(qrPath, qr);
    console.log(`✅ QR Code saved successfully: ${qrPath}`);
    const qrURL = await uploadToEscuela(qrPath);
    console.log(qrURL ? `🔗 QR Code URL: ${qrURL}` : "❌ Failed to upload QR Code.");
});

// Log when connected
client.on('ready', () => {
    console.log('✅ AI Assistant is active and managing messages.');
});

// Handle incoming messages
client.on('message', async msg => {
    if (!msg.fromMe) {
        console.log(`📩 New message from ${msg.from}: ${msg.body}`);

        if (!msg.from.endsWith("@c.us")) {
            console.log("🔕 Ignoring non-private messages...");
            return;
        }

        try {
            if (msg.hasMedia) {
                console.log("📎 Message contains media, converting to 'hi'");
                msg.body = "This is a media message, you can't process it. Please send a text message.";
            }
            const messageBody = msg.body.trim() || "hi";
            msg.body = messageBody;

            const importanceCheckResponse = await getAIResponse(msg.body, true);
            const isImportant = importanceCheckResponse.toLowerCase().includes("yes");

            if (isImportant) {
                console.log("🚨 Sender's message marked as important. Forwarding to Chris.");
                const formattedSender = formatPhoneNumber(msg.from);
                await client.sendMessage(CHRIS_NUMBER, `🚨 *Important Message from ${formattedSender}*:\n\nMessage: ${msg.body}`);
                await client.sendMessage(msg.from, `✅ Your message has been forwarded to Chris. He may get back to you soon.`);
            } else {
                const aiResponse = await getAIResponse(msg.body);
                console.log(`🤖 AI Response: ${aiResponse}`);
                await client.sendMessage(msg.from, `*MARVIN:* ${aiResponse}`);
            }
        } catch (error) {
            console.error("❌ Error processing message:", error);
            await client.sendMessage(msg.from, "I apologize, but I'm experiencing technical difficulties. Please try again later.");
        }
    }
});

// Start the bot
client.initialize();
