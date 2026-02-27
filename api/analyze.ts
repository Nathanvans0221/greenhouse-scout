import Anthropic from '@anthropic-ai/sdk';

export const config = { runtime: 'edge', maxDuration: 30 };

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface PestResult {
  type: string;
  count: number;
  confidence: number;
}

interface AnalysisResponse {
  pests: PestResult[];
  totalCount: number;
  summary: string;
}

const SYSTEM_PROMPT = `You are an expert greenhouse IPM (Integrated Pest Management) scout specializing in analyzing sticky trap cards. You will receive a photo of a yellow or blue sticky trap card from a greenhouse.

Your task is to identify and count each type of insect pest on the card. The common greenhouse pests found on sticky cards are:

1. **Whitefly** (1-1.5mm) - Oval body, appears orange on the adhesive (loses white waxy coating). Wings extend past body. Very common on yellow cards.
2. **Thrips** (<2mm) - Elongated cigar-shaped body, very small, orange/amber color. Antennae and fringed wings usually break off in glue. Common on both yellow and blue cards.
3. **Fungus Gnat** (3-4mm) - Dark gray/black, mosquito-like, delicate. Long skinny legs, Y-shaped wing vein. Single pair of gray wings.
4. **Shore Fly** (3mm) - Dark, stocky, compact body (housefly-like). Short wings with 5 pale/light spots. Much stockier than fungus gnats.
5. **Aphid** (2-3mm, winged form) - Pear/teardrop shaped, transparent wings held vertically. Two cornicles ("tailpipes") on rear. Variable color.
6. **Leafminer** (1.5-2.5mm) - Very small fly, yellow-and-black coloring, compact body.

For each pest type present, provide:
- The pest type (use exactly: whitefly, thrips, fungus_gnat, shore_fly, aphid, leafminer, other)
- An estimated count (be as accurate as possible; for dense clusters estimate to nearest 5)
- A confidence level from 0 to 1

Also provide a brief natural language summary of what you see.

IMPORTANT: Only include pest types you actually observe. Do not include types with 0 count. If you cannot identify the card as a sticky trap, say so in the summary.

Respond ONLY with valid JSON in this exact format:
{
  "pests": [
    {"type": "whitefly", "count": 23, "confidence": 0.85},
    {"type": "thrips", "count": 8, "confidence": 0.72}
  ],
  "totalCount": 31,
  "summary": "Yellow sticky card with moderate whitefly pressure (23 adults) concentrated in the upper half. 8 thrips scattered across the card. No fungus gnats or other pests observed."
}`;

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await req.json();
    const { image } = body;

    if (!image) {
      return new Response(JSON.stringify({ error: 'No image provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Strip the data URL prefix if present
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
    const mediaType = image.startsWith('data:image/png') ? 'image/png' : 'image/jpeg';

    const message = await client.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1024,
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
            {
              type: 'text',
              text: 'Analyze this sticky trap card. Identify and count all pest insects. Return JSON only.',
            },
          ],
        },
      ],
      system: SYSTEM_PROMPT,
    });

    // Extract text from the response
    const textBlock = message.content.find((block) => block.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      throw new Error('No text response from AI');
    }

    // Parse the JSON response - handle markdown code blocks
    let jsonText = textBlock.text.trim();
    const codeBlockMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      jsonText = codeBlockMatch[1].trim();
    }

    const result: AnalysisResponse = JSON.parse(jsonText);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Analysis failed';
    return new Response(JSON.stringify({ error: message, pests: [], totalCount: 0, summary: 'Analysis failed.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
