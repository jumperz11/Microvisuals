import { useState, useCallback, useEffect, useRef } from 'react';
import { MetaphorResult, HistoryItem, HistoryStatus } from './types';
import './App.css';

function App() {
  const [jsonInput, setJsonInput] = useState('');
  const [resultJSON, setResultJSON] = useState<MetaphorResult | null>(null);
  const [rejection, setRejection] = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedSize, setSelectedSize] = useState<'1:1' | '4:5' | '9:16'>('1:1');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);
  const [openaiKey, setOpenaiKey] = useState('');
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [generationStatus, setGenerationStatus] = useState('');
  const [generationProgress, setGenerationProgress] = useState(0);
  const [objectScale, setObjectScale] = useState(0.45);
  const [objectX, setObjectX] = useState(50); // percentage from left
  const [objectY, setObjectY] = useState(50); // percentage from top
  const [showGuides, setShowGuides] = useState(true);
  const [savedPresets, setSavedPresets] = useState<{name: string, settings: any}[]>([]);
  const [textPositionY, setTextPositionY] = useState(85); // percentage from top
  const [selectedFont, setSelectedFont] = useState('Inter');
  const [topText, setTopText] = useState('What it feels like:');
  const [showTopText, setShowTopText] = useState(true);
  const [topTextY, setTopTextY] = useState(8); // percentage from top
  const [quoteLine1, setQuoteLine1] = useState('');
  const [quoteLine2, setQuoteLine2] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fontOptions = [
    { name: 'Inter', label: 'Inter' },
    { name: 'Space Mono', label: 'Mono' },
    { name: 'Bebas Neue', label: 'Bebas' },
    { name: 'Playfair Display', label: 'Playfair' },
    { name: 'Oswald', label: 'Oswald' },
  ];

  const backgroundOptions = [
    { id: 'original', label: 'Original' },
    { id: 'custom', label: 'Custom' },
    { id: 'shiny', label: 'Shiny' },
    { id: 'metal', label: 'Metal' },
    { id: 'scratched', label: 'Scratched' },
  ];

  const [selectedBackground, setSelectedBackground] = useState('original');
  const [bgColor, setBgColor] = useState('#000000');
  const [shapeColor, setShapeColor] = useState('#ffffff');
  const [cleanThreshold, setCleanThreshold] = useState(35);

  // Default settings
  const defaultSettings = {
    scale: 0.45, x: 50, y: 50, text: 85,
    font: 'Inter', bg: 'original',
    bgColor: '#000000', shapeColor: '#ffffff', clean: 35,
    topText: 'What it feels like:', showTopText: true, topTextY: 8,
    quoteLine1: '', quoteLine2: ''
  };

  // Load history and API key from localStorage on mount
  useEffect(() => {
    const savedKey = localStorage.getItem('openai-key');
    if (savedKey) {
      setOpenaiKey(savedKey);
    }

    const saved = localStorage.getItem('metaphor-history');
    if (saved) {
      try {
        const loadedHistory = JSON.parse(saved) as HistoryItem[];

        // Load images from IndexedDB
        const dbRequest = indexedDB.open('metaphor-images', 1);
        dbRequest.onupgradeneeded = (e) => {
          const db = (e.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains('images')) {
            db.createObjectStore('images', { keyPath: 'id' });
          }
        };
        dbRequest.onsuccess = (e) => {
          const db = (e.target as IDBOpenDBRequest).result;
          const tx = db.transaction('images', 'readonly');
          const store = tx.objectStore('images');

          const updatedHistory = [...loadedHistory];
          let pending = updatedHistory.length;

          if (pending === 0) {
            setHistory(updatedHistory);
            return;
          }

          updatedHistory.forEach((item, index) => {
            if (item.generatedImage === 'stored') {
              const request = store.get(item.id);
              request.onsuccess = () => {
                if (request.result) {
                  updatedHistory[index] = { ...item, generatedImage: request.result.image };
                }
                pending--;
                if (pending === 0) {
                  setHistory(updatedHistory);
                }
              };
              request.onerror = () => {
                pending--;
                if (pending === 0) {
                  setHistory(updatedHistory);
                }
              };
            } else {
              pending--;
              if (pending === 0) {
                setHistory(updatedHistory);
              }
            }
          });
        };
        dbRequest.onerror = () => {
          setHistory(loadedHistory);
        };
      } catch (e) {
        console.error('Failed to load history:', e);
      }
    }
  }, []);

  // Save OpenAI key to localStorage
  useEffect(() => {
    if (openaiKey) {
      localStorage.setItem('openai-key', openaiKey);
    }
  }, [openaiKey]);

  // Load presets from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('metaphor-presets');
    if (saved) {
      try {
        setSavedPresets(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);

  // Save presets to localStorage
  useEffect(() => {
    localStorage.setItem('metaphor-presets', JSON.stringify(savedPresets));
  }, [savedPresets]);

  // Save current settings as preset
  const savePreset = () => {
    const name = `Preset ${savedPresets.length + 1}`;
    const settings = {
      scale: objectScale,
      x: objectX,
      y: objectY,
      text: textPositionY,
      font: selectedFont,
      bg: selectedBackground,
      bgColor: bgColor,
      shapeColor: shapeColor,
      clean: cleanThreshold,
      topText: topText,
      showTopText: showTopText,
      topTextY: topTextY,
      quoteLine1: quoteLine1,
      quoteLine2: quoteLine2
    };
    setSavedPresets(prev => [...prev, { name, settings }]);
  };

  // Apply preset
  const applyPreset = (settings: any) => {
    if (settings.scale) setObjectScale(settings.scale);
    if (settings.x !== undefined) setObjectX(settings.x);
    if (settings.y !== undefined) setObjectY(settings.y);
    if (settings.text) setTextPositionY(settings.text);
    if (settings.font) setSelectedFont(settings.font);
    if (settings.bg) setSelectedBackground(settings.bg);
    if (settings.bgColor) setBgColor(settings.bgColor);
    if (settings.shapeColor) setShapeColor(settings.shapeColor);
    if (settings.clean) setCleanThreshold(settings.clean);
    if (settings.topText !== undefined) setTopText(settings.topText);
    if (settings.showTopText !== undefined) setShowTopText(settings.showTopText);
    if (settings.topTextY !== undefined) setTopTextY(settings.topTextY);
    if (settings.quoteLine1 !== undefined) setQuoteLine1(settings.quoteLine1);
    if (settings.quoteLine2 !== undefined) setQuoteLine2(settings.quoteLine2);
  };

  // Delete preset
  const deletePreset = (index: number) => {
    setSavedPresets(prev => prev.filter((_, i) => i !== index));
  };

  // Save history to localStorage when it changes (compress images)
  useEffect(() => {
    try {
      // Store history - images are stored separately in IndexedDB
      const historyWithoutImages = history.map(item => ({
        ...item,
        generatedImage: item.generatedImage ? 'stored' : undefined
      }));
      localStorage.setItem('metaphor-history', JSON.stringify(historyWithoutImages));

      // Store images in IndexedDB (much larger storage)
      const dbRequest = indexedDB.open('metaphor-images', 1);
      dbRequest.onupgradeneeded = (e) => {
        const db = (e.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('images')) {
          db.createObjectStore('images', { keyPath: 'id' });
        }
      };
      dbRequest.onsuccess = (e) => {
        const db = (e.target as IDBOpenDBRequest).result;
        const tx = db.transaction('images', 'readwrite');
        const store = tx.objectStore('images');
        history.forEach(item => {
          if (item.generatedImage && item.generatedImage !== 'stored') {
            store.put({ id: item.id, image: item.generatedImage });
          }
        });
      };
    } catch (e) {
      console.error('Failed to save history:', e);
    }
  }, [history]);

  // Add current metaphor to history
  const saveToHistory = useCallback(() => {
    if (!resultJSON) return;

    const newItem: HistoryItem = {
      id: Date.now().toString(),
      createdAt: Date.now(),
      topic: resultJSON.step1?.subject || 'Unknown',
      metaphor: resultJSON,
      status: 'pending',
    };

    setHistory(prev => [newItem, ...prev]);
  }, [resultJSON]);

  // Update history item status
  const updateHistoryStatus = useCallback((id: string, status: HistoryStatus) => {
    setHistory(prev => prev.map(item =>
      item.id === id ? { ...item, status } : item
    ));
  }, []);

  // Load a history item
  const loadFromHistory = useCallback((item: HistoryItem) => {
    setResultJSON(item.metaphor);
    if (item.generatedImage) {
      setUploadedImage(item.generatedImage);
    }
    setShowHistory(false);
  }, []);

  // Delete a history item
  const deleteFromHistory = useCallback((id: string) => {
    setHistory(prev => prev.filter(item => item.id !== id));
  }, []);

  // Size configurations
  const sizeConfigs = {
    '1:1': { width: 1080, height: 1080, label: '1:1', desc: 'Universal' },
    '4:5': { width: 1080, height: 1350, label: '4:5', desc: 'Feed' },
    '9:16': { width: 1080, height: 1920, label: '9:16', desc: 'Story' },
  };

  // Fetch metaphor from Claude Code (manual only - no auto-poll)
  const loadFromClaude = useCallback(async () => {
    try {
      const res = await fetch('/metaphor.json?t=' + Date.now());
      if (res.ok) {
        const data = await res.json();
        if (data && data.step2_object) {
          setResultJSON(data);
          setRejection(null);
          setParseError(null);
          setJsonInput('');
          setShowManualInput(false);
          return true;
        } else if (data && data.rejection) {
          setRejection(data.rejection);
          setResultJSON(null);
          return true;
        }
      }
    } catch {
      setParseError('No metaphor found. Ask Claude Code to generate one first.');
    }
    return false;
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

  // Reset - go back to main screen
  const handleClear = useCallback(() => {
    setJsonInput('');
    setResultJSON(null);
    setRejection(null);
    setParseError(null);
    setUploadedImage(null);
    setShowManualInput(false);
  }, []);

  // Handle image upload from file
  const handleImageUpload = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      setUploadedImage(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  // Handle file input change
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImageUpload(file);
  }, [handleImageUpload]);

  // Handle drag and drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleImageUpload(file);
  }, [handleImageUpload]);

  // Handle paste from clipboard
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) handleImageUpload(file);
          break;
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [handleImageUpload]);

  // Generate image with DALL-E 3
  const generateImage = useCallback(async () => {
    if (!openaiKey || !resultJSON?.step5_dalle_prompt) return;

    setIsGeneratingImage(true);
    setImageError(null);
    setGenerationProgress(0);
    setGenerationStatus('Analyzing prompt...');

    // Simulate progress since DALL-E doesn't provide real progress
    const progressInterval = setInterval(() => {
      setGenerationProgress(prev => {
        if (prev < 20) {
          setGenerationStatus('Analyzing prompt...');
          return prev + 2;
        } else if (prev < 50) {
          setGenerationStatus('Generating composition...');
          return prev + 1.5;
        } else if (prev < 80) {
          setGenerationStatus('Rendering details...');
          return prev + 1;
        } else if (prev < 95) {
          setGenerationStatus('Finalizing image...');
          return prev + 0.5;
        }
        return prev;
      });
    }, 200);

    try {
      const response = await fetch('/api/openai/v1/images/generations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model: 'dall-e-3',
          prompt: resultJSON.step5_dalle_prompt,
          n: 1,
          size: '1024x1024',
          quality: 'hd',
          response_format: 'b64_json',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to generate image');
      }

      const data = await response.json();
      console.log('OpenAI response:', data);

      const imageUrl = data.data[0]?.url;
      const b64 = data.data[0]?.b64_json;

      if (b64) {
        const imageData = `data:image/png;base64,${b64}`;
        setUploadedImage(imageData);
        // Auto-save to history
        if (resultJSON) {
          const newItem: HistoryItem = {
            id: Date.now().toString(),
            createdAt: Date.now(),
            topic: resultJSON.topic || resultJSON.step1?.subject || 'Unknown',
            metaphor: resultJSON,
            status: 'pending',
            generatedImage: imageData,
          };
          setHistory(prev => [newItem, ...prev]);
        }
      } else if (imageUrl) {
        setUploadedImage(imageUrl);
        // Auto-save to history
        if (resultJSON) {
          const newItem: HistoryItem = {
            id: Date.now().toString(),
            createdAt: Date.now(),
            topic: resultJSON.topic || resultJSON.step1?.subject || 'Unknown',
            metaphor: resultJSON,
            status: 'pending',
            generatedImage: imageUrl,
          };
          setHistory(prev => [newItem, ...prev]);
        }
      }
    clearInterval(progressInterval);
      setGenerationProgress(100);
      setGenerationStatus('Complete!');
    } catch (error) {
      clearInterval(progressInterval);
      console.error('DALL-E error:', error);
      setImageError(error instanceof Error ? error.message : 'Failed to generate image. Check console.');
      setGenerationProgress(0);
      setGenerationStatus('');
    } finally {
      setIsGeneratingImage(false);
    }
  }, [openaiKey, resultJSON]);

  // Remove black background from image
  const removeBackground = useCallback(() => {
    if (!uploadedImage) return;

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // Threshold for "black" - pixels darker than this become transparent
      const threshold = 30;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // If pixel is near-black, make it transparent
        if (r < threshold && g < threshold && b < threshold) {
          data[i + 3] = 0; // Set alpha to 0
        }
      }

      ctx.putImageData(imageData, 0, 0);
      setUploadedImage(canvas.toDataURL('image/png'));
    };
    img.src = uploadedImage;
  }, [uploadedImage]);

  // Word wrap helper function
  const wrapText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] => {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const metrics = ctx.measureText(testLine);

      if (metrics.width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) {
      lines.push(currentLine);
    }
    return lines;
  };

  // Draw custom background
  const drawBackground = (ctx: CanvasRenderingContext2D, width: number, height: number, type: string) => {
    if (type === 'custom') {
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, width, height);
    } else if (type === 'shiny') {
      const gradient = ctx.createRadialGradient(width / 2, height / 3, 0, width / 2, height / 2, width);
      gradient.addColorStop(0, '#1a1a1a');
      gradient.addColorStop(0.5, '#0a0a0a');
      gradient.addColorStop(1, '#000000');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
    } else if (type === 'metal') {
      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, '#1c1c1c');
      gradient.addColorStop(0.3, '#0f0f0f');
      gradient.addColorStop(0.5, '#1a1a1a');
      gradient.addColorStop(0.7, '#0a0a0a');
      gradient.addColorStop(1, '#141414');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
    } else if (type === 'scratched') {
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(0, 0, width, height);
      // Add scratch lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 50; i++) {
        ctx.beginPath();
        const x1 = Math.random() * width;
        const y1 = Math.random() * height;
        const angle = Math.random() * Math.PI;
        const len = 50 + Math.random() * 150;
        ctx.moveTo(x1, y1);
        ctx.lineTo(x1 + Math.cos(angle) * len, y1 + Math.sin(angle) * len);
        ctx.stroke();
      }
    }
  };

  // Helper to parse hex color
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 255, g: 255, b: 255 };
  };

  // Replace dark pixels with transparency and recolor white shapes
  const processImage = (ctx: CanvasRenderingContext2D, width: number, height: number, threshold: number, newShapeColor: string) => {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const shapeRgb = hexToRgb(newShapeColor);

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      // Check if pixel is dark enough to be considered "black"
      if (r < threshold && g < threshold && b < threshold) {
        data[i + 3] = 0; // Set alpha to 0 (transparent)
      }
      // Check if pixel is light enough to be considered "white" shape
      else if (r > 200 && g > 200 && b > 200) {
        // Preserve the brightness ratio when recoloring
        const brightness = (r + g + b) / 3 / 255;
        data[i] = Math.round(shapeRgb.r * brightness);
        data[i + 1] = Math.round(shapeRgb.g * brightness);
        data[i + 2] = Math.round(shapeRgb.b * brightness);
      }
    }
    ctx.putImageData(imageData, 0, 0);
  };

  // Render canvas with image + quote overlay (Neuronvisuals/VisualTheory style)
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !uploadedImage || !resultJSON) return null;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      // Get selected size
      const { width, height } = sizeConfigs[selectedSize];
      canvas.width = width;
      canvas.height = height;

      // Draw background first
      if (selectedBackground === 'original') {
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, width, height);
      } else {
        drawBackground(ctx, width, height, selectedBackground);
      }

      // Process and draw image
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = img.width;
      tempCanvas.height = img.height;
      const tempCtx = tempCanvas.getContext('2d');
      if (tempCtx) {
        tempCtx.drawImage(img, 0, 0);

        // Only process colors if not original mode
        if (selectedBackground !== 'original') {
          processImage(tempCtx, img.width, img.height, cleanThreshold, shapeColor);
        }

        // Calculate scaled size
        const scaledW = img.width * objectScale;
        const scaledH = img.height * objectScale;

        // Position based on objectX/objectY (percentage)
        const posX = (width * objectX / 100) - (scaledW / 2);
        const posY = (height * objectY / 100) - (scaledH / 2);

        ctx.drawImage(tempCanvas, posX, posY, scaledW, scaledH);
      }

      // Draw center guides when near center
      if (showGuides) {
        const isNearCenterX = Math.abs(objectX - 50) < 2;
        const isNearCenterY = Math.abs(objectY - 50) < 2;

        // Padding from edges (5% of canvas size)
        const padX = width * 0.05;
        const padY = height * 0.05;

        ctx.setLineDash([10, 10]);
        ctx.lineWidth = 1;

        // Vertical center line
        if (isNearCenterX) {
          ctx.strokeStyle = 'rgba(0, 255, 0, 0.8)';
          ctx.beginPath();
          ctx.moveTo(width / 2, padY);
          ctx.lineTo(width / 2, height - padY);
          ctx.stroke();
        }

        // Horizontal center line
        if (isNearCenterY) {
          ctx.strokeStyle = 'rgba(0, 255, 0, 0.8)';
          ctx.beginPath();
          ctx.moveTo(padX, height / 2);
          ctx.lineTo(width - padX, height / 2);
          ctx.stroke();
        }

        // Always show faint grid (with padding)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        // Vertical center
        ctx.beginPath();
        ctx.moveTo(width / 2, padY);
        ctx.lineTo(width / 2, height - padY);
        ctx.stroke();
        // Horizontal center
        ctx.beginPath();
        ctx.moveTo(padX, height / 2);
        ctx.lineTo(width - padX, height / 2);
        ctx.stroke();
        // Thirds
        ctx.beginPath();
        ctx.moveTo(width / 3, padY);
        ctx.lineTo(width / 3, height - padY);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(width * 2 / 3, padY);
        ctx.lineTo(width * 2 / 3, height - padY);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(padX, height / 3);
        ctx.lineTo(width - padX, height / 3);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(padX, height * 2 / 3);
        ctx.lineTo(width - padX, height * 2 / 3);
        ctx.stroke();

        ctx.setLineDash([]);
      }

      // Subtle bottom gradient - not too heavy
      const gradient = ctx.createLinearGradient(0, height * 0.4, 0, height);
      gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0.75)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // Scale font based on canvas size
      const baseSize = Math.min(width, height);
      const quoteFontSize = Math.round(baseSize * 0.032);
      const fontWeight = selectedFont === 'Bebas Neue' ? '400' : '500';

      // Top text (setup line) - smaller, more subtle
      if (showTopText && topText) {
        const topFontSize = Math.round(baseSize * 0.024);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `${fontWeight} ${topFontSize}px "${selectedFont}", sans-serif`;
        const topY = height * (topTextY / 100);
        ctx.fillText(topText, width / 2, topY);
      }

      // Quote text (bottom) - Small, elegant, refined like Neuronvisuals
      // Use custom text if set, otherwise fall back to JSON
      const line1 = quoteLine1 || resultJSON.step4_best.line1;
      const line2 = quoteLine2 || resultJSON.step4_best.line2;
      const lineHeight = quoteFontSize * 1.6;

      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Calculate text position based on slider (textPositionY is percentage)
      const textY = height * (textPositionY / 100);

      // Calculate total text height
      const totalLines = line2 ? 2 : 1;
      const totalHeight = totalLines * lineHeight;

      let currentY = textY - totalHeight / 2;

      // Draw quote lines
      ctx.font = `${fontWeight} ${quoteFontSize}px "${selectedFont}", sans-serif`;
      ctx.fillText(line1, width / 2, currentY);
      if (line2) {
        currentY += lineHeight;
        ctx.fillText(line2, width / 2, currentY);
      }
    };
    img.src = uploadedImage;
  }, [uploadedImage, resultJSON, selectedSize, objectScale, objectX, objectY, textPositionY, selectedFont, selectedBackground, bgColor, shapeColor, cleanThreshold, showGuides, topText, showTopText, topTextY, quoteLine1, quoteLine2]);

  // Re-render canvas when any setting changes
  useEffect(() => {
    if (uploadedImage && resultJSON) {
      renderCanvas();
    }
  }, [uploadedImage, resultJSON, selectedSize, objectScale, objectX, objectY, textPositionY, selectedFont, selectedBackground, bgColor, shapeColor, cleanThreshold, showGuides, renderCanvas]);

  
  // Download canvas as PNG (without guides)
  const handleDownload = useCallback(async () => {
    // Temporarily hide guides for export
    setShowGuides(false);

    // Wait for re-render
    await new Promise(resolve => setTimeout(resolve, 100));

    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = `metaphor-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();

    // Restore guides
    setShowGuides(true);
  }, []);

  return (
    <div className="app">
      <header className="header">
        <div className="header-left">
          <h1>METAPHOR<span className="accent">ENGINE</span></h1>
          <p className="subtitle">Ask Claude Code to generate a metaphor, paste the JSON here</p>
        </div>
        <div className="header-right">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className={`history-toggle ${showHistory ? 'active' : ''}`}
          >
            History ({history.length})
          </button>
        </div>
      </header>

      <main className="main">
        {/* Left Panel - Input */}
        <div className="panel left-panel">
          {!resultJSON && !rejection ? (
            <section className="section">
              {!showManualInput ? (
                <>
                  <div className="instruction-box">
                    <p><strong>In Claude Code, say:</strong></p>
                    <p className="example">"Generate a metaphor for: [your situation]"</p>
                    <p>Then click "Load from Claude" to fetch it.</p>
                  </div>

                  {parseError && (
                    <div className="error-box">
                      {parseError}
                    </div>
                  )}

                  <div className="main-actions">
                    <button onClick={loadFromClaude} className="button primary large">
                      Load from Claude
                    </button>
                    <button onClick={() => setShowManualInput(true)} className="button secondary large">
                      Add JSON Manually
                    </button>
                  </div>
                </>
              ) : (
                <>
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
                    <button
                      onClick={() => setShowManualInput(false)}
                      className="button secondary"
                    >
                      Back
                    </button>
                  </div>
                </>
              )}
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
              {resultJSON.topic && (
                <div className="result-block">
                  <h3>Topic</h3>
                  <p className="result-value topic-value">{resultJSON.topic}</p>
                </div>
              )}

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
                  {copied ? 'Copied!' : 'Copy Prompt'}
                </button>
                <button onClick={handleClear} className="button secondary">
                  New
                </button>
              </div>
            </section>
          )}
        </div>

        {/* Right Panel - Image Upload & Preview */}
        <div className="panel right-panel">
          <div className="preview-container">
            {/* Hidden file input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              style={{ display: 'none' }}
            />

            {!resultJSON ? (
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
            ) : !uploadedImage ? (
              <div className="generate-zone">
                {!openaiKey ? (
                  <div className="api-key-setup">
                    <div className="setup-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0110 0v4" />
                      </svg>
                    </div>
                    <p className="setup-title">Add OpenAI API Key</p>
                    <p className="setup-hint">~$0.04 per image with GPT Image</p>
                    <input
                      type="password"
                      value={openaiKey}
                      onChange={(e) => setOpenaiKey(e.target.value)}
                      placeholder="sk-..."
                      className="input api-key-input"
                    />
                    <a
                      href="https://platform.openai.com/api-keys"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="api-link"
                    >
                      Get API key from OpenAI
                    </a>
                  </div>
                ) : isGeneratingImage ? (
                  <div className="generating-state">
                    <div className="progress-container">
                      <div className="progress-bar" style={{ width: `${generationProgress}%` }}></div>
                    </div>
                    <p className="progress-status">{generationStatus}</p>
                    <p className="progress-percent">{Math.round(generationProgress)}%</p>
                  </div>
                ) : (
                  <div className="ready-to-generate">
                    <button onClick={generateImage} className="button primary generate-btn">
                      Generate Image
                    </button>
                    {imageError && (
                      <p className="image-error">{imageError}</p>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="canvas-preview">
                <img
                  src={uploadedImage}
                  alt="Preview"
                  className="preview-image"
                  style={{ display: 'none' }}
                />
                <canvas
                  ref={canvasRef}
                  className="preview-canvas"
                  style={{ display: 'block' }}
                />

                {/* Edit Controls */}
                <div className="edit-controls">
                  {/* Object Section */}
                  <div className="control-section">
                    <h4>Object</h4>
                    <div className="control-grid">
                      <div className="control-group">
                        <label>Scale <span className="value">{objectScale.toFixed(2)}</span></label>
                        <input
                          type="range"
                          min="0.3"
                          max="1.5"
                          step="0.05"
                          value={objectScale}
                          onChange={(e) => setObjectScale(parseFloat(e.target.value))}
                          className="slider"
                        />
                      </div>
                      <div className="control-group half">
                        <label>X <span className="value">{objectX}%</span></label>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="1"
                          value={objectX}
                          onChange={(e) => setObjectX(parseInt(e.target.value))}
                          className="slider"
                        />
                      </div>
                      <div className="control-group half">
                        <label>Y <span className="value">{objectY}%</span></label>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="1"
                          value={objectY}
                          onChange={(e) => setObjectY(parseInt(e.target.value))}
                          className="slider"
                        />
                      </div>
                    </div>
                    <div className="control-row">
                      <button onClick={() => { setObjectX(50); setObjectY(50); }} className="tool-btn">Center</button>
                      <button onClick={() => setObjectScale(1)} className="tool-btn">Reset</button>
                      <button onClick={() => setShowGuides(!showGuides)} className={`tool-btn ${showGuides ? 'active' : ''}`}>
                        Grid
                      </button>
                      <button onClick={removeBackground} className="tool-btn" title="Remove black background from image">
                        Remove BG
                      </button>
                      <button
                        onClick={() => {
                          const settings = {
                            scale: objectScale,
                            x: objectX,
                            y: objectY,
                            text: textPositionY,
                            font: selectedFont,
                            bg: selectedBackground,
                            bgColor: bgColor,
                            shapeColor: shapeColor,
                            clean: cleanThreshold
                          };
                          navigator.clipboard.writeText(JSON.stringify(settings));
                        }}
                        className="tool-btn"
                        title="Copy settings to clipboard"
                      >
                        Copy
                      </button>
                      <button onClick={savePreset} className="tool-btn" title="Save as preset">
                        Save
                      </button>
                    </div>
                    {savedPresets.length > 0 && (
                      <div className="presets-list">
                        {savedPresets.map((preset, i) => (
                          <div key={i} className="preset-item">
                            <button onClick={() => applyPreset(preset.settings)} className="preset-btn">
                              {preset.name}
                            </button>
                            <button onClick={() => deletePreset(i)} className="preset-delete">×</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Text Section */}
                  <div className="control-section">
                    <h4>Text</h4>

                    {/* Top Text (Setup line) */}
                    <div className="control-group">
                      <label>
                        <input
                          type="checkbox"
                          checked={showTopText}
                          onChange={(e) => setShowTopText(e.target.checked)}
                          style={{ marginRight: '8px' }}
                        />
                        Top Text
                      </label>
                    </div>
                    {showTopText && (
                      <>
                        <div className="control-group">
                          <input
                            type="text"
                            value={topText}
                            onChange={(e) => setTopText(e.target.value)}
                            placeholder="What it feels like:"
                            className="text-input"
                          />
                        </div>
                        <div className="control-group">
                          <label>Top Position <span className="value">{topTextY}%</span></label>
                          <input
                            type="range"
                            min="3"
                            max="30"
                            step="1"
                            value={topTextY}
                            onChange={(e) => setTopTextY(parseInt(e.target.value))}
                            className="slider"
                          />
                        </div>
                      </>
                    )}

                    {/* Bottom Text (Quote) */}
                    <div className="control-group" style={{ marginTop: '12px' }}>
                      <label>Quote Line 1</label>
                      <input
                        type="text"
                        value={quoteLine1}
                        onChange={(e) => setQuoteLine1(e.target.value)}
                        placeholder={resultJSON?.step4_best.line1 || 'Line 1...'}
                        className="text-input"
                      />
                    </div>
                    <div className="control-group">
                      <label>Quote Line 2</label>
                      <input
                        type="text"
                        value={quoteLine2}
                        onChange={(e) => setQuoteLine2(e.target.value)}
                        placeholder={resultJSON?.step4_best.line2 || 'Line 2...'}
                        className="text-input"
                      />
                    </div>
                    <div className="control-group">
                      <label>Bottom Position <span className="value">{textPositionY}%</span></label>
                      <input
                        type="range"
                        min="20"
                        max="95"
                        step="1"
                        value={textPositionY}
                        onChange={(e) => setTextPositionY(parseInt(e.target.value))}
                        className="slider"
                      />
                    </div>
                    <div className="font-selector">
                      {fontOptions.map((font) => (
                        <button
                          key={font.name}
                          onClick={() => setSelectedFont(font.name)}
                          className={`font-btn ${selectedFont === font.name ? 'active' : ''}`}
                          style={{ fontFamily: font.name }}
                        >
                          {font.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Background Section */}
                  <div className="control-section">
                    <h4>Background</h4>
                    <div className="bg-selector">
                      {backgroundOptions.map((bg) => (
                        <button
                          key={bg.id}
                          onClick={() => setSelectedBackground(bg.id)}
                          className={`bg-btn ${selectedBackground === bg.id ? 'active' : ''}`}
                        >
                          {bg.label}
                        </button>
                      ))}
                    </div>

                    {selectedBackground !== 'original' && (
                      <>
                        <div className="control-group" style={{ marginTop: '12px' }}>
                          <label>Clean <span className="value">{cleanThreshold}</span></label>
                          <input
                            type="range"
                            min="10"
                            max="80"
                            step="1"
                            value={cleanThreshold}
                            onChange={(e) => setCleanThreshold(parseInt(e.target.value))}
                            className="slider"
                          />
                        </div>
                        <div className="colors-row">
                          <div className="color-input">
                            <label>BG</label>
                            <div className="color-picker">
                              <input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)} className="color-swatch" />
                              <input type="text" value={bgColor} onChange={(e) => setBgColor(e.target.value)} className="input hex-input" />
                            </div>
                          </div>
                          <div className="color-input">
                            <label>Shape</label>
                            <div className="color-picker">
                              <input type="color" value={shapeColor} onChange={(e) => setShapeColor(e.target.value)} className="color-swatch" />
                              <input type="text" value={shapeColor} onChange={(e) => setShapeColor(e.target.value)} className="input hex-input" />
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="size-selector">
                  {(['1:1', '4:5', '9:16'] as const).map((size) => (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      className={`size-btn ${selectedSize === size ? 'active' : ''}`}
                    >
                      <span className="size-ratio">{sizeConfigs[size].label}</span>
                      <span className="size-desc">{sizeConfigs[size].desc}</span>
                    </button>
                  ))}
                </div>
                <div className="preview-actions">
                  <button onClick={handleDownload} className="button primary">
                    Download PNG
                  </button>
                  <button onClick={() => { setUploadedImage(null); generateImage(); }} className="button secondary">
                    Regenerate
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* History Panel */}
      {showHistory && (
        <div className="history-overlay" onClick={() => setShowHistory(false)}>
          <div className="history-panel" onClick={(e) => e.stopPropagation()}>
            <div className="history-header">
              <h2>Saved Metaphors</h2>
              <button onClick={() => setShowHistory(false)} className="close-btn">×</button>
            </div>
            <div className="history-list">
              {history.length === 0 ? (
                <p className="history-empty">No saved metaphors yet. Click "Save" to add one.</p>
              ) : (
                history.map((item) => (
                  <div key={item.id} className={`history-item status-${item.status}`}>
                    <div className="history-item-content" onClick={() => loadFromHistory(item)}>
                      {item.generatedImage && (
                        <img src={item.generatedImage} alt="" className="history-thumb" />
                      )}
                      <div className="history-text">
                        <p className="history-quote">
                          "{item.metaphor.step4_best.line1}
                          {item.metaphor.step4_best.line2 && ` ${item.metaphor.step4_best.line2}`}"
                        </p>
                        <p className="history-object">{item.metaphor.step2_object}</p>
                        <p className="history-date">
                          {new Date(item.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="history-actions">
                      <button
                        onClick={() => updateHistoryStatus(item.id, 'done')}
                        className={`status-btn done ${item.status === 'done' ? 'active' : ''}`}
                        title="Done"
                      >
                        ✓
                      </button>
                      <button
                        onClick={() => updateHistoryStatus(item.id, 'future')}
                        className={`status-btn future ${item.status === 'future' ? 'active' : ''}`}
                        title="Save for later"
                      >
                        ★
                      </button>
                      <button
                        onClick={() => updateHistoryStatus(item.id, 'declined')}
                        className={`status-btn declined ${item.status === 'declined' ? 'active' : ''}`}
                        title="Declined"
                      >
                        ✗
                      </button>
                      <button
                        onClick={() => deleteFromHistory(item.id)}
                        className="status-btn delete"
                        title="Delete"
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
