import { useState, useMemo, Fragment } from 'react';
import { CalculatedInvoice, Unit, Language } from '../types';
import { formatMonthId, formatDenarExact } from '../utils';
import { ChevronDown, ChevronUp, AlertCircle, Search, User, CheckCircle2, AlertTriangle, FileText, TrendingUp, Sparkles, Printer } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import FullDebtorsPrint, { DebtorSummaryItem } from './FullDebtorsPrint';

interface DebtorListProps {
  calculatedInvoicesByMonth: Record<string, CalculatedInvoice[]>;
  monthIds: string[];
  activeMonthId: string;
  units: Unit[];
  lang: Language;
  onResetAllStartingDebtsToZero?: () => void;
  onPrintTenant?: (tenant: any) => void;
  onPrintFullDebtorsReport?: (historyList: DebtorSummaryItem[]) => void;
}

export default function DebtorList({
  calculatedInvoicesByMonth,
  monthIds,
  activeMonthId,
  units,
  lang,
  onResetAllStartingDebtsToZero,
  onPrintTenant,
  onPrintFullDebtorsReport,
}: DebtorListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showOnlyDebtors, setShowOnlyDebtors] = useState(false);
  const [orderBy, setOrderBy] = useState<'unit' | 'debt'>('unit');
  const [expandedUnitId, setExpandedUnitId] = useState<string | null>(null);
  const [showFullPrint, setShowFullPrint] = useState(false);

  const t = {
    MK: {
      title: 'Книга на должници и историја на долгови',
      subtitle: 'Приказ на сите поединечни долгови, извршени уплати и преглед месец по месец',
      searchPlaceholder: 'Пребарај по сопственик или број на стан...',
      filterOnlyDebtors: 'Прикажи ги само должниците',
      filterAll: 'Прикажи ги сите сопственици',
      colUnit: 'Имот',
      colOwner: 'Сопственик',
      colBilled: 'Тековно задолжување',
      colPaid: 'Уплатено',
      colOutstanding: 'Краен долг',
      colPrevDebt: 'Стар долг',
      actions: 'Преглед',
      historyTitle: 'Месечен преглед на задолжувањата и уплатите',
      month: 'Месец',
      status: 'Статус',
      statusPaid: 'Исплатено',
      statusPartial: 'Делумно',
      statusUnpaid: 'Неплатено',
      emptyNoDebtors: 'Нема должници за избраниот филтер.',
      statActiveDebtors: 'Активни должници',
      statTotalDebt: 'Вкупен долг на зградата',
      statMaxDebtor: 'Најголем должник',
      statUnitsPaid: 'Целосно исплатени',
      pastOverdueMonths: 'Месеци со заостанати долгови',
      debtHistoryPlaceholder: 'Кликнете на иконата за преглед на деталната историја по месеци.',
      currentMonthLabel: 'Тековен месец',
      orderByLabel: 'Редослед:',
      orderUnit: 'Број на имот',
      orderDebt: 'Износ на долг'
    },
    EN: {
      title: 'Debtors Registry & Debt History',
      subtitle: 'Chronological summary of individual monthly charges, payments, and outstanding arrears',
      searchPlaceholder: 'Search by owner or unit number...',
      filterOnlyDebtors: 'Show only debtors',
      filterAll: 'Show all tenants',
      colUnit: 'Property',
      colOwner: 'Owner',
      colBilled: 'Billed',
      colPaid: 'Paid',
      colOutstanding: 'Ending Debt',
      colPrevDebt: 'Old Debt',
      actions: 'Detail',
      historyTitle: 'Monthly summary of bills and receipts',
      month: 'Month',
      status: 'Status',
      statusPaid: 'Fully Paid',
      statusPartial: 'Partial',
      statusUnpaid: 'Unpaid',
      emptyNoDebtors: 'No debtors matching the filter.',
      statActiveDebtors: 'Active Debtors',
      statTotalDebt: 'Total Building Arrears',
      statMaxDebtor: 'Highest Individual Balance',
      statUnitsPaid: 'Fully Settled Units',
      pastOverdueMonths: 'Overdue months',
      debtHistoryPlaceholder: 'Click the action eye button to reveal chronological ledger for this person.',
      currentMonthLabel: 'Active month',
      orderByLabel: 'Sort by:',
      orderUnit: 'Unit No.',
      orderDebt: 'Owed Amount'
    }
  }[lang];

  // Get index of active month to slice monthIds chronologically up to now
  const activeMonthIndex = monthIds.indexOf(activeMonthId);
  const relevantMonthIds = useMemo(() => {
    if (activeMonthIndex === -1) return [activeMonthId];
    return monthIds.slice(0, activeMonthIndex + 1);
  }, [monthIds, activeMonthId, activeMonthIndex]);

  // Construct historical data per unit
  const unitHistoryList = useMemo(() => {
    return units.map(unit => {
      // Find all invoices for this unit across the relevant months
      const initialHistory = relevantMonthIds.map(mId => {
        const invoicesForMonth = calculatedInvoicesByMonth[mId] || [];
        const inv = invoicesForMonth.find(i => i.unitId === unit.id);
        return {
          monthId: mId,
          calculatedInvoice: inv,
          // Fallbacks if no invoice calculated
          beginningDebt: inv ? inv.beginningDebt : 0,
          totalMonthlyCharge: inv ? inv.totalMonthlyCharge : 0,
          payment: inv ? inv.payment : 0,
          preJunePayment: inv ? (inv.preJunePayment || 0) : 0,
          endingDebt: inv ? inv.endingDebt : 0,
        };
      });

      const firstMonthInv = initialHistory[0];
      const origStartingDebt = firstMonthInv ? firstMonthInv.beginningDebt : 0;
      const origPreJunePayment = firstMonthInv ? firstMonthInv.preJunePayment : 0;
      const netStartingDebt = origStartingDebt - origPreJunePayment;

      const preJuneRow = {
        monthId: 'pre-june',
        calculatedInvoice: undefined,
        beginningDebt: origStartingDebt,
        totalMonthlyCharge: origStartingDebt,
        payment: 0,
        preJunePayment: origPreJunePayment,
        endingDebt: netStartingDebt,
      };

      const adjustedHistory = initialHistory.map((h, idx) => {
        if (idx === 0) {
          return {
            ...h,
            beginningDebt: netStartingDebt,
            preJunePayment: 0,
            endingDebt: h.endingDebt,
          };
        }
        return h;
      });

      const history = [preJuneRow, ...adjustedHistory];

      const currentInvoice = history[history.length - 1];
      const endingDebtCurrent = currentInvoice ? currentInvoice.endingDebt : 0;
      const beginningDebtCurrent = currentInvoice ? currentInvoice.beginningDebt : 0;
      const billedCurrent = currentInvoice ? currentInvoice.totalMonthlyCharge : 0;
      const paymentCurrent = currentInvoice ? currentInvoice.payment : 0;

      // Count many months have endingDebt > 1 (excluding pre-june row so count is correct)
      const monthsInDebt = history.filter(h => h.monthId !== 'pre-june' && h.endingDebt > 1).length;

      return {
        unitId: unit.id,
        number: unit.number,
        owner: unit.owner,
        type: unit.type,
        history,
        endingDebtCurrent,
        beginningDebtCurrent,
        billedCurrent,
        paymentCurrent,
        monthsInDebt,
      };
    });
  }, [units, relevantMonthIds, calculatedInvoicesByMonth]);

  // Filter list
  const filteredList = useMemo(() => {
    const list = unitHistoryList.filter(item => {
      const matchesSearch = 
        item.owner.toLowerCase().includes(searchQuery.toLowerCase()) || 
        item.number.toLowerCase().includes(searchQuery.toLowerCase());
      
      if (!matchesSearch) return false;
      if (showOnlyDebtors) {
        return item.endingDebtCurrent > 1; // has ending debt
      }
      return true;
    });

    if (orderBy === 'debt') {
      return [...list].sort((a, b) => b.endingDebtCurrent - a.endingDebtCurrent);
    } else {
      // Keep original natural order in units array
      return [...list].sort((a, b) => {
        const indexA = units.findIndex(u => u.id === a.unitId);
        const indexB = units.findIndex(u => u.id === b.unitId);
        return indexA - indexB;
      });
    }
  }, [unitHistoryList, searchQuery, showOnlyDebtors, orderBy, units]);

  // Summary Metrics
  const metrics = useMemo(() => {
    let debtorsCount = 0;
    let totalDebtSum = 0;
    let maxDebtVal = 0;
    let maxDebtorName = '';
    let maxDebtorUnit = '';
    let settledCount = 0;

    unitHistoryList.forEach(item => {
      if (item.endingDebtCurrent >= 1) {
        debtorsCount++;
        totalDebtSum += item.endingDebtCurrent;
        if (item.endingDebtCurrent > maxDebtVal) {
          maxDebtVal = item.endingDebtCurrent;
          maxDebtorName = item.owner;
          maxDebtorUnit = item.number;
        }
      } else {
        settledCount++;
      }
    });

    return {
      debtorsCount,
      totalDebtSum,
      maxDebtVal,
      maxDebtorName,
      maxDebtorUnit,
      settledCount,
    };
  }, [unitHistoryList]);

  const toggleExpand = (unitId: string) => {
    if (expandedUnitId === unitId) {
      setExpandedUnitId(null);
    } else {
      setExpandedUnitId(unitId);
    }
  };

  return (
    <div className="space-y-6" id="debtors-history-tab-view">
      
      {/* Analytics highlights */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="bg-white p-5 border-2 border-black flex items-center space-x-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <div className="p-3 bg-red-100 text-red-600 border border-black inline-block flex-shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[9px] font-black uppercase text-slate-500 tracking-wider leading-none">{t.statActiveDebtors}</p>
            <p className="text-2xl font-black font-mono mt-1 text-red-600">
              {metrics.debtorsCount} <span className="text-xs font-bold text-slate-400">/ {units.length}</span>
            </p>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white p-5 border-2 border-black flex items-center space-x-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <div className="p-3 bg-rose-100 text-rose-600 border border-black inline-block flex-shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[9px] font-black uppercase text-slate-500 tracking-wider leading-none">{t.statTotalDebt}</p>
            <p className="text-xl font-black font-mono mt-1 truncate">
              {formatDenarExact(Math.round(metrics.totalDebtSum), lang)}
            </p>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white p-5 border-2 border-black flex items-center space-x-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-ellipsis">
          <div className="p-3 bg-yellow-105 text-amber-600 border border-black inline-block flex-shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[9px] font-black uppercase text-slate-500 tracking-wider leading-none">{t.statMaxDebtor}</p>
            {metrics.maxDebtVal > 0 ? (
              <div className="mt-1 leading-tight">
                <p className="text-sm font-black font-sans text-black truncate uppercase">
                  #{metrics.maxDebtorUnit} {metrics.maxDebtorName}
                </p>
                <p className="text-xs font-bold font-mono text-amber-600">
                  {formatDenarExact(Math.round(metrics.maxDebtVal), lang)}
                </p>
              </div>
            ) : (
              <p className="text-sm font-bold font-mono text-slate-400 mt-1">N/A</p>
            )}
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-white p-5 border-2 border-black flex items-center space-x-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <div className="p-3 bg-emerald-100 text-emerald-600 border border-black inline-block flex-shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[9px] font-black uppercase text-slate-500 tracking-wider leading-none">{t.statUnitsPaid}</p>
            <p className="text-2xl font-black font-mono mt-1 text-emerald-600">
              {metrics.settledCount} <span className="text-xs font-bold text-slate-400">/ {units.length}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Main filter / search panel */}
      <div className="bg-white p-5 border-2 border-black flex flex-col xl:flex-row justify-between items-stretch xl:items-center gap-4">
        {/* Left side: Search input */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-black w-4 h-4" />
          <input
            id="debtors-search-input"
            type="text"
            placeholder={t.searchPlaceholder}
            className="w-full pl-10 pr-4 py-2 border-2 border-black font-bold text-sm bg-white focus:outline-hidden"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Right side: Sort and Filter Controls */}
        <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center shrink-0">
          {/* Sorting */}
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
              {t.orderByLabel}
            </span>
            <div className="flex border-2 border-black divide-x-2 divide-black">
              <button
                id="sort-by-unit"
                onClick={() => setOrderBy('unit')}
                className={`px-3 py-1.5 text-xs font-black uppercase tracking-wider ${
                  orderBy === 'unit' 
                    ? 'bg-black text-white' 
                    : 'bg-white text-black hover:bg-slate-50'
                }`}
              >
                {t.orderUnit}
              </button>
              <button
                id="sort-by-debt"
                onClick={() => setOrderBy('debt')}
                className={`px-3 py-1.5 text-xs font-black uppercase tracking-wider ${
                  orderBy === 'debt' 
                    ? 'bg-black text-white' 
                    : 'bg-white text-black hover:bg-slate-50'
                }`}
              >
                {t.orderDebt}
              </button>
            </div>
          </div>

          {/* Filtering */}
          <div className="flex border-2 border-black divide-x-2 divide-black">
            <button
              id="filter-only-debtors"
              onClick={() => setShowOnlyDebtors(true)}
              className={`px-3 py-1.5 text-xs font-black uppercase tracking-wider ${
                showOnlyDebtors 
                  ? 'bg-black text-white' 
                  : 'bg-white text-black hover:bg-slate-50'
              }`}
            >
              {t.filterOnlyDebtors}
            </button>
            <button
              id="filter-all-debtors"
              onClick={() => setShowOnlyDebtors(false)}
              className={`px-3 py-1.5 text-xs font-black uppercase tracking-wider ${
                !showOnlyDebtors 
                  ? 'bg-black text-white' 
                  : 'bg-white text-black hover:bg-slate-50'
              }`}
            >
              {t.filterAll}
            </button>
          </div>

          {/* Reset All Starting Debts to 0 Button */}
          {onResetAllStartingDebtsToZero && (
            <button
              type="button"
              id="reset-starting-debts-zero-btn"
              onClick={() => {
                if (window.confirm(lang === 'MK' ? 'Дали сте сигурни дека сакате да ги поставите сите почетни долгови на сопствениците на 0?' : 'Are you sure you want to reset all tenant starting debts to 0?')) {
                  onResetAllStartingDebtsToZero();
                }
              }}
              className="px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white border-2 border-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all shrink-0"
            >
              <span>🧹</span>
              <span>{lang === 'MK' ? 'ДОЛГОВИ НА 0' : 'DEBTS TO 0'}</span>
            </button>
          )}

          {/* Full Debtors PDF Report Print Button */}
          <button
            type="button"
            id="print-full-debtors-report-btn"
            onClick={() => {
              if (onPrintFullDebtorsReport) {
                onPrintFullDebtorsReport(unitHistoryList);
              } else {
                setShowFullPrint(true);
              }
            }}
            className="px-4 py-2 bg-yellow-400 hover:bg-yellow-300 text-black border-2 border-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all shrink-0 ml-auto sm:ml-0"
          >
            <Printer className="w-4 h-4" />
            <span>{lang === 'MK' ? 'ПЕЧАТИ ЗБИРЕН ИЗВЕШТАЈ (PDF)' : 'PRINT FULL DEBTORS REPORT (PDF)'}</span>
          </button>
        </div>
      </div>

      {/* Debtors Table */}
      <div className="bg-white border-2 border-black overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] border-collapse text-left">
            <thead>
              <tr className="bg-slate-100 border-b-2 border-black text-[11px] font-black uppercase tracking-wider text-black">
                <th className="py-3 px-4 w-[110px] text-center border-r border-slate-350">{t.colUnit}</th>
                <th className="py-3 px-4 border-r border-slate-350">{t.colOwner}</th>
                <th className="py-3 px-4 text-right border-r border-slate-350 w-[120px]">{t.colPrevDebt}</th>
                <th className="py-3 px-4 text-right border-r border-slate-350 w-[120px]">{t.colBilled}</th>
                <th className="py-3 px-4 text-right border-r border-slate-350 w-[120px]">{t.colPaid}</th>
                <th className="py-3 px-4 text-right border-r border-slate-350 w-[130px] bg-red-50/20">{t.colOutstanding}</th>
                <th className="py-3 px-4 text-center w-[150px]">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y border-b border-black">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 font-bold uppercase text-xs">
                    <User className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    {t.emptyNoDebtors}
                  </td>
                </tr>
              ) : (
                filteredList.map((item) => {
                  const isExpanded = expandedUnitId === item.unitId;
                  const hasEndingDebt = item.endingDebtCurrent > 1;

                  return (
                    <Fragment key={item.unitId}>
                      {/* Main row */}
                      <tr className={`hover:bg-slate-50/50 transition-colors text-[13px] font-bold ${hasEndingDebt ? 'bg-red-50/5' : ''}`}>
                        {/* Unit name tag badge styling */}
                        <td className="py-3.5 px-4 text-center border-r border-slate-200">
                          <span className={`px-2.5 py-1 text-[11px] font-mono font-black border-2 inline-block ${
                            item.type === 'apartment' 
                              ? 'bg-blue-50 text-blue-900 border-blue-900' 
                              : 'bg-amber-50 text-amber-900 border-amber-900'
                          }`}>
                            {item.number}
                          </span>
                        </td>
                        
                        {/* Tenant Owner name */}
                        <td className="py-3.5 px-4 font-black uppercase text-black border-r border-slate-200">
                          {item.owner}
                          {item.monthsInDebt > 1 && (
                            <span className="ml-2.5 px-1.5 py-0.5 bg-rose-100 text-[9px] font-bold text-rose-700 tracking-wider uppercase">
                              {item.monthsInDebt} {lang === 'MK' ? 'мес.' : 'mos.'}
                            </span>
                          )}
                        </td>

                        {/* Starting Debt/Arrears for active month */}
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-500 border-r border-slate-200">
                          {Math.round(item.beginningDebtCurrent)}
                        </td>

                        {/* Total billed this month */}
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-600 border-r border-slate-200">
                          {Math.round(item.billedCurrent)}
                        </td>

                        {/* Paid this month */}
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-600 border-r border-slate-200">
                          {Math.round(item.paymentCurrent)}
                        </td>

                        {/* Ending accumulated debt */}
                        <td className={`py-3.5 px-4 text-right font-mono font-black border-r border-slate-200 ${
                          hasEndingDebt ? 'text-rose-600 bg-rose-50/25' : 'text-emerald-600 bg-emerald-50/20'
                        }`}>
                          {Math.round(item.endingDebtCurrent)}
                        </td>

                        {/* Detail/Expand toggle */}
                        <td className="py-2 px-3 text-center">
                          <button
                            onClick={() => toggleExpand(item.unitId)}
                            className={`px-3 py-1.5 border-2 text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center space-x-1 mx-auto cursor-pointer ${
                              isExpanded 
                                ? 'bg-black text-white border-black' 
                                : 'bg-white text-black border-black hover:bg-slate-100'
                            }`}
                          >
                            <span>{isExpanded ? (lang === 'MK' ? 'СКРИЈ' : 'HIDE') : (lang === 'MK' ? 'ИСТОРИЈА' : 'HISTORY')}</span>
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                        </td>
                      </tr>

                      {/* Expanded Sub-table detailing Month-by-month history */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={7} className="p-0 bg-stone-50 border-y border-stone-300">
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="p-6">
                                <div className="border border-stone-300 bg-white">
                                  {/* Subheader */}
                                  <div className="bg-slate-900 text-white p-3.5 px-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
                                    <span className="text-[10px] font-black uppercase tracking-wider flex items-center gap-2">
                                      <FileText className="w-4 h-4 text-yellow-400" />
                                      {t.historyTitle} — {item.owner} (стан {item.number})
                                    </span>
                                    <div className="flex flex-wrap items-center gap-2">
                                      <button
                                        onClick={() => onPrintTenant?.(item)}
                                        className="px-2.5 py-1 bg-yellow-400 hover:bg-yellow-300 text-black text-[9px] font-black uppercase tracking-wider leading-none flex items-center gap-1 cursor-pointer transition-all border border-black mr-2"
                                      >
                                        <Printer className="w-3 h-3" />
                                        <span>{lang === 'MK' ? 'ПЕЧАТИ ИЗВЕШТАЈ (PDF)' : 'PRINT REPORT (PDF)'}</span>
                                      </button>
                                      {item.history[0] && Math.round(item.history[0].beginningDebt) > 0 && (
                                        <span className="px-2 py-0.5 bg-yellow-400 text-black text-[9px] font-black uppercase tracking-wider leading-none">
                                          {lang === 'MK' 
                                            ? `ПОЧЕТЕН ДОЛГ (ПРЕД ЈУНИ 2026): ${Math.round(item.history[0].beginningDebt)} ден.` 
                                            : `PRE-JUNE 2026 STARTING DEBT: ${Math.round(item.history[0].beginningDebt)} den.`}
                                        </span>
                                      )}
                                      <span className="text-[10px] font-mono text-slate-400 font-bold uppercase">
                                        {relevantMonthIds.length} {lang === 'MK' ? 'месеци снимени' : 'months recorded'}
                                      </span>
                                    </div>
                                  </div>

                                  <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs">
                                      <thead>
                                        <tr className="bg-stone-100 border-b border-stone-300 text-[10px] font-bold text-stone-600 uppercase tracking-widest">
                                          <th className="py-2.5 px-4">{t.month}</th>
                                          <th className="py-2.5 px-4 text-right">{t.colBilled} (ден)</th>
                                          <th className="py-2.5 px-4 text-right">{t.colPaid} (ден)</th>
                                          <th className="py-2.5 px-4 text-right">{t.colOutstanding} (ден)</th>
                                          <th className="py-2.5 px-4 text-center">{t.status}</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-stone-200">
                                        {item.history.map((recordItem, idx) => {
                                          const isMonthActive = recordItem.monthId === activeMonthId;
                                          const preVal = Math.round(recordItem.preJunePayment || 0);
                                          const billedVal = Math.round(recordItem.totalMonthlyCharge);
                                          const paidVal = Math.round(recordItem.payment) + preVal;
                                          const endDebtVal = billedVal - paidVal;

                                          let statusBadgeColor = 'bg-stone-100 text-stone-600';
                                          let statusLabel = t.statusPaid;

                                          if (endDebtVal > 0) {
                                            if (paidVal > 0) {
                                              statusBadgeColor = 'bg-amber-100 text-amber-800 border-amber-300';
                                              statusLabel = t.statusPartial;
                                            } else {
                                              statusBadgeColor = 'bg-rose-100 text-rose-800 border-rose-300';
                                              statusLabel = t.statusUnpaid;
                                            }
                                          } else if (endDebtVal < 0) {
                                            statusBadgeColor = 'bg-blue-100 text-blue-800 border-blue-300';
                                            statusLabel = lang === 'MK' ? 'ПРЕПЛАТЕНО' : 'OVERPAID';
                                          } else {
                                            statusBadgeColor = 'bg-emerald-100 text-emerald-800 border-emerald-300';
                                            statusLabel = t.statusPaid;
                                          }

                                          return (
                                            <tr 
                                              key={recordItem.monthId} 
                                              className={`hover:bg-slate-50 transition-colors font-medium text-stone-700 ${
                                                isMonthActive ? 'bg-yellow-50/50 border-l-4 border-yellow-400' : ''
                                              }`}
                                            >
                                              {/* Month label column */}
                                              <td className="py-3 px-4 font-bold flex items-center gap-1.5">
                                                <span>{formatMonthId(recordItem.monthId, lang)}</span>
                                                {isMonthActive && (
                                                  <span className="px-1 text-[8px] bg-yellow-400 text-black border border-black font-black uppercase leading-none font-sans">
                                                    {t.currentMonthLabel}
                                                  </span>
                                                )}
                                              </td>
                                              
                                              {/* Billed */}
                                              <td className="py-3 px-4 text-right font-mono font-bold text-stone-600">
                                                {billedVal}
                                              </td>

                                              {/* Payment */}
                                              <td className="py-3 px-4 text-right font-mono font-black text-emerald-600">
                                                {paidVal > 0 ? `-${paidVal}` : '0'}
                                              </td>

                                              {/* Month Ending balance */}
                                              <td className={`py-3 px-4 text-right font-mono font-black ${
                                                endDebtVal > 0 ? 'text-rose-600 font-extrabold' : endDebtVal < 0 ? 'text-blue-600 font-extrabold' : 'text-emerald-600'
                                              }`}>
                                                {endDebtVal}
                                              </td>

                                              {/* Badge status */}
                                              <td className="py-3 px-4 text-center">
                                                <span className={`px-2 py-0.5 rounded-none text-[9px] font-black uppercase border tracking-wider inline-block leading-tight ${statusBadgeColor}`}>
                                                  {statusLabel}
                                                </span>
                                              </td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>

                                </div>
                              </div>
                            </motion.div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Full Debtors Summary Report Print Modal */}
      {showFullPrint && (
        <FullDebtorsPrint
          unitHistoryList={unitHistoryList}
          units={units}
          activeMonthId={activeMonthId}
          lang={lang}
          onClose={() => setShowFullPrint(false)}
        />
      )}
    </div>
  );
}
