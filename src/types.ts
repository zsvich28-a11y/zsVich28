export type UnitType = 'apartment' | 'store';

export interface Unit {
  id: string; // e.g., 'stan-1' or 'lokal-d1'
  type: UnitType;
  number: string; // e.g., '1', '2', 'Д1'
  owner: string;
  area: number;
  debts?: number;
  email?: string;
  emailOptIn?: boolean;
}

export interface MonthlyVariables {
  electricity: number;
  cleaning: number;
  elevator: number;
  accounting: number;
  management: number;
  bankFees: number;
  investment: number;
  misc: number;
}

export interface MonthRecord {
  monthId: string; // e.g., '2026-06' (June 2026)
  variables: MonthlyVariables;
  payments: Record<string, number>; // unitId -> amount paid in this month
  fixedRates?: { apartment: number; store: number };
}

export interface CalculatedInvoice {
  unitId: string;
  type: UnitType;
  number: string;
  owner: string;
  area: number;
  
  // Specific breakdowns
  fixedCharge: number;
  electricityCharge: number;
  elevatorCharge: number;
  cleaningCharge: number;
  accountingCharge: number;
  managementCharge: number;
  bankFeesCharge: number;
  investmentCharge: number;
  miscCharge: number;
  
  // Totals
  totalVariable: number;
  totalMonthlyCharge: number;
  
  // Financial progress
  beginningDebt: number;
  payment: number;
  preJunePayment?: number;
  endingDebt: number;
  customAddress?: string;
  isD7Split?: boolean;
  d7SplitRatio?: number;
}

export interface AppConfig {
  apartmentFixedRatePerM2: number; // default 2
  storeFixedRatePerM2: number;     // default 5
  startingMonthId: string;        // default '2026-06'
}

export type Language = 'MK' | 'EN';

export interface Expense {
  id: string;
  monthId: string;
  date: string;
  description: string;
  amount: number;
  fundType: 'current' | 'reserve';
  imageUrl?: string; // Contains Base64 data URL of the receipt/doc
}

export interface EmailAttachment {
  filename: string;
  mimeType: string;
  base64Data: string;
}

export interface Announcement {
  id: string;
  date: string;
  title: string;
  content: string;
  priority: 'high' | 'normal' | 'low';
  category: string;
  imageUrls?: string[];
}

export interface FuturePlan {
  id: string;
  title: string;
  description: string;
  status: 'planned' | 'in_progress' | 'completed';
  estimatedCost?: number;
  targetDate?: string;
  imageUrls?: string[];
}

export interface EmergencyContact {
  id: string;
  title: string;
  name: string;
  phone: string;
  note?: string;
}

export interface ReportedIssue {
  id: string;
  date: string;
  apartmentNo: string;
  name: string;
  contact: string;
  issueType: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved';
}

export interface PollVote {
  apartmentNo: string; // e.g. "12" or "Д1"
  optionIndex: number;
  timestamp: string;
}

export interface Poll {
  id: string;
  title: string;
  description: string;
  options: string[]; // e.g. ["ЗА (Одобрувам)", "ПРОТИВ (Не одобрувам)", "ВОЗДРЖАН"]
  startDate: string;
  endDate: string;
  status: 'active' | 'closed';
  category: 'capital' | 'maintenance' | 'rules' | 'general';
  votes: PollVote[];
  quorumRequired: number; // e.g. 51 for 51% majority
  pins?: Record<string, string>; // unitNo -> 4-digit PIN for this specific voting
}

export interface UnitPin {
  unitNo: string; // e.g. "1", "2", "76", "Д1"
  pin: string;    // e.g. "7K9P23"
}
