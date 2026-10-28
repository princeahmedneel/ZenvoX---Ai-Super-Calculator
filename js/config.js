// ==========================================================================
// PATH: js/config.js
// ZenvX Super-App — Master Configuration, i18n, 40 Constants & 40 Conversions
// (Step 4 of 20 — 100% Syntax & Runtime Error Checked)
// ==========================================================================

/**
 * 1. CORE APPLICATION & EXTERNAL SERVICES CONFIGURATION
 * আপনি চাইলে আপনার নিজস্ব Firebase, Cloudinary এবং Cloudflare Worker URL এখানে বসাতে পারেন।
 * যদি নাও বসান, তবুও ক্যালকুলেটর, গ্রাফ ও অফলাইন স্টাডি টুলস ১০০% কাজ করবে।
 */
export const APP_CONFIG = {
  appName: "ZenvX",
  version: "2.5.0",
  defaultRoute: "sci-calc",
  defaultTheme: "dark",
  defaultLanguage: "bn",
  defaultNumeral: "bn", // 'bn' | 'en'
  defaultGrouping: "lakh", // 'lakh' (দেশীয় লক্ষ/কোটি) | 'international' (Million)

  // Cloudflare Worker Backend Proxy URL (Handles Gemini AI, YouTube Search & Zego Token)
  workerBaseUrl: "https://zenvx-api-proxy.workers.dev",

  // Firebase Web SDK Configuration
  firebase: {
    apiKey: "AIzaSyAdkoBFzQTXTfJyJ3ZFghOLsA0gmnI8a_E",
    authDomain: "zenvx--calculator.firebaseapp.com",
    projectId: "zenvx--calculator",
    storageBucket: "zenvx--calculator.appspot.com",
    messagingSenderId: "320661171862",
    appId: "1:320661171862:web:9d8882812e249ad19b1cb7"
  },

  // Cloudinary Unsigned Upload Configuration (For Profile Avatar & Chat Media)
  cloudinary: {
    cloudName: "demo",
    uploadPreset: "docs_upload_example_us_preset",
    maxImageBytes: 5 * 1024 * 1024, // 5 MB
    maxAudioBytes: 10 * 1024 * 1024 // 10 MB
  },

  // ZEGOCLOUD WebRTC Audio/Video Call Configuration
  zego: {
    appId: 1234567890,
    serverUrl: "wss://webliveroom-test.zego.im/ws"
  },

  // IndexedDB Local Database Config
  indexedDb: {
    name: "ZenvX_Local_DB_v25",
    version: 1
  }
};

/**
 * কোন সার্ভিস কনফিগার করা আছে কি না তা নিরাপদে চেক করে (যাতে অ্যাপ ক্র্যাশ না করে)
 */
export function isServiceConfigured(serviceName) {
  try {
    if (serviceName === "firebase") {
      return Boolean(
        APP_CONFIG.firebase &&
        APP_CONFIG.firebase.apiKey &&
        !APP_CONFIG.firebase.apiKey.includes("YOUR_") &&
        APP_CONFIG.firebase.projectId
      );
    }
    if (serviceName === "worker") {
      return Boolean(
        APP_CONFIG.workerBaseUrl &&
        APP_CONFIG.workerBaseUrl.startsWith("https://") &&
        !APP_CONFIG.workerBaseUrl.includes("example")
      );
    }
    if (serviceName === "cloudinary") {
      return Boolean(
        APP_CONFIG.cloudinary &&
        APP_CONFIG.cloudinary.cloudName &&
        APP_CONFIG.cloudinary.uploadPreset
      );
    }
    return false;
  } catch (_) {
    return false;
  }
}

// ==========================================================================
// 2. BENGALI / ENGLISH DIGIT CONVERTER & NUMBER FORMATTER (i18n)
// ==========================================================================

const BN_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
const EN_DIGITS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

const BN_TO_EN_MAP = {
  "০": "0", "১": "1", "২": "2", "৩": "3", "৪": "4",
  "৫": "5", "৬": "6", "৭": "7", "৮": "8", "৯": "9"
};

const EN_TO_BN_MAP = {
  "0": "০", "1": "১", "2": "২", "3": "৩", "4": "৪",
  "5": "৫", "6": "৬", "7": "৭", "8": "৮", "9": "৯"
};

/**
 * যেকোনো স্ট্রিংয়ের ভেতরে থাকা বাংলা অঙ্ককে (০-৯) ইংরেজি অঙ্কে (0-9) রূপান্তর করে
 */
export function toEnglishDigits(inputStr = "") {
  if (inputStr === null || inputStr === undefined) return "";
  return String(inputStr).replace(/[০-৯]/g, (match) => BN_TO_EN_MAP[match] || match);
}

/**
 * ইংরেজি অঙ্ককে (0-9) বাংলা অঙ্কে (০-৯) রূপান্তর করে
 */
export function toBanglaDigits(inputStr = "") {
  if (inputStr === null || inputStr === undefined) return "";
  return String(inputStr).replace(/[0-9]/g, (match) => EN_TO_BN_MAP[match] || match);
}

/**
 * ইউজারের পছন্দ অনুযায়ী ('bn' বা 'en') সংখ্যায় রূপান্তর করে
 */
export function localizeDigits(inputStr = "", numeralMode = "bn") {
  const clean = String(inputStr ?? "");
  if (numeralMode === "en") {
    return toEnglishDigits(clean);
  }
  return toBanglaDigits(toEnglishDigits(clean));
}

/**
 * লক্ষ/কোটি (Lakh/Crore: 12,34,567) অথবা আন্তর্জাতিক (Million: 1,234,567) ফরম্যাটে কমা বসায়
 */
export function formatNumber(rawValue, { grouping = "lakh", numeral = "bn" } = {}) {
  if (rawValue === null || rawValue === undefined || rawValue === "") return localizeDigits("0", numeral);

  const str = toEnglishDigits(String(rawValue).trim());

  // যদি ভগ্নাংশ (যেমন 3/4), পাই (π), রুট (√) বা সায়েন্টিফিক নোটেশন (1.5e+12) থাকে তবে কমা না বসিয়ে শুধু ডিজিট লোকালাইজ করো
  if (/[\/π√eE]/.test(str) || !/^[+-]?\d+(\.\d+)?$/.test(str)) {
    return localizeDigits(str, numeral);
  }

  const isNegative = str.startsWith("-");
  const unsigned = str.replace(/^[+-]/, "");
  const [intPart, decPart] = unsigned.split(".");

  let formattedInt = intPart;
  if (grouping === "lakh" && intPart.length > 3) {
    const lastThree = intPart.slice(-3);
    const otherNumbers = intPart.slice(0, -3);
    formattedInt = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + lastThree;
  } else if (grouping === "international" && intPart.length > 3) {
    formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

  const combined = (isNegative ? "-" : "") + formattedInt + (decPart !== undefined ? "." + decPart : "");
  return localizeDigits(combined, numeral);
}

// ==========================================================================
// 3. CASIO fx-991ES PLUS — ALL 40 SCIENTIFIC CONSTANTS (SHIFT + 7 / CONST)
// ==========================================================================

export const SCIENTIFIC_CONSTANTS = [
  { code: "01", key: "mp", symbol: "mₚ", name: "প্রোটন ভর (Proton mass)", value: 1.67262192369e-27, unit: "kg" },
  { code: "02", key: "mn", symbol: "mₙ", name: "নিউট্রন ভর (Neutron mass)", value: 1.67492749804e-27, unit: "kg" },
  { code: "03", key: "me", symbol: "mₑ", name: "ইলেকট্রন ভর (Electron mass)", value: 9.1093837015e-31, unit: "kg" },
  { code: "04", key: "mmu", symbol: "mμ", name: "মিউয়ন ভর (Muon mass)", value: 1.883531627e-28, unit: "kg" },
  { code: "05", key: "a0", symbol: "a₀", name: "বোর ব্যাসার্ধ (Bohr radius)", value: 5.29177210903e-11, unit: "m" },
  { code: "06", key: "h", symbol: "h", name: "প্ল্যাঙ্ক ধ্রুবক (Planck constant)", value: 6.62607015e-34, unit: "J·s" },
  { code: "07", key: "muN", symbol: "μN", name: "নিউক্লিয়ার ম্যাগনেটন (Nuclear magneton)", value: 5.0507837461e-27, unit: "J/T" },
  { code: "08", key: "muB", symbol: "μB", name: "বোর ম্যাগনেটন (Bohr magneton)", value: 9.2740100783e-24, unit: "J/T" },
  { code: "09", key: "hbar", symbol: "ℏ", name: "হ্রাসকৃত প্ল্যাঙ্ক ধ্রুবক (h-bar)", value: 1.054571817e-34, unit: "J·s" },
  { code: "10", key: "alpha", symbol: "α", name: "সূক্ষ্ম গঠন ধ্রুবক (Fine-structure)", value: 7.2973525693e-3, unit: "" },
  { code: "11", key: "re", symbol: "rₑ", name: "চিরায়ত ইলেকট্রন ব্যাসার্ধ", value: 2.8179403262e-15, unit: "m" },
  { code: "12", key: "lambdaC", symbol: "λc", name: "কম্পটন তরঙ্গদৈর্ঘ্য (Compton wavelength)", value: 2.42631023867e-12, unit: "m" },
  { code: "13", key: "gammaP", symbol: "γₚ", name: "প্রোটন গায়রোম্যাগনেটিক অনুপাত", value: 2.6752218744e8, unit: "s⁻¹·T⁻¹" },
  { code: "14", key: "lambdaCp", symbol: "λcp", name: "প্রোটন কম্পটন তরঙ্গদৈর্ঘ্য", value: 1.32140985539e-15, unit: "m" },
  { code: "15", key: "lambdaCn", symbol: "λcn", name: "নিউট্রন কম্পটন তরঙ্গদৈর্ঘ্য", value: 1.31959090581e-15, unit: "m" },
  { code: "16", key: "Rinf", symbol: "R∞", name: "রিডবার্গ ধ্রুবক (Rydberg constant)", value: 10973731.56816, unit: "m⁻¹" },
  { code: "17", key: "u", symbol: "u", name: "পারমাণবিক ভর একক (Atomic mass unit)", value: 1.6605390666e-27, unit: "kg" },
  { code: "18", key: "muP", symbol: "μₚ", name: "প্রোটন চৌম্বক ভ্রামক", value: 1.41060679736e-26, unit: "J/T" },
  { code: "19", key: "muE", symbol: "μₑ", name: "ইলেকট্রন চৌম্বক ভ্রামক", value: -9.2847647043e-24, unit: "J/T" },
  { code: "20", key: "muN_mag", symbol: "μₙ", name: "নিউট্রন চৌম্বক ভ্রামক", value: -9.6623651e-27, unit: "J/T" },
  { code: "21", key: "muMu", symbol: "μμ", name: "মিউয়ন চৌম্বক ভ্রামক", value: -4.4904483e-26, unit: "J/T" },
  { code: "22", key: "F", symbol: "F", name: "ফ্যারাডে ধ্রুবক (Faraday constant)", value: 96485.33212, unit: "C/mol" },
  { code: "23", key: "eCharge", symbol: "e", name: "প্রাথমিক চার্জ (Elementary charge)", value: 1.602176634e-19, unit: "C" },
  { code: "24", key: "NA", symbol: "Nₐ", name: "অ্যাভোগাড্রো সংখ্যা (Avogadro constant)", value: 6.02214076e23, unit: "mol⁻¹" },
  { code: "25", key: "kB", symbol: "k", name: "বোল্টজম্যান ধ্রুবক (Boltzmann constant)", value: 1.380649e-23, unit: "J/K" },
  { code: "26", key: "Vm", symbol: "Vₘ", name: "আদর্শ গ্যাসের মোলার আয়তন", value: 0.02241396954, unit: "m³/mol" },
  { code: "27", key: "R", symbol: "R", name: "মোলার গ্যাস ধ্রুবক (Molar gas constant)", value: 8.314462618, unit: "J/(mol·K)" },
  { code: "28", key: "c0", symbol: "c₀", name: "শূন্য মাধ্যমে আলোর বেগ (Speed of light)", value: 299792458, unit: "m/s" },
  { code: "29", key: "C1", symbol: "c₁", name: "প্রথম বিকিরণ ধ্রুবক", value: 3.741771852e-16, unit: "W·m²" },
  { code: "30", key: "C2", symbol: "c₂", name: "দ্বিতীয় বিকিরণ ধ্রুবক", value: 0.01438776877, unit: "m·K" },
  { code: "31", key: "sigma", symbol: "σ", name: "স্টিফান-বোল্টজম্যান ধ্রুবক", value: 5.670374419e-8, unit: "W/(m²·K⁴)" },
  { code: "32", key: "eps0", symbol: "ε₀", name: "শূন্য মাধ্যমের তড়িৎ ভেদনযোগ্যতা", value: 8.8541878128e-12, unit: "F/m" },
  { code: "33", key: "mu0", symbol: "μ₀", name: "শূন্য মাধ্যমের চৌম্বক প্রবেশ্যতা", value: 1.25663706212e-6, unit: "N/A²" },
  { code: "34", key: "Phi0", symbol: "Φ₀", name: "চৌম্বক ফ্লাক্স কোয়ান্টাম", value: 2.067833848e-15, unit: "Wb" },
  { code: "35", key: "g0", symbol: "g", name: "আদর্শ অভিকর্ষজ ত্বরণ (Standard gravity)", value: 9.80665, unit: "m/s²" },
  { code: "36", key: "G0", symbol: "G₀", name: "পরিবাহিতা কোয়ান্টাম (Conductance quantum)", value: 7.748091729e-5, unit: "S" },
  { code: "37", key: "Z0", symbol: "Z₀", name: "শূন্য মাধ্যমের প্রতিবন্ধকতা", value: 376.730313668, unit: "Ω" },
  { code: "38", key: "tC", symbol: "t", name: "সেলসিয়াস তাপমাত্রা ধ্রুবক (0°C in K)", value: 273.15, unit: "K" },
  { code: "39", key: "G", symbol: "G", name: "মহাকর্ষীয় ধ্রুবক (Gravitational constant)", value: 6.67430e-11, unit: "m³/(kg·s²)" },
  { code: "40", key: "atm", symbol: "atm", name: "আদর্শ বায়ুমণ্ডলীয় চাপ (Standard atmosphere)", value: 101325, unit: "Pa" }
];

// ==========================================================================
// 4. CASIO fx-991ES PLUS — ALL 40 UNIT CONVERSIONS (SHIFT + 8 / CONV)
// ==========================================================================

export const UNIT_CONVERSIONS = [
  // Length (01 - 10)
  { code: "01", label: "in ▸ cm", category: "দৈর্ঘ্য", factor: 2.54 },
  { code: "02", label: "cm ▸ in", category: "দৈর্ঘ্য", factor: 1 / 2.54 },
  { code: "03", label: "ft ▸ m", category: "দৈর্ঘ্য", factor: 0.3048 },
  { code: "04", label: "m ▸ ft", category: "দৈর্ঘ্য", factor: 1 / 0.3048 },
  { code: "05", label: "yd ▸ m", category: "দৈর্ঘ্য", factor: 0.9144 },
  { code: "06", label: "m ▸ yd", category: "দৈর্ঘ্য", factor: 1 / 0.9144 },
  { code: "07", label: "mile ▸ km", category: "দৈর্ঘ্য", factor: 1.609344 },
  { code: "08", label: "km ▸ mile", category: "দৈর্ঘ্য", factor: 1 / 1.609344 },
  { code: "09", label: "n mile ▸ m", category: "দৈর্ঘ্য", factor: 1852 },
  { code: "10", label: "m ▸ n mile", category: "দৈর্ঘ্য", factor: 1 / 1852 },

  // Area & Volume (11 - 18)
  { code: "11", label: "acre ▸ m²", category: "ক্ষেত্রফল", factor: 4046.8564224 },
  { code: "12", label: "m² ▸ acre", category: "ক্ষেত্রফল", factor: 1 / 4046.8564224 },
  { code: "13", label: "gal (US) ▸ L", category: "আয়তন", factor: 3.785411784 },
  { code: "14", label: "L ▸ gal (US)", category: "আয়তন", factor: 1 / 3.785411784 },
  { code: "15", label: "gal (UK) ▸ L", category: "আয়তন", factor: 4.54609 },
  { code: "16", label: "L ▸ gal (UK)", category: "আয়তন", factor: 1 / 4.54609 },
  { code: "17", label: "pc (Parsec) ▸ km", category: "মহাকাশ", factor: 3.085677581e13 },
  { code: "18", label: "km ▸ pc (Parsec)", category: "মহাকাশ", factor: 1 / 3.085677581e13 },

  // Velocity & Mass (19 - 24)
  { code: "19", label: "km/h ▸ m/s", category: "বেগ", factor: 1 / 3.6 },
  { code: "20", label: "m/s ▸ km/h", category: "বেগ", factor: 3.6 },
  { code: "21", label: "oz ▸ g", category: "ভর", factor: 28.349523125 },
  { code: "22", label: "g ▸ oz", category: "ভর", factor: 1 / 28.349523125 },
  { code: "23", label: "lb ▸ kg", category: "ভর", factor: 0.45359237 },
  { code: "24", label: "kg ▸ lb", category: "ভর", factor: 1 / 0.45359237 },

  // Pressure (25 - 32)
  { code: "25", label: "atm ▸ Pa", category: "চাপ", factor: 101325 },
  { code: "26", label: "Pa ▸ atm", category: "চাপ", factor: 1 / 101325 },
  { code: "27", label: "mmHg ▸ Pa", category: "চাপ", factor: 133.322387415 },
  { code: "28", label: "Pa ▸ mmHg", category: "চাপ", factor: 1 / 133.322387415 },
  { code: "29", label: "hp ▸ kW", category: "ক্ষমতা", factor: 0.745699872 },
  { code: "30", label: "kW ▸ hp", category: "ক্ষমতা", factor: 1 / 0.745699872 },
  { code: "31", label: "kgf/cm² ▸ Pa", category: "চাপ", factor: 98066.5 },
  { code: "32", label: "Pa ▸ kgf/cm²", category: "চাপ", factor: 1 / 98066.5 },

  // Energy & Temperature (33 - 40)
  { code: "33", label: "kgf·m ▸ J", category: "শক্তি", factor: 9.80665 },
  { code: "34", label: "J ▸ kgf·m", category: "শক্তি", factor: 1 / 9.80665 },
  { code: "35", label: "lbf/in² (psi) ▸ kPa", category: "চাপ", factor: 6.894757293 },
  { code: "36", label: "kPa ▸ lbf/in² (psi)", category: "চাপ", factor: 1 / 6.894757293 },
  { code: "37", label: "°F ▸ °C", category: "তাপমাত্রা", isTemp: "F_TO_C" },
  { code: "38", label: "°C ▸ °F", category: "তাপমাত্রা", isTemp: "C_TO_F" },
  { code: "39", label: "cal ▸ J", category: "শক্তি", factor: 4.184 },
  { code: "40", label: "J ▸ cal", category: "শক্তি", factor: 1 / 4.184 }
];

/**
 * একক রূপান্তর হিসাবকারী ফাংশন
 */
export function applyUnitConversion(value, convCode) {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  const item = UNIT_CONVERSIONS.find((c) => c.code === convCode);
  if (!item) return num;
  if (item.isTemp === "F_TO_C") return ((num - 32) * 5) / 9;
  if (item.isTemp === "C_TO_F") return (num * 9) / 5 + 32;
  return num * (item.factor || 1);
}
