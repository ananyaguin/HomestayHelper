const fs = require('fs');
const path = require('path');
const ort = require('onnxruntime-web');
const { PreTrainedTokenizer } = require('@huggingface/transformers');

// Configure ONNX Runtime Web WASM paths for Node environment
const distPath = path.join(__dirname, '../node_modules/onnxruntime-web/dist') + path.sep;
ort.env.wasm.wasmPaths = distPath;
ort.env.wasm.numThreads = 1;

// FLORES-200 language codes
const FLORES = {
  en: 'eng_Latn',
  hi: 'hin_Deva',
  bn: 'ben_Beng',
  ne: 'npi_Deva'
};

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

const loadedModels = new Map();

async function loadModel(direction) {
  if (loadedModels.has(direction)) return loadedModels.get(direction);

  const modelDir = path.join(__dirname, '../public/models', `indictrans2-${direction}`);
  const srcTokJSON = JSON.parse(fs.readFileSync(path.join(modelDir, 'tokenizer_src.json'), 'utf8'));
  const tgtTokJSON = JSON.parse(fs.readFileSync(path.join(modelDir, 'tokenizer_tgt.json'), 'utf8'));
  const tokConfig = JSON.parse(fs.readFileSync(path.join(modelDir, 'tokenizer_config.json'), 'utf8'));
  const genConfig = JSON.parse(fs.readFileSync(path.join(modelDir, 'generation_config.json'), 'utf8'));
  const meta = JSON.parse(fs.readFileSync(path.join(modelDir, 'tokenizer_meta.json'), 'utf8'));

  const srcTok = new PreTrainedTokenizer(srcTokJSON, tokConfig);
  const tgtTok = new PreTrainedTokenizer(tgtTokJSON, tokConfig);

  const encSession = await ort.InferenceSession.create(
    new Uint8Array(fs.readFileSync(path.join(modelDir, 'encoder_model.onnx'))),
    {
      executionProviders: ['wasm'],
      externalData: [
        {
          path: 'encoder_model.onnx.data',
          data: new Uint8Array(fs.readFileSync(path.join(modelDir, 'encoder_model.onnx.data')))
        }
      ]
    }
  );

  const decSharedData = new Uint8Array(fs.readFileSync(path.join(modelDir, 'decoder_shared.onnx.data')));

  const decSession = await ort.InferenceSession.create(
    new Uint8Array(fs.readFileSync(path.join(modelDir, 'decoder_model.onnx'))),
    {
      executionProviders: ['wasm'],
      externalData: [
        {
          path: 'decoder_shared.onnx.data',
          data: decSharedData
        }
      ]
    }
  );

  const decPastSession = await ort.InferenceSession.create(
    new Uint8Array(fs.readFileSync(path.join(modelDir, 'decoder_with_past_model.onnx'))),
    {
      executionProviders: ['wasm'],
      externalData: [
        {
          path: 'decoder_shared.onnx.data',
          data: decSharedData
        }
      ]
    }
  );

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
  return model;
}

async function runTranslation(text, srcLangCode, tgtLangCode, model) {
  const { srcTok, tgtTok, genConfig, meta, encSession, decSession, decPastSession, numLayers } = model;

  let processedInput = text.trim();
  if (srcLangCode === 'ben_Beng') {
    processedInput = bengaliToDevanagari(processedInput);
  }

  const formattedInput = `${srcLangCode} ${tgtLangCode} ${processedInput}`;
  const encoded = srcTok(formattedInput);

  const inputIdsArray = Array.from(encoded.input_ids.data).map(x => {
    const num = Number(x);
    return num < meta.src_dict_size ? BigInt(num) : BigInt(meta.unk_id);
  });
  const attentionMaskArray = Array.from(encoded.attention_mask.data).map(x => BigInt(x));

  const seqLen = inputIdsArray.length;
  const inputIdsTensor = new ort.Tensor('int64', BigInt64Array.from(inputIdsArray), [1, seqLen]);
  const attentionMaskTensor = new ort.Tensor('int64', BigInt64Array.from(attentionMaskArray), [1, seqLen]);

  const encOut = await encSession.run({
    input_ids: inputIdsTensor,
    attention_mask: attentionMaskTensor
  });

  const decoderStartId = BigInt(genConfig.decoder_start_token_id ?? 2);
  const eosId = BigInt(genConfig.eos_token_id ?? 2);

  let decoderInputIds = new ort.Tensor('int64', new BigInt64Array([decoderStartId]), [1, 1]);
  let pastKeyValues = {};
  const generatedIds = [Number(decoderStartId)];

  for (let step = 0; step < 64; step++) {
    let decOut;
    if (step === 0) {
      decOut = await decSession.run({
        input_ids: decoderInputIds,
        encoder_hidden_states: encOut.last_hidden_state,
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
    if (BigInt(maxIdx) === eosId) break;

    decoderInputIds = new ort.Tensor('int64', new BigInt64Array([BigInt(maxIdx)]), [1, 1]);

    pastKeyValues = {};
    for (let i = 0; i < numLayers; i++) {
      pastKeyValues[`past_key_values.${i}.decoder.key`] = decOut[`present.${i}.decoder.key`];
      pastKeyValues[`past_key_values.${i}.decoder.value`] = decOut[`present.${i}.decoder.value`];
      pastKeyValues[`past_key_values.${i}.encoder.key`] = decOut[`present.${i}.encoder.key`];
      pastKeyValues[`past_key_values.${i}.encoder.value`] = decOut[`present.${i}.encoder.value`];
    }
  }

  const safeIds = generatedIds.map(id => (id < meta.tgt_dict_size ? id : meta.unk_id));
  let decodedText = tgtTok.decode(safeIds, { skip_special_tokens: true });

  if (tgtLangCode === 'ben_Beng') {
    decodedText = devanagariToBengali(decodedText);
  }

  return decodedText.trim();
}

async function translate(text, srcLang, tgtLang) {
  if (srcLang === tgtLang) return text;

  const srcFlores = FLORES[srcLang];
  const tgtFlores = FLORES[tgtLang];

  if (srcLang === 'en') {
    // en -> indic
    const model = await loadModel('en-indic');
    return await runTranslation(text, srcFlores, tgtFlores, model);
  } else if (tgtLang === 'en') {
    // indic -> en
    const model = await loadModel('indic-en');
    return await runTranslation(text, srcFlores, tgtFlores, model);
  } else {
    // indic -> indic via English pivot
    const indicEnModel = await loadModel('indic-en');
    const englishInter = await runTranslation(text, srcFlores, 'eng_Latn', indicEnModel);
    const enIndicModel = await loadModel('en-indic');
    return await runTranslation(englishInter, 'eng_Latn', tgtFlores, enIndicModel);
  }
}

async function main() {
  const languages = ['en', 'hi', 'bn', 'ne'];
  const testInputs = {
    en: 'Where is my room?',
    hi: 'मेरा कमरा कहाँ है?',
    bn: 'আমার ঘরটি কোথায়?',
    ne: 'मेरो कोठा कहाँ छ?'
  };

  console.log('=== STARTING 16-PAIR TRANSLATION MATRIX TEST ===\n');

  let passed = 0;
  let failed = 0;

  for (const src of languages) {
    for (const tgt of languages) {
      const input = testInputs[src];
      const start = Date.now();
      try {
        const output = await translate(input, src, tgt);
        const duration = ((Date.now() - start) / 1000).toFixed(2);

        // Verification checks
        const isSame = src === tgt;
        let valid = true;

        if (isSame) {
          if (output !== input) valid = false;
        } else {
          // Output must NOT be the source text
          if (output === input || !output) valid = false;
          // Must not have brackets like [नेपाली]
          if (output.startsWith('[')) valid = false;
        }

        if (valid) {
          console.log(`✓ [PASS] ${src.toUpperCase()} -> ${tgt.toUpperCase()} (${duration}s): "${input}" => "${output}"`);
          passed++;
        } else {
          console.error(`✗ [FAIL] ${src.toUpperCase()} -> ${tgt.toUpperCase()}: "${input}" => "${output}"`);
          failed++;
        }
      } catch (err) {
        console.error(`✗ [ERROR] ${src.toUpperCase()} -> ${tgt.toUpperCase()}: ${err.message}`);
        failed++;
      }
    }
  }

  console.log('\n=== TESTING ARBITRARY CONVERSATIONAL SENTENCES ===\n');
  const arbitrarySentences = [
    { src: 'en', tgt: 'hi', text: 'Can I get another towel?' },
    { src: 'en', tgt: 'ne', text: 'What time is breakfast served?' },
    { src: 'en', tgt: 'bn', text: 'I need drinking water.' },
    { src: 'hi', tgt: 'bn', text: 'क्या मुझे गर्म पानी मिल सकता है?' },
    { src: 'ne', tgt: 'hi', text: 'यहाँ वाइ-फाइको पासवर्ड के हो?' },
    { src: 'bn', tgt: 'ne', text: 'আমাদের হোমস্টেতে আপনাকে স্বাগতম।' }
  ];

  for (const item of arbitrarySentences) {
    const start = Date.now();
    try {
      const output = await translate(item.text, item.src, item.tgt);
      const duration = ((Date.now() - start) / 1000).toFixed(2);
      if (output && output !== item.text && !output.startsWith('[')) {
        console.log(`✓ [PASS] ${item.src.toUpperCase()} -> ${item.tgt.toUpperCase()} (${duration}s): "${item.text}" => "${output}"`);
        passed++;
      } else {
        console.error(`✗ [FAIL] ${item.src.toUpperCase()} -> ${item.tgt.toUpperCase()}: "${item.text}" => "${output}"`);
        failed++;
      }
    } catch (err) {
      console.error(`✗ [ERROR] ${item.src.toUpperCase()} -> ${item.tgt.toUpperCase()}: ${err.message}`);
      failed++;
    }
  }

  console.log(`\n========================================`);
  console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log(`========================================`);

  if (failed > 0) process.exit(1);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
