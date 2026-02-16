/**
 * OpenAI API Configuration
 *
 * In EAS builds, the key is read from the OPENAI_API_KEY environment secret.
 * For local development, create this file with your key hardcoded (it's gitignored).
 *
 * The app will fall back to keyword matching if the API key is not set.
 */

export const OPENAI_API_KEY = process.env.OPENAI_API_KEY ?? '';
