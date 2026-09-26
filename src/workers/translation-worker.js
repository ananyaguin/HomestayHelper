/**
 * Web Worker for Local IndicTrans2 AI Translation
 * Runs onnxruntime-web and Fast BPE Tokenizers entirely off the main UI thread.
 * Highly optimized for speed, model caching, and low CPU usage.
 */

import * as ort from 'onnxruntime-web/wasm';
import { env, PreTrainedTokenizer } from '@huggingface/transformers';

// Configure Transformers.js for offline local models and static public WASM assets
env.allowLocalModels = true;
env.allowRemoteModels = false;
env.localModelPath = '/models';
if (env.backends && env.backends.onnx && env.backends.onnx.wasm) {
  env.backends.onnx.wasm.wasmPaths = '/wasm/';
  env.backends.onnx.wasm.numThreads = 1;
}

// Configure ONNX Runtime Web for local WASM execution with conservative thread count (1-2)
ort.env.wasm.wasmPaths = '/wasm/';
ort.env.wasm.numThreads = 1;

// Supported language FLORES codes
const FLORES_CODES = {
  en: 'eng_Latn',
  hi: 'hin_Deva',
  bn: 'ben_Beng',
  ne: 'npi_Deva'
};

// Cached models map: key is direction ('en-indic' | 'indic-en')
const loadedModels = new Map();
const modelLoadPromises = new Map();
let modelLoaded = false;
let activeTranslateId = null;

/**
 * Transliterate Devanagari Unicode characters to Bengali Unicode characters
 */
function devanagariToBengali(text) {
  let res = '';
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const code = ch.charCodeAt(0);
    if (code >= 0x0901 && code <= 0x0970 && code !== 0x0964 && code !== 0x0965) {
      res += String.fromCharCode(code + 0x80);
    } else {
      res += ch;
    }
  }
  return res
    .replace(/দয\u09BCা/g, 'দয়া')
    .replace(/নিয়\u09BCে/g, 'নিয়ে')
    .replace(/য\u09BC/g, 'য়')
    .replace(/ড\u09BC/g, 'ড়')
    .replace(/ঢ\u09BC/g, 'ঢ়')
    .replace(/র\u09BC/g, 'র')
    .replace(/ব\u09BC/g, 'ব');
}

/**
 * Transliterate Bengali Unicode characters to Devanagari Unicode characters
 */
function bengaliToDevanagari(text) {
  let res = '';
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const code = ch.charCodeAt(0);
    if (code >= 0x0981 && code <= 0x09F0 && code !== 0x09E4 && code !== 0x09E5) {
      res += String.fromCharCode(code - 0x80);
    } else {
      res += ch;
    }
  }
  return res
    .replace(/য/g, 'य')
    .replace(/য়/g, 'य़')
    .replace(/ड़/g, 'ड़')
    .replace(/ढ़/g, 'ढ़')
    .replace(/র/g, 'र');
}

/**
 * Release currently loaded models from memory
 */
function releaseAllModels() {
  for (const [direction, model] of loadedModels.entries()) {
    try {
      if (model.encSession) model.encSession.release?.();
      if (model.decSession) model.decSession.release?.();
      if (model.decPastSession) model.decPastSession.release?.();
    } catch (e) {
      console.warn('Error releasing model session:', e);
    }
  }
  loadedModels.clear();
  modelLoadPromises.clear();
  modelLoaded = false;
}

/**
 * Load direction model bundle (en-indic or indic-en)
 * Loads ONCE and caches the model/session for all subsequent translations.
 * Language direction changes reuse already-loaded models without reloading.
 */
async function loadDirectionModel(direction, onProgress = null) {
  // Fast path: reuse already loaded model session
  if (loadedModels.has(direction)) {
    return loadedModels.get(direction);
  }

  // Deduplicate ongoing load
  if (modelLoadPromises.has(direction)) {
    return modelLoadPromises.get(direction);
  }

  const loadStartTime = performance.now();

  const loadPromise = (async () => {
    try {
      const modelBase = `/models/indictrans2-${direction}`;

      if (onProgress) onProgress({ status: 'LOADING', progress: 10, message: `Loading ${direction} model files...` });

      // Fetch all model resources concurrently to eliminate network waterfalls
      let [
        [srcTokJSON, tgtTokJSON, tokConfig, genConfig, meta],
        [encModelBuffer, encDataBuffer],
        [decModelBuffer, decPastModelBuffer, decSharedBuffer]
      ] = await Promise.all([
        Promise.all([
          fetch(`${modelBase}/tokenizer_src.json`).then(r => {
            if (!r.ok) throw new Error(`Model not installed (${r.status})`);
            return r.json();
          }),
          fetch(`${modelBase}/tokenizer_tgt.json`).then(r => r.json()),
          fetch(`${modelBase}/tokenizer_config.json`).then(r => r.json()),
          fetch(`${modelBase}/generation_config.json`).then(r => r.json()),
          fetch(`${modelBase}/tokenizer_meta.json`).then(r => r.json())
        ]),
        Promise.all([
          fetch(`${modelBase}/encoder_model.onnx`).then(r => r.arrayBuffer()),
          fetch(`${modelBase}/encoder_model.onnx.data`).then(r => r.arrayBuffer())
        ]),
        Promise.all([
          fetch(`${modelBase}/decoder_model.onnx`).then(r => r.arrayBuffer()),
          fetch(`${modelBase}/decoder_with_past_model.onnx`).then(r => r.arrayBuffer()),
          fetch(`${modelBase}/decoder_shared.onnx.data`).then(r => r.arrayBuffer())
        ])
      ]);

      if (onProgress) onProgress({ status: 'LOADING', progress: 40, message: `Initializing tokenizers...` });
      const srcTok = new PreTrainedTokenizer(srcTokJSON, tokConfig);
      const tgtTok = new PreTrainedTokenizer(tgtTokJSON, tokConfig);

      const sessionOptions = {
        executionProviders: ['wasm'],
        graphOptimizationLevel: 'all',
        enableCpuMemArena: true,
        enableMemPattern: true,
        executionMode: 'sequential'
      };

      if (onProgress) onProgress({ status: 'LOADING', progress: 60, message: `Initializing neural encoder...` });
      const encSession = await ort.InferenceSession.create(new Uint8Array(encModelBuffer), {
        ...sessionOptions,
        externalData: [
          {
            path: 'encoder_model.onnx.data',
            data: new Uint8Array(encDataBuffer)
          }
        ]
      });

      if (onProgress) onProgress({ status: 'LOADING', progress: 80, message: `Initializing neural decoder...` });
      let decSharedUint8 = new Uint8Array(decSharedBuffer);

      const decSession = await ort.InferenceSession.create(new Uint8Array(decModelBuffer), {
        ...sessionOptions,
        externalData: [
          {
            path: 'decoder_shared.onnx.data',
            data: decSharedUint8
          }
        ]
      });

      if (onProgress) onProgress({ status: 'LOADING', progress: 95, message: `Initializing KV-cache decoder...` });
      const decPastSession = await ort.InferenceSession.create(new Uint8Array(decPastModelBuffer), {
        ...sessionOptions,
        externalData: [
          {
            path: 'decoder_shared.onnx.data',
            data: decSharedUint8
          }
        ]
      });

      // Release large raw buffers from JS memory immediately to avoid RAM pressure
      encModelBuffer = null;
      encDataBuffer = null;
      decModelBuffer = null;
      decPastModelBuffer = null;
      decSharedBuffer = null;
      decSharedUint8 = null;

      const numLayers = (decSession.outputNames.length - 1) / 4;

      const model = {
        direction,
        srcTok,
        tgtTok,
        genConfig,
        meta,
        encSession,
        decSession,
        decPastSession,
        numLayers
      };

      loadedModels.set(direction, model);
      modelLoaded = true;
      modelLoadPromises.delete(direction);

      const loadDuration = ((performance.now() - loadStartTime) / 1000).toFixed(1);
      // Performance log: timing only, no user text
      console.log(`[Translator] Model loaded in ${loadDuration}s`);

      if (onProgress) onProgress({ status: 'READY', progress: 100, message: `Local AI Model Ready (${direction})` });
      return model;
    } catch (err) {
      modelLoadPromises.delete(direction);
      throw err;
    }
  })();

  modelLoadPromises.set(direction, loadPromise);
  return loadPromise;
}


/**
 * Execute translation with greedy decoding loop and cancellation check
 */
async function runTranslation(text, srcLangCode, tgtLangCode, model, requestId) {
  const transStartTime = performance.now();
  const { srcTok, tgtTok, genConfig, meta, encSession, decSession, decPastSession, numLayers } = model;

  let processedInput = text.trim();
  if (srcLangCode === 'ben_Beng') {
    processedInput = bengaliToDevanagari(processedInput);
  }

  const formattedInput = `${srcLangCode} ${tgtLangCode} ${processedInput}`;

  // Tokenize source sentence
  const encoded = srcTok(formattedInput);
  const inputIdsArray = Array.from(encoded.input_ids.data).map(x => {
    const num = Number(x);
    return num < meta.src_dict_size ? BigInt(num) : BigInt(meta.unk_id);
  });
  const attentionMaskArray = Array.from(encoded.attention_mask.data).map(x => BigInt(x));

  const seqLen = inputIdsArray.length;
  const inputIdsTensor = new ort.Tensor('int64', BigInt64Array.from(inputIdsArray), [1, seqLen]);
  const attentionMaskTensor = new ort.Tensor('int64', BigInt64Array.from(attentionMaskArray), [1, seqLen]);

  // Run Encoder
  const encOut = await encSession.run({
    input_ids: inputIdsTensor,
    attention_mask: attentionMaskTensor
  });
  const lastHiddenState = encOut.last_hidden_state;

  const decoderStartId = BigInt(genConfig.decoder_start_token_id ?? 2);
  const eosId = BigInt(genConfig.eos_token_id ?? 2);

  let decoderInputIds = new ort.Tensor('int64', new BigInt64Array([decoderStartId]), [1, 1]);
  let pastKeyValues = {};
  const generatedIds = [Number(decoderStartId)];

  // Greedy Decoding Loop capped at 64 tokens for short conversational homestay sentences
  const maxTokens = 64;
  for (let step = 0; step < maxTokens; step++) {
    // Check if a newer request arrived
    if (activeTranslateId !== requestId) {
      throw new Error('Translation aborted: superseded by newer request');
    }

    let decOut;
    if (step === 0) {
      decOut = await decSession.run({
        input_ids: decoderInputIds,
        encoder_hidden_states: lastHiddenState,
        encoder_attention_mask: attentionMaskTensor
      });
    } else {
      decOut = await decPastSession.run({
        input_ids: decoderInputIds,
        encoder_attention_mask: attentionMaskTensor,
        ...pastKeyValues
      });
    }

    const logitsTensor = decOut.logits;
    const vocabSize = logitsTensor.dims[2];
    const logitsData = logitsTensor.data;
    const offset = (logitsTensor.dims[1] - 1) * vocabSize;

    let maxVal = -Infinity;
    let maxIdx = 0;
    for (let v = 0; v < vocabSize; v++) {
      const val = logitsData[offset + v];
      if (val > maxVal) {
        maxVal = val;
        maxIdx = v;
      }
    }

    generatedIds.push(maxIdx);
    if (BigInt(maxIdx) === eosId) {
      break;
    }

    decoderInputIds = new ort.Tensor('int64', new BigInt64Array([BigInt(maxIdx)]), [1, 1]);

    pastKeyValues = {};
    for (let i = 0; i < numLayers; i++) {
      pastKeyValues[`past_key_values.${i}.decoder.key`] = decOut[`present.${i}.decoder.key`];
      pastKeyValues[`past_key_values.${i}.decoder.value`] = decOut[`present.${i}.decoder.value`];
      pastKeyValues[`past_key_values.${i}.encoder.key`] = decOut[`present.${i}.encoder.key`];
      pastKeyValues[`past_key_values.${i}.encoder.value`] = decOut[`present.${i}.encoder.value`];
    }
  }

  // Decode tokens to target string
  const safeIds = generatedIds.map(id => id < meta.tgt_dict_size ? id : meta.unk_id);
  let decodedText = tgtTok.decode(safeIds, { skip_special_tokens: true });

  // Postprocess transliteration for Bengali
  if (tgtLangCode === 'ben_Beng') {
    decodedText = devanagariToBengali(decodedText);
  }

  const transDuration = ((performance.now() - transStartTime) / 1000).toFixed(1);
  // Performance log: timing only, no user text
  console.log(`[Translator] Translation completed in ${transDuration}s`);

  return decodedText.trim();
}

// Handle messages from TranslationService
self.onmessage = async (event) => {
  const { id, type, action, text, sourceLanguage, targetLanguage } = event.data || {};
  const msgType = type || action;

  switch (msgType) {
    case 'CHECK_STATUS':
    case 'status': {
      self.postMessage({
        id,
        type: 'status',
        status: modelLoaded ? 'READY' : 'UNAVAILABLE',
        message: modelLoaded ? 'AI Offline Ready (Cached)' : 'Local AI translation ready.'
      });
      break;
    }

    case 'TRANSLATE':
    case 'translate': {
      activeTranslateId = id;
      const srcFlores = FLORES_CODES[sourceLanguage] || sourceLanguage;
      const tgtFlores = FLORES_CODES[targetLanguage] || targetLanguage;

      if (!text || !text.trim()) {
        self.postMessage({
          id,
          type: 'error',
          success: false,
          error: 'Input text is empty'
        });
        return;
      }

      if (srcFlores === tgtFlores) {
        self.postMessage({
          id,
          type: 'result',
          success: true,
          translatedText: text.trim()
        });
        return;
      }

      try {
        let translatedText;

        if (srcFlores === 'eng_Latn') {
          // 1. English -> Indic (Hindi, Bengali, Nepali)
          const isAlreadyLoaded = loadedModels.has('en-indic');
          if (!isAlreadyLoaded) {
            self.postMessage({
              id,
              type: 'status',
              status: 'LOADING',
              message: 'Initializing local English to Indic model...'
            });
          }

          const model = await loadDirectionModel('en-indic', (progressState) => {
            self.postMessage({
              id,
              type: 'status',
              ...progressState
            });
          });

          if (activeTranslateId !== id) return;

          self.postMessage({
            id,
            type: 'status',
            status: 'TRANSLATING',
            message: 'Translating...'
          });

          translatedText = await runTranslation(text, srcFlores, tgtFlores, model, id);
        } else if (tgtFlores === 'eng_Latn') {
          // 2. Indic (Hindi, Bengali, Nepali) -> English
          const isAlreadyLoaded = loadedModels.has('indic-en');
          if (!isAlreadyLoaded) {
            self.postMessage({
              id,
              type: 'status',
              status: 'LOADING',
              message: 'Initializing local Indic to English model...'
            });
          }

          const model = await loadDirectionModel('indic-en', (progressState) => {
            self.postMessage({
              id,
              type: 'status',
              ...progressState
            });
          });

          if (activeTranslateId !== id) return;

          self.postMessage({
            id,
            type: 'status',
            status: 'TRANSLATING',
            message: 'Translating...'
          });

          translatedText = await runTranslation(text, srcFlores, tgtFlores, model, id);
        } else {
          // 3. Indic -> Indic (e.g. Hindi <-> Bengali, Hindi <-> Nepali, Bengali <-> Nepali)
          // Step 1: Translate Source Indic -> English
          const isAlreadyLoadedIndicEn = loadedModels.has('indic-en');
          if (!isAlreadyLoadedIndicEn) {
            self.postMessage({
              id,
              type: 'status',
              status: 'LOADING',
              message: 'Initializing Indic to English model...'
            });
          }

          const modelIndicEn = await loadDirectionModel('indic-en', (progressState) => {
            self.postMessage({
              id,
              type: 'status',
              ...progressState
            });
          });

          if (activeTranslateId !== id) return;

          self.postMessage({
            id,
            type: 'status',
            status: 'TRANSLATING',
            message: 'Translating source to English...'
          });

          const intermediateEnglish = await runTranslation(text, srcFlores, 'eng_Latn', modelIndicEn, id);

          if (activeTranslateId !== id) return;

          // Step 2: Translate English -> Target Indic
          const isAlreadyLoadedEnIndic = loadedModels.has('en-indic');
          if (!isAlreadyLoadedEnIndic) {
            self.postMessage({
              id,
              type: 'status',
              status: 'LOADING',
              message: 'Initializing English to Indic model...'
            });
          }

          const modelEnIndic = await loadDirectionModel('en-indic', (progressState) => {
            self.postMessage({
              id,
              type: 'status',
              ...progressState
            });
          });

          if (activeTranslateId !== id) return;

          self.postMessage({
            id,
            type: 'status',
            status: 'TRANSLATING',
            message: 'Translating to target language...'
          });

          translatedText = await runTranslation(intermediateEnglish, 'eng_Latn', tgtFlores, modelEnIndic, id);
        }

        if (activeTranslateId !== id) {
          return; // Superseded
        }

        self.postMessage({
          id,
          type: 'result',
          success: true,
          translatedText
        });
      } catch (err) {
        if (activeTranslateId !== id) {
          return; // Ignore errors for superseded requests
        }
        console.error('Translation error in worker:', err);
        const errMsg = err.message?.includes('Model not installed') || err.message?.includes('404')
          ? 'Local translation model is not installed.'
          : (err.message || 'Translation failed');

        self.postMessage({
          id,
          type: 'error',
          success: false,
          error: errMsg
        });
      }
      break;
    }

    case 'CANCEL':
    case 'cancel':
    case 'ABORT':
    case 'abort': {
      activeTranslateId = null;
      break;
    }

    case 'RELEASE':
    case 'release': {
      releaseAllModels();
      self.postMessage({
        id,
        type: 'status',
        status: 'UNAVAILABLE',
        message: 'Models unloaded.'
      });
      break;
    }

    default:
      self.postMessage({
        id,
        type: 'error',
        success: false,
        error: `Unknown message type: ${msgType}`
      });
      break;
  }
};
