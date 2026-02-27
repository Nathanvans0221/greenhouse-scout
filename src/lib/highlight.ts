import type { HighlightResult, HighlightMode } from '../types';
import { HIGHLIGHT_ENDPOINT } from './constants';

export async function fetchHighlightLocations(
  image: string,
  mode: HighlightMode,
  targetType: string,
  targetLabel: string,
  expectedCount: number,
): Promise<HighlightResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(HIGHLIGHT_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image, mode, targetType, targetLabel, expectedCount }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Highlight failed (${response.status}): ${errorBody}`);
    }

    return await response.json();
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return {
        locations: [],
        count: 0,
        description: '',
        error: 'Highlight request timed out. Please try again.',
      };
    }
    return {
      locations: [],
      count: 0,
      description: '',
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  } finally {
    clearTimeout(timeout);
  }
}
