import type { PestCount } from '../types';
import { ANALYZE_ENDPOINT } from './constants';

export interface AnalysisResult {
  pests: PestCount[];
  totalCount: number;
  summary: string;
  error?: string;
}

export async function analyzeImage(
  imageBase64: string,
  onProgress?: (status: string) => void,
): Promise<AnalysisResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45000);

  try {
    onProgress?.('Uploading image...');

    const response = await fetch(ANALYZE_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: imageBase64 }),
      signal: controller.signal,
    });

    onProgress?.('Processing results...');

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Analysis failed (${response.status}): ${errorBody}`);
    }

    return await response.json();
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return {
        pests: [],
        totalCount: 0,
        summary: '',
        error: 'Analysis timed out. Try again or use Demo Scan.',
      };
    }
    return {
      pests: [],
      totalCount: 0,
      summary: '',
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  } finally {
    clearTimeout(timeout);
  }
}
