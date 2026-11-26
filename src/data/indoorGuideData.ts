import type { IndoorChecklistItem, IndoorGuideRoom } from '../types';

export const INDOOR_GUIDE_ROOMS: IndoorGuideRoom[] = [
  {
    id: 'bedroom',
    name: 'Bedrooms',
    summary:
      'People spend roughly 7–9 continuous hours sleeping; keeping bedroom PM2.5 low provides one of the highest daily exposure reductions.',
    primaryRisks: ['Overnight winter smog infiltration', 'Bedding dust mites', 'Stale indoor CO₂ if tightly sealed'],
    guidancePoints: [
      {
        heading: 'HEPA Filtration & Sizing',
        body: 'Select a true HEPA (H13/H14) purifier whose Clean Air Delivery Rate (CADR) suits the room floor area. Run it continuously on a quiet low/medium setting overnight with doors closed.',
      },
      {
        heading: 'Filter Maintenance',
        body: 'Vacuum washable mesh pre-filters every 2–4 weeks during heavy smog months and replace main HEPA cartridges according to runtime hours (typically 6–12 months) so airflow stays effective.',
      },
      {
        heading: 'Humidity & Bedding Dust',
        body: 'Keep relative humidity between 40–55% to discourage mold and dust mites. Wash pillowcases and sheets weekly in warm water and damp-wipe nightstands instead of dry dusting.',
      },
    ],
  },
  {
    id: 'kitchen',
    name: 'Kitchens',
    summary:
      'High-heat tempering (tadka), frying, and gas combustion can spike indoor PM2.5 and NO₂ well above outdoor smog levels within minutes.',
    primaryRisks: ['Cooking oil aerosols & PM2.5 spikes', 'Gas stove NO₂ & CO emissions', 'Excess moisture & grease buildup'],
    guidancePoints: [
      {
        heading: 'Exhaust Hood & Cross-Airflow',
        body: 'Switch on a ducted chimney or exhaust fan before igniting the stove and keep it running 10–15 minutes after cooking ends. Recirculating hoods without clean grease/carbon filters do not remove NO₂.',
      },
      {
        heading: 'Cooking Emission Controls',
        body: 'Cover pans when simmering, use back burners directly beneath the exhaust intake, and prefer induction or electric appliances when practical to eliminate indoor gas combustion byproducts.',
      },
      {
        heading: 'Isolate Cooking Smells from Sleeping Areas',
        body: 'Keep bedroom doors shut during frying or roasting so fine aerosols do not migrate into sleeping zones.',
      },
    ],
  },
  {
    id: 'living',
    name: 'Living Rooms',
    summary:
      'Shared family zones experience frequent door openings, footwear-tracked dust, and indoor combustion sources like incense or candles.',
    primaryRisks: ['Tracked outdoor road dust', 'Incense, dhoop, mosquito coils & candles', 'Window draft leaks facing roadways'],
    guidancePoints: [
      {
        heading: 'Eliminate Indoor Smoke & Combustion',
        body: 'Avoid burning incense sticks, dhoop, scented candles, or mosquito coils indoors during smog season—these release concentrated fine particles and volatile compounds directly into breathing space.',
      },
      {
        heading: 'Dust Reduction & Entry Control',
        body: 'Adopt a shoes-off entryway with a washable doormat. Damp-mop hard floors or use a HEPA-filtered vacuum rather than dry brooms that resuspend settled PM10.',
      },
      {
        heading: 'Smart Ventilation Timing',
        body: 'Keep balcony doors and road-facing windows closed when outdoor US AQI exceeds 100. Open briefly for 15–20 minutes only when hourly air quality improves to lower indoor CO₂.',
      },
    ],
  },
  {
    id: 'workspace',
    name: 'Workspaces',
    summary:
      'Long seated desk hours in closed rooms can elevate indoor CO₂ (causing drowsiness) alongside printer toner particulates and dust.',
    primaryRisks: ['CO₂ accumulation in sealed study rooms', 'Laser printer & copier ultrafine emissions', 'Dry air discomfort'],
    guidancePoints: [
      {
        heading: 'Balance Filtration with Fresh Air',
        body: 'Pair a quiet desk-side HEPA purifier with brief ventilation breaks when outdoor AQI permits, preventing both fine particulate buildup and stagnant CO₂.',
      },
      {
        heading: 'Equipment Placement',
        body: 'Place laser printers away from breathing zones and avoid harsh aerosol cleaning sprays or plug-in synthetic air fresheners.',
      },
      {
        heading: 'Thermal & Humidity Comfort',
        body: 'Maintain moderate indoor humidity (35–55%). Very dry winter air irritates airways, while excessive moisture (>60%) promotes mold growth.',
      },
    ],
  },
  {
    id: 'community',
    name: 'Schools & Community Spaces',
    summary:
      'Classrooms, clinics, and senior centers house vulnerable age groups where practical ventilation and filtration decisions have broad impact.',
    primaryRisks: ['High occupancy CO₂ & airborne transmission', 'Outdoor playground dust & idling pickup vehicles', 'Chalk and floor dust'],
    guidancePoints: [
      {
        heading: 'No-Idling Pickup Zones',
        body: 'Coordinate with school administrators to enforce engine-off rules for buses and cars waiting outside gates, cutting localized NO₂ and diesel particulate plumes.',
      },
      {
        heading: 'Classroom Filtration & Activities',
        body: 'On Unhealthy AQI days (US AQI > 150), move morning assemblies and physical education indoors, keep corridor windows shut, and run properly maintained portable HEPA units or MERV-13 HVAC filters.',
      },
      {
        heading: 'Wet Cleaning Protocols',
        body: 'Schedule damp mopping after school hours rather than dry sweeping between classes so children are not exposed to resuspended coarse dust.',
      },
    ],
  },
];

export const INDOOR_CHECKLIST_ITEMS: IndoorChecklistItem[] = [
  {
    id: 'chk-bed-hepa',
    room: 'bedroom',
    title: 'Run bedroom HEPA purifier with doors & windows closed overnight',
    detail: 'Verify intake grills have at least 20–30 cm clearance from walls and curtains.',
    frequency: 'Daily on high-AQI nights',
    topic: 'HEPA',
  },
  {
    id: 'chk-bed-prefilter',
    room: 'bedroom',
    title: 'Inspect and clean HEPA mesh pre-filter',
    detail: 'Gently vacuum dust from the pre-filter every 2–4 weeks; replace main HEPA filter on schedule.',
    frequency: 'Every 2–4 weeks',
    topic: 'HEPA',
  },
  {
    id: 'chk-bed-humidity',
    room: 'bedroom',
    title: 'Check indoor relative humidity (target 40–55%)',
    detail: 'Use a simple hygrometer to avoid overly dry winter air or damp mold conditions.',
    frequency: 'Weekly',
    topic: 'Humidity',
  },
  {
    id: 'chk-kit-exhaust',
    room: 'kitchen',
    title: 'Run ducted chimney / exhaust fan before & 10 min after cooking',
    detail: 'Captures cooking PM2.5 oil aerosols and gas stove NO₂ before they spread indoors.',
    frequency: 'Every meal',
    topic: 'Cooking',
  },
  {
    id: 'chk-kit-grease',
    room: 'kitchen',
    title: 'Clean kitchen exhaust baffle / mesh filters',
    detail: 'Grease-clogged filters lose suction and leave cooking smoke lingering in the home.',
    frequency: 'Monthly',
    topic: 'Cooking',
  },
  {
    id: 'chk-kit-lids',
    room: 'kitchen',
    title: 'Use pot lids and close bedroom doors during high-heat cooking',
    detail: 'Minimizes steam and fine particulate migration into sleeping rooms.',
    frequency: 'Daily',
    topic: 'Cooking',
  },
  {
    id: 'chk-liv-nosmoke',
    room: 'living',
    title: 'Keep home free of incense, dhoop, candles, and mosquito coils',
    detail: 'Eliminates avoidable indoor combustion spikes during winter smog days.',
    frequency: 'Daily',
    topic: 'Combustion',
  },
  {
    id: 'chk-liv-dampmop',
    room: 'living',
    title: 'Damp-mop floors & wipe surfaces instead of dry sweeping',
    detail: 'Captures settled PM10 dust without kicking particles back into breathing air.',
    frequency: 'Daily / alternate days',
    topic: 'Dust',
  },
  {
    id: 'chk-liv-seals',
    room: 'living',
    title: 'Check door sweeps and window weather-stripping facing roads',
    detail: 'Simple silicone or foam strips cut draft infiltration from polluted streets.',
    frequency: 'Seasonal',
    topic: 'Ventilation',
  },
  {
    id: 'chk-wrk-vent',
    room: 'workspace',
    title: 'Time brief 15-minute ventilation only during lower-AQI windows',
    detail: 'Clears accumulated workspace CO₂ without flooding the room with peak traffic smog.',
    frequency: 'As forecast permits',
    topic: 'Ventilation',
  },
  {
    id: 'chk-wrk-dust',
    room: 'workspace',
    title: 'Keep electronics, bookshelves, and AC intake screens dust-free',
    detail: 'Prevents recirculated dust when space heaters or AC fans operate.',
    frequency: 'Weekly',
    topic: 'Dust',
  },
  {
    id: 'chk-com-noidle',
    room: 'community',
    title: 'Advocate for engine-off pickup zones at schools & apartment gates',
    detail: 'Directly reduces diesel and petrol exhaust plumes where children wait outdoors.',
    frequency: 'Ongoing',
    topic: 'Combustion',
  },
  {
    id: 'chk-com-filters',
    room: 'community',
    title: 'Verify shared room HVAC / purifier filter maintenance logs',
    detail: 'Confirm filters in classrooms or community halls are cleaned or replaced before winter.',
    frequency: 'Seasonal',
    topic: 'HEPA',
  },
];
