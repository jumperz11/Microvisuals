import { MetaphorResponse, MetaphorResult, APIError, ParseError, isRejection } from './types';

// Request ID counter for stale response protection
let requestIdCounter = 0;

export function getNextRequestId(): number {
  return ++requestIdCounter;
}

// Build the metaphor prompt
function buildMetaphorPrompt(userInput: string): string {
  return `SYSTEM / DEVELOPER INTENT:
You are a meaning → mechanism → proof engine.

You MUST respond with JSON ONLY.
No markdown. No commentary. No extra keys. No leading/trailing text.

TASK:
Produce:

one sharp sentence bound to an object's physical rule

one concrete visual description that proves it
If this cannot be done cleanly, return only:
{ "rejection": "reason" }

INPUT: "${userInput}"

STEP 0 — INPUT CHECK
If already a conclusion/quote/moral:
→ { "rejection": "This is already a resolved idea." }

STEP 1 — MEANING (LITERAL ONLY)
Extract:

Subject: who/what

Pressure: what acts on them

Conflict: what's stuck

Cost: what's lost

Emotion: ONE word
No metaphors. No wisdom.
If vague → { "rejection": "Too vague to visualize." }

STEP 2 — OBJECT (STRICT)
Choose ONE concrete real-world object.
Rules:

Instantly recognizable

Has physical function

Understandable by a child

Works on black background

ONE object only — no secondary objects that "explain"

The object's failure must be visible WITHOUT adding other elements
BANNED: abstract shapes, diagrams, UI elements, systems, secondary explanatory objects

STEP 3 — MECHANIC (NON-NEGOTIABLE)
Write the object's behavior as a rule:
"When X happens, Y inevitably happens."
Map:

X → user's situation

Y → the cost/outcome
If outcome isn't inevitable → reject.
If it only "symbolizes" → reject.

STEP 4 — QUOTE (OBJECT-BOUND)
Write 3 options. Pick best. Rules:

Describes object's behavior

Cold, factual, observational

No advice, no philosophy

If quote works without the object → invalid

STEP 5 — VISUAL DESCRIPTION
VISUAL STYLE (NON-NEGOTIABLE):

Flat 2D illustration

Black + white only

No textures, no realism

No lighting effects, no depth

Poster/symbol style (Bauhaus, Swiss design)

Must look printable

MINIMAL RULE (CRITICAL):

ONE object only

ONE failure mode visible

ONE consequence shown

NO secondary objects that explain the meaning

If you need a second object → you picked the wrong metaphor

Describe as GRAPHIC CONSTRUCTION:

Object + its state

What shows the failure (without extra objects)

"White shapes on black background. No texture. No extra objects."

Return JSON in this exact schema:

{
"step1": {
"subject": "",
"pressure": "",
"conflict": "",
"cost": "",
"emotion": ""
},
"step2_object": "",
"step3_mechanic": {
"rule": "",
"x_maps_to": "",
"y_maps_to": ""
},
"step4_quotes": ["", "", ""],
"step4_best": {
"line1": "",
"line2": ""
},
"step5_visual": "",
"step5_dalle_prompt": "[single object + failure state]. Flat 2D vector. Pure black background. White shapes only. No gradients. No texture. No shadows. No extra objects. No ground. Minimal. Bauhaus poster style. Centered."
}

OR: { "rejection": "reason" }`;
}

// Parse JSON from model response - strict parsing, no greedy regex
function parseModelResponse(text: string): MetaphorResponse {
  // Trim whitespace
  const trimmed = text.trim();

  // Try direct parse first (model followed instructions)
  try {
    const parsed = JSON.parse(trimmed);
    return validateMetaphorResponse(parsed);
  } catch {
    // If direct parse fails, look for JSON object boundaries
    // Find first { and match to its closing }
    const startIndex = trimmed.indexOf('{');
    if (startIndex === -1) {
      throw new ParseError('Model returned invalid JSON. No JSON object found.', text);
    }

    // Manual brace matching to find the complete JSON object
    let braceCount = 0;
    let endIndex = -1;
    let inString = false;
    let escapeNext = false;

    for (let i = startIndex; i < trimmed.length; i++) {
      const char = trimmed[i];

      if (escapeNext) {
        escapeNext = false;
        continue;
      }

      if (char === '\\' && inString) {
        escapeNext = true;
        continue;
      }

      if (char === '"' && !escapeNext) {
        inString = !inString;
        continue;
      }

      if (!inString) {
        if (char === '{') {
          braceCount++;
        } else if (char === '}') {
          braceCount--;
          if (braceCount === 0) {
            endIndex = i;
            break;
          }
        }
      }
    }

    if (endIndex === -1) {
      throw new ParseError('Model returned invalid JSON. Unclosed JSON object.', text);
    }

    const jsonString = trimmed.substring(startIndex, endIndex + 1);

    try {
      const parsed = JSON.parse(jsonString);
      return validateMetaphorResponse(parsed);
    } catch {
      throw new ParseError('Model returned invalid JSON. Parse failed.', text);
    }
  }
}

// Validate the parsed response has required fields
function validateMetaphorResponse(obj: unknown): MetaphorResponse {
  if (typeof obj !== 'object' || obj === null) {
    throw new ParseError('Model returned invalid JSON. Expected object.');
  }

  const response = obj as Record<string, unknown>;

  // Check if it's a rejection
  if ('rejection' in response && typeof response.rejection === 'string') {
    return { rejection: response.rejection };
  }

  // Validate full metaphor result
  if (!response.step1 || !response.step2_object || !response.step3_mechanic ||
      !response.step4_quotes || !response.step4_best ||
      !response.step5_visual || !response.step5_dalle_prompt) {
    throw new ParseError('Model returned incomplete JSON. Missing required fields.');
  }

  return response as unknown as MetaphorResult;
}

// Generate metaphor using Anthropic API
export async function generateMetaphor(
  userInput: string,
  anthropicKey: string,
  signal?: AbortSignal
): Promise<MetaphorResponse> {
  const prompt = buildMetaphorPrompt(userInput);

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': anthropicKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: prompt
            }
          ]
        }
      ]
    }),
    signal
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `Anthropic API error (${response.status})`;

    try {
      const errorJson = JSON.parse(errorText);
      if (errorJson.error?.message) {
        errorMessage = errorJson.error.message;
      }
    } catch {
      if (errorText) {
        errorMessage = errorText.substring(0, 200);
      }
    }

    throw new APIError(errorMessage, response.status, errorText);
  }

  const data = await response.json();

  // Extract text content from Anthropic response
  const textContent = data.content?.find((block: { type: string }) => block.type === 'text');
  if (!textContent?.text) {
    throw new APIError('No text content in Anthropic response');
  }

  return parseModelResponse(textContent.text);
}

// Generate image using OpenAI API
export async function generateImage(
  dallePrompt: string,
  openaiKey: string,
  signal?: AbortSignal
): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${openaiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-image-1',
      prompt: dallePrompt,
      n: 1,
      size: '1024x1024',
      quality: 'high'
    }),
    signal
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `OpenAI API error (${response.status})`;

    // Check if gpt-image-1 failed and we should try dall-e-3
    if (response.status === 404 || response.status === 400) {
      // Try with dall-e-3 as fallback
      const fallbackResponse = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiKey}`
        },
        body: JSON.stringify({
          model: 'dall-e-3',
          prompt: dallePrompt,
          n: 1,
          size: '1024x1024',
          quality: 'hd'
        }),
        signal
      });

      if (!fallbackResponse.ok) {
        const fallbackErrorText = await fallbackResponse.text();
        try {
          const errorJson = JSON.parse(fallbackErrorText);
          if (errorJson.error?.message) {
            errorMessage = errorJson.error.message;
          }
        } catch {
          if (fallbackErrorText) {
            errorMessage = fallbackErrorText.substring(0, 200);
          }
        }
        throw new APIError(errorMessage, fallbackResponse.status, fallbackErrorText);
      }

      const fallbackData = await fallbackResponse.json();
      const imageUrl = fallbackData.data?.[0]?.url || fallbackData.data?.[0]?.b64_json;
      if (!imageUrl) {
        throw new APIError('No image URL in OpenAI response');
      }

      // Handle base64 response
      if (fallbackData.data?.[0]?.b64_json) {
        return `data:image/png;base64,${fallbackData.data[0].b64_json}`;
      }

      return imageUrl;
    }

    try {
      const errorJson = JSON.parse(errorText);
      if (errorJson.error?.message) {
        errorMessage = errorJson.error.message;
      }
    } catch {
      if (errorText) {
        errorMessage = errorText.substring(0, 200);
      }
    }

    throw new APIError(errorMessage, response.status, errorText);
  }

  const data = await response.json();
  const imageUrl = data.data?.[0]?.url || data.data?.[0]?.b64_json;
  if (!imageUrl) {
    throw new APIError('No image URL in OpenAI response');
  }

  // Handle base64 response
  if (data.data?.[0]?.b64_json) {
    return `data:image/png;base64,${data.data[0].b64_json}`;
  }

  return imageUrl;
}

export { isRejection };
