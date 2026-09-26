/**
 * Central Hospitality Phrase Data for Homestay Helper
 * Structured for offline use and backend API serving
 */

const PHRASE_CATEGORIES = [
  {
    id: "welcome",
    name: "Welcome",
    subtitle: "Guest greetings",
    icon: "Sparkles",
    color: "emerald"
  },
  {
    id: "food-tea",
    name: "Food & Tea",
    subtitle: "Tea, meals & dining",
    icon: "Utensils",
    color: "amber"
  },
  {
    id: "room",
    name: "Room",
    subtitle: "Stay comfort & supplies",
    icon: "BedDouble",
    color: "sky"
  },
  {
    id: "directions",
    name: "Directions",
    subtitle: "Wayfinding & transport",
    icon: "Compass",
    color: "teal"
  },
  {
    id: "payment",
    name: "Payment",
    subtitle: "Rates, UPI & billing",
    icon: "Banknote",
    color: "emerald"
  },
  {
    id: "local-experience",
    name: "Local Experience",
    subtitle: "Sightseeing & culture",
    icon: "Mountain",
    color: "indigo"
  },
  {
    id: "emergency",
    name: "Emergency",
    subtitle: "Medical & assistance",
    icon: "AlertTriangle",
    color: "rose"
  }
];

const HOMESTAY_PHRASES = [
  // --- WELCOME ---
  {
    id: "welcome-01",
    category: "Welcome",
    categoryId: "welcome",
    english: "Welcome to our homestay.",
    hindi: "हमारे होमस्टे में आपका स्वागत है।",
    bengali: "আমাদের হোমস্টেতে আপনাকে স্বাগতম।",
    nepali: "हाम्रो होमस्टेमा यहाँलाई स्वागत छ।",
    en: "Welcome to our homestay.",
    hi: "हमारे होमस्टे में आपका स्वागत है।",
    bn: "আমাদের হোমস্টেতে আপনাকে স্বাগতম।",
    ne: "हाम्रो होमस्टेमा यहाँलाई स्वागत छ।"
  },
  {
    id: "welcome-02",
    category: "Welcome",
    categoryId: "welcome",
    english: "Please make yourself comfortable.",
    hindi: "कृपया आराम से बैठिए।",
    bengali: "অনুগ্রহ করে আরাম করে বসুন।",
    nepali: "कृपया आराम गर्नुहोस्।",
    en: "Please make yourself comfortable.",
    hi: "कृपया आराम से बैठिए।",
    bn: "অনুগ্রহ করে আরাম করে বসুন।",
    ne: "कृपया आराम गर्नुहोस्।"
  },
  {
    id: "welcome-03",
    category: "Welcome",
    categoryId: "welcome",
    english: "How was your journey?",
    hindi: "आपकी यात्रा कैसी रही?",
    bengali: "আপনার যাত্রা কেমন ছিল?",
    nepali: "तपाईंको यात्रा कस्तो रह्यो?",
    en: "How was your journey?",
    hi: "आपकी यात्रा कैसी रही?",
    bn: "আপনার যাত্রা কেমন ছিল?",
    ne: "तपाईंको यात्रा कस्तो रह्यो?"
  },
  {
    id: "welcome-04",
    category: "Welcome",
    categoryId: "welcome",
    english: "Here is your room key. Let me know if you need anything.",
    hindi: "यह आपके कमरे की चाबी है। कुछ भी चाहिए तो बताइएगा।",
    bengali: "এই নিন আপনার ঘরের চাবি। কিছু লাগলে জানাবেন।",
    nepali: "यो तपाईंको कोठाको चाबी हो। केही चाहिएमा भन्नुहोस्।",
    en: "Here is your room key. Let me know if you need anything.",
    hi: "यह आपके कमरे की चाबी है। कुछ भी चाहिए तो बताइएगा।",
    bn: "এই নিন আপনার ঘরের চাবি। কিছু লাগলে জানাবেন।",
    ne: "यो तपाईंको कोठाको चाबी हो। केही चाहिएमा भन्नुहोस्।"
  },

  // --- FOOD & TEA ---
  {
    id: "food-tea-01",
    category: "Food & Tea",
    categoryId: "food-tea",
    english: "Would you like some tea?",
    hindi: "क्या आप थोड़ी चाय लेना चाहेंगे?",
    bengali: "আপনি কি একটু চা খাবেন?",
    nepali: "तपाईंलाई चिया चाहिन्छ?",
    en: "Would you like some tea?",
    hi: "क्या आप थोड़ी चाय लेना चाहेंगे?",
    bn: "আপনি কি একটু চা খাবেন?",
    ne: "तपाईंलाई चिया चाहिन्छ?"
  },
  {
    id: "food-tea-02",
    category: "Food & Tea",
    categoryId: "food-tea",
    english: "Would you like breakfast?",
    hindi: "क्या आप नाश्ता करना चाहेंगे?",
    bengali: "আপনি কি সকালের প্রাতরাশ করবেন?",
    nepali: "के तपाईं बिहानको खाजा खान चाहनुहुन्छ?",
    en: "Would you like breakfast?",
    hi: "क्या आप नाश्ता करना चाहेंगे?",
    bn: "আপনি কি সকালের প্রাতরাশ করবেন?",
    ne: "के तपाईं बिहानको खाजा खान चाहनुहुन्छ?"
  },
  {
    id: "food-tea-03",
    category: "Food & Tea",
    categoryId: "food-tea",
    english: "Dinner will be ready at 8 PM.",
    hindi: "रात का खाना 8 बजे तैयार हो जाएगा।",
    bengali: "রাতের খাবার রাত ৮ টায় তৈরি হয়ে যাবে।",
    nepali: "रातीको खाना बेलुका ८ बजे तयार हुनेछ।",
    en: "Dinner will be ready at 8 PM.",
    hi: "रात का खाना 8 बजे तैयार हो जाएगा।",
    bn: "রাতের খাবার রাত ৮ টায় তৈরি হয়ে যাবে।",
    ne: "रातीको खाना बेलुका ८ बजे तयार हुनेछ।"
  },
  {
    id: "food-tea-04",
    category: "Food & Tea",
    categoryId: "food-tea",
    english: "Do you prefer Vegetarian or Non-Vegetarian food?",
    hindi: "क्या आप शाकाहारी या मांसाहारी खाना पसंद करते हैं?",
    bengali: "আপনি কি নিরামিষ নাকি আমিষ খাবার পছন্দ করেন?",
    nepali: "तपाईं शाकाहारी कि मांसाहारी खाना मन पराउनुहुन्छ?",
    en: "Do you prefer Vegetarian or Non-Vegetarian food?",
    hi: "क्या आप शाकाहारी या मांसाहारी खाना पसंद करते हैं?",
    bn: "আপনি কি নিরামিষ নাকি আমিষ খাবার পছন্দ করেন?",
    ne: "तपाईं शाकाहारी कि मांसाहारी खाना मन पराउनुहुन्छ?"
  },

  // --- ROOM ---
  {
    id: "room-01",
    category: "Room",
    categoryId: "room",
    english: "Is everything comfortable in your room?",
    hindi: "क्या आपके कमरे में सब कुछ आरामदायक है?",
    bengali: "আপনার ঘরে কি সবকিছু ঠিকঠাক ও আরামদায়ক আছে?",
    nepali: "के तपाईंको कोठामा सबै कुरा आरामदायी छ?",
    en: "Is everything comfortable in your room?",
    hi: "क्या आपके कमरे में सब कुछ आरामदायक है?",
    bn: "আপনার ঘরে কি সবকিছু ঠিকঠাক ও আরামদায়ক আছে?",
    ne: "के तपाईंको कोठामा सबै कुरा आरामदायी छ?"
  },
  {
    id: "room-02",
    category: "Room",
    categoryId: "room",
    english: "Would you like another blanket?",
    hindi: "क्या आपको एक और कंबल चाहिए?",
    bengali: "আপনার কি আরেকটি কম্বল লাগবে?",
    nepali: "के तपाईंलाई अर्को कम्बल चाहिन्छ?",
    en: "Would you like another blanket?",
    hi: "क्या आपको एक और कंबल चाहिए?",
    bn: "আপনার কি আরেকটি কম্বল লাগবে?",
    ne: "के तपाईंलाई अर्को कम्बल चाहिन्छ?"
  },
  {
    id: "room-03",
    category: "Room",
    categoryId: "room",
    english: "Do you need anything for your room?",
    hindi: "क्या आपको अपने कमरे के लिए किसी चीज की जरूरत है?",
    bengali: "ঘরের জন্য কি আপনার কিছু লাগবে?",
    nepali: "के तपाईंलाई कोठाको लागि केही चाहिन्छ?",
    en: "Do you need anything for your room?",
    hi: "क्या आपको अपने कमरे के लिए किसी चीज की जरूरत है?",
    bn: "ঘরের জন্য কি আপনার কিছু লাগবে?",
    ne: "के तपाईंलाई कोठाको लागि केही चाहिन्छ?"
  },
  {
    id: "room-04",
    category: "Room",
    categoryId: "room",
    english: "Hot water is available in the morning.",
    hindi: "सुबह गर्म पानी उपलब्ध रहेगा।",
    bengali: "সকালে গরম জল পাওয়া যাবে।",
    nepali: "बिहान तातो पानी उपलब्ध हुनेछ।",
    en: "Hot water is available in the morning.",
    hi: "सुबह गर्म पानी उपलब्ध रहेगा।",
    bn: "সকালে গরম জল পাওয়া যাবে।",
    ne: "बिहान तातो पानी उपलब्ध हुनेछ।"
  },

  // --- DIRECTIONS ---
  {
    id: "directions-01",
    category: "Directions",
    categoryId: "directions",
    english: "The washroom is this way.",
    hindi: "शौचालय इस तरफ है।",
    bengali: "ওয়াশরুম এই দিকে।",
    nepali: "शौचालय यतातिर छ।",
    en: "The washroom is this way.",
    hi: "शौचालय इस तरफ है।",
    bn: "ওয়াশরুম এই দিকে।",
    ne: "शौचालय यतातिर छ।"
  },
  {
    id: "directions-02",
    category: "Directions",
    categoryId: "directions",
    english: "The dining area is downstairs.",
    hindi: "भोजन क्षेत्र नीचे है।",
    bengali: "খাওয়ার জায়গাটি নিচে।",
    nepali: "डाइनिङ क्षेत्र तल छ।",
    en: "The dining area is downstairs.",
    hi: "भोजन क्षेत्र नीचे है।",
    bn: "খাওয়ার জায়গাটি নিচে।",
    ne: "डाइनिङ क्षेत्र तल छ।"
  },
  {
    id: "directions-03",
    category: "Directions",
    categoryId: "directions",
    english: "The taxi stand is nearby.",
    hindi: "टैक्सी स्टैंड पास में ही है।",
    bengali: "ট্যাক্সি স্ট্যান্ড কাছেই আছে।",
    nepali: "ट्याक्सी स्ट्यान्ड नजिकै छ।",
    en: "The taxi stand is nearby.",
    hi: "टैक्सी स्टैंड पास में ही है।",
    bn: "ট্যাক্সি স্ট্যান্ড কাছেই আছে।",
    ne: "ट्याक्सी स्ट्यान्ड नजिकै छ।"
  },
  {
    id: "directions-04",
    category: "Directions",
    categoryId: "directions",
    english: "The market is a 10-minute walk from here.",
    hindi: "बाजार यहाँ से 10 मिनट की पैदल दूरी पर है।",
    bengali: "বাজার এখান থেকে ১০ মিনিটের হাঁটা পথ।",
    nepali: "बजार यहाँबाट १० मिनेटको पैदल दूरीमा छ।",
    en: "The market is a 10-minute walk from here.",
    hi: "बाजार यहाँ से 10 मिनट की पैदल दूरी पर है।",
    bn: "বাজার এখান থেকে ১০ মিনিটের হাঁটা পথ।",
    ne: "बजार यहाँबाट १० मिनेटको पैदल दूरीमा छ।"
  },

  // --- PAYMENT ---
  {
    id: "payment-01",
    category: "Payment",
    categoryId: "payment",
    english: "Your total amount is ₹2,000.",
    hindi: "आपकी कुल राशि ₹2,000 है।",
    bengali: "আপনার মোট পরিমাণ ₹২,০০০।",
    nepali: "तपाईंको कुल रकम रु २,००० हो।",
    en: "Your total amount is ₹2,000.",
    hi: "आपकी कुल राशि ₹2,000 है।",
    bn: "আপনার মোট পরিমাণ ₹২,০০০।",
    ne: "तपाईंको कुल रकम रु २,००० हो।"
  },
  {
    id: "payment-02",
    category: "Payment",
    categoryId: "payment",
    english: "You can pay by cash or UPI.",
    hindi: "आप नकद या UPI द्वारा भुगतान कर सकते हैं।",
    bengali: "আপনি নগদ অথবা UPI দিয়ে পেমেন্ট করতে পারেন।",
    nepali: "तपाईं नगद वा UPI मार्फत भुक्तानी गर्न सक्नुहुन्छ।",
    en: "You can pay by cash or UPI.",
    hi: "आप नकद या UPI द्वारा भुगतान कर सकते हैं।",
    bn: "আপনি নগদ অথবা UPI দিয়ে পেমেন্ট করতে পারেন।",
    ne: "तपाईं नगद वा UPI मार्फत भुक्तानी गर्न सक्नुहुन्छ।"
  },
  {
    id: "payment-03",
    category: "Payment",
    categoryId: "payment",
    english: "Here is your payment receipt.",
    hindi: "यह आपकी भुगतान रसीद है।",
    bengali: "এই নিন আপনার পেমেন্টের রসিদ।",
    nepali: "यो तपाईंको भुक्तानी रसिद हो।",
    en: "Here is your payment receipt.",
    hi: "यह आपकी भुगतान रसीद है।",
    bn: "এই নিন আপনার পেমেন্টের রসিদ।",
    ne: "यो तपाईंको भुक्तानी रसिद हो।"
  },
  {
    id: "payment-04",
    category: "Payment",
    categoryId: "payment",
    english: "Payment has been received, thank you.",
    hindi: "भुगतान प्राप्त हो गया है, धन्यवाद।",
    bengali: "পেমেন্ট পাওয়া গেছে, ধন্যবাদ।",
    nepali: "भुक्तानी प्राप्त भयो, धन्यवाद।",
    en: "Payment has been received, thank you.",
    hi: "भुगतान प्राप्त हो गया है, धन्यवाद।",
    bn: "পেমেন্ট পাওয়া গেছে, ধন্যবাদ।",
    ne: "भुक्तानी प्राप्त भयो, धन्यवाद।"
  },

  // --- LOCAL EXPERIENCE ---
  {
    id: "local-01",
    category: "Local Experience",
    categoryId: "local-experience",
    english: "Would you like to visit the tea garden?",
    hindi: "क्या आप चाय बागान घूमना चाहेंगे?",
    bengali: "আপনি কি চা বাগান দেখতে যেতে চান?",
    nepali: "के तपाईं चिया बगान घुम्न जान चाहनुहुन्छ?",
    en: "Would you like to visit the tea garden?",
    hi: "क्या आप चाय बागान घूमना चाहेंगे?",
    bn: "আপনি কি চা বাগান দেখতে যেতে চান?",
    ne: "के तपाईं चिया बगान घुम्न जान चाहनुहुन्छ?"
  },
  {
    id: "local-02",
    category: "Local Experience",
    categoryId: "local-experience",
    english: "The viewpoint is nearby.",
    hindi: "व्यू पॉइंट पास में ही है।",
    bengali: "ভিউ পয়েন্টটি কাছেই আছে।",
    nepali: "भ्यू पोइन्ट नजिकै छ।",
    en: "The viewpoint is nearby.",
    hi: "व्यू पॉइंट पास में ही है।",
    bn: "ভিউ পয়েন্টটি কাছেই আছে।",
    ne: "भ्यू पोइन्ट नजिकै छ।"
  },
  {
    id: "local-03",
    category: "Local Experience",
    categoryId: "local-experience",
    english: "We can help you arrange local transport.",
    hindi: "हम स्थानीय वाहन की व्यवस्था करने में आपकी मदद कर सकते हैं।",
    bengali: "আমরা স্থানীয় গাড়ির ব্যবস্থা করতে সাহায্য করতে পারি।",
    nepali: "हामी स्थानीय गाडीको व्यवस्था मिलाउन मद्दत गर्न सक्छौं।",
    en: "We can help you arrange local transport.",
    hi: "हम स्थानीय वाहन की व्यवस्था करने में आपकी मदद कर सकते हैं।",
    bn: "আমরা স্থানীয় গাড়ির ব্যবস্থা করতে সাহায্য করতে পারি।",
    ne: "हामी स्थानीय गाडीको व्यवस्था मिलाउन मद्दत गर्न सक्छौं।"
  },
  {
    id: "local-04",
    category: "Local Experience",
    categoryId: "local-experience",
    english: "You can see Mount Kanchenjunga from the terrace on clear mornings.",
    hindi: "साफ सुबह में आप छत से कंचनजंगा पर्वत देख सकते हैं।",
    bengali: "পরিষ্কার সকালে ছাদ থেকে কাঞ্চনজঙ্ঘা পর্বত দেখতে পাবেন।",
    nepali: "सफा बिहानमा तपाईंले छतबाटै कञ्चनजङ्घा हिमाल देख्न सक्नुहुन्छ।",
    en: "You can see Mount Kanchenjunga from the terrace on clear mornings.",
    hi: "साफ सुबह में आप छत से कंचनजंगा पर्वत देख सकते हैं।",
    bn: "পরিষ্কার সকালে ছাদ থেকে কাঞ্চনজঙ্ঘা পর্বত দেখতে পাবেন।",
    ne: "सफा बिहानमा तपाईंले छतबाटै कञ्चनजङ्घा हिमाल देख्न सक्नुहुन्छ।"
  },

  // --- EMERGENCY ---
  {
    id: "emergency-01",
    category: "Emergency",
    categoryId: "emergency",
    english: "Are you feeling okay?",
    hindi: "क्या आप ठीक महसूस कर रहे हैं?",
    bengali: "আপনি কি সুস্থ বোধ করছেন?",
    nepali: "के तपाईंलाई सन्चो छ?",
    en: "Are you feeling okay?",
    hi: "क्या आप ठीक महसूस कर रहे हैं?",
    bn: "আপনি কি সুস্থ বোধ করছেন?",
    ne: "के तपाईंलाई सन्चो छ?"
  },
  {
    id: "emergency-02",
    category: "Emergency",
    categoryId: "emergency",
    english: "Do you need medical assistance?",
    hindi: "क्या आपको चिकित्सीय सहायता की आवश्यकता है?",
    bengali: "আপনার কি চিকিৎসার কোনো সাহায্য লাগবে?",
    nepali: "के तपाईंलाई स्वास्थ्य उपचार वा औषधीको खाँचो छ?",
    en: "Do you need medical assistance?",
    hi: "क्या आपको चिकित्सीय सहायता की आवश्यकता है?",
    bn: "আপনার কি চিকিৎসার কোনো সাহায্য লাগবে?",
    ne: "के तपाईंलाई स्वास्थ्य उपचार वा औषधीको खाँचो छ?"
  },
  {
    id: "emergency-03",
    category: "Emergency",
    categoryId: "emergency",
    english: "I will call for help.",
    hindi: "मैं मदद के लिए बुलाता हूँ।",
    bengali: "আমি সাহায্যের জন্য কাউকে ডাকছি।",
    nepali: "म सहयोगको लागि बोलाउँछु।",
    en: "I will call for help.",
    hi: "मैं मदद के लिए बुलाता हूँ।",
    bn: "আমি সাহায্যের জন্য কাউকে ডাকছি।",
    ne: "म सहयोगको लागि बोलाउँछु।"
  },
  {
    id: "emergency-04",
    category: "Emergency",
    categoryId: "emergency",
    english: "A first-aid box is available with us.",
    hindi: "हमारे पास प्राथमिक चिकित्सा (फर्स्ट-एड) किट उपलब्ध है।",
    bengali: "আমাদের কাছে ফার্স্ট এইড বক্স আছে।",
    nepali: "हामीसँग प्राथमिक उपचार किट उपलब्ध छ।",
    en: "A first-aid box is available with us.",
    hi: "हमारे पास प्राथमिक चिकित्सा (फर्स्ट-एड) किट उपलब्ध है।",
    bn: "আমাদের কাছে ফার্স্ট এইড বক্স আছে।",
    ne: "हामीसँग प्राथमिक उपचार किट उपलब्ध छ।"
  }
];

module.exports = {
  PHRASE_CATEGORIES,
  HOMESTAY_PHRASES
};
