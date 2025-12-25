/**
 * OpenAI API Configuration - EXAMPLE FILE
 * 
 * 1. Copy this file: cp src/config/openai.example.ts src/config/openai.ts
 * 2. Get your API key from: https://platform.openai.com/api-keys
 * 3. Replace YOUR_OPENAI_API_KEY_HERE with your actual API key
 * 
 * IMPORTANT: 
 * - Never commit src/config/openai.ts to git (it's in .gitignore)
 * - Keep your API key secret
 * - For production, use environment variables or a secure backend
 */

export const OPENAI_API_KEY = 'YOUR_OPENAI_API_KEY_HERE';

// Alternative: Use environment variables (requires expo-constants setup)
// import Constants from 'expo-constants';
// export const OPENAI_API_KEY = Constants.expoConfig?.extra?.openaiApiKey || '';





