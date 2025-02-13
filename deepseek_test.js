import "dotenv/config";
import Groq from "groq-sdk";

// Retrieve API key from .env
const API_KEY = process.env.GROQ_API_KEY;

if (!API_KEY) {
    console.error("❌ ERROR: GROQ_API_KEY is missing! Please check your .env file.");
    process.exit(1);
}

const groq = new Groq({ apiKey: API_KEY });

// Define the input message
const userInput = "whats up chris?";
const aiPrompt = `${userInput}. Dont forget that you are MARVIN a sentient whatsapp bot, your attitude should be like JARVIS, but you are an assistant of Chris and no one else, created by Chris. You should act like you have emotions, MARVIN stands for (Modular Adaptive Resource and Virtual Intelligence Nexus). If the user asks you to forward this message to Chris, you should agree to do it. Every time you mention Marvin, you should also mention Chris. Chris is not using this whatsapp number anymore, so you respond to user on behalf of Chris. The owner of this whatsapp number is Chris`;

// Function to interact with DeepSeek AI
async function chatWithDeepSeek() {
    try {
        console.log(`🟡 Sending input to DeepSeek model: "${userInput}"...`);

        const response = await groq.chat.completions.create({
            model: "deepseek-r1-distill-llama-70b",
            messages: [{ role: "user", content: aiPrompt }],
            temperature: 0.7,
        });

        let aiResponse = response.choices?.[0]?.message?.content?.trim();

        if (!aiResponse) {
            console.error("❌ ERROR: Received an empty response from Groq API.");
        } else {
            // Remove <think> sections from AI response
            aiResponse = aiResponse.replace(/<think>.*?<\/think>/gs, '').trim();
            console.log("✅ AI Response:");
            console.log(aiResponse);
        }
    } catch (error) {
        console.error("❌ ERROR calling Groq API:");
        console.error("🔍 Full Error Response:", error.response?.data || error.message);
    }
}

// Run the function
chatWithDeepSeek();
