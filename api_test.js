// Load environment variables
import "dotenv/config";
import Groq from "groq-sdk";

// Retrieve API key from .env
const API_KEY = process.env.GROQ_API_KEY;

if (!API_KEY) {
    console.error("❌ GROQ_API_KEY is missing! Please set it in the .env file.");
    process.exit(1);
}

const groq = new Groq({ apiKey: API_KEY });

async function testGroqAPI() {
    try {
        console.log("🟡 Sending test request to Groq API...");

        const completion = await groq.chat.completions.create({
            messages: [
                {
                    role: "user",
                    content: "Explain the importance of fast language models.",
                },
            ],
            model: "llama-3.3-70b-versatile",
        });

        console.log("✅ Groq API Response:");
        console.log(completion.choices[0]?.message?.content || "No response received.");
    } catch (error) {
        console.error("❌ Error calling Groq API:", error);
    }
}

testGroqAPI();
