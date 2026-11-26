// Text content for the Bibbulmun app, taken from the walking plan and gear list
// (Claude Docs, 2026-11-26). Anything marked guess: true is not confirmed.

export const SECTIONS = [
  { n: 1, name: "Darling Range", from: "Kalamunda", to: "Dwellingup", startKm: 0, endKm: 206.3, resupply: "Dwellingup" },
  { n: 2, name: "Dwellingup", from: "Dwellingup", to: "Collie", startKm: 206.3, endKm: 334.2, resupply: "Collie" },
  { n: 3, name: "Collie", from: "Collie", to: "Balingup", startKm: 334.2, endKm: 419.2, resupply: "Balingup" },
  { n: 4, name: "Balingup", from: "Balingup", to: "Donnelly River Village", startKm: 419.2, endKm: 475.2, resupply: "Donnelly River Village (limited)", guess: true },
  { n: 5, name: "Donnelly River", from: "Donnelly River Village", to: "Pemberton", startKm: 475.2, endKm: 578.7, resupply: "Pemberton" },
  { n: 6, name: "Pemberton", from: "Pemberton", to: "Northcliffe", startKm: 578.7, endKm: 633.9, resupply: "Northcliffe" },
  { n: 7, name: "Northcliffe", from: "Northcliffe", to: "Walpole", startKm: 633.9, endKm: 774.3, resupply: "Walpole" },
  { n: 8, name: "Walpole", from: "Walpole", to: "Denmark", startKm: 774.3, endKm: 901.5, resupply: "Denmark (Peaceful Bay midway, small)" },
  { n: 9, name: "Denmark–Albany", from: "Denmark", to: "Albany", startKm: 901.5, endKm: 1000.0, resupply: "Albany" },
];

// First walk: Kalamunda to Brookton Highway (73.0 km by the calculator).
// Each day is [fromKm, toKm, night, note]. Km are cumulative along the track.
export const FIRST_WALK = {
  title: "Kalamunda to Brookton Highway",
  startKm: 0,
  endKm: 73.0,
  intro:
    "The first 73.0 km of Section 1, ending at the Brookton Highway crossing, about 33 km along the highway from Kelmscott. No resupply on the way: carry all your food.",
  options: [
    {
      id: "4day",
      label: "4 days",
      sub: "Recommended, 3 nights",
      days: [
        { from: 0, to: 21.8, night: "Ball Creek Campsite", note: "Hard and hilly first 11 km to Hewett's Hill. Mundaring Weir Hotel at 17.2 km for lunch." },
        { from: 21.8, to: 40.0, night: "Waalegh Campsite", note: "Passes Helena Campsite at 8.7 km." },
        { from: 40.0, to: 62.7, night: "Mt Dale Campsite", note: "Dale Road picnic area at 20.0 km is the last easy exit." },
        { from: 62.7, to: 73.0, night: "Home", note: "Passes Brookton Campsite at 7.7 km. Pickup at Brookton Highway." },
      ],
    },
    {
      id: "3day",
      label: "3 days",
      sub: "Faster, 2 nights, max 27 km",
      days: [
        { from: 0, to: 21.8, night: "Ball Creek Campsite", note: "Hard and hilly first 11 km. Lunch at Mundaring Weir Hotel (17.2 km)." },
        { from: 21.8, to: 48.6, night: "Beraking Campsite", note: "Long day, 26.8 km. Passes Helena and Waalegh campsites for water and breaks." },
        { from: 48.6, to: 73.0, night: "Home", note: "24.4 km past Dale Road, Mt Dale and Brookton campsites. Dale Road (11.4 km) is the bail-out." },
      ],
    },
    {
      id: "5day",
      label: "5 days",
      sub: "Gentle, every day ≤ 20 km",
      days: [
        { from: 0, to: 11.1, night: "Hewett's Hill Campsite", note: "Short but hilly start." },
        { from: 11.1, to: 30.5, night: "Helena Campsite", note: "Via Mundaring Weir Hotel and the Perth Hills Discovery Centre." },
        { from: 30.5, to: 48.6, night: "Beraking Campsite", note: "Passes Waalegh Campsite." },
        { from: 48.6, to: 62.7, night: "Mt Dale Campsite", note: "Dale Road picnic area at 11.4 km." },
        { from: 62.7, to: 73.0, night: "Home", note: "Pickup at Brookton Highway." },
      ],
    },
    {
      id: "weekends",
      label: "Weekends",
      sub: "3 trips from home",
      days: [
        { from: 0, to: 11.1, night: "Hewett's Hill Campsite", note: "Trip 1, day 1.", trip: 1 },
        { from: 11.1, to: 19.1, night: "Home", note: "Trip 1, day 2. Out at the Perth Hills Discovery Centre.", trip: 1 },
        { from: 19.1, to: 40.0, night: "Waalegh Campsite", note: "Trip 2, day 1. Start at the Perth Hills Discovery Centre.", trip: 2 },
        { from: 40.0, to: 60.0, night: "Home", note: "Trip 2, day 2. Out at Dale Road picnic area.", trip: 2 },
        { from: 60.0, to: 73.0, night: "Home", note: "Trip 3, a day walk past Mt Dale.", trip: 3 },
      ],
    },
  ],
  caveat:
    "The official example walk gives 69.7 km for this walk; the distance calculator gives 73.0. The difference is probably a realignment, so check before you go.",
};

export const GEAR = [
  {
    group: "Wear while walking",
    items: [
      "Broken-in trail runners or light boots",
      "Merino or synthetic hiking socks (liners if you blister)",
      "Quick-dry shorts or light pants",
      "Light long-sleeve sun shirt with collar",
      "Wide-brim hat",
      "Sunglasses",
      "Gaiters (spring)",
    ],
  },
  {
    group: "Clothes in the pack",
    items: [
      "Waterproof rain jacket with hood",
      "Rain pants or skirt (winter)",
      "Fleece or light puffer",
      "Thermal top and leggings",
      "Beanie and light gloves",
      "2 spare pairs of socks, 1 kept dry for camp",
      "Camp shoes (optional)",
      "Buff or neck gaiter",
      "Fly head net (spring, autumn)",
    ],
  },
  {
    group: "Pack and shelter",
    items: [
      "Backpack 45–60 L with liner or dry bags",
      { t: "Tent or tarp (huts can be full)", o: true },
      { t: "Sleeping bag, 0–5 °C", o: true },
      { t: "Sleeping mat", o: true },
      { t: "Inflatable pillow (optional)", o: true },
    ],
  },
  {
    group: "Water",
    items: [
      "At least 3 L capacity, more if warm",
      "Water treatment: filter, tablets or UV",
      "Collapsible bucket (optional)",
    ],
  },
  {
    group: "Cooking and food",
    items: [
      { t: "Stove, gas canister, lighter", o: true },
      { t: "Pot, mug, long spoon", o: true },
      { t: "Food for every day plus 1 spare day", o: true },
      { t: "One no-cook dinner for fire ban days", o: true },
      "Rubbish bag: carry everything out",
    ],
  },
  {
    group: "Navigation and comms",
    items: [
      "Track Map 1 and Guidebook 1 (Darling Range)",
      "Phone with this app saved offline",
      "Power bank and cable",
      "PLB or satellite messenger",
      "Trip intention left with someone at home",
    ],
  },
  {
    group: "First aid and safety",
    items: [
      "Two elastic snake bandages",
      "Blister kit: tape, hydrocolloid patches",
      "Painkillers, antihistamine, own medicines",
      "Tick remover and insect repellent",
      "Small knife, whistle, emergency blanket",
      "Head torch and spare batteries",
      "Sunscreen and lip balm",
    ],
  },
  {
    group: "Hygiene",
    items: ["Toilet paper and hand sanitiser", "Small trowel", "Toothbrush, toothpaste, small towel"],
  },
];

export const CONTACTS = [
  { who: "Emergency", for: "Injury, fire, lost", tel: "000", extra: "112 from a mobile, or trigger your PLB" },
  { who: "Bibbulmun Track Foundation", for: "Maps, track conditions, questions", tel: "0894810551", telLabel: "(08) 9481 0551" },
  { who: "DBCA Perth Hills District, Mundaring", for: "Closures, burns, baiting", tel: "0892906100", telLabel: "(08) 9290 6100", guess: true },
  { who: "DBCA park passes", for: "Assistance animal requests", email: "park.passes@dbca.wa.gov.au" },
];

export const INFO = [
  {
    h: "When to walk",
    p: [
      "Walk from March to November. Skip December to early March: heat and bushfire risk, and the track managers advise against extended walks.",
      "On days rated Very High fire danger or above, don't start, and leave if you're already out. On a total fire ban day you can't light any fire, including a gas stove.",
    ],
    list: [
      "Mar–May: cooling, tanks lowest after summer. Good for the Darling Range.",
      "Jun–Aug: cool and wet, creeks flowing. Darling Range and Dwellingup–Collie.",
      "Sep–Nov: wildflowers, busiest. Best for the south coast.",
    ],
    guessNote: "Suggested 2027 order: Section 1 in autumn or winter, forest through winter, south coast in spring.",
  },
  {
    h: "Water",
    p: [
      "Every campsite has a rainwater tank, shelter, toilet and tent sites. Treat all tank water: walkers have fallen ill from it.",
      "Carry enough to reach the next tank: about 2–3 L in cool months, 4 L or more when warm. Check the track conditions page for empty tanks before each trip.",
    ],
    guessNote: "Water amounts are an estimate (about 0.5 L an hour walking plus camp needs).",
  },
  {
    h: "Food and resupply",
    p: [
      "No food resupply between Kalamunda and Dwellingup (206 km). Mundaring Weir Hotel (17.2 km) has meals but no walker supplies.",
      "Road access for food drops from home: Perth Hills Discovery Centre (19.1 km), Dale Road (60.0 km), Brookton Highway (73.0 km), Albany Highway (142.6 km).",
    ],
  },
  {
    h: "Getting there and back",
    p: [
      "Transperth buses 296 and 299 run from Perth to Kalamunda bus station, about 30 minutes, or get dropped off.",
      "Brookton Highway is about 33 km along the highway from Kelmscott.",
      "Mundaring Weir wall gates close at 5 pm (4 pm in winter). There's a signed alternative route.",
    ],
    guessNote: "TransWA coaches serve Dwellingup, Collie, Balingup, Pemberton, Walpole, Denmark and Albany: confirm timetables.",
  },
  {
    h: "Dogs",
    p: [
      "Pet dogs can't come: Section 1 runs through water catchments and national parks. Only a formally approved assistance dog is allowed, after WA approval and talking to DBCA's Recreation and Trails Unit.",
      "1080 fox baits are laid in these parks and are fatal to dogs. If an approved dog does go: lead, basket muzzle, check baiting maps, plan with your vet.",
    ],
  },
  {
    h: "Rules",
    p: [
      "Camp only at campsites. Groups of 8 or more staying overnight send the Foundation a group notification. Leave a trip intention with someone you trust.",
      "No open fires in the southern sections; several campsites have no fire rings.",
    ],
  },
];

export const SOURCES = [
  { t: "Distance calculator (all km)", u: "https://www.bibbulmuntrack.org.au/trip-planner/distance-calculator/" },
  { t: "Track sections", u: "https://www.bibbulmuntrack.org.au/trip-planner/track-sections/" },
  { t: "Track conditions", u: "https://www.bibbulmuntrack.org.au/trip-planner/track-conditions/", guess: true },
  { t: "Foundation FAQ", u: "https://www.bibbulmuntrack.org.au/the-track/frequently-asked-questions/" },
  { t: "AllTrails list", u: "https://www.alltrails.com/lists/bibbulmun-track--6" },
  { t: "Explore Parks: pets and baiting", u: "https://exploreparks.dbca.wa.gov.au/pets-parks" },
];
