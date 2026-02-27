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

const PEST_ID_GUIDE: Record<string, string> = {
  'Whitefly': 'Oval body (1-1.5mm), appears orange on adhesive (loses white waxy coating). Wings extend past body. Very common on yellow cards.',
  'Thrips': 'Elongated cigar-shaped body (<2mm), very small, orange/amber color. Antennae and fringed wings usually break off in glue. Found on both yellow and blue cards. Do NOT confuse with whitefly (oval, larger) or other small debris.',
  'Fungus Gnat': 'Dark gray/black (3-4mm), mosquito-like, delicate. Long skinny legs, Y-shaped wing vein. Single pair of gray wings.',
  'Shore Fly': 'Dark, stocky, compact body (3mm, housefly-like). Short wings with 5 pale/light spots. Much stockier than fungus gnats.',
  'Aphid': 'Pear/teardrop shaped (2-3mm, winged form), transparent wings held vertically. Two cornicles ("tailpipes") on rear.',
  'Leafminer': 'Very small fly (1.5-2.5mm), yellow-and-black coloring, compact body.',
};

function buildScoutPrompt(targetLabel: string, expectedCount: number): string {
  const idGuide = PEST_ID_GUIDE[targetLabel] || '';
  const idSection = idGuide
    ? `\n\nIDENTIFICATION GUIDE for ${targetLabel}:\n${idGuide}\n\nOnly mark insects that match this description. Do NOT mark other pest types, debris, or smudges.`
    : '';

  return `You are an expert greenhouse IPM scout. You will receive a photo of a yellow or blue sticky trap card.

A prior multi-pass analysis determined there are approximately **${expectedCount}** ${targetLabel} on this card. Your job is to locate those ~${expectedCount} insects and provide their positions.${idSection}

CRITICAL RULES:
- You should find approximately ${expectedCount} ${targetLabel} (within ±2). If you are finding significantly more, you are likely misidentifying other insects or debris as ${targetLabel}.
- Only mark insects you are confident are ${targetLabel}. Skip anything uncertain.
- Provide normalized coordinates for each:
  - x: 0.0 = left edge, 1.0 = right edge
  - y: 0.0 = top edge, 1.0 = bottom edge

Respond ONLY with valid JSON:
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

function buildGermPrompt(targetLabel: string, expectedCount: number): string {
  return `You are an expert greenhouse propagation specialist. You will receive a photo of a plug tray (seedling tray).

A prior multi-pass analysis determined there are approximately **${expectedCount}** ${targetLabel} cells on this tray. Your job is to locate those ~${expectedCount} cells and provide their positions.

Cell definitions (be strict):
- "Germinated" = cells with visible green seedling emergence (green shoot, cotyledons, or true leaves above media)
- "Empty" = cells with NO germination whatsoever (just soil/media visible, no green growth at all)
- "Abnormal" = cells with damped-off, wilted, yellow/brown, or clearly unhealthy seedlings

CRITICAL RULES:
- You should find approximately ${expectedCount} ${targetLabel} cells (within ±3). Do not over-count.
- Only mark cells you are confident match the "${targetLabel}" category.
- Provide normalized coordinates for the center of each cell:
  - x: 0.0 = left edge, 1.0 = right edge
  - y: 0.0 = top edge, 1.0 = bottom edge

Respond ONLY with valid JSON:
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
    const { image, mode, targetType, targetLabel, expectedCount } = body;

    if (!image || !mode || !targetLabel) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: image, mode, targetLabel' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const count = typeof expectedCount === 'number' && expectedCount > 0 ? expectedCount : 5;

    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
    const mediaType = image.startsWith('data:image/png') ? 'image/png' as const : 'image/jpeg' as const;

    const systemPrompt = mode === 'scout'
      ? buildScoutPrompt(targetLabel, count)
      : buildGermPrompt(targetLabel, count);

    const userText = mode === 'scout'
      ? `A prior analysis found ${count} ${targetLabel} on this sticky trap card. Locate those ~${count} and return their coordinates as JSON.`
      : `A prior analysis found ${count} ${targetLabel} cells on this plug tray. Locate those ~${count} and return their coordinates as JSON.`;

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
