import { useState, useCallback, useEffect } from 'react';
import { MetaphorResult } from './types';
import './App.css';

function App() {
  const [jsonInput, setJsonInput] = useState('');
  const [resultJSON, setResultJSON] = useState<MetaphorResult | null>(null);
  const [rejection, setRejection] = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Poll for new metaphor data from file
  useEffect(() => {
    const checkForUpdate = async () => {
      try {
        const res = await fetch('/metaphor.json?t=' + Date.now());
        if (res.ok) {
          const data = await res.json();
          if (data && data.step2_object) {
            setResultJSON(data);
            setRejection(null);
            setParseError(null);
          } else if (data && data.rejection) {
            setRejection(data.rejection);
            setResultJSON(null);
          }
        }
      } catch {
        // File doesn't exist yet, that's fine
      }
    };

    const interval = setInterval(checkForUpdate, 1000);
    checkForUpdate(); // Check immediately on load

    return () => clearInterval(interval);
  }, []);

  // Parse the JSON response
  const handleParseJSON = useCallback(() => {
    setParseError(null);
    setRejection(null);
    setResultJSON(null);

    const trimmed = jsonInput.trim();
    if (!trimmed) {
      setParseError('Paste the JSON from Claude Code.');
      return;
    }

    // Try to extract JSON from the input
    let jsonString = trimmed;

    // Remove markdown code blocks if present
    const codeBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      jsonString = codeBlockMatch[1].trim();
    }

    // Sanitize: fix copy/paste issues from terminals and chat interfaces
    jsonString = jsonString
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove control chars
      .replace(/\r\n/g, ' ') // Normalize line endings to space
      .replace(/\r/g, ' ')
      .replace(/\n/g, ' ')
      .replace(/\t/g, ' ')
      .replace(/[\u2018\u2019]/g, "'") // Smart quotes to regular
      .replace(/[\u201C\u201D]/g, '"') // Smart double quotes
      .replace(/\u2013/g, '-') // En dash
      .replace(/\u2014/g, '-') // Em dash
      .replace(/\u2026/g, '...') // Ellipsis
      .replace(/[^\x20-\x7E]/g, (char) => {
        // Keep only printable ASCII, escape everything else for JSON
        const code = char.charCodeAt(0);
        if (code > 127) return ''; // Remove non-ASCII for now
        return char;
      });

    // Find first { and last }
    const startIndex = jsonString.indexOf('{');
    const endIndex = jsonString.lastIndexOf('}');

    if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) {
      setParseError('No valid JSON object found.');
      return;
    }

    const extracted = jsonString.substring(startIndex, endIndex + 1);

    try {
      const parsed = JSON.parse(extracted);

      if (parsed.rejection) {
        setRejection(parsed.rejection);
        return;
      }

      if (!parsed.step2_object || !parsed.step3_mechanic || !parsed.step4_best) {
        setParseError('JSON is missing required fields.');
        return;
      }

      setResultJSON(parsed as MetaphorResult);
    } catch (e) {
      console.error('Parse error:', e, 'Input was:', extracted.substring(0, 100));
      setParseError(`Parse error: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  }, [jsonInput]);

  // Copy DALL-E prompt
  const handleCopyDalle = useCallback(async () => {
    if (!resultJSON?.step5_dalle_prompt) return;
    try {
      await navigator.clipboard.writeText(resultJSON.step5_dalle_prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = resultJSON.step5_dalle_prompt;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [resultJSON]);

  // Reset
  const handleClear = useCallback(() => {
    setJsonInput('');
    setResultJSON(null);
    setRejection(null);
    setParseError(null);
  }, []);

  return (
    <div className="app">
      <header className="header">
        <h1>METAPHOR<span className="accent">ENGINE</span></h1>
        <p className="subtitle">Ask Claude Code to generate a metaphor, paste the JSON here</p>
      </header>

      <main className="main">
        {/* Left Panel - Input */}
        <div className="panel left-panel">
          {!resultJSON && !rejection ? (
            <section className="section">
              <div className="instruction-box">
                <p><strong>In Claude Code, say:</strong></p>
                <p className="example">"Generate a metaphor for: [your situation]"</p>
                <p>Then paste the JSON response below.</p>
              </div>

              <div className="input-group">
                <label htmlFor="json-input">Paste JSON</label>
                <textarea
                  id="json-input"
                  value={jsonInput}
                  onChange={(e) => setJsonInput(e.target.value)}
                  placeholder='{"step1": {...}, "step2_object": "...", ...}'
                  className="input textarea mono"
                  rows={12}
                />
              </div>

              {parseError && (
                <div className="error-box">
                  {parseError}
                </div>
              )}

              <div className="button-row">
                <button
                  onClick={handleParseJSON}
                  disabled={!jsonInput.trim()}
                  className="button primary"
                >
                  View Metaphor
                </button>
              </div>
            </section>
          ) : rejection ? (
            <section className="section">
              <div className="rejection-box">
                <strong>Rejected:</strong> {rejection}
              </div>
              <div className="button-row">
                <button onClick={handleClear} className="button primary">
                  Try Again
                </button>
              </div>
            </section>
          ) : resultJSON && (
            <section className="section result-section">
              <div className="result-block">
                <h3>Object</h3>
                <p className="result-value object-value">{resultJSON.step2_object}</p>
              </div>

              <div className="result-block">
                <h3>Mechanic</h3>
                <p className="result-value">{resultJSON.step3_mechanic.rule}</p>
                <p className="mapping">
                  <span className="map-label">X:</span> {resultJSON.step3_mechanic.x_maps_to}
                </p>
                <p className="mapping">
                  <span className="map-label">Y:</span> {resultJSON.step3_mechanic.y_maps_to}
                </p>
              </div>

              <div className="result-block">
                <h3>Quote</h3>
                <p className="result-value quote-line">{resultJSON.step4_best.line1}</p>
                {resultJSON.step4_best.line2 && (
                  <p className="result-value quote-line">{resultJSON.step4_best.line2}</p>
                )}
              </div>

              <div className="result-block">
                <h3>Visual</h3>
                <p className="result-value visual-desc">{resultJSON.step5_visual}</p>
              </div>

              <div className="result-block">
                <h3>Image Prompt</h3>
                <p className="result-value dalle-prompt">{resultJSON.step5_dalle_prompt}</p>
              </div>

              <div className="button-row">
                <button onClick={handleCopyDalle} className="button primary">
                  {copied ? 'Copied!' : 'Generate Image'}
                </button>
                <button onClick={handleClear} className="button secondary">
                  New
                </button>
              </div>
            </section>
          )}
        </div>

        {/* Right Panel - Generated Image */}
        <div className="panel right-panel">
          <div className="preview-container">
            {resultJSON ? (
              <div className="poster-preview">
                <div className="generated-poster">
                  <svg viewBox="0 0 400 400" className="poster-svg">
                    {/* Black background */}
                    <rect width="400" height="400" fill="#000" />

                    {/* Stairs */}
                    <g stroke="#fff" strokeWidth="2" fill="none">
                      {/* Stair steps */}
                      <line x1="60" y1="280" x2="100" y2="280" />
                      <line x1="100" y1="280" x2="100" y2="260" />
                      <line x1="100" y1="260" x2="140" y2="260" />
                      <line x1="140" y1="260" x2="140" y2="240" />
                      <line x1="140" y1="240" x2="180" y2="240" />
                      <line x1="180" y1="240" x2="180" y2="220" />
                      <line x1="180" y1="220" x2="220" y2="220" />
                      <line x1="220" y1="220" x2="220" y2="200" />
                      {/* Railing */}
                      <line x1="60" y1="250" x2="220" y2="170" />
                      {/* Railing posts */}
                      <line x1="80" y1="280" x2="80" y2="258" />
                      <line x1="120" y1="260" x2="120" y2="238" />
                      <line x1="160" y1="240" x2="160" y2="218" />
                      <line x1="200" y1="220" x2="200" y2="198" />
                    </g>

                    {/* Elevator */}
                    <g stroke="#fff" strokeWidth="2" fill="none">
                      {/* Outer frame */}
                      <rect x="250" y="120" width="100" height="160" />
                      {/* Inner door frame */}
                      <rect x="260" y="140" width="80" height="130" />
                      {/* Door opening (white fill to show open) */}
                      <rect x="265" y="145" width="70" height="120" fill="#111" />
                      {/* Floor indicator */}
                      <rect x="270" y="125" width="60" height="12" />
                      <circle cx="285" cy="131" r="3" fill="#fff" />
                      <circle cx="300" cy="131" r="3" fill="#fff" />
                      <circle cx="315" cy="131" r="3" fill="#fff" />
                      {/* Call button */}
                      <rect x="355" y="180" width="15" height="40" />
                      <circle cx="362" cy="192" r="4" />
                      <circle cx="362" cy="208" r="4" />
                    </g>

                    {/* Text */}
                    <text x="200" y="340" textAnchor="middle" fill="#fff" fontSize="14" fontFamily="Helvetica, Arial, sans-serif">
                      What ignoring vibe coding feels like:
                    </text>
                    <text x="200" y="365" textAnchor="middle" fill="#fff" fontSize="13" fontFamily="Helvetica, Arial, sans-serif">
                      Taking the stairs to the 50th floor
                    </text>
                    <text x="200" y="385" textAnchor="middle" fill="#fff" fontSize="13" fontFamily="Helvetica, Arial, sans-serif">
                      when the elevator is right there.
                    </text>
                  </svg>
                </div>
              </div>
            ) : (
              <div className="image-placeholder">
                <div className="placeholder-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <path d="M21 15l-5-5L5 21" />
                  </svg>
                </div>
                <p>Paste JSON to see your metaphor</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
