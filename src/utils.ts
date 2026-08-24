import { Unit, MonthlyVariables, CalculatedInvoice, MonthRecord, Expense } from './types';
import { TOTAL_APARTMENT_AREA, TOTAL_BUILDING_AREA } from './data';

// Calendar names in dual languages
export const MONTH_NAMES = {
  MK: [
    'Јануари', 'Февруари', 'Март', 'Април', 'Мај', 'Јуни',
    'Јули', 'Август', 'Септември', 'Октомври', 'Ноември', 'Декември'
  ],
  EN: [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]
};

export function formatMonthId(monthId: string, lang: 'MK' | 'EN' = 'MK'): string {
  if (monthId === 'pre-june') {
    return lang === 'MK' ? 'Пред јуни 2026' : 'Pre-June 2026';
  }
  const [year, monthStr] = monthId.split('-');
  const monthIdx = parseInt(monthStr, 10) - 1;
  const monthName = MONTH_NAMES[lang][monthIdx] || monthStr;
  return `${monthName} ${year}`;
}

// Generate list of months starting from June 2026 up to December 2027 for a picker
export function generateMonthList(startMonthId: string = '2026-06', count: number = 24): string[] {
  const [startYear, startMonth] = startMonthId.split('-').map(Number);
  const list: string[] = [];
  
  for (let i = 0; i < count; i++) {
    const currentMonthTotal = (startMonth - 1) + i;
    const year = startYear + Math.floor(currentMonthTotal / 12);
    const month = (currentMonthTotal % 12) + 1;
    const monthStr = month.toString().padStart(2, '0');
    list.push(`${year}-${monthStr}`);
  }
  return list;
}

// Round to integer for monetary display as requested
export function roundToDenar(num: number): number {
  return Math.round(num);
}

export function formatDenar(amount: number, lang: 'MK' | 'EN' = 'MK'): string {
  const rounded = roundToDenar(amount); 
  if (lang === 'MK') {
    return `${rounded.toLocaleString('mk-MK')} ден.`;
  }
  return `${rounded.toLocaleString('en-US')} den.`;
}

export function formatDenarExact(amount: number, lang: 'MK' | 'EN' = 'MK'): string {
  const rounded = roundToDenar(amount);
  if (lang === 'MK') {
    return `${rounded.toLocaleString('mk-MK')} ден.`;
  }
  return `${rounded.toLocaleString('en-US')} den.`;
}

/**
 * Calculates invoices for a series of months in chronological order.
 * Rolling forward balances automatically.
 */
export function calculateChronologicalInvoices({
  units,
  monthIds, // sorted chronologically, e.g. ["2026-06", "2026-07", ...]
  records,  // Map of monthId -> MonthRecord
  startingDebts, // Map of unitId -> Pre-June starting debt
  preJunePayments = {},
  apartmentFixedRatePerM2 = 2,
  storeFixedRatePerM2 = 5
}: {
  units: Unit[];
  monthIds: string[];
  records: Record<string, MonthRecord>;
  startingDebts: Record<string, number>;
  preJunePayments?: Record<string, number>;
  apartmentFixedRatePerM2?: number;
  storeFixedRatePerM2?: number;
}): Record<string, CalculatedInvoice[]> {
  
  const results: Record<string, CalculatedInvoice[]> = {};
  
  // Track continuous running debts of each unit (starting with initial debts)
  const runningDebts: Record<string, number> = { ...startingDebts };
  
  // Track current active rates, updated if a month has specific overrides
  let currentApartmentRate = apartmentFixedRatePerM2;
  let currentStoreRate = storeFixedRatePerM2;
  
  for (const monthId of monthIds) {
    const record = records[monthId] || {
      monthId,
      variables: { electricity: 0, cleaning: 0, elevator: 0, accounting: 0, management: 0, bankFees: 0, investment: 0, misc: 0 },
      payments: {}
    };
    
    // Update rates if month has overrides
    if (record.fixedRates) {
      currentApartmentRate = record.fixedRates.apartment;
      currentStoreRate = record.fixedRates.store;
    }
    
    const vars = record.variables;
    const monthPayments = record.payments;
    const monthInvoices: CalculatedInvoice[] = [];
    const isFirstMonth = monthId === monthIds[0];
    
    for (const unit of units) {
      const isApartment = unit.type === 'apartment';
      
      // 1. Fixed Charge
      const fixedRate = isApartment ? currentApartmentRate : currentStoreRate;
      const fixedCharge = roundToDenar(unit.area * fixedRate);
      
      // 2. Variable Charges
      // Shared costs are divided per m2: unit.area / TOTAL_BUILDING_AREA
      // Electricity and Elevator are only charged to apartments, divided per m2: unit.area / TOTAL_APARTMENT_AREA
      
      const electricityCharge = isApartment 
        ? roundToDenar((vars.electricity || 0) * (unit.area / TOTAL_APARTMENT_AREA))
        : 0;
        
      const elevatorCharge = isApartment
        ? roundToDenar((vars.elevator || 0) * (unit.area / TOTAL_APARTMENT_AREA))
        : 0;
        
      const cleaningCharge = roundToDenar((vars.cleaning || 0) * (unit.area / TOTAL_BUILDING_AREA));
      const accountingCharge = roundToDenar((vars.accounting || 0) * (unit.area / TOTAL_BUILDING_AREA));
      const managementCharge = roundToDenar((vars.management || 0) * (unit.area / TOTAL_BUILDING_AREA));
      const bankFeesCharge = roundToDenar((vars.bankFees || 0) * (unit.area / TOTAL_BUILDING_AREA));
      const investmentCharge = roundToDenar((vars.investment || 0) * (unit.area / TOTAL_BUILDING_AREA));
      const miscCharge = roundToDenar((vars.misc || 0) * (unit.area / TOTAL_BUILDING_AREA));
      
      const totalVariable = roundToDenar(
        electricityCharge + elevatorCharge + cleaningCharge + accountingCharge + managementCharge + bankFeesCharge + investmentCharge + miscCharge
      );
      
      const totalMonthlyCharge = roundToDenar(fixedCharge + totalVariable);
      
      // 3. Debt carried forward
      const beginningDebt = roundToDenar(runningDebts[unit.id] || 0);
      const prePayment = isFirstMonth ? roundToDenar(preJunePayments[unit.id] || 0) : 0;
      const payment = roundToDenar(monthPayments[unit.id] || 0);
      const endingDebt = roundToDenar(beginningDebt - prePayment + totalMonthlyCharge - payment);
      
      // Update running debt for the NEXT month in chronology
      runningDebts[unit.id] = endingDebt;
      
      monthInvoices.push({
        unitId: unit.id,
        type: unit.type,
        number: unit.number,
        owner: unit.owner,
        area: unit.area,
        fixedCharge,
        electricityCharge,
        elevatorCharge,
        cleaningCharge,
        accountingCharge,
        managementCharge,
        bankFeesCharge,
        investmentCharge,
        miscCharge,
        totalVariable,
        totalMonthlyCharge,
        beginningDebt,
        payment,
        preJunePayment: prePayment,
        endingDebt
      });
    }
    
    // Sort so Apartments are sorted numerically, followed by Stores Д1-Д8
    monthInvoices.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'apartment' ? -1 : 1;
      return a.number.localeCompare(b.number, undefined, { numeric: true, sensitivity: 'base' });
    });
    
    results[monthId] = monthInvoices;
  }
  
  return results;
}

export function macedonianNumberToWords(num: number): string {
  if (num === 0) return 'нула';
  
  const units = ['', 'еден', 'два', 'три', 'четири', 'пет', 'шест', 'седум', 'осум', 'девет'];
  const unitsFem = ['', 'една', 'две', 'три', 'четири', 'пет', 'шест', 'седум', 'осум', 'девет'];
  const teens = ['десет', 'единаесет', 'дванаесет', 'тринаесет', 'четиринаесет', 'петнаесет', 'шеснаесет', 'седумнаесет', 'осумнаесет', 'деветнаесет'];
  const tens = ['', 'десет', 'дваесет', 'триесет', 'четириесет', 'педесет', 'шеесет', 'седумдесет', 'осумдесет', 'деведесет'];
  const hundreds = ['', 'сто', 'двесте', 'триста', 'четиристотини', 'петстотини', 'шестстотини', 'седумстотини', 'осумстотини', 'деветстотини'];

  function convertLess1000(n: number, isFeminine = false): string {
    if (n === 0) return '';
    let res = '';
    const h = Math.floor(n / 100);
    const rem = n % 100;
    
    if (h > 0) {
      res += hundreds[h];
    }
    
    if (rem > 0) {
      if (res !== '') res += ' ';
      
      if (h > 0) {
         res += 'и ';
      }

      if (rem < 10) {
        res += isFeminine ? unitsFem[rem] : units[rem];
      } else if (rem < 20) {
        res += teens[rem - 10];
      } else {
        const t = Math.floor(rem / 10);
        const u = rem % 10;
        res += tens[t];
        if (u > 0) {
          res += ' и ' + (isFeminine ? unitsFem[u] : units[u]);
        }
      }
    }
    return res;
  }

  const thousands = Math.floor(num / 1000);
  const remainder = num % 1000;
  let result = '';

  if (thousands > 0) {
    if (thousands === 1) {
      result += 'една илјада';
    } else {
      result += convertLess1000(thousands, true) + ' илјади';
    }
  }

  if (remainder > 0) {
    if (result !== '') {
      if (remainder < 100 || remainder % 100 === 0) {
        result += ' и ';
      } else {
        result += ' ';
      }
    }
    result += convertLess1000(remainder, false);
  }

  return result.replace(/\s+/g, ' ').trim();
}

export interface BalanceBreakdown {
  bank: number;
  reserve: number;
  operating: number;
}

export function calculateBalancesForMonth({
  monthId,
  monthIds,
  calculatedInvoicesByMonth,
  expenses,
  openingBalances,
  balanceOverrides,
  tmobilePaid,
  tmobileRates
}: {
  monthId?: string | null;
  monthIds: string[];
  calculatedInvoicesByMonth: Record<string, CalculatedInvoice[]>;
  expenses: Expense[];
  openingBalances: { bank: number; reserve: number } | null;
  balanceOverrides?: any;
  tmobilePaid?: Record<string, boolean>;
  tmobileRates?: Record<string, number>;
}): BalanceBreakdown {
  const selectedMonthId = monthId;

  // Sort monthIds chronologically
  const sortedMonthIds = [...monthIds].sort();

  const initReserve = openingBalances?.reserve || 0;
  const initBank = openingBalances?.bank || 0;
  const initOperating = Math.max(0, initBank - initReserve);

  let runningOperating = initOperating;
  let runningReserve = initReserve;

  for (const mId of sortedMonthIds) {
    if (selectedMonthId && mId > selectedMonthId) {
      break;
    }

    // 1. Calculate incomes collected for this month
    let monthPayments = 0;
    let monthReserveRevenue = 0;
    const invoices = calculatedInvoicesByMonth[mId] || [];
    invoices.forEach(inv => {
      if (inv.payment > 0) {
        monthPayments += inv.payment;
        if (inv.totalMonthlyCharge > 0) {
          const ratio = inv.fixedCharge / inv.totalMonthlyCharge;
          monthReserveRevenue += inv.payment * ratio;
        }
      }
    });

    if (tmobilePaid && tmobilePaid[mId]) {
      const rate = tmobileRates && tmobileRates[mId] !== undefined ? tmobileRates[mId] : 61.50;
      const tmobileAmt = Math.round(300 * rate);
      monthPayments += tmobileAmt;
      monthReserveRevenue += tmobileAmt;
    }

    const monthOperatingRevenue = monthPayments - monthReserveRevenue;

    // 2. Calculate expenses spent this month
    const monthExpensesList = expenses ? expenses.filter(exp => exp.monthId === mId || (exp.date && exp.date.startsWith(mId))) : [];
    const monthExpensesTotal = monthExpensesList.reduce((sum, exp) => sum + exp.amount, 0);
    const monthReserveSpent = monthExpensesList
      .filter(exp => exp.fundType === 'reserve')
      .reduce((sum, exp) => sum + exp.amount, 0);
    const monthOperatingSpent = monthExpensesTotal - monthReserveSpent;

    if (balanceOverrides && balanceOverrides[mId]) {
      const ov = balanceOverrides[mId];
      if (ov.bank !== undefined) {
        const res = ov.reserve !== undefined ? ov.reserve : 0;
        const op = ov.operating !== undefined ? ov.operating : (ov.bank - res);
        runningOperating = op;
        runningReserve = res;
      } else {
        runningReserve = runningReserve + monthReserveRevenue - monthReserveSpent;
        runningOperating = runningOperating + monthOperatingRevenue - monthOperatingSpent;
      }
    } else {
      // Pure chronological addition of incomes and subtraction of costs
      runningReserve = runningReserve + monthReserveRevenue - monthReserveSpent;
      runningOperating = runningOperating + monthOperatingRevenue - monthOperatingSpent;
    }
  }

  return {
    bank: Math.round(runningOperating + runningReserve),
    reserve: Math.round(runningReserve),
    operating: Math.round(runningOperating)
  };
}
