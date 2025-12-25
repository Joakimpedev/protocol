/**
 * OpenAI API Integration for Category Classification
 */

import { OPENAI_API_KEY } from '../config/openai';

interface ClassificationResponse {
  categories: string[];
  confidence?: number;
  off_topic?: boolean;
}

/**
 * Classify user input into relevant categories using OpenAI API
 */
export async function classifyUserInput(userInput: string): Promise<ClassificationResponse> {
  // Check if API key is configured
  if (!OPENAI_API_KEY || OPENAI_API_KEY === 'YOUR_OPENAI_API_KEY_HERE') {
    console.warn('OpenAI API key not configured. Falling back to keyword matching.');
    return fallbackClassification(userInput);
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a classifier that identifies skincare and facial improvement concerns from user input. 
            
Return ONLY a JSON object with this exact structure:
{
  "categories": ["category_id1", "category_id2"],
  "confidence": 0.85,
  "off_topic": false
}

Valid category IDs are:
- jawline (for jaw, chin, mewing, face structure concerns)
- acne (for pimples, breakouts, zits)
- oily_skin (for oily, greasy, shiny skin)
- dry_skin (for dry, flaky, tight skin)
- blackheads (for blackheads, clogged pores)
- dark_circles (for under-eye bags, dark circles)
- skin_texture (for rough, uneven, bumpy texture)
- hyperpigmentation (for dark spots, uneven tone, discoloration)
- facial_hair (for beard, facial hair growth)

Return empty array if input is off-topic or too vague. Set off_topic: true if the input is completely unrelated to skincare/facial improvement.`,
          },
          {
            role: 'user',
            content: userInput,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3, // Lower temperature for more consistent classification
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('OpenAI API error:', errorData);
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    const result = JSON.parse(data.choices[0].message.content);
    
    // Validate response structure
    if (result.categories && Array.isArray(result.categories)) {
      return {
        categories: result.categories,
        confidence: result.confidence || 0.8,
        off_topic: result.off_topic || false,
      };
    } else {
      throw new Error('Invalid response format from OpenAI');
    }
  } catch (error) {
    console.error('OpenAI classification error:', error);
    // Fallback to keyword matching on error
    return fallbackClassification(userInput);
  }
}

/**
 * Fallback keyword-based classification (used when API key not configured or on error)
 */
function fallbackClassification(userInput: string): ClassificationResponse {
  const input = userInput.toLowerCase();
  const detectedCategories: string[] = [];
  
  const categoryKeywords: Record<string, string[]> = {
    jawline: ['jaw', 'jawline', 'chin', 'double chin', 'mewing', 'face structure', 'facial structure'],
    acne: ['acne', 'pimple', 'breakout', 'zit', 'blemish', 'spot'],
    oily_skin: ['oily', 'shine', 'greasy', 'pore', 'large pores'],
    dry_skin: ['dry', 'flaking', 'flaky', 'tight', 'tightness'],
    blackheads: ['blackhead', 'black head', 'nose', 'pore'],
    dark_circles: ['dark circle', 'under eye', 'eye bag', 'bags'],
    skin_texture: ['texture', 'rough', 'uneven', 'bumpy'],
    hyperpigmentation: ['pigmentation', 'dark spot', 'spot', 'uneven tone', 'discoloration'],
    facial_hair: ['beard', 'facial hair', 'patchy', 'growth'],
  };
  
  for (const [categoryId, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some(keyword => input.includes(keyword))) {
      detectedCategories.push(categoryId);
    }
  }
  
  const uniqueCategories = Array.from(new Set(detectedCategories));
  
  return {
    categories: uniqueCategories,
    confidence: uniqueCategories.length > 0 ? 0.85 : 0,
    off_topic: uniqueCategories.length === 0 && input.length > 10,
  };
}

