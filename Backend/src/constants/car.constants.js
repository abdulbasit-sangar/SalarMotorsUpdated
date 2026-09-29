export const FUEL_TYPE = {
  PETROL: "Petrol",
  DIESEL: "Diesel",
  HYBRID: "Hybrid",
  ELECTRIC: "Electric",
  CNG: "CNG",
};

export const BODY_TYPE = {
  SEDAN: "Sedan",
  SUV: "SUV",
  HATCHBACK: "Hatchback",
  COUPE: "Coupe",
  PICKUP: "Pickup",
  VAN: "Van",
  MINIVAN: "Minivan",
  WAGON: "Wagon",
  CONVERTIBLE: "Convertible",
};

export const TRANSMISSION = {
  AUTOMATIC: "Automatic",
  MANUAL: "Manual",
  CVT: "CVT",
};

export const CONDITION = {
  NEW: "New",
  USED: "Used",
  CERTIFIED: "Certified Pre-Owned",
};

// ─────────────────────────────────────────────────────────────────────────────
// Dropdown option sources (Brand / Province / Year / Engine CC)
//
// Single source of truth for the four car dropdown fields. The frontend
// never hardcodes these — it fetches them from GET /api/cars/options
// (see car.controller.js / car.service.js), which reads directly from this
// file. Keep this file as the only place these lists are edited.
// ─────────────────────────────────────────────────────────────────────────────

// Plain arrays (not key/value maps like the specification enums above) since these are
// open lists of display strings, not a small fixed enum with symbolic keys.
export const CAR_BRANDS = [
  "Toyota",
  "Honda",
  "Nissan",
  "Hyundai",
  "Kia",
  "Ford",
  "Chevrolet",
  "BMW",
  "Mercedes-Benz",
  "Lexus",
  "Mazda",
  "Mitsubishi",
  "Subaru",
  "Suzuki",
];

export const CAR_MODELS_BY_BRAND = {
  Toyota: [
    "Corolla",
    "Camry",
    "Land Cruiser",
    "Land Cruiser Prado",
    "RAV4",
    "Hilux",
    "Prius",
    "Yaris",
    "Vitz",
    "Aqua",
    "Passo",
    "Premio",
    "Allion",
    "Wish",
    "Noah",
    "Voxy",
    "Sienta",
    "Fortuner",
    "Highlander",
    "Sequoia",
    "Tundra",
    "Tacoma",
    "4Runner",
    "Rush",
    "Raize",
    "C-HR",
    "Harrier",
    "Alphard",
    "Vellfire",
    "Hiace",
    "Dyna",
    "Avalon",
    "Crown",
    "FJ Cruiser",
    "Urban Cruiser",
    "Aygo",
    "bZ4X",
  ],
  Honda: [
    "Civic",
    "Accord",
    "CR-V",
    "HR-V",
    "BR-V",
    "Pilot",
    "Fit",
    "Jazz",
    "City",
    "Insight",
    "Odyssey",
    "Stepwgn",
    "Freed",
    "Vezel",
    "N-Box",
    "N-WGN",
    "Ridgeline",
    "Passport",
    "WR-V",
    "ZR-V",
    "Prelude",
  ],
  Nissan: [
    "Sunny",
    "Altima",
    "Maxima",
    "Sentra",
    "Versa",
    "Sylphy",
    "Teana",
    "Patrol",
    "X-Trail",
    "Rogue",
    "Qashqai",
    "Juke",
    "Kicks",
    "Murano",
    "Pathfinder",
    "Armada",
    "Navara",
    "Frontier",
    "Titan",
    "Leaf",
    "Ariya",
    "Note",
    "March",
    "Micra",
    "Tiida",
    "Serena",
    "Elgrand",
    "Dayz",
    "Sakura",
  ],
  Hyundai: [
    "Elantra",
    "Sonata",
    "Accent",
    "Tucson",
    "Santa Fe",
    "Palisade",
    "Kona",
    "Venue",
    "Creta",
    "i10",
    "i20",
    "i30",
    "i40",
    "Azera",
    "Grandeur",
    "Verna",
    "Bayon",
    "Staria",
    "Santa Cruz",
    "IONIQ 5",
    "IONIQ 6",
    "IONIQ 9",
  ],
  Kia: [
    "Sportage",
    "Sorento",
    "Seltos",
    "Telluride",
    "Soul",
    "Forte",
    "Cerato",
    "K5",
    "K8",
    "K9",
    "Rio",
    "Picanto",
    "Morning",
    "Stonic",
    "Sonet",
    "Carens",
    "Carnival",
    "Sedona",
    "Mohave",
    "EV3",
    "EV5",
    "EV6",
    "EV9",
    "Niro",
    "Optima",
  ],
  Ford: [
    "F-150",
    "F-250",
    "F-350",
    "Ranger",
    "Everest",
    "Explorer",
    "Expedition",
    "Escape",
    "Edge",
    "Bronco",
    "Bronco Sport",
    "Mustang",
    "Mustang Mach-E",
    "Focus",
    "Fiesta",
    "Fusion",
    "Taurus",
    "EcoSport",
    "Territory",
    "Transit",
    "Maverick",
  ],
  Chevrolet: [
    "Malibu",
    "Impala",
    "Cruze",
    "Spark",
    "Aveo",
    "Onix",
    "Trax",
    "Trailblazer",
    "Equinox",
    "Blazer",
    "Traverse",
    "Tahoe",
    "Suburban",
    "Silverado",
    "Colorado",
    "Camaro",
    "Corvette",
    "Captiva",
    "Groove",
    "Bolt EV",
    "Bolt EUV",
  ],
  BMW: [
    "1 Series",
    "2 Series",
    "3 Series",
    "4 Series",
    "5 Series",
    "6 Series",
    "7 Series",
    "8 Series",
    "X1",
    "X2",
    "X3",
    "X4",
    "X5",
    "X6",
    "X7",
    "XM",
    "Z4",
    "i3",
    "i4",
    "i5",
    "i7",
    "iX",
    "iX1",
    "iX3",
  ],
  "Mercedes-Benz": [
    "A-Class",
    "B-Class",
    "C-Class",
    "E-Class",
    "S-Class",
    "CLA",
    "CLS",
    "GLA",
    "GLB",
    "GLC",
    "GLE",
    "GLS",
    "G-Class",
    "GLK",
    "SL",
    "SLC",
    "AMG GT",
    "EQB",
    "EQE",
    "EQS",
    "EQC",
    "EQA",
    "Sprinter",
    "V-Class",
  ],
  Lexus: [
    "IS",
    "ES",
    "GS",
    "LS",
    "UX",
    "NX",
    "RX",
    "GX",
    "LX",
    "TX",
    "RC",
    "LC",
    "RZ",
    "CT",
    "HS",
    "LFA",
  ],
  Mazda: [
    "Mazda2",
    "Mazda3",
    "Mazda6",
    "CX-3",
    "CX-30",
    "CX-5",
    "CX-50",
    "CX-60",
    "CX-70",
    "CX-80",
    "CX-90",
    "MX-5",
    "MX-30",
    "BT-50",
    "CX-9",
    "MPV",
    "Demio",
    "Axela",
    "Atenza",
  ],
  Mitsubishi: [
    "Lancer",
    "Lancer Evolution",
    "Outlander",
    "Outlander Sport",
    "ASX",
    "Eclipse Cross",
    "Pajero",
    "Pajero Sport",
    "Montero",
    "Montero Sport",
    "L200",
    "Triton",
    "Mirage",
    "Attrage",
    "Galant",
    "Delica",
    "Xpander",
    "Xforce",
    "Eclipse",
    "i-MiEV",
  ],
  Subaru: [
    "Impreza",
    "WRX",
    "WRX STI",
    "Legacy",
    "Outback",
    "Forester",
    "Crosstrek",
    "XV",
    "Ascent",
    "BRZ",
    "Levorg",
    "Solterra",
    "Justy",
    "Tribeca",
    "Baja",
    "Stella",
  ],
  Suzuki: [
    "Alto",
    "Swift",
    "Dzire",
    "Celerio",
    "Wagon R",
    "Baleno",
    "Ignis",
    "Vitara",
    "Grand Vitara",
    "Jimny",
    "S-Cross",
    "SX4",
    "Ertiga",
    "XL7",
    "Fronx",
    "Brezza",
    "Ciaz",
    "Kizashi",
    "APV",
    "Carry",
    "Every",
    "Hustler",
    "Spacia",
    "Lapin",
  ],
};

export const PROVINCES = [
  "Kabul",
  "Nangarhar",
  "Herat",
  "Kandahar",
  "Balkh",
  "Kunduz",
  "Nimroz",
  "Helmand",
  "Ghazni",
  "Paktia",
  "Khost",
  "Logar",
  "Wardak",
  "Parwan",
  "Kapisa",
  "Laghman",
  "Kunar",
  "Paktika",
  "Zabul",
  "Uruzgan",
  "Farah",
  "Badghis",
  "Ghor",
  "Faryab",
  "Jowzjan",
  "Samangan",
  "Baghlan",
  "Takhar",
  "Badakhshan",
  "Bamyan",
  "Daikundi",
  "Panjshir",
  "Nuristan",
  "Sar-e Pol",
];

// ─────────────────────────────────────────────────────────────────────────────
// Special locations — "Dubai Cars" and "On The Way" categories
//
// These extend the existing `province` (Location) field rather than
// introducing a second, parallel category system. A listing's `province`
// is still a single field on the Car model — it's just no longer limited
// to Afghan provinces/cities. The website groups listings into categories
// by checking which of these special values (if any) a listing's
// `province` matches:
//   - LOCATION_DUBAI               → "Dubai Cars" category
//   - LOCATION_ON_THE_WAY.AMERICA  → "On the Way → From America to Herat"
//   - LOCATION_ON_THE_WAY.DUBAI    → "On the Way → From Dubai to Herat"
// Any listing whose province is a normal Afghan province/city is unaffected
// and keeps appearing under "All Cars" exactly as before.
// ─────────────────────────────────────────────────────────────────────────────
export const LOCATION_DUBAI = "Dubai";

export const LOCATION_ON_THE_WAY = {
  AMERICA_TO_HERAT: "From America to Herat",
  DUBAI_TO_HERAT: "From Dubai to Herat",
};

// Every non-Afghan-province location value a listing's `province` field may
// hold. Used to (a) extend the Location dropdown/enum below, and (b) tell
// the filter logic in car.service.js to match these values exactly instead
// of as a partial/substring match (so "Dubai" never also matches "From
// Dubai to Herat").
export const SPECIAL_LOCATIONS = [
  LOCATION_DUBAI,
  LOCATION_ON_THE_WAY.AMERICA_TO_HERAT,
  LOCATION_ON_THE_WAY.DUBAI_TO_HERAT,
];

// Full set of selectable values for the Location field: the existing
// Afghan provinces/cities, plus the special categories above. This is what
// the Mongoose enum, the Joi validator, and the Create/Edit Listing
// dropdown all consume — PROVINCES itself is untouched.
export const LOCATIONS = [...PROVINCES, ...SPECIAL_LOCATIONS];

export const ENGINE_CC_OPTIONS = [
  660, 1000, 1200, 1300, 1500, 1600, 1800, 2000, 2400, 2500, 2700, 3000, 3500,
  4000, 4500, 5000, 6000,
];

// ─────────────────────────────────────────────────────────────────────────────
// Vehicle Features — single source of truth for the Features system.
//
// FEATURE_GROUPS is what the frontend renders (grouped checkboxes on Create
// Listing, grouped display on the details page). VEHICLE_FEATURES is the
// flat list derived from it — used to validate `Car.features` both at the
// Mongoose schema level and in car.validator.js, so the client can never
// write an arbitrary feature string through the API. Add a feature by
// editing FEATURE_GROUPS only; VEHICLE_FEATURES stays in sync automatically.
// ─────────────────────────────────────────────────────────────────────────────
export const FEATURE_GROUPS = [
  {
    group: "Safety",
    features: [
      "Airbags",
      "ABS",
      "Traction Control",
      "Stability Control",
      "Blind Spot Monitoring",
      "Lane Departure Warning",
      "Lane Keep Assist",
      "Adaptive Cruise Control",
      "Cruise Control",
      "Parking Sensors",
      "Rear Camera",
      "Front Camera",
      "360° Camera",
      "Parking Assist",
      "Hill Start Assist",
      "Hill Descent Control",
    ],
  },
  {
    group: "Comfort",
    features: [
      "Leather Seats",
      "Heated Seats",
      "Ventilated Seats",
      "Power Seats",
      "Memory Seats",
      "Automatic Climate Control",
      "Dual-Zone AC",
      "Quad-Zone AC",
      "Rear AC",
      "Electric Windows",
      "Power Mirrors",
      "Folding Mirrors",
      "Soft-Close Doors",
      "Power Tailgate",
    ],
  },
  {
    group: "Technology",
    features: [
      "Navigation/GPS",
      "Bluetooth",
      "Apple CarPlay",
      "Android Auto",
      "USB",
      "AUX",
      "Wireless Charging",
      "Remote Start",
      "Keyless Entry",
      "Keyless Start",
      "Push Button Start",
      "Engine Start/Stop",
    ],
  },
  {
    group: "Exterior",
    features: [
      "Sunroof",
      "LED Headlights",
      "Fog Lights",
      "Daytime Running Lights",
      "Alloy Wheels",
      "Roof Rails",
      "Tow Package",
    ],
  },
  {
    group: "Off-Road & Drive",
    features: [
      "4x4",
      "Differential Lock",
      "Off-Road Package",
      "Sport Mode",
      "Eco Mode",
      "Drive Modes",
      "Third Row Seats",
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Currency — Add Currency Selection to Vehicle Price
//
// Single source of truth for supported currencies. Symbol is what's shown
// next to the formatted number on the frontend (see shared/utils/format.js);
// AED/AFN use their ISO code as the "symbol" since neither has a single
// widely-recognized glyph, matching the examples in the spec
// ("12,000 AED", "12,000 AFN") vs "$"/"€" for USD/EUR.
// ─────────────────────────────────────────────────────────────────────────────
export const CURRENCIES = [
  { code: "USD", symbol: "$", label: "US Dollar" },
  { code: "EUR", symbol: "€", label: "Euro" },
  { code: "AED", symbol: "AED", label: "UAE Dirham" },
  { code: "AFN", symbol: "AFN", label: "Afghan Afghani" },
];

export const CURRENCY_CODES = CURRENCIES.map((c) => c.code);
export const DEFAULT_CURRENCY = "USD";

// ─────────────────────────────────────────────────────────────────────────────
// Mileage unit — KM or Miles
// ─────────────────────────────────────────────────────────────────────────────
export const MILEAGE_UNITS = ["km", "miles"];
export const DEFAULT_MILEAGE_UNIT = "km";

export const VEHICLE_FEATURES = FEATURE_GROUPS.flatMap((g) => g.features);

// Kept in sync with the Car model's `year` bounds (models/car.model.js) and
// the Joi `year` field (validators/car.validator.js): min 2005, max is
// always "current year + 1". Years are generated here, never hand-maintained.
export const MIN_CAR_YEAR = 2005;

export const getMaxCarYear = () => new Date().getFullYear() + 1;

// Newest year first — matches how a buyer expects a year dropdown to read.
export const getCarYears = () => {
  const maxYear = getMaxCarYear();
  const years = [];
  for (let year = maxYear; year >= MIN_CAR_YEAR; year--) {
    years.push(year);
  }
  return years;
};
