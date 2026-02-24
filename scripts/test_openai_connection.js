import OpenAI from 'openai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables from .env
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const apiKey = process.env.VITE_OPENAI_API_KEY;

if (!apiKey) {
    console.error("❌ Error: VITE_OPENAI_API_KEY not found in .env");
    process.exit(1);
}

console.log(`✅ Found API Key: ${apiKey.substring(0, 10)}...`);

const openai = new OpenAI({
    apiKey: apiKey,
});

async function testConnection() {
    console.log("🔄 Testing OpenAI connection...");
    try {
        const completion = await openai.chat.completions.create({
            messages: [{ role: "user", content: "Hello, are you working?" }],
            model: "gpt-4o-mini",
        });

        console.log("✅ Connection Successful!");
        console.log("🤖 AI Response:", completion.choices[0].message.content);
    } catch (error) {
        console.error("❌ Connection Failed:", error.message);
        if (error.code === 'insufficient_quota') {
            console.error("⚠️  Check your billing details or credits.");
        }
    }
}

testConnection();
