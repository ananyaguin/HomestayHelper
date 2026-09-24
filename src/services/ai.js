/**
 * On-Device Gemma AI Service for Homestay Helper
 * Connects directly to local Ollama runtime running Gemma 4 E2B (gemma4:e4b)
 * 100% Offline, Zero Cloud APIs.
 */

const MODEL_NAME = 'gemma4:e4b';

class HomestayAI {
  constructor() {
    this.modelName = MODEL_NAME;
    this.status = 'checking'; // 'checking' | 'ready' | 'generating' | 'offline' | 'unavailable' | 'error'
    this.statusListeners = new Set();
    this.lastError = null;
  }

  /**
   * Subscribe to AI engine status updates
   */
  subscribeStatus(listener) {
    this.statusListeners.add(listener);
    listener(this.status, this.lastError);
    return () => this.statusListeners.delete(listener);
  }

  _setStatus(status, error = null) {
    this.status = status;
    this.lastError = error;
    this.statusListeners.forEach((fn) => {
      try {
        fn(status, error);
      } catch (err) {
        console.error('[AI] Error in status listener:', err);
      }
    });
  }

  /**
   * Tries to fetch from Vite proxy first, falling back to direct localhost URL if needed
   */
  async _fetchOllama(endpoint, options = {}) {
    const urls = [
      `/api/ollama${endpoint}`,
      `http://127.0.0.1:11434${endpoint}`
    ];

    let lastFetchError = null;
    for (const url of urls) {
      try {
        const res = await fetch(url, options);
        if (res.ok) {
          return res;
        }
      } catch (err) {
        lastFetchError = err;
      }
    }
    throw lastFetchError || new Error(`Failed to reach Ollama endpoint ${endpoint}`);
  }

  /**
   * Checks whether Ollama is active and if the gemma4:e4b model is available locally.
   * Returns: 'ready' | 'offline' | 'unavailable'
   */
  async checkEngineStatus() {
    try {
      this._setStatus(this.status === 'generating' ? 'generating' : 'checking');
      const res = await this._fetchOllama('/api/tags', { method: 'GET' });
      const data = await res.json();
      
      const models = data.models || [];
      const hasGemma = models.some((m) => {
        const name = (m.name || m.model || '').toLowerCase();
        return name === MODEL_NAME || name.startsWith('gemma4:e4b');
      });

      if (hasGemma) {
        this._setStatus('ready');
        return 'ready';
      } else {
        const err = `Ollama is running, but model "${MODEL_NAME}" is missing.`;
        this._setStatus('unavailable', err);
        return 'unavailable';
      }
    } catch (err) {
      const errMsg = 'Ollama is offline or unreachable on http://127.0.0.1:11434';
      this._setStatus('offline', errMsg);
      return 'offline';
    }
  }

  /**
   * Builds the strict, grounded listing generation prompt for Gemma
   */
  _buildPrompt(profile) {
    const {
      name = '',
      hostName = '',
      village = '',
      roomType = 'attached_bath',
      roomCount = 1,
      amenities = []
    } = profile;

    const roomTypeLabel = {
      attached_bath: 'Standard Attached Bath Room',
      shared_bath: 'Traditional Shared Bath Room',
      family_suite: 'Family Suite (4 Bed)'
    }[roomType] || roomType;

    // Format amenities list - map 'Geyser facilities' to 'Bathroom with Geyser'
    const formattedAmenities = amenities.map((a) => {
      if (a === 'Geyser facilities' || a === 'Hot Bucket Water') {
        return 'Bathroom with Geyser';
      }
      return a;
    });

    const amenitiesList = formattedAmenities.length > 0
      ? formattedAmenities.join(', ')
      : 'Basic authentic hill hospitality';

    return `You are a homestay listing copywriter. Create an attractive, authentic 3-paragraph homestay listing in English and a matching 3-paragraph Hindi version based ONLY on the verified details below.

Verified Homestay Profile:
- Homestay Name: ${name || 'Village Homestay'}
- Host Name(s): ${hostName || 'Local Host Family'}
- Village / Location: ${village || 'Darjeeling Hills'}
- Room Category: ${roomTypeLabel} (${roomCount} room(s) available)
- Verified Amenities: ${amenitiesList}

Structure for both languages (approximately 120-180 words each, formatted as 3 distinct paragraphs separated by double linebreaks):
Paragraph 1: Welcome guests to ${name || 'the homestay'} in ${village || 'the village'}, hosted by ${hostName || 'the host family'}.
Paragraph 2: Highlight the ${roomTypeLabel} accommodation, room availability, and verified amenities (${amenitiesList}).
Paragraph 3: Warm closing inviting travelers for a memorable, authentic stay.

Strict Constraints:
1. Use ONLY the verified details above. Never invent unlisted amenities, facilities, views, transport, prices, or distances.
2. If "Bathroom with Geyser" is in the verified amenities, mention "Bathroom with Geyser" (NEVER mention hot bucket water).
3. Do NOT use bullet points or lists. Use 3 natural paragraphs.
4. Output MUST be a valid JSON object with keys "english" and "hindi".

JSON Output:
{
  "english": "<3 paragraphs separated by \\n\\n>",
  "hindi": "<3 paragraphs separated by \\n\\n>"
}`;
  }

  /**
   * Parses JSON response or falls back to text extraction
   */
  _parseResponse(rawResponse) {
    let clean = (rawResponse || '').replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

    // Strip markdown code fences if present (e.g. ```json ... ```)
    clean = clean.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

    try {
      const parsed = JSON.parse(clean);
      if (parsed.english || parsed.hindi) {
        return {
          en: (parsed.english || '').trim(),
          hi: (parsed.hindi || '').trim()
        };
      }
    } catch (e) {
      console.warn('[AI] JSON parse failed, using fallback extractor:', e);
    }

    // Fallback regex extraction if JSON had trailing characters
    const enMatch = clean.match(/"english"\s*:\s*"([\s\S]*?)(?=",\s*"hindi"|"\s*\})/i);
    const hiMatch = clean.match(/"hindi"\s*:\s*"([\s\S]*?)(?="\s*\})/i);

    let en = enMatch ? enMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"').trim() : '';
    let hi = hiMatch ? hiMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"').trim() : '';

    if (!en && !hi) {
      en = clean;
    }

    return { en, hi };
  }

  /**
   * Generates natural language bilingual homestay listing text in a single optimized pass.
   * 
   * @param {Object} profile - Homestay profile data
   * @returns {Promise<{ en: string, hi: string }>} Generated bilingual listing object
   */
  async generateListingText(profile) {
    const prompt = this._buildPrompt(profile);
    this._setStatus('generating');

    try {
      const payload = {
        model: MODEL_NAME,
        prompt: prompt,
        format: 'json',
        stream: false,
        options: {
          temperature: 0.3,
          num_predict: 750
        }
      };

      const res = await this._fetchOllama('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      const rawResponse = data.response || '';

      const { en, hi } = this._parseResponse(rawResponse);

      if (!en && !hi) {
        throw new Error('Gemma returned an empty response.');
      }

      this._setStatus('ready');
      return { en, hi };
    } catch (err) {
      console.error('[AI] Gemma generation failed:', err);
      const isConnectionErr = err.message && (err.message.includes('fetch') || err.message.includes('reach'));
      const statusToSet = isConnectionErr ? 'offline' : 'error';
      this._setStatus(statusToSet, err.message);
      throw err;
    }
  }
}

export const homestayAI = new HomestayAI();
export default homestayAI;
