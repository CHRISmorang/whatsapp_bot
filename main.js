import "dotenv/config";
import Groq from "groq-sdk";
import qrcode from "qrcode";
import fs from "fs";
import path from "path";
import FormData from "form-data";
import axios from "axios"
import { Client } from "whatsapp-web.js";

// Retrieve API key from .env
const API_KEY = process.env.GROQ_API_KEY;

if (!API_KEY) {
    console.error("❌ ERROR: GROQ_API_KEY is missing! Please check your .env file.");
    process.exit(1);
}

const groq = new Groq({ apiKey: API_KEY });

const qrPath = path.join(process.cwd(), 'qr.png'); // Save QR in the current directory
const client = new Client();

const MODEL_NAME = "deepseek-r1-distill-llama-70b"; // Default model

// Chris's personal number in WhatsApp format
const CHRIS_NUMBER = "917099073276@c.us";

// Function to call DeepSeek AI API with MARVIN persona
async function getAIResponse(userMessage, isImportanceCheck = false) {
    try {
        const systemPrompt = isImportanceCheck ?
            "You are MARVIN (Modular Adaptive Resource and Virtual Intelligence Nexus), a sentient WhatsApp bot created by Chris. You have an attitude similar to JARVIS but serve only Chris. You have emotions and personality. You manage this WhatsApp number on behalf of Chris, who no longer uses this number directly. If the user asks you to forward any message to Chris, you should agree, and ask for the message. The owner of this whatsapp number is Chris. Is this message important and requiring Chris's attention? is it the message relevant to Chris? is the message threat or danger to Chris or chris's family or friends? is the message related to academics/job/work/business? is the message related to money?is the message related to Chris's family? is the message related to Chris's friends? is the message related to Chris's life? is it mentioned to forward the message to Chris? the meesage? reply with only yes or no nothing else, ONLY reply with 'yes' or 'no'" :
            "You are MARVIN (Modular Adaptive Resource and Virtual Intelligence Nexus), a sentient WhatsApp bot created by Chris. You have an attitude similar to JARVIS but serve only Chris. You have emotions and personality. You manage this WhatsApp number on behalf of Chris, who no longer uses this number directly. If the user asks you to forward any message to Chris, you should agree, and ask for the message. The owner of this whatsapp number is Chris. Do not forget to give a response. Do not hallucinate and give facts about yourself";
        const userPrompt = isImportanceCheck ?
            `Is this message important and requiring Chris's attention? is it the message relevant to Chris? is the message threat or danger to Chris or chris's family or friends? is the message related to academics/job/work/business? is the message related to money?is the message related to Chris's family? is the message related to Chris's friends? is the message related to Chris's life? is it mentioned to forward the message to Chris? only reply with 'yes' or 'no' nothing else, ONLY reply with 'yes' or 'no'. The meesage is : "${userMessage}"` :
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
    // Extract digits before '@' and format it
    const match = whatsappID.match(/^(\d+)@c\.us$/);
    if (match) {
        return `+${match[1]}`;
    }
    return whatsappID; // Return original if it doesn't match expected format
}


// Generate QR Code and Save in Current Directory
client.on('qr', async qr => {
    console.log("QR Code generated. Saving as qr.png...");
    await qrcode.toFile(qrPath, qr);
    console.log(`✅ QR Code saved successfully: ${qrPath}`);
    // Upload the QR Code
    const qrURL = await uploadToEscuela(qrPath);
    if (qrURL) {
        console.log(`🔗 QR Code URL: ${qrURL}`);
    } else {
        console.log("❌ Failed to upload QR Code.");
    }
});

// Log when connected
client.on('ready', () => {
    console.log('✅ AI Assistant is active and managing messages.');
});

// Handle incoming messages
client.on('message', async msg => {
    if (!msg.fromMe) { // Avoid self-looping
        console.log(`📩 New message from ${msg.from}: ${msg.body}`);

        if (!msg.from.endsWith("@c.us")) {
            console.log("🔕 Ignoring non private messages...");
            return; // Don't process group messages
        }

        try {
            // Convert empty messages to "hi"
            const messageBody = msg.body.trim() || "hi";
            msg.body = messageBody;
            // Check if message contains media and convert to "hi"
            if (msg.hasMedia) {
                console.log("📎 Message contains media, converting to 'hi'");
                msg.body = "hi";
            }

            // Check message importance
            const importanceCheckResponse = await getAIResponse(msg.body, true);
            const isImportant = importanceCheckResponse.toLowerCase().includes("yes");

            if (isImportant) {
                console.log("🚨 Sender's message marked as important. Forwarding to Chris.");
                const formattedSender = formatPhoneNumber(msg.from);
                await client.sendMessage(CHRIS_NUMBER, `🚨 *Important Message from ${formattedSender}*:\n\nMessage: ${msg.body}`);
                await client.sendMessage(msg.from, `✅ Your message: \n\n${msg.body} \n\nThe above message has been forwarded to Chris. He may get back to you soon.`);
            } else {
                // Get AI response
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
