import { PRIORITIES } from './constants.js';

/**
 * Transparent, rule-based priority suggestion (no AI involved).
 *
 * score = category weight + sum of matched keyword weights.
 *   score >= 6 -> critical, >= 3 -> high, >= 1 -> medium, otherwise low.
 * Every rule that fired is returned in `reasons`, so the student/admin can see WHY.
 */

const CATEGORY_WEIGHTS = {
  electricity: { weight: 2, label: 'Electricity problems can affect safety and teaching' },
  'water supply': { weight: 2, label: 'Water supply is an essential service' },
  'laboratory equipment': { weight: 1, label: 'Laboratory work depends on working equipment' },
  'it and wi-fi': { weight: 1, label: 'IT/Wi-Fi affects many users' },
  hostel: { weight: 1, label: 'Hostel issues affect student living conditions' },
  'cleaning and sanitation': { weight: 1, label: 'Sanitation affects health' },
  library: { weight: 0, label: '' },
  canteen: { weight: 0, label: '' },
  'classroom facilities': { weight: 0, label: '' },
  other: { weight: 0, label: '' },
};

const KEYWORD_RULES = [
  // Safety hazards
  { words: ['fire', 'smoke', 'sparking', 'sparks', 'short circuit', 'electric shock', 'electrocut', 'gas leak', 'burning smell', 'exposed wire', 'live wire'], weight: 6, label: 'Possible safety hazard' },
  { words: ['injur', 'accident', 'unsafe', 'danger', 'collapse', 'flood', 'sewage', 'overflow'], weight: 4, label: 'Risk of injury or health hazard' },
  // Widespread outages
  { words: ['power failure', 'power outage', 'power cut', 'blackout', 'no power', 'no electricity', 'no water', 'no internet', 'wifi down', 'wi-fi down', 'network down', 'server down'], weight: 3, label: 'Service outage' },
  { words: ['entire', 'whole', 'complete', 'completely', 'all computers', 'all the computers', 'all labs', 'all rooms', 'whole building', 'whole floor'], weight: 2, label: 'Affects a large area / many users' },
  { words: ['exam', 'examination', 'practical', 'viva', 'urgent', 'immediately', 'emergency'], weight: 2, label: 'Time-sensitive (exams / urgency)' },
  // Functional faults
  { words: ['not working', 'not functioning', 'broken', 'leaking', 'leakage', 'damaged', 'stopped working', 'out of order', 'faulty', 'dead', 'crashed'], weight: 1, label: 'Something is not working' },
  // Minor / cosmetic
  { words: ['minor', 'small', 'slightly', 'scratch', 'paint', 'cosmetic', 'suggestion', 'request', 'loose', 'squeak', 'dusty', 'stain'], weight: -2, label: 'Appears minor or cosmetic' },
  { words: ['chair', 'bench', 'desk', 'furniture', 'curtain', 'poster', 'notice board'], weight: -1, label: 'Furniture / fittings' },
];

export function suggestPriority({ categoryName = '', title = '', description = '' } = {}) {
  const text = ` ${title} ${description} `.toLowerCase();
  const reasons = [];
  let score = 0;

  const cat = CATEGORY_WEIGHTS[String(categoryName).trim().toLowerCase()];
  if (cat && cat.weight > 0) {
    score += cat.weight;
    reasons.push({ rule: `Category: ${categoryName}`, effect: `+${cat.weight}`, note: cat.label });
  }

  for (const rule of KEYWORD_RULES) {
    const hit = rule.words.find((w) => text.includes(w));
    if (hit) {
      score += rule.weight;
      reasons.push({
        rule: `Keyword "${hit.trim()}"`,
        effect: rule.weight > 0 ? `+${rule.weight}` : `${rule.weight}`,
        note: rule.label,
      });
    }
  }

  let priority = 'low';
  if (score >= 6) priority = 'critical';
  else if (score >= 3) priority = 'high';
  else if (score >= 1) priority = 'medium';

  return { priority, score, reasons };
}

/** Students may not self-select "critical"; it comes from the rules or an admin. */
export function resolveInitialPriority({ studentChoice, suggested }) {
  if (suggested === 'critical') return { priority: 'critical', source: 'rules' };
  if (studentChoice && PRIORITIES.includes(studentChoice)) {
    const capped = studentChoice === 'critical' ? 'high' : studentChoice;
    return { priority: capped, source: capped === suggested ? 'rules' : 'student' };
  }
  return { priority: suggested, source: 'rules' };
}
