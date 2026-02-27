import Anthropic from '@anthropic-ai/sdk';

export const config = { runtime: 'edge', maxDuration: 30 };

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface HighlightLocation {
  x: number;
  y: number;
}

interface HighlightResponse {
  locations: HighlightLocation[];
  count: number;
  description: string;
}

function buildScoutPrompt(targetLabel: string): string {
  return `You are an expert greenhouse IPM scout. You will receive a photo of a sticky trap card.

Your task: Identify the approximate locations of all **${targetLabel}** on this sticky trap card.

For each individual ${targetLabel} you can see, provide its approximate position as normalized coordinates:
- x: 0.0 = left edge, 1.0 = right edge
- y: 0.0 = top edge, 1.0 = bottom edge

Be as accurate as possible with placement. Mark each individual insect, not clusters.

Respond ONLY with valid JSON in this exact format:
{
  "locations": [
    {"x": 0.23, "y": 0.45},
    {"x": 0.67, "y": 0.12}
  ],
  "count": 2,
  "description": "Found 2 ${targetLabel} - one in the upper-left quadrant and one near the top-right."
}

If none are found, return empty locations array with count 0.`;
}

function buildGermPrompt(targetLabel: string): string {
  return `You are an expert greenhouse propagation specialist. You will receive a photo of a plug tray (seedling tray).

Your task: Identify the approximate locations of all **${targetLabel} cells** on this plug tray.

For each ${targetLabel} cell you can see, provide its approximate position as normalized coordinates:
- x: 0.0 = left edge, 1.0 = right edge
- y: 0.0 = top edge, 1.0 = bottom edge

Cell definitions:
- "germinated" = cells with visible green seedling emergence
- "empty" = cells with no germination (just soil/media, no green growth)
- "abnormal" = cells with damped-off, wilted, or clearly unhealthy seedlings

Mark the center of each cell. Be thorough but accurate.

Respond ONLY with valid JSON in this exact format:
{
  "locations": [
    {"x": 0.12, "y": 0.08},
    {"x": 0.25, "y": 0.08}
  ],
  "count": 2,
  "description": "Found 2 ${targetLabel} cells - distributed across the tray."
}

If none are found, return empty locations array with count 0.`;
}

function parseResponse(text: string): HighlightResponse {
  let jsonText = text.trim();
  const codeBlockMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    jsonText = codeBlockMatch[1].trim();
  }
  const parsed = JSON.parse(jsonText);

  // Clamp coordinates to 0-1
  const locations = (parsed.locations || []).map((loc: { x: number; y: number }) => ({
    x: Math.max(0, Math.min(1, loc.x)),
    y: Math.max(0, Math.min(1, loc.y)),
  }));

  return {
    locations,
    count: parsed.count ?? locations.length,
    description: parsed.description ?? '',
  };
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await req.json();
    const { image, mode, targetType, targetLabel } = body;

    if (!image || !mode || !targetLabel) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: image, mode, targetLabel' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
    const mediaType = image.startsWith('data:image/png') ? 'image/png' as const : 'image/jpeg' as const;

    const systemPrompt = mode === 'scout'
      ? buildScoutPrompt(targetLabel)
      : buildGermPrompt(targetLabel);

    const userText = mode === 'scout'
      ? `Mark all ${targetLabel} on this sticky trap card. Return JSON with normalized coordinates.`
      : `Mark all ${targetLabel} cells on this plug tray. Return JSON with normalized coordinates.`;

    const message = await client.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4096,
      temperature: 0,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: base64Data,
              },
            },
            { type: 'text', text: userText },
          ],
        },
      ],
      system: systemPrompt,
    });

    const textBlock = message.content.find((block) => block.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      throw new Error('No text response from AI');
    }

    const result = parseResponse(textBlock.text);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const errMessage = err instanceof Error ? err.message : 'Highlight analysis failed';
    return new Response(
      JSON.stringify({ locations: [], count: 0, description: '', error: errMessage }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
}
