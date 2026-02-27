import type { PestCount } from '../types';
import { ANALYZE_ENDPOINT } from './constants';

export interface AnalysisResult {
  pests: PestCount[];
  totalCount: number;
  summary: string;
  error?: string;
}

export async function analyzeImage(imageBase64: string): Promise<AnalysisResult> {
  try {
    const response = await fetch(ANALYZE_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: imageBase64 }),
    });

    if (!response.ok) {
      throw new Error(`Analysis failed: ${response.status}`);
    }

    return await response.json();
  } catch (err) {
    return {
      pests: [],
      totalCount: 0,
      summary: 'Analysis failed. Please try again.',
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}
