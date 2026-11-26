import type { CommunityCategory } from '../types';

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function sanitizePlainText(input: string, maxLength = 500): string {
  return input
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/[<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

export function validateCoordinates(latRaw: string, lonRaw: string): ValidationResult & {
  latitude?: number;
  longitude?: number;
} {
  const latitude = Number(latRaw);
  const longitude = Number(lonRaw);

  if (!latRaw.trim() || !lonRaw.trim() || Number.isNaN(latitude) || Number.isNaN(longitude)) {
    return { valid: false, error: 'Enter valid numeric latitude and longitude values.' };
  }
  if (latitude < -90 || latitude > 90) {
    return { valid: false, error: 'Latitude must be between -90 and 90 degrees.' };
  }
  if (longitude < -180 || longitude > 180) {
    return { valid: false, error: 'Longitude must be between -180 and 180 degrees.' };
  }
  return { valid: true, latitude: Number(latitude.toFixed(4)), longitude: Number(longitude.toFixed(4)) };
}

export function validateAssistantQuestion(raw: string): ValidationResult & { sanitized?: string } {
  const sanitized = sanitizePlainText(raw, 600);
  if (!sanitized) {
    return { valid: false, error: 'Please enter an air quality or routine question before submitting.' };
  }
  if (sanitized.length < 4) {
    return { valid: false, error: 'Please provide a slightly more specific question (at least 4 characters).' };
  }
  return { valid: true, sanitized };
}

export function validateTravelDistance(rawDistance: string | number): ValidationResult & { value?: number } {
  const value = typeof rawDistance === 'number' ? rawDistance : Number(rawDistance);
  if (!Number.isFinite(value) || value <= 0) {
    return { valid: false, error: 'Travel distance must be a positive number greater than 0 km.' };
  }
  if (value > 500) {
    return { valid: false, error: 'Enter a single-trip urban or regional distance up to 500 km.' };
  }
  return { valid: true, value: Number(value.toFixed(1)) };
}

const PERSONAL_ADDRESS_PATTERNS = [
  /\b(?:flat|apt|apartment|house|door|plot|bungalow|villa|floor)\s*(?:no\.?|#)?\s*\d+/i,
  /\b\d{10}\b/,
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/,
  /\b\d{1,4}\s+[A-Za-z]+\s+(?:street|st\.|lane|ln\.|avenue|ave\.|apartment)\b/i,
];

const VALID_COMMUNITY_CATEGORIES: CommunityCategory[] = [
  'construction_dust',
  'smoke',
  'waste_burning',
  'vehicle_emissions',
  'other',
];

export function validateCommunityReport(input: {
  category: string;
  areaName: string;
  description: string;
}): ValidationResult & { areaName?: string; description?: string } {
  if (!VALID_COMMUNITY_CATEGORIES.includes(input.category as CommunityCategory)) {
    return { valid: false, error: 'Select a valid pollution observation category.' };
  }

  const areaName = sanitizePlainText(input.areaName, 80);
  const description = sanitizePlainText(input.description, 320);

  if (areaName.length < 3) {
    return {
      valid: false,
      error: 'Enter a general neighborhood, intersection, or ward name (at least 3 characters).',
    };
  }

  const combined = `${areaName} ${description}`;
  for (const pattern of PERSONAL_ADDRESS_PATTERNS) {
    if (pattern.test(combined)) {
      return {
        valid: false,
        error:
          'For privacy, please avoid exact flat/house numbers, phone numbers, or email addresses. Use only a general locality or junction name.',
      };
    }
  }

  return { valid: true, areaName, description };
}

export function validateTimeString(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}
