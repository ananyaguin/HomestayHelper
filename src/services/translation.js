/**
 * Translation Service
 * Communicates with Web Worker for local IndicTrans2 AI translation.
 * Keeps all model-loading and worker coordination outside of React UI components.
 * Manages request lifecycle and cancels outdated pending requests.
 */

class TranslationService {
  constructor() {
    this.worker = null;
    this.pendingRequests = new Map();
    this.requestIdCounter = 0;
    this.statusListeners = new Set();
    this.currentStatus = {
      status: 'UNAVAILABLE',
      message: 'Local AI translation ready to load on demand.'
    };
    this.refCount = 0;
  }

  acquire() {
    this.refCount++;
    if (!this.worker) {
      this.initWorker();
    }
  }

  release() {
    this.refCount = Math.max(0, this.refCount - 1);
    if (this.refCount === 0) {
      this.cancelPendingRequests();
      if (this.worker) {
        this.worker.postMessage({ type: 'CANCEL' });
      }
    }
  }

  initWorker() {
    if (typeof window === 'undefined') return;
    if (this.worker) return; // Keep single worker alive for reuse

    try {
      this.worker = new Worker(
        new URL('../workers/translation-worker.js', import.meta.url),
        { type: 'module' }
      );

      this.worker.onmessage = (e) => {
        const { id, type, action, status, message, progress, success, error, translatedText } = e.data || {};
        const msgType = type || action;

        if (msgType === 'status' || status) {
          this.currentStatus = {
            status: status || this.currentStatus.status,
            message: message || this.currentStatus.message,
            progress
          };
          this.notifyStatusListeners();
        }

        if (id && this.pendingRequests.has(id)) {
          if (msgType === 'result' || success === true) {
            const { resolve } = this.pendingRequests.get(id);
            this.pendingRequests.delete(id);
            resolve(translatedText);
          } else if (msgType === 'error' || success === false) {
            const { reject } = this.pendingRequests.get(id);
            this.pendingRequests.delete(id);
            reject(new Error(error || 'Translation request failed'));
          }
        }
      };

      this.worker.onerror = (err) => {
        console.error('Translation Worker Error:', err);
        this.currentStatus = {
          status: 'UNAVAILABLE',
          message: 'Local AI translation worker encountered an error.'
        };
        this.notifyStatusListeners();
      };

      // Check initial status
      this.checkStatus();
    } catch (err) {
      console.warn('Failed to initialize Translation Worker:', err);
      this.currentStatus = {
        status: 'UNAVAILABLE',
        message: 'Web Worker not supported or failed to initialize.'
      };
    }
  }

  checkStatus() {
    if (!this.worker) return;
    const id = ++this.requestIdCounter;
    this.worker.postMessage({
      id,
      type: 'CHECK_STATUS'
    });
  }

  onStatusChange(callback) {
    this.statusListeners.add(callback);
    callback(this.currentStatus);
    return () => this.statusListeners.delete(callback);
  }

  notifyStatusListeners() {
    this.statusListeners.forEach((callback) => {
      try {
        callback(this.currentStatus);
      } catch (err) {
        console.error('Status listener error:', err);
      }
    });
  }

  cancelPendingRequests() {
    for (const [id, { reject }] of this.pendingRequests.entries()) {
      try {
        reject(new Error('Outdated translation request cancelled.'));
      } catch (e) {
        // Ignore
      }
    }
    this.pendingRequests.clear();
  }

  /**
   * Main translation method
   * Ensures only the latest request resolves and cancels outdated pending requests.
   * @param {string} text - Input text to translate
   * @param {string} sourceLanguage - 'en' | 'hi' | 'bn' | 'ne'
   * @param {string} targetLanguage - 'en' | 'hi' | 'bn' | 'ne'
   * @returns {Promise<string>} Translated text
   */
  async translateText(text, sourceLanguage, targetLanguage) {
    if (!text || !text.trim()) {
      throw new Error('Input text is empty');
    }

    if (sourceLanguage === targetLanguage) {
      return text.trim();
    }

    // If both source and target are Indic languages (e.g. hi -> bn, ne -> hi),
    // pivot seamlessly via English (Indic -> EN -> Indic) using existing local models
    if (sourceLanguage !== 'en' && targetLanguage !== 'en') {
      const intermediateEnglish = await this.translateText(text, sourceLanguage, 'en');
      return await this.translateText(intermediateEnglish, 'en', targetLanguage);
    }

    if (!this.worker) {
      this.initWorker();
    }

    if (!this.worker) {
      throw new Error('Local AI translation model is not available yet.');
    }

    // Safely cancel previous pending requests so only latest runs
    this.cancelPendingRequests();

    return new Promise((resolve, reject) => {
      const id = ++this.requestIdCounter;
      this.pendingRequests.set(id, { resolve, reject });

      this.worker.postMessage({
        id,
        type: 'TRANSLATE',
        text: text.trim(),
        sourceLanguage,
        targetLanguage
      });
    });
  }

  releaseModel() {
    if (!this.worker) return;
    this.worker.postMessage({
      type: 'RELEASE'
    });
  }

  terminate() {
    this.cancelPendingRequests();
    if (this.worker) {
      try {
        this.worker.terminate();
      } catch (e) {
        // Ignore
      }
      this.worker = null;
    }
  }
}

export const translationService = new TranslationService();
