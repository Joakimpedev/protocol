/**
 * Face Analysis Service
 *
 * Persists selfie photos to durable storage and calls GPT-4o Vision API
 * for face analysis. Photos are saved to documentDirectory so they survive
 * app restarts and onboarding state clears.
 */

import * as FileSystem from 'expo-file-system/legacy';
import { OPENAI_API_KEY } from '../config/openai';

const SELFIE_DIR = FileSystem.documentDirectory + 'selfie_photos/';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface FaceAnalysisResult {
  overall: number;
  jawline: number;
  symmetry: number;
  skin_quality: number;
  cheekbones: number;
  eye_area: number;
  hair: number;
  masculinity: number;
  potential: number;
  advice_jawline: string;
  advice_skin: string;
  advice_hair: string;
  advice_overall: string;
}

// ─── Photo Persistence ───────────────────────────────────────────────────────

async function ensureSelfieDirectory(): Promise<void> {
  const dirInfo = await FileSystem.getInfoAsync(SELFIE_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(SELFIE_DIR, { intermediates: true });
  }
}

/**
 * Copy selfie photos from temp camera URIs to persistent documentDirectory.
 * Returns the new persistent URIs.
 */
export async function saveSelfiePhotos(
  frontUri: string,
  sideUri: string | null
): Promise<{ frontUri: string; sideUri: string | null }> {
  await ensureSelfieDirectory();

  const frontDest = SELFIE_DIR + 'front.jpg';
  const sideDest = SELFIE_DIR + 'side.jpg';

  // Remove old files if they exist
  for (const dest of [frontDest, sideDest]) {
    const info = await FileSystem.getInfoAsync(dest);
    if (info.exists) {
      await FileSystem.deleteAsync(dest);
    }
  }

  await FileSystem.copyAsync({ from: frontUri, to: frontDest });
  if (sideUri) {
    await FileSystem.copyAsync({ from: sideUri, to: sideDest });
  }

  console.log('[FaceAnalysis] Saved selfie photos to persistent storage');
  return { frontUri: frontDest, sideUri: sideUri ? sideDest : null };
}

/**
 * Load persisted selfie photos. Returns null if photos don't exist.
 */
export async function loadSelfiePhotos(): Promise<{ frontUri: string; sideUri: string | null } | null> {
  const frontPath = SELFIE_DIR + 'front.jpg';
  const sidePath = SELFIE_DIR + 'side.jpg';

  const [frontInfo, sideInfo] = await Promise.all([
    FileSystem.getInfoAsync(frontPath),
    FileSystem.getInfoAsync(sidePath),
  ]);

  if (!frontInfo.exists) return null;

  return { frontUri: frontPath, sideUri: sideInfo.exists ? sidePath : null };
}

// ─── Cache Clearing ─────────────────────────────────────────────────────────

/**
 * Delete all cached face analysis results for a user from Firestore.
 * Used in dev mode to force fresh API calls on re-runs.
 */
export async function clearFaceAnalysisCache(uid: string): Promise<void> {
  const { collection: col, getDocs: gd, deleteDoc } = await import('firebase/firestore');
  const { db } = await import('../config/firebase');
  try {
    const snapshot = await gd(col(db, 'users', uid, 'faceAnalysis'));
    const deletions = snapshot.docs.map(d => deleteDoc(d.ref));
    await Promise.all(deletions);
    console.log(`[FaceAnalysis] Cleared ${snapshot.docs.length} cached results for ${uid}`);
  } catch (e) {
    console.warn('[FaceAnalysis] Failed to clear cache:', e);
  }
}

// ─── GPT-4o Vision API ───────────────────────────────────────────────────────

/**
 * Analyze face photos using GPT-4o Vision API.
 * Sends both front and side photos as base64 images.
 */
export async function analyzeFace(
  frontUri: string,
  sideUri: string | null,
  gender: string
): Promise<FaceAnalysisResult> {
  if (!OPENAI_API_KEY || OPENAI_API_KEY === 'YOUR_OPENAI_API_KEY_HERE') {
    console.warn('[FaceAnalysis] OpenAI API key not configured, returning mock scores');
    return getMockResult();
  }

  // Read photos as base64
  const frontBase64 = await FileSystem.readAsStringAsync(frontUri, { encoding: FileSystem.EncodingType.Base64 });
  const sideBase64 = sideUri
    ? await FileSystem.readAsStringAsync(sideUri, { encoding: FileSystem.EncodingType.Base64 })
    : null;

  const photoDesc = sideBase64 ? 'the two photos provided (front-facing and side profile)' : 'the front-facing photo provided';
  const systemPrompt = `You are a facial aesthetics expert. Analyze ${photoDesc} of a ${gender} person.

Rate each category from 1.0 to 10.0 (one decimal place). Be honest but constructive. Consider bone structure, proportions, and overall harmony.

Return ONLY a JSON object with this exact structure:
{
  "overall": 7.2,
  "jawline": 6.5,
  "symmetry": 7.8,
  "skin_quality": 6.0,
  "cheekbones": 7.0,
  "eye_area": 7.5,
  "hair": 6.8,
  "masculinity": 7.0,
  "potential": 8.5,
  "advice_jawline": "Brief actionable advice for jawline improvement",
  "advice_skin": "Brief actionable advice for skin improvement",
  "advice_hair": "Brief actionable advice for hair improvement",
  "advice_overall": "Brief overall improvement summary"
}

Scoring guidelines:
- 1-3: Significantly below average
- 4-5: Below average
- 5-6: Average
- 6-7: Above average
- 7-8: Attractive
- 8-9: Very attractive
- 9-10: Exceptionally attractive (very rare)

Be realistic — most people score 4.5-6.5 overall. Do not inflate scores.`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: [
            { type: 'text', text: sideBase64 ? 'Here are my front-facing and side profile photos. Please analyze my facial features.' : 'Here is my front-facing photo. Please analyze my facial features.' },
            {
              type: 'image_url',
              image_url: { url: `data:image/jpeg;base64,${frontBase64}`, detail: 'high' },
            },
            ...(sideBase64 ? [{
              type: 'image_url' as const,
              image_url: { url: `data:image/jpeg;base64,${sideBase64}`, detail: 'high' as const },
            }] : []),
          ],
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 800,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error('[FaceAnalysis] API error:', errorData);
    throw new Error(`Face analysis API error: ${response.status}`);
  }

  const data = await response.json();
  const result = JSON.parse(data.choices[0].message.content) as FaceAnalysisResult;

  // Validate all required fields exist
  const requiredFields: (keyof FaceAnalysisResult)[] = [
    'overall', 'jawline', 'symmetry', 'skin_quality', 'cheekbones',
    'eye_area', 'hair', 'masculinity', 'potential',
    'advice_jawline', 'advice_skin', 'advice_hair', 'advice_overall',
  ];

  for (const field of requiredFields) {
    if (result[field] === undefined) {
      throw new Error(`Missing field in analysis result: ${field}`);
    }
  }

  // Override potential with computed value based on actual scores
  result.potential = computePotential(result);

  return result;
}

// ─── Potential Calculation ───────────────────────────────────────────────────

/**
 * Compute a realistic potential score based on individual category scores.
 * Logic: categories with lower scores have more room for improvement.
 * Skincare, hair, and jawline (mewing) are the most improvable areas.
 */
function computePotential(result: FaceAnalysisResult): number {
  // How improvable each category is (weight 0-1)
  const improvability: { key: keyof FaceAnalysisResult; weight: number }[] = [
    { key: 'skin_quality', weight: 1.0 },   // Very improvable with routine
    { key: 'hair', weight: 0.9 },            // Highly improvable with styling
    { key: 'jawline', weight: 0.7 },         // Moderately improvable (mewing, leanness)
    { key: 'eye_area', weight: 0.3 },        // Slightly improvable (grooming, sleep)
    { key: 'cheekbones', weight: 0.2 },      // Mostly genetic, leanness helps
    { key: 'symmetry', weight: 0.1 },        // Barely improvable
    { key: 'masculinity', weight: 0.4 },     // Moderate (fitness, posture)
  ];

  let totalGain = 0;
  for (const { key, weight } of improvability) {
    const score = typeof result[key] === 'number' ? (result[key] as number) : 0;
    const room = Math.max(0, 9.0 - score); // Room to grow toward 9.0
    // Each category can contribute up to its weight * room * factor
    totalGain += room * weight * 0.12;
  }

  // Add small random variance (±0.3) so it feels natural
  const variance = (Math.random() - 0.5) * 0.6;
  const potential = result.overall + totalGain + variance;

  // Clamp between overall+0.5 and 9.5
  return Math.round(Math.min(9.5, Math.max(result.overall + 0.5, potential)) * 10) / 10;
}

// ─── Mock Data (fallback when API key not set) ───────────────────────────────

function getMockResult(): FaceAnalysisResult {
  const mock: FaceAnalysisResult = {
    overall: 6.4,
    jawline: 5.8,
    symmetry: 7.1,
    skin_quality: 5.5,
    cheekbones: 6.2,
    eye_area: 6.8,
    hair: 6.0,
    masculinity: 6.5,
    potential: 0, // Will be computed below
    advice_jawline: 'Practice mewing and jaw exercises to define your jawline over time.',
    advice_skin: 'Start a consistent skincare routine with cleanser, moisturizer, and SPF.',
    advice_hair: 'Consider a hairstyle that complements your face shape. Keep it well-groomed.',
    advice_overall: 'You have solid fundamentals. Focus on skincare, posture, and grooming for the biggest improvements.',
  };
  mock.potential = computePotential(mock);
  return mock;
}
