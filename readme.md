# Homestay Helper - Garden Villages

An offline-first Progressive Web App (PWA) designed to help first-time homestay hosts in tea-garden villages manage guests, bookings, finances, communication, listings, and daily hosting tasks with minimal internet connectivity.

The application is designed for low-end devices and focuses on local data storage, offline usability, multilingual communication, and on-device AI assistance.

---

## Overview

Homestay Helper provides a simple digital toolkit for homestay hosts who may have limited connectivity or no data connection during parts of their daily operations.

The application combines:

- Guest communication and multilingual translation
- Speech-to-text and text-to-speech support
- Guest bookings and room management
- Income and expense tracking
- CSV ledger export
- AI-assisted homestay listing generation
- Deterministic pricing recommendations
- Host readiness checklist
- Offline-first PWA functionality
- Local browser storage
- Local AI translation
- Local Gemma-based listing generation

The application is built to continue providing its core functionality even when the internet is unavailable.

---

## Key Features

### 1. Guest Communicator

A multilingual communication tool designed for communication between homestay hosts and guests.

Supported languages include:

- English
- Hindi
- Bengali
- Nepali

Features include:

- Source and target language selection
- Language swapping
- Text translation
- Copy translated text
- Clear input/output
- Text-to-speech
- Speech-to-text
- Quick hospitality phrases
- Offline translation using a locally available translation model

The translator uses an on-device IndicTrans2-based model through ONNX Runtime and Transformers.js.

No translation request needs to be sent to a cloud translation service.

---

### 2. Bookings and Cash Ledger

A simple management system for maintaining guest bookings and financial records.

Hosts can:

- Add new guest bookings
- Store guest details
- Record check-in and check-out information
- Assign rooms
- Track booking amounts
- Record income
- Record expenses
- View total income
- View total expenses
- View current cash in hand
- View active guests
- Export the ledger as CSV

The data is stored locally using IndexedDB.

This allows the ledger to remain available even without an internet connection.

---

### 3. AI Listing

The AI Listing feature helps hosts create a professional homestay listing without requiring them to write the entire description themselves.

The host provides information such as:

- Homestay name
- Host name
- Village/location
- Room category
- Number of available rooms
- Amenities

The application then generates:

- English homestay listing
- Hindi homestay listing

The generated listing is based only on the information provided by the host.

The current demonstration uses Gemma 4 E2B through a locally running Ollama instance.

The AI integration is local and does not send the listing request to a cloud AI service.

---

### 4. Recommended Pricing

The application provides a separate deterministic pricing calculator.

Pricing is calculated using predefined rules based on:

- Room category
- Number of amenities
- Season

The pricing calculator is intentionally separated from the AI generation system.

This means the AI model does not decide the recommended price.

The purpose is to keep pricing predictable, explainable, and consistent.

---

### 5. Host Readiness Checklist

A dynamic checklist helps hosts prepare their homestay before receiving guests.

Hosts can:

- Mark tasks as completed
- Unmark completed tasks
- Add new tasks
- Delete tasks
- Create additional checklist categories
- Delete custom categories
- Track overall completion progress

Checklist data is persisted locally so that progress is retained between sessions.

---

### 6. Offline-First PWA

Homestay Helper is implemented as a Progressive Web App.

The PWA provides:

- Installable application experience
- Standalone application window
- Service Worker
- Offline application shell
- Local data persistence
- Cached application resources
- Mobile-friendly interface
- PWA manifest
- Application icons

Once installed, the application can be launched from the device's home screen or application launcher.

The PWA does not require a traditional native Android APK.

---

## Technology Stack

### Frontend

- React
- JSX
- Vite
- Tailwind CSS
- Lucide React

### Local Storage

- IndexedDB
- LocalStorage

IndexedDB is used for structured application data such as bookings and financial records.

LocalStorage is used for lightweight persistent application state such as checklist information where appropriate.

### AI and Machine Learning

#### Translation

- IndicTrans2
- ONNX
- ONNX Runtime Web
- Transformers.js
- Web Worker

The translation model runs locally in the browser.

#### Listing Generation

- Gemma 4 E2B
- Ollama
- Local HTTP API

The current desktop demonstration runs Gemma locally through Ollama.

### Browser APIs

The application uses browser capabilities including:

- Web Speech API
- Speech Recognition
- Speech Synthesis
- IndexedDB
- Service Worker API
- Cache Storage API
- Web Share API
- PWA installation APIs

---

## Project Structure

```text
homestayhelper/
│
├── public/
│   ├── icons/
│   │   ├── icon-192.png
│   │   └── icon-512.png
│   │
│   ├── models/
│   │   ├── indictrans2-en-indic-...
│   │   └── indictrans2-indic-en-...
│   │
│   ├── wasm/
│   │   └── ONNX Runtime WebAssembly files
│   │
│   ├── manifest.json
│   └── sw.js
│
├── src/
│   ├── components/
│   │   ├── BookingsLedger.jsx
│   │   ├── GuestCommunicator.jsx
│   │   ├── HostReadiness.jsx
│   │   ├── ListingPricing.jsx
│   │   └── OfflineTranslator.jsx
│   │
│   ├── data/
│   │   ├── checklist.js
│   │   └── phrases.js
│   │
│   ├── services/
│   │   ├── ai.js
│   │   ├── db.js
│   │   ├── pricingCalculator.js
│   │   ├── share.js
│   │   ├── speechRecognition.js
│   │   ├── translation.js
│   │   └── tts.js
│   │
│   ├── workers/
│   │   └── translation-worker.js
│   │
│   ├── App.jsx
│   ├── index.css
│   └── main.jsx
│
├── index.html
├── package.json
├── package-lock.json
├── vite.config.js
└── .gitignore