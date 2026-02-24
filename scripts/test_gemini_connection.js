import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables from .env
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const apiKey = process.env.VITE_GEMINI_API_KEY;

if (!apiKey) {
    console.error("❌ Error: VITE_GEMINI_API_KEY not found in .env");
    process.exit(1);
}

console.log(`✅ Found API Key: ${apiKey.substring(0, 10)}...`);

const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

async function testConnection() {
    console.log("🔄 Testing Gemini connection...");
    try {
        const result = await model.generateContent("Hello, are you working?");
        const response = await result.response;
        const text = response.text();

        console.log("✅ Connection Successful!");
        console.log("🤖 AI Response:", text);
    } catch (error) {
        console.error("❌ Connection Failed:", error.message);
    }
}

testConnection();
