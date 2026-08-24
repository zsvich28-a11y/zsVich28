import React from 'react';
import { CalculatedInvoice, Language, MonthRecord, Expense } from '../types';
import { BarChart3, CalendarDays, Printer, FileText, Coins, ArrowUpRight, ArrowDownRight, BookOpen, Download, Building2, Wallet, ShieldCheck, ChevronDown, ChevronUp } from 'lucide-react';
import { formatMonthId, formatDenarExact, calculateBalancesForMonth } from '../utils';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList } from 'recharts';
import MonthlyFinancialReport from './MonthlyFinancialReport';

interface ReportsProps {
  calculatedInvoicesByMonth: Record<string, CalculatedInvoice[]>;
  records: Record<string, MonthRecord>;
  monthIds: string[];
  lang: Language;
  activeYear: string;
  activeMonthId: string;
  apartmentFixedRatePerM2: number;
  storeFixedRatePerM2: number;
  openingBalances?: { bank: number; reserve: number };
  expenses?: Expense[];
  balanceOverrides?: Record<string, { bank?: number; reserve?: number; operating?: number }> | null;
  onUpdateBalanceOverrides?: (overrides: Record<string, { bank?: number; reserve?: number; operating?: number }>) => void;
  onChangeMonth?: (monthId: string) => void;
  tmobilePaid?: Record<string, boolean>;
  tmobileRates?: Record<string, number>;
}

export default function Reports({ 
  calculatedInvoicesByMonth, 
  records,
  monthIds, 
  lang, 
  activeYear,
  activeMonthId,
  apartmentFixedRatePerM2,
  storeFixedRatePerM2,
  openingBalances,
  expenses,
  balanceOverrides = {},
  onUpdateBalanceOverrides,
  onChangeMonth,
  tmobilePaid = {},
  tmobileRates = {}
}: ReportsProps) {
  const [selectedYear, setSelectedYear] = React.useState(activeYear);
  const [selectedMonthId, setSelectedMonthId] = React.useState(activeMonthId);
  const [showDetailedReport, setShowDetailedReport] = React.useState(false);
  const [isOverridesExpanded, setIsOverridesExpanded] = React.useState(false);

  React.useEffect(() => {
    setSelectedYear(activeYear);
  }, [activeYear]);

  React.useEffect(() => {
    setSelectedMonthId(activeMonthId);
  }, [activeMonthId]);

  const currentYear = new Date().getFullYear();
  const nextTenYears = Array.from({ length: 11 }, (_, i) => (currentYear + i).toString());
  const existingYears = Array.from(new Set(monthIds.map(id => id.split('-')[0])));
  const uniqueYears = Array.from(new Set([...existingYears, ...nextTenYears])).sort();
  const t = {
    MK: {
      title: 'Годишни и месечни извештаи',
      monthly: 'Месечен преглед',
      yearly: 'Годишен преглед',
      totalInvoiced: 'Вкупно фактурирано',
      totalPaid: 'Вкупно уплатено',
      balance: 'Салдо',
      printBtn: 'Печати / PDF',
      detailedStatement: 'Месечен биланс (детален извештај)',
      selectMonthTitle: 'Изберете месец за детален извештај:',
      generateBtn: 'Генерирај извештај',
      reserveFundSubtitle: 'Евиденција на сите уплатени средства за резервниот фонд од страна на сопствениците со приказ на тековната состојба.'
    },
    EN: {
      title: 'Monthly & Yearly Reports',
      monthly: 'Monthly Overview',
      yearly: 'Yearly Overview',
      totalInvoiced: 'Total Invoiced',
      totalPaid: 'Total Paid',
      balance: 'Balance',
      printBtn: 'Print / PDF',
      detailedStatement: 'Detailed Monthly Financial Statement',
      selectMonthTitle: 'Select month for detailed report:',
      generateBtn: 'Generate Detailed Report',
      reserveFundSubtitle: 'Detailed register tracking every tenant/store payment portion allocated to the reserve fund and current running balances.'
    }
  }[lang];

  // Aggregation
  const reportingYear = selectedYear;

  // Retrieve selected month's rate overrides
  const selectedRecord = records[selectedMonthId];
  let currentAptRate = apartmentFixedRatePerM2;
  let currentStoreRate = storeFixedRatePerM2;
  if (selectedRecord && selectedRecord.fixedRates) {
    currentAptRate = selectedRecord.fixedRates.apartment;
    currentStoreRate = selectedRecord.fixedRates.store;
  }

  // RESERVE FUND DETAILED CALCULATIONS
  const reserveStartingBalance = openingBalances?.reserve || 0;
  // Calculate starting reserve balance for selected month taking overrides and prior propagation into account
  const sortedMonthIds = [...monthIds].sort();
  const priorMonths = sortedMonthIds.filter(mId => mId < selectedMonthId);
  let startOfMonthBalance = 0;

  const currentOverrides = balanceOverrides?.[selectedMonthId];

  // 2. Starting reserve balance for selected month
  if (currentOverrides && currentOverrides.reserve !== undefined && currentOverrides.reserve !== null) {
    startOfMonthBalance = currentOverrides.reserve;
  } else if (currentOverrides && currentOverrides.bank !== undefined && currentOverrides.operating !== undefined) {
    startOfMonthBalance = currentOverrides.bank - currentOverrides.operating;
  } else if (priorMonths.length > 0) {
    const lastPriorMonthId = priorMonths[priorMonths.length - 1];
    const priorBalances = calculateBalancesForMonth({
      monthId: lastPriorMonthId,
      monthIds,
      calculatedInvoicesByMonth,
      expenses: expenses || [],
      openingBalances: openingBalances || null,
      balanceOverrides
    });
    startOfMonthBalance = priorBalances.reserve;
  } else {
    startOfMonthBalance = openingBalances?.reserve || 0;
  }

  // 3. Current month items (ledger items):
  interface LedgerItem {
    id: string;
    unitId?: string;
    description: string;
    totalAmount: number;
    allocatedReserve: number;
    type: 'income' | 'expense';
  }

  const ledgerItems: LedgerItem[] = [];

  // Current month incomes (payments):
  const activeInvoices = calculatedInvoicesByMonth[selectedMonthId] || [];
  activeInvoices.forEach(inv => {
    if (inv.payment > 0 && inv.totalMonthlyCharge > 0) {
      const ratio = inv.fixedCharge / inv.totalMonthlyCharge;
      const allocatedReserve = inv.payment * ratio;
      if (allocatedReserve > 0) {
        ledgerItems.push({
          id: `pay-${inv.unitId}`,
          unitId: inv.unitId,
          description: `${inv.type === 'apartment' ? (lang === 'MK' ? 'Стан' : 'Apt') : (lang === 'MK' ? 'Дуќан' : 'Store')} ${inv.number} - ${inv.owner}`,
          totalAmount: inv.payment,
          allocatedReserve: allocatedReserve,
          type: 'income'
        });
      }
    }
  });

  if (tmobilePaid && tmobilePaid[selectedMonthId]) {
    const rate = tmobileRates && tmobileRates[selectedMonthId] !== undefined ? tmobileRates[selectedMonthId] : 61.50;
    const tmobileAmt = Math.round(300 * rate);
    ledgerItems.push({
      id: `pay-tmobile-${selectedMonthId}`,
      unitId: 'tmobile',
      description: lang === 'MK' ? 'Македонски Телеком (Т-Мобиле) - Антенерина' : 'Makedonski Telekom (T-Mobile) - Antenna Fee',
      totalAmount: tmobileAmt,
      allocatedReserve: tmobileAmt,
      type: 'income'
    });
  }

  // Current month expenses (spent):
  const activeExpenses = (expenses || []).filter(e => e.fundType === 'reserve' && (e.monthId === selectedMonthId || (e.date && e.date.startsWith(selectedMonthId))));
  activeExpenses.forEach(exp => {
    ledgerItems.push({
      id: `exp-${exp.id}`,
      description: exp.description || (lang === 'MK' ? 'Трошок од резервен фонд' : 'Reserve fund expense'),
      totalAmount: exp.amount,
      allocatedReserve: -exp.amount,
      type: 'expense'
    });
  });

  // Compute running balance for each transaction
  let tempRunning = startOfMonthBalance;
  const ledgerWithBalances = ledgerItems.map(item => {
    tempRunning += item.allocatedReserve;
    return {
      ...item,
      runningBalance: tempRunning
    };
  });

  const totalCollectedThisMonth = ledgerItems
    .filter(item => item.type === 'income')
    .reduce((sum, item) => sum + item.allocatedReserve, 0);

  const totalSpentThisMonth = ledgerItems
    .filter(item => item.type === 'expense')
    .reduce((sum, item) => sum + Math.abs(item.allocatedReserve), 0);

  const initialCalculatedMonthBalance = tempRunning;
  const netMonthIncrease = totalCollectedThisMonth - totalSpentThisMonth;

  // Total Bank Account Balance calculation for Reports using central utility:
  const autoBalances = calculateBalancesForMonth({
    monthId: selectedMonthId,
    monthIds,
    calculatedInvoicesByMonth,
    expenses: expenses || [],
    openingBalances: openingBalances || null,
    balanceOverrides: null,
    tmobilePaid,
    tmobileRates
  });

  const finalBalances = calculateBalancesForMonth({
    monthId: selectedMonthId,
    monthIds,
    calculatedInvoicesByMonth,
    expenses: expenses || [],
    openingBalances: openingBalances || null,
    balanceOverrides: balanceOverrides,
    tmobilePaid,
    tmobileRates
  });

  const calculatedEndingBankBalance = autoBalances.bank;
  const calculatedEndingMonthBalance = autoBalances.reserve;

  // Apply overrides if defined for the selected month (carried forward and resolved by calculateBalancesForMonth)
  const endingBankBalance = finalBalances.bank;
  const endingMonthBalance = finalBalances.reserve;
  const currentOperatingFundBalance = finalBalances.operating;

  const monthlyData = Array.from({ length: 12 }, (_, i) => {
    const month = (i + 1).toString().padStart(2, '0');
    const monthId = `${reportingYear}-${month}`;
    const invoices = calculatedInvoicesByMonth[monthId] || [];
    const totalInvoiced = invoices.reduce((sum, inv) => sum + inv.totalMonthlyCharge, 0);
    let totalPaid = invoices.reduce((sum, inv) => sum + inv.payment, 0);
    if (tmobilePaid && tmobilePaid[monthId]) {
      const rate = tmobileRates && tmobileRates[monthId] !== undefined ? tmobileRates[monthId] : 61.50;
      totalPaid += Math.round(300 * rate);
    }
    
    const percentage = totalInvoiced > 0 ? (totalPaid / totalInvoiced) * 100 : 0;
    
    return {
      month: formatMonthId(monthId, lang).split(' ')[0],
      totalInvoiced,
      totalPaid,
      percentage,
      balance: totalInvoiced - totalPaid,
      year: reportingYear
    };
  });

  const yearlyData: Record<string, { invoiced: number, paid: number }> = {};
  monthlyData.forEach(d => {
    const year = d.year;
    if (!yearlyData[year]) yearlyData[year] = { invoiced: 0, paid: 0 };
    yearlyData[year].invoiced += d.totalInvoiced;
    yearlyData[year].paid += d.totalPaid;
  });

  const downloadCSV = (content: string, filename: string) => {
    // Add UTF-8 BOM to support cyrillic in Excel out-of-the-box
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportYearlyCSV = () => {
    const title = lang === 'MK' ? `ГОДИШЕН ФИНАНСИСКИ ИЗВЕШТАЈ ЗА ${reportingYear}` : `YEARLY FINANCIAL REPORT FOR ${reportingYear}`;
    const headers = lang === 'MK' 
      ? ['Месец', 'Вкупно фактурирано (ден)', 'Вкупно уплатено (ден)', 'Процент на наплата (%)', 'Разлика (ден)']
      : ['Month', 'Total Invoiced (DEN)', 'Total Paid (DEN)', 'Collection Rate (%)', 'Balance (DEN)'];
    
    let csvRows = [];
    csvRows.push(`"${title}"`);
    csvRows.push('');
    csvRows.push(headers.map(h => `"${h}"`).join(','));
    
    let totalInvoicedSum = 0;
    let totalPaidSum = 0;
    
    monthlyData.forEach(d => {
      totalInvoicedSum += d.totalInvoiced;
      totalPaidSum += d.totalPaid;
      csvRows.push([
        `"${d.month}"`,
        Math.round(d.totalInvoiced),
        Math.round(d.totalPaid),
        d.percentage.toFixed(1),
        Math.round(d.totalInvoiced - d.totalPaid)
      ].join(','));
    });
    
    csvRows.push('');
    
    const avgPercentage = totalInvoicedSum > 0 ? (totalPaidSum / totalInvoicedSum) * 100 : 0;
    const totalsRow = lang === 'MK'
      ? ['ВКУПНО', Math.round(totalInvoicedSum), Math.round(totalPaidSum), avgPercentage.toFixed(1), Math.round(totalInvoicedSum - totalPaidSum)]
      : ['TOTAL', Math.round(totalInvoicedSum), Math.round(totalPaidSum), avgPercentage.toFixed(1), Math.round(totalInvoicedSum - totalPaidSum)];
      
    csvRows.push(totalsRow.join(','));
    
    const csvContent = csvRows.join('\n');
    downloadCSV(csvContent, `vich28_yearly_report_${reportingYear}.csv`);
  };

  const exportMonthlyCSV = () => {
    const monthName = formatMonthId(selectedMonthId, lang).toUpperCase();
    const title = lang === 'MK' ? `МЕСЕЧЕН ФИНАНСИСКИ ИЗВЕШТАЈ - ${monthName}` : `MONTHLY FINANCIAL REPORT - ${monthName}`;
    
    let csvRows = [];
    csvRows.push(`"${title}"`);
    csvRows.push('');
    
    // Operating costs
    const opCostsTitle = lang === 'MK' ? 'ОПЕРАТИВНИ ТРОШОЦИ (ВЛЕЗНИ ФАКТУРИ)' : 'OPERATING COSTS (INCOMING INVOICES)';
    csvRows.push(`"${opCostsTitle}"`);
    
    const costLabels = {
      MK: {
        electricity: 'Електрична енергија',
        cleaning: 'Хигиена и чистење',
        elevator: 'Сервис на лифт',
        accounting: 'Сметководствени услуги',
        management: 'Управување',
        bankFees: 'Банкарски провизии',
        investment: 'Инвестиционо одржување',
        misc: 'Друго',
        total: 'ВКУПНО ОПЕРАТИВНИ ТРОШОЦИ'
      },
      EN: {
        electricity: 'Electricity',
        cleaning: 'Cleaning Services',
        elevator: 'Elevator Maintenance',
        accounting: 'Accounting Services',
        management: 'Management Fee',
        bankFees: 'Bank Fees',
        investment: 'Investment Fund',
        misc: 'Miscellaneous',
        total: 'TOTAL OPERATING COSTS'
      }
    }[lang];

    const currentVariables = records[selectedMonthId]?.variables || { electricity: 0, cleaning: 0, elevator: 0, accounting: 0, management: 0, bankFees: 0, investment: 0, misc: 0 };
    const costItemsList = [
      [costLabels.electricity, Math.round(currentVariables.electricity || 0)],
      [costLabels.cleaning, Math.round(currentVariables.cleaning || 0)],
      [costLabels.elevator, Math.round(currentVariables.elevator || 0)],
      [costLabels.accounting, Math.round(currentVariables.accounting || 0)],
      [costLabels.management, Math.round(currentVariables.management || 0)],
      [costLabels.bankFees, Math.round(currentVariables.bankFees || 0)],
      [costLabels.investment, Math.round(currentVariables.investment || 0)],
      [costLabels.misc, Math.round(currentVariables.misc || 0)]
    ];
    
    let totalCostsSum = 0;
    costItemsList.forEach(([lbl, val]) => {
      totalCostsSum += Number(val);
      csvRows.push(`"${lbl}",${val}`);
    });
    csvRows.push(`"${costLabels.total}",${totalCostsSum}`);
    csvRows.push('');
    
    // Fixed Rates
    const ratesTitle = lang === 'MK' ? 'Важечки фиксни стапки (по м2)' : 'Current Fixed Rates (per m2)';
    const rateAptLabel = lang === 'MK' ? 'Станови' : 'Apartments';
    const rateStoreLabel = lang === 'MK' ? 'Дуќани' : 'Stores';
    csvRows.push(`"${ratesTitle}"`);
    csvRows.push(`"${rateAptLabel}",${currentAptRate}`);
    csvRows.push(`"${rateStoreLabel}",${currentStoreRate}`);
    csvRows.push('');
    
    // Detailed Unit Table
    const detailsTitle = lang === 'MK' ? 'ДЕТАЛЕН ПРЕГЛЕД ПО ОБЈЕКТИ' : 'DETAILED UNIT OVERVIEW';
    const headers = lang === 'MK'
      ? ['Објект', 'Сопственик', 'м2', 'Фиксно', 'Варијабилно', 'Задолжено', 'Стар долг', 'Уплатено', 'Крајно салдо']
      : ['Unit', 'Owner', 'm2', 'Fixed', 'Variable', 'Billed', 'Old Debt', 'Paid', 'Ending Balance'];
      
    csvRows.push(`"${detailsTitle}"`);
    csvRows.push(headers.map(h => `"${h}"`).join(','));
    
    const invoicesList = calculatedInvoicesByMonth[selectedMonthId] || [];
    let sumArea = 0;
    let sumFixed = 0;
    let sumVar = 0;
    let sumBilled = 0;
    let sumPrevDebt = 0;
    let sumPayment = 0;
    let sumEndingDebt = 0;
    
    invoicesList.forEach(inv => {
      sumArea += inv.area || 0;
      sumFixed += inv.fixedCharge || 0;
      sumVar += inv.totalVariable || 0;
      sumBilled += inv.totalMonthlyCharge || 0;
      sumPrevDebt += Math.round(inv.beginningDebt || 0);
      sumPayment += inv.payment || 0;
      sumEndingDebt += Math.round(inv.endingDebt || 0);
      
      csvRows.push([
        `"${inv.number}"`,
        `"${inv.owner}"`,
        inv.area,
        inv.fixedCharge,
        inv.totalVariable,
        inv.totalMonthlyCharge,
        Math.round(inv.beginningDebt),
        inv.payment,
        Math.round(inv.endingDebt)
      ].join(','));
    });
    
    const totalLabel = lang === 'MK' ? 'ВКУПНО' : 'TOTAL';
    csvRows.push([
      `"${totalLabel}"`,
      '""',
      sumArea,
      sumFixed,
      sumVar,
      sumBilled,
      sumPrevDebt,
      sumPayment,
      sumEndingDebt
    ].join(','));
    
    const csvContent = csvRows.join('\n');
    downloadCSV(csvContent, `vich28_monthly_report_${selectedMonthId}.csv`);
  };

  const printChart = () => {
    const printWindow = window.open('', '_blank');
    const chartArea = document.getElementById('chart-print-area');
    if (printWindow && chartArea) {
      printWindow.document.write(`
        <html>
          <head>
            <title>${document.title}</title>
            <style>
              @page { size: A4 landscape; margin: 1cm; }
              body { display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
              #chart-print-area { width: 90%; height: 80vh; }
            </style>
          </head>
          <body>
            ${chartArea.outerHTML}
            <script>window.print(); window.close();</script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  return (
    <div className="space-y-6" id="reports-print-area">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-black text-black uppercase tracking-tight">{t.title}</h2>
        <div className="flex gap-2">
          <select 
            value={selectedYear} 
            onChange={(e) => setSelectedYear(e.target.value)}
            className="px-2 py-2 border-2 border-black font-black uppercase text-xs tracking-widest bg-white"
          >
            {uniqueYears.map(year => <option key={year} value={year}>{year}</option>)}
          </select>
          <button
            onClick={exportYearlyCSV}
            className="flex items-center space-x-2 px-4 py-2 border-2 border-black bg-white text-black hover:bg-black hover:text-white transition-all font-black uppercase text-xs tracking-widest print:hidden"
          >
            <Download className="w-4 h-4" />
            <span>{lang === 'MK' ? 'Извези Годишен CSV' : 'Export Yearly CSV'}</span>
          </button>
          <button
            onClick={printChart}
            className="flex items-center space-x-2 px-4 py-2 border-2 border-black bg-white text-black hover:bg-black hover:text-white transition-all font-black uppercase text-xs tracking-widest print:hidden"
          >
            <Printer className="w-4 h-4" />
            <span>{lang === 'MK' ? 'Печати графикон' : 'Print Chart'}</span>
          </button>
        </div>
      </div>

      {/* NEW: Detailed Monthly Financial Statement Generator */}
      <div className="bg-black text-white p-6 border-b-8 border-blue-600 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-white text-black border-2 border-white">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-black uppercase tracking-widest">{t.detailedStatement}</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{t.selectMonthTitle}</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <select 
            value={selectedMonthId} 
            onChange={(e) => {
              setSelectedMonthId(e.target.value);
              if (onChangeMonth) {
                onChangeMonth(e.target.value);
              }
            }}
            className="px-4 py-2 bg-slate-900 border-2 border-slate-700 text-white font-black uppercase text-xs tracking-widest focus:outline-hidden"
          >
            {monthIds.map(mId => <option key={mId} value={mId}>{formatMonthId(mId, lang).toUpperCase()}</option>)}
          </select>
          <button
            onClick={exportMonthlyCSV}
            className="px-6 py-2 bg-blue-600 text-white font-black uppercase text-xs tracking-widest hover:bg-white hover:text-black transition-all border-2 border-blue-600 flex items-center space-x-2 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>{lang === 'MK' ? 'Извези Месечен CSV' : 'Export Month CSV'}</span>
          </button>
          <button
            onClick={() => setShowDetailedReport(true)}
            className="px-6 py-2 bg-yellow-400 text-black font-black uppercase text-xs tracking-widest hover:bg-white transition-all border-2 border-yellow-400 hover:border-black"
          >
            {t.generateBtn}
          </button>
        </div>
      </div>
      
      {/* Detailed Report Modal */}
      {showDetailedReport && (
        <MonthlyFinancialReport
          monthId={selectedMonthId}
          variables={records[selectedMonthId]?.variables || { electricity: 0, cleaning: 0, elevator: 0, accounting: 0, management: 0, bankFees: 0, investment: 0, misc: 0 }}
          invoices={calculatedInvoicesByMonth[selectedMonthId] || []}
          fixedRates={records[selectedMonthId]?.fixedRates || { apartment: apartmentFixedRatePerM2, store: storeFixedRatePerM2 }}
          onClose={() => setShowDetailedReport(false)}
          lang={lang}
        />
      )}

      {/* Reserve Fund General Ledger (Comprehensive Analytical Dashboard) */}
      <div className="bg-white border-2 border-black p-6 space-y-6" id="reserve-fund-general-ledger">
        <div className="border-b-2 border-black pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 bg-yellow-400 text-black px-2.5 py-1 text-[10px] font-black tracking-widest uppercase mb-1.5 border border-black">
              <Coins className="w-3.5 h-3.5 shrink-0" />
              <span>{lang === 'MK' ? 'АНАЛИТИКА НА РЕЗЕРВЕН ФОНД' : 'RESERVE FUND LEDGER'}</span>
            </div>
            <h3 className="text-xl md:text-2xl font-black uppercase tracking-tight text-black leading-none">
              {lang === 'MK' ? `Резервен Фонд: ${formatMonthId(selectedMonthId, lang).toUpperCase()}` : `Reserve Fund: ${formatMonthId(selectedMonthId, lang).toUpperCase()}`}
            </h3>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mt-1.5 leading-relaxed">
              {lang === 'MK' ? t.reserveFundSubtitle : t.reserveFundSubtitle}
            </p>
          </div>
          <div className="flex gap-2">
            <div className="border-2 border-black p-3 bg-slate-50 flex flex-col justify-center text-right font-mono min-w-[200px]">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-0.5">
                {lang === 'MK' ? 'Крајно Салдо на Резервен Фонд' : 'Ending Reserve Balance'}
              </span>
              <span className="text-xl font-black text-amber-700">
                {formatDenarExact(endingMonthBalance, lang)}
              </span>
            </div>
          </div>
        </div>

        {(currentAptRate === 0 || currentStoreRate === 0) && (
          <div className="bg-amber-50 border-2 border-amber-500 p-4 font-sans text-amber-950 space-y-1.5" id="reports-rate-zero-warning">
            <p className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
              <span>⚠️</span>
              {lang === 'MK' 
                ? 'МЕСЕЧНАТА СТАПКА ЗА РЕЗЕРВЕН ФОНД Е ПОСТАВЕНА НА 0 ДЕН.' 
                : 'MONTHLY RESERVE FUND RATE IS SET TO 0 DEN.'}
            </p>
            <p className="text-[11px] font-bold leading-normal text-amber-900">
              {lang === 'MK'
                ? `Бидејќи стапката на резервен фонд за ${formatMonthId(selectedMonthId, lang)} е подесена на 0 ден. по m² во делот „Влезни фактури“, фактурите немаат фиксен дел (резервен фонд). Како резултат на тоа, внесените уплати од станарите нема да одвојат нови средства во резервниот фонд. За да започнете со наплата на средства, одете на табот „ВЛЕЗНИ ФАКТУРИ“ и подесете ги стапките на износ поголем од 0.`
                : `Since the reserve fund rate for ${formatMonthId(selectedMonthId, lang)} is configured as 0 den. per m² under the "Incoming Invoices" tab, invoices have no fixed charge. Consequently, any payments entered from tenants will have 0 den. allocated to the Reserve Fund. To start collecting reserve funds, navigate to the "INCOMING INVOICES" tab and set positive rates.`}
            </p>
          </div>
        )}

        {/* Bank Account Funds Allocation Panel */}
        <div className="border-2 border-black bg-slate-50 p-4">
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-900 mb-3 border-b border-black pb-1.5 flex items-center justify-between">
            <span>{lang === 'MK' ? 'ФОНДОВИ НА СМЕТКА' : 'FUNDS ALLOCATION'}</span>
            <span className="font-mono text-[9px] bg-white border border-black px-1.5 py-0.2">
              {lang === 'MK' ? 'АКТИВНА СОСТОЈБА' : 'ACTIVE ALLOCATION'}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Total Bank Balance */}
            <div className="bg-white border-2 border-black p-4 flex flex-col justify-center">
              <span className="text-[9px] font-black uppercase text-slate-600 tracking-widest block mb-1">
                {lang === 'MK' ? 'Вкупно' : 'Total'}
              </span>
              <span className="text-xl font-black font-mono text-emerald-600">
                {formatDenarExact(endingBankBalance, lang)}
              </span>
            </div>

            {/* Current Operating Fund Balance */}
            <div className="bg-white border-2 border-black p-4 flex flex-col justify-center">
              <span className="text-[9px] font-black uppercase text-indigo-600 tracking-widest block mb-1">
                {lang === 'MK' ? 'Оперативен' : 'Operating'}
              </span>
              <span className="text-xl font-black font-mono text-indigo-700">
                {formatDenarExact(currentOperatingFundBalance, lang)}
              </span>
            </div>

            {/* Reserve Fund Balance */}
            <div className="bg-white border-2 border-black p-4 flex flex-col justify-center">
              <span className="text-[9px] font-black uppercase text-amber-600 tracking-widest block mb-1">
                {lang === 'MK' ? 'Резервен' : 'Reserve'}
              </span>
              <span className="text-xl font-black font-mono text-amber-700">
                {formatDenarExact(endingMonthBalance, lang)}
              </span>
            </div>
          </div>
        </div>

        {/* Overview Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="border-2 border-slate-200 bg-slate-50/50 p-4 font-mono">
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">
              {lang === 'MK' ? 'Почетно салдо (Јуни 2026)' : 'Initial Balance (June 2026)'}
            </span>
            <span className="text-sm font-extrabold text-black">{formatDenarExact(reserveStartingBalance, lang)}</span>
          </div>

          <div className="border-2 border-slate-200 bg-slate-50/50 p-4 font-mono">
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">
              {lang === 'MK' ? 'Салдо на почеток на Месец' : 'Start of Month Balance'}
            </span>
            <span className="text-sm font-extrabold text-slate-800">{formatDenarExact(startOfMonthBalance, lang)}</span>
          </div>

          <div className="border-2 border-slate-200 bg-slate-50/50 p-4 font-mono">
            <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest block mb-1">
              {lang === 'MK' ? 'Собрани приливи (Овој Месец)' : 'Collected Inflow (This Month)'}
            </span>
            <span className="text-sm font-extrabold text-emerald-600 flex items-center">
              <ArrowUpRight className="w-4 h-4 mr-1 text-emerald-500 stroke-[3]" />
              +{formatDenarExact(totalCollectedThisMonth, lang)}
            </span>
          </div>

          <div className="border-2 border-slate-200 bg-slate-50/50 p-4 font-mono">
            <span className="text-[9px] font-black text-rose-600 uppercase tracking-widest block mb-1">
              {lang === 'MK' ? 'Расходи/Исплати (Овој Месец)' : 'Expenditures (This Month)'}
            </span>
            <span className="text-sm font-extrabold text-rose-600 flex items-center">
              {totalSpentThisMonth > 0 ? (
                <>
                  <ArrowDownRight className="w-4 h-4 mr-1 text-rose-500 stroke-[3]" />
                  -{formatDenarExact(totalSpentThisMonth, lang)}
                </>
              ) : '0.00 ДЕН'}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly */}
        <div className="bg-white border-2 border-black p-6">
          <div className="flex items-center space-x-2 mb-4">
            <CalendarDays className="w-5 h-5" />
            <h3 className="font-black uppercase tracking-widest">{t.monthly}</h3>
          </div>
          <div className="space-y-2">
            {monthlyData.map(d => (
              <div key={d.month} className="flex justify-between items-center text-xs font-mono border-b border-slate-200 py-1">
                <span>{d.month}</span>
                <span className="font-bold">{Math.round(d.totalInvoiced)} / {Math.round(d.totalPaid)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Yearly */}
        <div className="bg-white border-2 border-black p-6">
          <div className="flex items-center space-x-2 mb-4">
            <BarChart3 className="w-5 h-5" />
            <h3 className="font-black uppercase tracking-widest">{t.yearly}</h3>
          </div>
          <div className="space-y-2">
            {Object.entries(yearlyData).map(([year, d]) => (
              <div key={year} className="flex justify-between items-center bg-slate-900 text-white p-3 font-mono text-xs">
                <span className="font-bold">{year}</span>
                <span>{Math.round(d.invoiced)} / {Math.round(d.paid)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white border-2 border-black p-6" id="chart-print-area">
        <h3 className="font-black uppercase tracking-widest mb-4">{lang === 'MK' ? `Стапка на наплата ${reportingYear}` : `Collection Rate ${reportingYear}`}</h3>
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthlyData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis domain={[0, 100]} />
              <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
              <Line type="monotone" dataKey="percentage" name={lang === 'MK' ? 'Стапка (%)' : 'Rate (%)'} stroke="#eab308" strokeWidth={2}>
                <LabelList dataKey="percentage" position="top" formatter={(val: number) => `${val.toFixed(0)}%`} />
              </Line>
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
