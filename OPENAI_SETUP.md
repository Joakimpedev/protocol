# OpenAI API Setup

## Quick Setup

1. **Get your API key:**
   - Go to https://platform.openai.com/api-keys
   - Sign up or log in
   - Create a new API key
   - Copy the key (starts with `sk-...`)

2. **Add the key to your app:**
   - Open `src/config/openai.ts`
   - Replace `YOUR_OPENAI_API_KEY_HERE` with your actual API key
   - Save the file

3. **That's it!** The app will now use OpenAI for category classification.

## Cost

- Using `gpt-4o-mini` (the model we're using)
- Cost: ~$0.00003 per classification call
- Very cheap - basically free for MVP
- Example: 1,000 classifications = ~$0.03

## Security

⚠️ **IMPORTANT:** 
- Never commit your API key to git
- The config file is tracked, but don't commit changes with your real key
- For production, consider using a backend proxy or environment variables

## Fallback

If the API key is not set or there's an error, the app automatically falls back to keyword-based classification. This ensures the app always works, even without the API key.

## Testing

After adding your API key, test it by:
1. Opening the app
2. Going through onboarding
3. Typing something like "I want a sharper jawline and clearer skin"
4. The AI should detect: `jawline` and `acne` categories





