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

const genAI = new GoogleGenerativeAI(apiKey);

async function listModels() {
    console.log("🔄 Listing available models...");
    try {
        // Did not find a direct listModels method in the simplified SDK in some versions, 
        // but let's try a strict connection test with 'gemini-pro' which is usually standard,
        // or just try to generate content with a fallback to see if *any* works.
        // Actually, the error message from user "Call ListModels to see..." suggests we can/should.
        // But the JS SDK might not expose it easily in the helper.
        // Let's try to query the typically stable 'gemini-pro'.

        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        const result = await model.generateContent("Hello?");
        console.log("✅ gemini-pro works!");

    } catch (error) {
        console.error("❌ gemini-pro failed:", error.message);
    }

    try {
        const modelFlash = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
        const result = await modelFlash.generateContent("Hello?");
        console.log("✅ gemini-1.5-flash-latest works!");
    } catch (error) {
        console.error("❌ gemini-1.5-flash-latest failed:", error.message);
    }
    try {
        const modelPro15 = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
        const result = await modelPro15.generateContent("Hello?");
        console.log("✅ gemini-1.5-pro works!");
    } catch (error) {
        console.error("❌ gemini-1.5-pro failed:", error.message);
    }
}

listModels();
