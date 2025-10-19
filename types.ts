export interface Testimonial {
  quote: string;
  author: string;
}

export interface CollegeDetails {
  overview: string;
  programHighlights: string;
  diversityAndCulture: string;
  studentExperience: string;
  testimonials: Testimonial[];
  averageGpa?: string;
  acceptanceRate?: string;
}

export interface Scholarship {
  name: string;
  description: string;
  estimatedAmount: string;
  eligibility: string;
  website?: string;
}

export interface College {
  name: string;
  website: string;
  reason: string;
  estimatedTuitionLocal: string;
  estimatedTuitionInternational: string;
  scholarships: Scholarship[];
  details?: CollegeDetails;
  videoUrl?: string;
  // FIX: Add optional id property for Firestore documents to resolve property access errors.
  id?: string;
}

export interface FileData {
  name: string;
  mimeType: string;
  base64: string;
}

export interface DegreePathway {
  name: string;
  description: string;
  careerOptions: string[];
}

export interface StudentAnalysis {
    summary: string;
    pathways: DegreePathway[];
    keyStrengths: string[];
    studentName?: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  message: string;
}

// FIX: Define missing User interface.
export interface User {
  uid: string;
  name: string;
  email: string;
  picture: string;
}

// FIX: Define missing AnalysisData interface.
export interface AnalysisData {
    analysis: StudentAnalysis;
    colleges: College[];
    fileName: string;
}

// FIX: Define missing AnalysisRecord interface.
export interface AnalysisRecord extends AnalysisData {
    id: string;
    timestamp: number;
}

export interface JobMarketOverview {
  overallOutlook: string;
  growthRate: string;
  competitionLevel: string;
}

export interface CareerPath {
  title: string;
  description: string;
}

export interface CareerData {
  jobMarketOverview: JobMarketOverview;
  careerPathCount: number;
  industryCount: number;
  averageSalaryRange: string;
  topCareerPaths: CareerPath[];
}

export interface CareerPathDetails {
  dayToDayResponsibilities: string[];
  requiredSkills: string[];
  careerProgression: string;
}

// FIX: Define AIStudio interface and declare it on the global Window object
// in a single global declaration block to avoid subsequent property declaration errors.
declare global {
    interface AIStudio {
        hasSelectedApiKey: () => Promise<boolean>;
        openSelectKey: () => Promise<void>;
    }

    interface Window {
        aistudio?: AIStudio;
    }
}