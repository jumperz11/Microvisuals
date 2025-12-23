// Metaphor result types
export interface MetaphorStep1 {
  subject: string;
  pressure: string;
  conflict: string;
  cost: string;
  emotion: string;
}

export interface MetaphorStep3 {
  rule: string;
  x_maps_to: string;
  y_maps_to: string;
}

export interface MetaphorStep4Best {
  line1: string;
  line2: string;
}

export interface MetaphorResult {
  step1: MetaphorStep1;
  step2_object: string;
  step3_mechanic: MetaphorStep3;
  step4_quotes: [string, string, string];
  step4_best: MetaphorStep4Best;
  step5_visual: string;
  step5_dalle_prompt: string;
}

export interface MetaphorRejection {
  rejection: string;
}

export type MetaphorResponse = MetaphorResult | MetaphorRejection;

export function isRejection(response: MetaphorResponse): response is MetaphorRejection {
  return 'rejection' in response;
}

// API error types
export class APIError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public details?: string
  ) {
    super(message);
    this.name = 'APIError';
  }
}

export class ParseError extends Error {
  constructor(message: string, public rawResponse?: string) {
    super(message);
    this.name = 'ParseError';
  }
}

// Application state
export interface AppState {
  input: string;
  anthropicKey: string;
  openaiKey: string;
  isGeneratingText: boolean;
  isGeneratingImage: boolean;
  resultJSON: MetaphorResult | null;
  rejection: string | null;
  imageUrl: string | null;
  imageError: string | null;
  textError: string | null;
}
