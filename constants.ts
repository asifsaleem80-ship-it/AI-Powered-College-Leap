export interface LocationGroup {
  label: string;
  options: string[];
}

export const LOCATIONS: (string | LocationGroup)[] = [
  'Any / Undecided',
  {
    label: 'United States',
    options: [
      'Anywhere in USA',
      'New York, USA',
      'Boston, USA',
      'San Francisco, USA',
      'Los Angeles, USA',
      'Chicago, USA',
    ],
  },
  {
    label: 'United Kingdom',
    options: [
      'Anywhere in UK',
      'London, UK',
      'Edinburgh, UK',
      'Manchester, UK',
    ],
  },
  {
    label: 'Canada',
    options: [
      'Anywhere in Canada',
      'Toronto, Canada',
      'Vancouver, Canada',
      'Montreal, Canada',
    ],
  },
  {
    label: 'Australia & New Zealand',
    options: [
      'Anywhere in Australia',
      'Sydney, Australia',
      'Melbourne, Australia',
      'Brisbane, Australia',
      'Auckland, New Zealand',
    ],
  },
  {
    label: 'Europe',
    options: [
      'Anywhere in Germany',
      'Paris, France',
      'Berlin, Germany',
      'Munich, Germany',
      'Amsterdam, Netherlands',
      'Dublin, Ireland',
      'Zurich, Switzerland',
      'Stockholm, Sweden',
    ],
  },
  {
    label: 'Asia',
    options: [
      'Singapore',
      'Tokyo, Japan',
      'Seoul, South Korea',
      'Hong Kong',
    ],
  },
];

export const DEGREE_PROGRAMS: string[] = [
  'Any / Undecided',
  'Computer Science',
  'Engineering',
  'Business Administration',
  'Medicine & Health Sciences',
  'Fine Arts',
  'Humanities & Social Sciences',
  'Law',
  'Architecture',
  'Data Science & Analytics',
  'Environmental Science',
  'Economics',
];

export const GRADES: string[] = [
    '12th Grade / A-Level',
    '11th Grade / AS-Level',
    '10th Grade / IGCSE / O-Level',
    '9th Grade',
    '8th Grade',
    'IB Diploma Year 2',
    'IB Diploma Year 1',
];

export const SCHOLARSHIP_TYPES: string[] = [
  'Merit-Based',
  'Need-Based',
  'Athletic',
  'Artistic/Talent-Based',
  'Community Service',
  'Minority/Diversity',
];

export const GRANT_AMOUNTS: string[] = [
  'Any',
  '$1,000+',
  '$5,000+',
  '$10,000+',
  'Half Tuition+',
  'Full Ride',
];

export const UNIVERSITY_SIZES: string[] = [
    'Any',
    'Small (< 5,000 students)',
    'Medium (5,000 - 15,000 students)',
    'Large (> 15,000 students)',
];

export const CAMPUS_SETTINGS: string[] = [
    'Any',
    'Urban',
    'Suburban',
    'Rural',
];