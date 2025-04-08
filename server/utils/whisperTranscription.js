import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Mock speech-to-text function that simulates transcription with pre-defined shopping-related queries
 * @param {string} audioFilePath - Path to the audio file to transcribe
 * @returns {Promise<{text: string, confidence: number}>} - Transcribed text and confidence score
 */
export const transcribeAudioWithWhisper = async (audioFilePath) => {
  try {
    console.log(`Simulating transcription for: ${audioFilePath}`);
    
    return new Promise((resolve, reject) => {
      // Read the file to check its existence
      if (!fs.existsSync(audioFilePath)) {
        return reject(new Error('Audio file not found'));
      }
      
      // Check file size to ensure it contains data
      const stats = fs.statSync(audioFilePath);
      if (stats.size === 0) {
        return reject(new Error('Audio file is empty'));
      }
      
      console.log(`Audio file exists and has size: ${stats.size} bytes`);
      
      // Generate a seed based on file properties and current time
      // This ensures we get different responses for different recordings
      const fileSize = stats.size;
      const fileModTime = stats.mtimeMs;
      const now = Date.now();
      
      // Create a deterministic but varied seed
      const seedValue = (fileSize + Math.floor(now / 10000)) % 1000;
      
      // Collection of useful shopping queries for testing the chatbot
      const shoppingQueries = [
        "What gaming keyboards do you recommend?",
        "Do you have RTX 4090 graphics cards in stock?",
        "What's your return policy?",
        "Tell me about your gaming laptops",
        "I'm looking for a good gaming monitor under $300",
        "Do you offer international shipping?",
        "What's the warranty on your products?",
        "How long does delivery usually take?",
        "Can you recommend a good gaming headset?",
        "Do you sell PlayStation 5 consoles?",
        "What gaming mice do you have?",
        "Are there any deals on mechanical keyboards?",
        "I need help finding a budget gaming PC",
        "Do you have HDMI 2.1 cables?",
        "Tell me about your VR headsets",
        "What's the best value gaming laptop you have?",
        "Do you offer computer building services?",
        "Can I finance my purchase?",
        "What Cherry MX switches do you recommend?",
        "How much RAM do I need for gaming?",
      ];
      
      // Use the seed to select a shopping query
      const selectedQuery = shoppingQueries[seedValue % shoppingQueries.length];
      
      // Wait a short time to simulate processing
      setTimeout(() => {
        resolve({
          text: selectedQuery,
          confidence: 0.85 + (seedValue % 15) / 100 // Value between 0.85 and 0.99
        });
      }, 800 + seedValue % 400); // Random delay between 800-1200ms
    });
  } catch (error) {
    console.error('Error in transcription simulation:', error);
    throw new Error(`Transcription failed: ${error.message}`);
  }
};
