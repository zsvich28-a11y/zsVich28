import React, { useState } from 'react';
import { CalculatedInvoice, MonthRecord, Language, Expense } from '../types';
import { formatDenarExact, formatMonthId, calculateBalancesForMonth } from '../utils';
import { 
  Printer, 
  Calendar, 
  TrendingDown, 
  Coins, 
  AlertCircle,
  Percent,
  TrendingUp,
  FileCheck,
  CheckCircle,
  HelpCircle,
  Building2,
  Wallet,
  ShieldCheck,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface AccountBalanceProps {
  calculatedInvoicesByMonth: Record<string, CalculatedInvoice[]>;
  records: Record<string, MonthRecord>;
  monthIds: string[];
  expenses: Expense[];
  openingBalances: { bank: number, reserve: number };
  onUpdateOpeningBalances: (balances: { bank: number, reserve: number }) => void;
  onResetOpeningBalancesToZero?: () => void;
  onResetCurrentBalancesToZero?: () => void;
  onResetAllStartingDebtsToZero?: () => void;
  onCompleteResetToZero?: () => void;
  lang: Language;
  activeMonthId?: string;
  startingMonthId?: string;
  balanceOverrides?: Record<string, { bank?: number; reserve?: number; operating?: number }> | null;
  onUpdateBalanceOverrides?: (overrides: Record<string, { bank?: number; reserve?: number; operating?: number }>) => void;
  onChangeMonth?: (monthId: string) => void;
  tmobilePaid?: Record<string, boolean>;
  tmobileRates?: Record<string, number>;
}

export default function AccountBalance({ 
  calculatedInvoicesByMonth, 
  records, 
  monthIds,
  expenses,
  openingBalances,
  onUpdateOpeningBalances,
  onResetOpeningBalancesToZero,
  onResetCurrentBalancesToZero,
  onResetAllStartingDebtsToZero,
  onCompleteResetToZero,
  lang,
  activeMonthId,
  startingMonthId,
  balanceOverrides = {},
  onUpdateBalanceOverrides,
  onChangeMonth,
  tmobilePaid = {},
  tmobileRates = {}
}: AccountBalanceProps) {
  // Select the active month as default if available
  const [selectedMonthId, setSelectedMonthId] = useState(activeMonthId || startingMonthId || '2026-06');
  const [isOverridesExpanded, setIsOverridesExpanded] = useState(false);

  React.useEffect(() => {
    if (activeMonthId) {
      setSelectedMonthId(activeMonthId);
    }
  }, [activeMonthId]);

  // Translations
  const t = {
    MK: {
      title: 'ИЗВЕШТАЈ ЗА ОГЛАСНА ТАБЛА',
      subtitle: 'Преглед на приходите и расходите на заедницата на сопственици',
      selectorLabel: 'Изберете месец и година:',
      printBtn: 'Печати за Огласна Табла (PDF)',
      invoicedLabel: 'Вкупно задолжено за месецот',
      collectedLabel: 'Вкупно собрани уплати',
      spentLabel: 'Вкупно потрошени средства',
      balanceLabel: 'Салдо на крајот на месецот',
      fixedPartLabel: 'Оперативен/Резервен фиксен дел:',
      varPartLabel: 'Варијабилни тековни трошоци:',
      expendituresTitle: 'СПИСОК НА ПОТРОШЕНИ СРЕДСТВА (РАСХОДИ)',
      noExpenses: 'Нема заведени трошоци во овој период.',
      currentFund: 'Тековен',
      reserveFund: 'Резервен',
      collectionRate: 'Процент на наплата од сопствениците',
      noticeTitle: 'ВЕ МОЛИМЕ НАВРЕМЕНО ДА ГИ ПЛАЌАТЕ СМЕТКИТЕ',
      noticeBody: 'Овој извештај се истакнува на огласната табла со цел јавност, транспарентност и отчетност при менаџирањето со заедничките финансиски средства.',
      totalLabel: 'ВКУПНО ПОТРОШЕНО',
      fundLabel: 'Фонд',
      dateCol: 'Датум',
      descCol: 'Парична цел / Намена',
      amountCol: 'Износ',
      reserveFundStateLabel: 'Состојба на резервниот фонд',
      bankAccountStatusTitle: 'ФОНДОВИ НА СМЕТКА',
      totalBankBalanceLabel: 'Вкупно',
      currentFundBalanceLabel: 'Оперативен',
      reserveFundBalanceLabel: 'Резервен'
    },
    EN: {
      title: 'BULLETIN BOARD FINANCIAL REPORT',
      subtitle: 'Overview of building funds revenues and expenditures',
      selectorLabel: 'Select month and year:',
      printBtn: 'Print for Board (PDF)',
      invoicedLabel: 'Total billed this month',
      collectedLabel: 'Total collected payments',
      spentLabel: 'Total expenditures paid',
      balanceLabel: 'Net end of month balance',
      fixedPartLabel: 'Fixed Operating/Reserve charges:',
      varPartLabel: 'Variable maintenance charges:',
      expendituresTitle: 'DETAILED EXPENDITURES (SPENDINGS LIST)',
      noExpenses: 'No expenses recorded for this month.',
      currentFund: 'Current',
      reserveFund: 'Reserve',
      collectionRate: 'Tenant collection efficiency rate',
      noticeTitle: 'PLEASE REMEMBER TO PAY MONTHLY INVOICES ON TIME',
      noticeBody: 'This document is generated and posted publicly on the bulletin board to ensure absolute transparency and democratic accountability over collective building finances.',
      totalLabel: 'TOTAL EXPENDITURE',
      fundLabel: 'Fund',
      dateCol: 'Date',
      descCol: 'Description / Purpose',
      amountCol: 'Amount',
      reserveFundStateLabel: 'Reserve Fund Balance',
      bankAccountStatusTitle: 'FUNDS ALLOCATION',
      totalBankBalanceLabel: 'Total',
      currentFundBalanceLabel: 'Operating',
      reserveFundBalanceLabel: 'Reserve'
    }
  }[lang];

  // Retrieve invoices, records, and expenses for selected month
  const monthInvoices = calculatedInvoicesByMonth[selectedMonthId] || [];
  const monthExpenses = expenses.filter(e => e.monthId === selectedMonthId || (e.date && e.date.startsWith(selectedMonthId)));

  // Math summary
  const totalInvoiced = monthInvoices.reduce((sum, inv) => sum + inv.totalMonthlyCharge, 0);
  let totalCollected = monthInvoices.reduce((sum, inv) => sum + inv.payment, 0);
  const totalSpent = monthExpenses.reduce((sum, exp) => sum + exp.amount, 0);

  let curOpRev = 0;
  let curResRev = 0;
  monthInvoices.forEach(inv => {
    if (inv.payment > 0) {
      if (inv.totalMonthlyCharge > 0) {
        const ratio = inv.fixedCharge / inv.totalMonthlyCharge;
        const resRev = inv.payment * ratio;
        curResRev += resRev;
        curOpRev += (inv.payment - resRev);
      } else {
        curOpRev += inv.payment;
      }
    }
  });

  if (tmobilePaid && tmobilePaid[selectedMonthId]) {
    const rate = tmobileRates && tmobileRates[selectedMonthId] !== undefined ? tmobileRates[selectedMonthId] : 61.50;
    const tmobileAmt = Math.round(300 * rate);
    totalCollected += tmobileAmt;
    curResRev += tmobileAmt;
  }

  const netSurplusDeficit = totalCollected - totalSpent;

  const curResSpent = monthExpenses.filter(e => e.fundType === 'reserve').reduce((sum, e) => sum + e.amount, 0);
  const curOpSpent = totalSpent - curResSpent;

  // Collection percentages
  const collectionPercentage = totalInvoiced > 0 ? Math.round((totalCollected / totalInvoiced) * 100) : 0;

  // Breakdown of invoiced
  const sumFixedCharges = monthInvoices.reduce((sum, inv) => sum + inv.fixedCharge, 0);
  const sumVariableCharges = monthInvoices.reduce((sum, inv) => sum + inv.totalVariable, 0);

  // Standard auto balances & overridable balances
  const autoBalances = calculateBalancesForMonth({
    monthId: selectedMonthId,
    monthIds,
    calculatedInvoicesByMonth,
    expenses,
    openingBalances,
    balanceOverrides: null,
    tmobilePaid,
    tmobileRates
  });

  const finalBalances = calculateBalancesForMonth({
    monthId: selectedMonthId,
    monthIds,
    calculatedInvoicesByMonth,
    expenses,
    openingBalances,
    balanceOverrides,
    tmobilePaid,
    tmobileRates
  });

  const endingBankBalance = finalBalances.bank;
  const endingReserveBalance = finalBalances.reserve;
  const endingOperatingBalance = finalBalances.operating;

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      window.print();
      return;
    }

    const printContent = document.getElementById('bulletin-infographic-print');
    if (!printContent) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>${t.title} - ${formatMonthId(selectedMonthId, lang)}</title>
          <meta charset="utf-8" />
          <style>
            body { 
              background-color: white !important; 
              color: black !important; 
              font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
              padding: 5mm !important;
              margin: 0 !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            * {
              box-sizing: border-box !important;
            }
            .print\\:hidden {
              display: none !important;
            }
            /* High visibility styles optimized for printed black-and-white or color copy */
            .meter-container {
              background: #f1f5f9 !important;
              border: 2px solid #000000 !important;
            }
            .meter-bar {
              background: #059669 !important;
            }
            @media print {
              @page {
                size: A4 portrait;
                margin: 6mm 8mm 6mm 8mm;
              }
              html, body {
                width: 100% !important;
                height: auto !important;
                min-height: auto !important;
                margin: 0 !important;
                padding: 0 !important;
                background-color: white !important;
              }
              tr, table, tbody, .print-avoid-break, .border-2 {
                page-break-inside: avoid !important;
                break-inside: avoid !important;
              }
              thead {
                display: table-header-group !important;
              }
              tfoot {
                display: table-footer-group !important;
              }
            }
          </style>
        </head>
        <body>
          <div style="width: 100%; max-width: 100%;">
            ${printContent.innerHTML}
          </div>
          <script>
            window.addEventListener('load', () => {
              setTimeout(() => {
                window.print();
                window.close();
              }, 400);
            });
          </script>
        </body>
      </html>
    `);

    // Duplicate classes & Tailwind stylesheets to the new window context
    const styles = document.querySelectorAll('style, link[rel="stylesheet"]');
    styles.forEach(styleNode => {
      printWindow.document.head.appendChild(styleNode.cloneNode(true));
    });

    printWindow.document.close();
  };

  return (
    <div className="space-y-6">
      {/* Selector & Actions Bar - Hidden on print */}
      <div className="bg-slate-100 border-2 border-black p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <label className="text-xs font-black uppercase tracking-wider text-black flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-700" />
            {t.selectorLabel}
          </label>
          <select
            value={selectedMonthId}
            onChange={(e) => {
              setSelectedMonthId(e.target.value);
              if (onChangeMonth) {
                onChangeMonth(e.target.value);
              }
            }}
            className="px-4 py-2 bg-white border-2 border-black focus:outline-hidden font-black text-xs uppercase tracking-wider min-w-[200px] cursor-pointer"
          >
            {monthIds.map(mId => (
              <option key={mId} value={mId}>
                {formatMonthId(mId, lang)}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={handlePrint}
          className="px-6 py-2.5 bg-emerald-600 text-white font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-emerald-700 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all cursor-pointer"
        >
          <Printer className="w-4 h-4" />
          <span>{t.printBtn}</span>
        </button>
      </div>

      {/* Primary Container */}
      <div 
        id="bulletin-infographic-print" 
        className="bg-white p-4 print:p-2 border-2 border-black print:border-none rounded-none max-w-4xl mx-auto"
      >
        {/* Infographic Main Header */}
        <div className="border-b-2 border-black pb-4 print:pb-2 text-center space-y-1 print-avoid-break">
          <div className="inline-block border-2 border-black bg-slate-100 text-black px-3 py-1 text-[10px] font-black tracking-widest uppercase mb-1">
            {t.title}
          </div>
          <h2 className="text-2xl md:text-3xl print:text-xl font-black uppercase tracking-tight text-black font-sans leading-none">
            {formatMonthId(selectedMonthId, lang).toUpperCase()}
          </h2>
          <p className="text-xs print:text-[10px] font-bold text-slate-600 uppercase font-mono">
            {t.subtitle}
          </p>
        </div>

        {/* Infographic Main Flow Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:gap-2.5 pt-4 print:pt-2.5 print-avoid-break">

          {/* Total Spent Pile */}
          <div className="border-2 border-black bg-slate-50 p-4 print:p-2.5 flex flex-col justify-center relative overflow-hidden">
            <div className="absolute right-3 top-2.5 text-rose-600/10 print:hidden">
              <TrendingDown className="w-12 h-12 stroke-[3]" />
            </div>
            <div>
              <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest block mb-1">{t.spentLabel}</span>
              <span className="text-2xl print:text-xl font-black font-mono text-rose-600">-{formatDenarExact(totalSpent, lang)}</span>
            </div>
          </div>

          {/* Reserve Fund Balance card */}
          <div className="border-2 border-black bg-yellow-50/50 p-4 print:p-2.5 flex flex-col justify-center relative overflow-hidden">
            <div className="absolute right-3 top-2.5 text-amber-600/10 print:hidden">
              <TrendingUp className="w-12 h-12 stroke-[3]" />
            </div>
            <div>
              <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest block mb-1">{t.reserveFundStateLabel}</span>
              <span className="text-2xl print:text-xl font-black font-mono text-amber-700">{formatDenarExact(endingReserveBalance, lang)}</span>
            </div>
          </div>

        </div>

        {/* Bank Account Funds Allocation Panel */}
        <div className="mt-4 print:mt-2.5 border-2 border-black bg-slate-50 p-4 print:p-2.5 print-avoid-break">
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-900 mb-3 print:mb-1.5 border-b border-black pb-1.5 flex items-center justify-between">
            <span>{t.bankAccountStatusTitle}</span>
            <span className="font-mono text-[9px] bg-white border border-black px-1.5 py-0.2">
              {lang === 'MK' ? 'АКТИВНА СОСТОЈБА' : 'ACTIVE ALLOCATION'}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 print:gap-2">
            {/* Total Bank Balance */}
            <div className="bg-white border-2 border-black p-4 print:p-2 flex flex-col justify-center">
              <span className="text-[9px] print:text-[8px] font-black uppercase text-slate-600 tracking-widest block mb-1">
                {t.totalBankBalanceLabel}
              </span>
              <span className="text-xl print:text-base font-black font-mono text-emerald-600">
                {formatDenarExact(endingBankBalance, lang)}
              </span>
            </div>

            {/* Current Operating Fund Balance */}
            <div className="bg-white border-2 border-black p-4 print:p-2 flex flex-col justify-center">
              <span className="text-[9px] print:text-[8px] font-black uppercase text-indigo-600 tracking-widest block mb-1">
                {t.currentFundBalanceLabel}
              </span>
              <span className="text-xl print:text-base font-black font-mono text-indigo-700">
                {formatDenarExact(endingOperatingBalance, lang)}
              </span>
            </div>

            {/* Reserve Fund Balance */}
            <div className="bg-white border-2 border-black p-4 print:p-2 flex flex-col justify-center">
              <span className="text-[9px] print:text-[8px] font-black uppercase text-amber-600 tracking-widest block mb-1">
                {t.reserveFundBalanceLabel}
              </span>
              <span className="text-xl print:text-base font-black font-mono text-amber-700">
                {formatDenarExact(endingReserveBalance, lang)}
              </span>
            </div>
          </div>
        </div>

        {/* INITIAL STARTING FUND BALANCES (Control Panel) */}
        {onUpdateOpeningBalances && (
          <div className="mt-4 border-2 border-black bg-amber-50/60 print:hidden transition-all duration-200">
            <button
              type="button"
              onClick={() => setIsOverridesExpanded(!isOverridesExpanded)}
              className="w-full text-left p-4 flex items-center justify-between select-none hover:bg-amber-100/60 transition-colors focus:outline-hidden cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Coins className="w-4 h-4 text-amber-800" />
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-950">
                  {lang === 'MK' ? 'ПОЧЕТНИ СОСТОЈБИ НА ФОНДОВИ (ПОЧЕТЕН КАПИТАЛ)' : 'INITIAL STARTING FUND BALANCES'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-slate-500">
                <span className="text-[9px] font-bold font-mono text-amber-900 bg-amber-200/80 px-2 py-0.5 border border-amber-400">
                  {lang === 'MK' ? 'ПРИЛАГОДИ ПОЧЕТНИ СУМИ' : 'CONFIGURE INITIAL SUMS'}
                </span>
                {isOverridesExpanded ? (
                  <ChevronUp className="w-4 h-4 text-black stroke-[3]" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-black stroke-[3]" />
                )}
              </div>
            </button>

            {isOverridesExpanded && (
              <div className="px-4 pb-4 border-t border-amber-300 pt-3 space-y-4">
                <p className="text-[10px] text-amber-900 leading-relaxed font-medium">
                  {lang === 'MK'
                    ? 'Внесете ги почетните суми за Оперативен и Резервен фонд. Можете да започнете од 0 или да внесете конкретни вредности. Сите приливи и расходи автоматски се додаваат (+) односно одземаат (-).'
                    : 'Enter initial starting sums for Operating and Reserve funds. You can start from 0 or enter custom baseline amounts. All revenues and costs are automatically added (+) or subtracted (-).'}
                </p>

                {/* Direct Initial Fund Inputs */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white border-2 border-black p-3 space-y-1.5">
                    <label className="block text-[9px] font-black uppercase text-indigo-900">
                      {lang === 'MK' ? 'Почетен Оперативен фонд (ден.)' : 'Initial Operating Fund (den.)'}
                    </label>
                    <input
                      type="number"
                      value={Math.max(0, openingBalances.bank - openingBalances.reserve)}
                      onChange={(e) => {
                        const newOp = parseFloat(e.target.value) || 0;
                        onUpdateOpeningBalances({
                          bank: newOp + openingBalances.reserve,
                          reserve: openingBalances.reserve
                        });
                      }}
                      className="w-full text-xs px-2.5 py-1.5 border-2 border-black font-mono font-bold text-black bg-white focus:outline-hidden"
                    />
                  </div>

                  <div className="bg-white border-2 border-black p-3 space-y-1.5">
                    <label className="block text-[9px] font-black uppercase text-amber-900">
                      {lang === 'MK' ? 'Почетен Резервен фонд (ден.)' : 'Initial Reserve Fund (den.)'}
                    </label>
                    <input
                      type="number"
                      value={openingBalances.reserve}
                      onChange={(e) => {
                        const newRes = parseFloat(e.target.value) || 0;
                        const curOp = Math.max(0, openingBalances.bank - openingBalances.reserve);
                        onUpdateOpeningBalances({
                          bank: curOp + newRes,
                          reserve: newRes
                        });
                      }}
                      className="w-full text-xs px-2.5 py-1.5 border-2 border-black font-mono font-bold text-black bg-white focus:outline-hidden"
                    />
                  </div>

                  <div className="bg-emerald-50 border-2 border-emerald-600 p-3 space-y-1 flex flex-col justify-between">
                    <div>
                      <label className="block text-[9px] font-black uppercase text-emerald-900">
                        {lang === 'MK' ? 'Вкупно почетно салдо' : 'Total Initial Bank Sum'}
                      </label>
                      <div className="text-base font-black font-mono text-emerald-950 mt-0.5">
                        {formatDenarExact(openingBalances.bank, lang)}
                      </div>
                    </div>
                    <p className="text-[8px] text-emerald-700 font-bold uppercase mt-1">
                      {lang === 'MK' ? '= Оперативен + Резервен' : '= Operating + Reserve'}
                    </p>
                  </div>
                </div>

                {/* Quick Action Tools: Reset to 0 */}
                <div className="pt-3 border-t border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="text-[10px] text-amber-950 font-black uppercase tracking-wider flex items-center gap-1.5">
                    <span>⚡ {lang === 'MK' ? 'АЛАТКИ ЗА РЕСЕТИРАЊЕ НА 0:' : 'RESET TO ZERO TOOLS:'}</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(lang === 'MK' ? 'Дали сте сигурни дека сакате да ги ресетирате ПОЧЕТНИТЕ фондови на 0?' : 'Are you sure you want to reset starting fund balances to 0?')) {
                          if (onResetOpeningBalancesToZero) {
                            onResetOpeningBalancesToZero();
                          } else {
                            onUpdateOpeningBalances({ bank: 0, reserve: 0 });
                          }
                        }
                      }}
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-black text-[10px] uppercase tracking-wider border-2 border-black cursor-pointer shadow-sm transition-all"
                    >
                      🔄 {lang === 'MK' ? 'ПОЧЕТНИ ФОНДОВИ НА 0' : 'STARTING FUNDS TO 0'}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(lang === 'MK' ? 'Дали сте сигурни дека сакате да го поставите ТЕКОВНОТО САЛДО на фонда на 0 за овој месец?' : 'Are you sure you want to set the current fund balance to 0 for this month?')) {
                          if (onResetCurrentBalancesToZero) {
                            onResetCurrentBalancesToZero();
                          } else if (onUpdateBalanceOverrides && activeMonthId) {
                            onUpdateBalanceOverrides({
                              ...balanceOverrides,
                              [activeMonthId]: { bank: 0, reserve: 0, operating: 0 }
                            });
                          }
                        }
                      }}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-wider border-2 border-black cursor-pointer shadow-sm transition-all"
                    >
                      🎯 {lang === 'MK' ? 'ТЕКОВНО САЛДО НА 0' : 'CURRENT BALANCE TO 0'}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(lang === 'MK' ? 'Дали сте сигурни дека сакате да ги поставите сите почетни долгови на сите сопственици на 0?' : 'Are you sure you want to reset all tenant starting debts to 0?')) {
                          if (onResetAllStartingDebtsToZero) {
                            onResetAllStartingDebtsToZero();
                          }
                        }
                      }}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-black text-[10px] uppercase tracking-wider border-2 border-black cursor-pointer shadow-sm transition-all"
                    >
                      🧹 {lang === 'MK' ? 'ДОЛГОВИ НА СОПСТВЕНИЦИ НА 0' : 'TENANT DEBTS TO 0'}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(lang === 'MK' ? 'ВНИМАНИЕ! Ова ќе ги ресетира сите фондови, салдоа, долгови, уплати и расходи на 0 за целосно чист биланс. Дали да продолжиме?' : 'WARNING! This will reset all funds, balances, debts, payments, and expenses to 0 for a completely clean slate. Continue?')) {
                          if (onCompleteResetToZero) {
                            onCompleteResetToZero();
                          } else {
                            onUpdateOpeningBalances({ bank: 0, reserve: 0 });
                            if (onUpdateBalanceOverrides) onUpdateBalanceOverrides({});
                            if (onResetAllStartingDebtsToZero) onResetAllStartingDebtsToZero();
                          }
                        }
                      }}
                      className="px-3 py-1.5 bg-black hover:bg-slate-800 text-yellow-300 font-black text-[10px] uppercase tracking-wider border-2 border-black cursor-pointer shadow-sm transition-all"
                    >
                      ⚡ {lang === 'MK' ? 'ЦЕЛОСЕН РЕСЕТ НА 0 (ЧИСТ БИЛАНС)' : 'COMPLETE RESET TO 0'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Infographic Center: EXPENDITURE LEDGER POSTER */}
        <div className="mt-4 print:mt-2.5 border-2 border-black">
          <div className="p-3 print:p-1.5 bg-slate-100 text-black flex items-center justify-between border-b-2 border-black">
            <h3 className="text-xs print:text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
              <FileCheck className="w-4 h-4 text-emerald-600" />
              {t.expendituresTitle}
            </h3>
            <span className="font-mono text-[10px] print:text-[8px] font-black bg-white px-2 py-0.5 border-2 border-black">
              {monthExpenses.length} {lang === 'MK' ? 'ТРАНСАКЦИИ' : 'ITEMS'}
            </span>
          </div>

          <table className="w-full text-left text-xs print:text-[10px]">
            <thead>
              <tr className="bg-slate-50 font-mono border-b-2 border-black text-[8px] font-black uppercase tracking-widest text-slate-600">
                <th className="p-2 print:p-1 w-24 border-r border-slate-200">{t.dateCol}</th>
                <th className="p-2 print:p-1 border-r border-slate-200">{t.descCol}</th>
                <th className="p-2 print:p-1 w-28 text-center border-r border-slate-200">{t.fundLabel}</th>
                <th className="p-2 print:p-1 text-right w-30">{t.amountCol}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-medium">
              {monthExpenses.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 print:p-3 text-center text-slate-400 font-bold uppercase text-[10px] tracking-widest font-mono">
                    {t.noExpenses}
                  </td>
                </tr>
              ) : (
                monthExpenses.map(exp => (
                  <tr key={exp.id} className="hover:bg-slate-50/50">
                    <td className="p-2 print:p-1 font-mono text-slate-500 font-bold border-r border-slate-200 whitespace-nowrap">
                      {exp.date}
                    </td>
                    <td className="p-2 print:p-1 font-sans font-extrabold text-slate-900 border-r border-slate-200 text-xs print:text-[10px]">
                      {exp.description}
                      {exp.imageUrl && (
                        <span className="ml-1.5 inline-flex items-center text-[8px] font-black uppercase px-1 py-0.2 border border-emerald-600 text-emerald-800 bg-emerald-50 rounded-xs print:hidden">
                          {lang === 'MK' ? 'Приложена сметка' : 'Receipt filed'}
                        </span>
                      )}
                    </td>
                    <td className="p-1.5 print:p-0.5 text-center border-r border-slate-200">
                      <span className={`px-1.5 py-0.2 text-[8px] font-black uppercase tracking-widest border ${
                        exp.fundType === 'reserve' 
                          ? 'border-amber-400 bg-amber-50 text-amber-800' 
                          : 'border-indigo-400 bg-indigo-50 text-indigo-800'
                      }`}>
                        {exp.fundType === 'reserve' ? t.reserveFund : t.currentFund}
                      </span>
                    </td>
                    <td className="p-2 print:p-1 text-right font-black font-mono text-rose-600 text-xs print:text-[10px] whitespace-nowrap bg-rose-50/10">
                      -{formatDenarExact(exp.amount, lang)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50 border-t-2 border-black font-black font-mono text-xs print:text-[10px] text-black">
                <td colSpan={3} className="p-2.5 print:p-1.5 uppercase tracking-wider font-sans font-black text-right border-r border-slate-300">
                  {t.totalLabel}
                </td>
                <td className="p-2.5 print:p-1.5 text-right text-rose-700 font-black text-xs print:text-[10px] bg-rose-100/40 border-l border-slate-300 whitespace-nowrap">
                  -{formatDenarExact(totalSpent, lang)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Infographic Footer: COMMUNITY BULLETIN MESSAGE */}
        <div className="mt-4 print:mt-2.5 bg-amber-50/50 border-2 border-dashed border-amber-500 p-3.5 print:p-2 flex flex-col sm:flex-row gap-3 print:gap-1.5 items-start rounded-none print-avoid-break">
          <div className="p-1.5 bg-amber-500 text-black border border-black shrink-0">
            <AlertCircle className="w-5 h-5 print:w-4 print:h-4 stroke-[2.5]" />
          </div>
          <div className="space-y-0.5">
            <h4 className="text-[10px] font-black uppercase text-amber-900 tracking-wider">
              {t.noticeTitle}
            </h4>
            <p className="text-[10px] print:text-[9px] text-amber-800 font-medium leading-relaxed">
              {t.noticeBody}
            </p>
          </div>
        </div>

        {/* Dynamic visual signature seal */}
        <div className="mt-4 print:mt-2 border-t border-slate-200 pt-2.5 print:pt-1.5 flex flex-col sm:flex-row items-center justify-between text-[8px] text-slate-400 font-mono uppercase tracking-widest print-avoid-break">
          <span>HOUSEMAN INFOGRAPHICS (BOARD v2.4)</span>
          <div className="flex items-center gap-1 mt-0.5 sm:mt-0 text-emerald-600 font-bold">
            <CheckCircle className="w-3 h-3" />
            <span>{lang === 'MK' ? 'ФИНАНСИСКИ ВЕРИФИКУВАНО' : 'FINANCIALLY VERIFIED'}</span>
          </div>
        </div>

      </div>
    </div>
  );
}
