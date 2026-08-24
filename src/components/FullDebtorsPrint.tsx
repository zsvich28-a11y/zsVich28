import React, { useState, useMemo } from 'react';
import { Printer, X, Search, Filter, AlertTriangle, CheckCircle2, FileText, Building2 } from 'lucide-react';
import { Language, Unit } from '../types';
import { formatMonthId, formatDenarExact } from '../utils';

export interface DebtorSummaryItem {
  unitId: string;
  number: string;
  owner: string;
  type: 'apartment' | 'store';
  endingDebtCurrent: number;
  beginningDebtCurrent: number;
  billedCurrent: number;
  paymentCurrent: number;
  monthsInDebt: number;
  history: Array<{
    monthId: string;
    beginningDebt: number;
    totalMonthlyCharge: number;
    payment: number;
    preJunePayment?: number;
    endingDebt: number;
  }>;
}

interface FullDebtorsPrintProps {
  unitHistoryList: DebtorSummaryItem[];
  units: Unit[];
  activeMonthId: string;
  lang: Language;
  onClose: () => void;
}

export default function FullDebtorsPrint({
  unitHistoryList,
  units,
  activeMonthId,
  lang,
  onClose,
}: FullDebtorsPrintProps) {
  const [filterMode, setFilterMode] = useState<'debtors' | 'all'>('debtors');
  const [orderBy, setOrderBy] = useState<'debt' | 'unit'>('debt');
  const [searchQuery, setSearchQuery] = useState('');
  const [customNotice, setCustomNotice] = useState(() => {
    return localStorage.getItem('debtors_report_notice') || '';
  });

  const handlePrint = () => {
    window.print();
  };

  const handleNoticeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setCustomNotice(val);
    localStorage.setItem('debtors_report_notice', val);
  };

  const currentDateStr = new Date().toLocaleDateString(lang === 'MK' ? 'mk-MK' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const activeMonthName = formatMonthId(activeMonthId, lang);

  // Filter & Sort list for display
  const filteredList = useMemo(() => {
    const list = unitHistoryList.filter(item => {
      const matchesSearch =
        item.owner.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.number.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;
      if (filterMode === 'debtors') {
        return item.endingDebtCurrent > 1; // Only active debtors
      }
      return true;
    });

    if (orderBy === 'debt') {
      return [...list].sort((a, b) => b.endingDebtCurrent - a.endingDebtCurrent);
    } else {
      return [...list].sort((a, b) => {
        const indexA = units.findIndex(u => u.id === a.unitId);
        const indexB = units.findIndex(u => u.id === b.unitId);
        return indexA - indexB;
      });
    }
  }, [unitHistoryList, searchQuery, filterMode, orderBy, units]);

  // Overall statistics (across all units)
  const totalArrears = useMemo(() => {
    return unitHistoryList.reduce((sum, item) => sum + (item.endingDebtCurrent > 0 ? item.endingDebtCurrent : 0), 0);
  }, [unitHistoryList]);

  const debtorsCount = useMemo(() => {
    return unitHistoryList.filter(item => item.endingDebtCurrent > 1).length;
  }, [unitHistoryList]);

  const settledCount = unitHistoryList.length - debtorsCount;

  // Table Totals for the printable table rows
  const tableTotals = useMemo(() => {
    let endingDebtSum = 0;

    filteredList.forEach(item => {
      endingDebtSum += item.endingDebtCurrent;
    });

    return {
      endingDebtSum: Math.round(endingDebtSum),
    };
  }, [filteredList]);

  const t = {
    MK: {
      modalTitle: 'ЗБИРЕН ИЗВЕШТАЈ ЗА ДОЛЖНИЦИ (PDF / ПЕЧАТЕНЊЕ)',
      modalSubtitle: 'Креирајте и отпечатете официјална листа на сите сопственици со заостанати долгови',
      printBtn: 'Зачувај во PDF / Печати',
      closeBtn: 'Затвори',
      filterDebtors: 'Само должници (> 0 ден.)',
      filterAll: 'Сите сопственици',
      sortDebt: 'Прво најголем долг',
      sortUnit: 'Според број на стан',
      searchPlaceholder: 'Пребарај по име или број на стан...',
      noticePlaceholder: 'Внесете изборна белешка или соопштение што ќе се прикаже на дното од извештајот...',
      
      // Print Document strings
      buildingTitle: 'ЗАЕДНИЦА НА СОПСТВЕНИЦИ НА УЛ. ВИЧ БР. 28, СКОПЈЕ',
      docTitle: 'ОФИЦИЈАЛЕН ЗБИРЕН ИЗВЕШТАЈ ЗА ДОЛГОВИ И ЗАОСТАНАТИ ОБВРСКИ',
      periodLabel: 'Регистар на сите задолжувања и заостанати долгови заклучно со:',
      dateGen: 'Датум на изготвување:',
      
      // Metrics
      statTotalDebt: 'Вкупен заостанат долг на зградата',
      statActiveDebtors: 'Сопственици со неодмирен долг',
      statSettled: 'Целосно подмирени сопственици',
      statTotalUnits: 'Вкупно имоти во регистарот',

      // Table columns
      colNum: 'Бр.',
      colUnit: 'Имот / Стан',
      colOwner: 'Сопственик / Корисник',
      colType: 'Тип',
      colStartDebt: 'Стар долг (пред 06.2026)',
      colBilled: 'Тековни задолжувања',
      colPaid: 'Вкупно уплатено',
      colEndingDebt: 'ВКУПЕН КРАЕН ДОЛГ',
      colStatus: 'Статус',

      typeApt: 'СТАН',
      typeStore: 'ЛОКАЛ',
      statusPaid: 'ИСПЛАТЕНО',
      statusUnpaid: 'НЕПЛАТЕНО',
      statusPartial: 'ДЕЛУМНО',

      totalsRow: 'ВКУПНО ЗА ПРИКАЖАНИТЕ ИМОТИ',
      
      bankInfoTitle: 'ИНФОРМАЦИИ И НАЧИН НА ПЛАЌАЊЕ НА ЗАОСТАНАТИТЕ ДОЛГОВИ',
      bankDetails: 'Жиро-сметка: 300000004672235 при Комерцијална банка АД Скопје | ЕДБ: 4057010504720',
      noticeHeader: 'Забелешка / Соопштение до сопствениците:',
      signLabel: 'Претседател на ЗС - Ф. Зафировски',
      signStamp: 'М.П. / Потпис',
    },
    EN: {
      modalTitle: 'SUMMARY DEBTORS REPORT (PDF / PRINT)',
      modalSubtitle: 'Generate and print official summary of all property owners with outstanding arrears',
      printBtn: 'Save to PDF / Print',
      closeBtn: 'Close',
      filterDebtors: 'Only Debtors (> 0 den)',
      filterAll: 'All Tenants',
      sortDebt: 'Highest Debt First',
      sortUnit: 'By Unit Number',
      searchPlaceholder: 'Search by owner name or unit number...',
      noticePlaceholder: 'Enter optional announcement or note to display at the bottom of the PDF report...',
      
      // Print Document strings
      buildingTitle: 'COMMUNITY OF OWNERS VICH ST. 28, SKOPJE',
      docTitle: 'OFFICIAL SUMMARY DEBT & ARREARS REPORT',
      periodLabel: 'Register of all charges and outstanding debts up to:',
      dateGen: 'Report Generated Date:',
      
      // Metrics
      statTotalDebt: 'Total Building Arrears',
      statActiveDebtors: 'Unsettled Debtors',
      statSettled: 'Fully Settled Tenants',
      statTotalUnits: 'Total Registered Properties',

      // Table columns
      colNum: '#',
      colUnit: 'Property Unit',
      colOwner: 'Property Owner / Resident',
      colType: 'Type',
      colStartDebt: 'Pre-June 2026 Debt',
      colBilled: 'Period Charges',
      colPaid: 'Total Paid',
      colEndingDebt: 'ENDING TOTAL DEBT',
      colStatus: 'Status',

      typeApt: 'APT',
      typeStore: 'STORE',
      statusPaid: 'PAID',
      statusUnpaid: 'UNPAID',
      statusPartial: 'PARTIAL',

      totalsRow: 'TOTALS FOR DISPLAYED PROPERTIES',

      bankInfoTitle: 'PAYMENT INFORMATION FOR SETTLING DEBTS',
      bankDetails: 'Bank Account: 300000004672235 at Komercijalna Banka AD Skopje | Tax ID: 4057010504720',
      noticeHeader: 'Announcement / Note to Owners:',
      signLabel: 'President of Community - F. Zafirovski',
      signStamp: 'Authorized Stamp & Signature',
    }
  }[lang];

  return (
    <div
      id="full-debtors-print-modal"
      className="fixed inset-0 bg-neutral-900/90 backdrop-blur-xs flex items-center justify-center p-0 z-50 overflow-y-auto print:static print:bg-white print:p-0 print:overflow-visible"
    >
      <div className="bg-slate-100 max-w-5xl w-full flex flex-col h-full md:h-[95vh] md:my-4 border-4 border-black font-sans relative print:border-0 print:h-auto print:my-0 print:bg-white animate-scale-up">
        
        {/* Modal Header Controls (Hidden during browser print) */}
        <div className="bg-black text-white p-4 border-b-4 border-black flex flex-col gap-3 print:hidden shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center space-x-2">
                <Printer className="w-5 h-5 text-yellow-400" />
                <h1 className="text-base font-black uppercase tracking-wide">{t.modalTitle}</h1>
              </div>
              <p className="text-[10px] text-slate-400 uppercase mt-0.5 tracking-wider">{t.modalSubtitle}</p>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handlePrint}
                className="py-2 px-4 bg-yellow-400 hover:bg-yellow-300 text-black border-2 border-black font-black text-xs uppercase tracking-widest flex items-center space-x-1.5 cursor-pointer transition-all shadow-sm"
              >
                <Printer className="w-4 h-4 shrink-0" />
                <span>{t.printBtn}</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-2 border-2 border-slate-700 bg-slate-900 text-slate-300 hover:text-white hover:border-white transition-all cursor-pointer"
                title={t.closeBtn}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Controls Bar: Filters, Search & Options */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-slate-800 text-xs">
            {/* Filter mode */}
            <div className="flex items-center space-x-2">
              <span className="text-[10px] uppercase font-bold text-slate-400">Филтер:</span>
              <div className="flex border border-slate-700 divide-x divide-slate-700 bg-slate-900">
                <button
                  type="button"
                  onClick={() => setFilterMode('debtors')}
                  className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${
                    filterMode === 'debtors' ? 'bg-yellow-400 text-black' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {t.filterDebtors}
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode('all')}
                  className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${
                    filterMode === 'all' ? 'bg-yellow-400 text-black' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {t.filterAll}
                </button>
              </div>
            </div>

            {/* Sorting */}
            <div className="flex items-center space-x-2">
              <span className="text-[10px] uppercase font-bold text-slate-400">Сортирај:</span>
              <div className="flex border border-slate-700 divide-x divide-slate-700 bg-slate-900">
                <button
                  type="button"
                  onClick={() => setOrderBy('debt')}
                  className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${
                    orderBy === 'debt' ? 'bg-yellow-400 text-black' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {t.sortDebt}
                </button>
                <button
                  type="button"
                  onClick={() => setOrderBy('unit')}
                  className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${
                    orderBy === 'unit' ? 'bg-yellow-400 text-black' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {t.sortUnit}
                </button>
              </div>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder={t.searchPlaceholder}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1 bg-slate-900 border border-slate-700 text-white text-xs font-medium focus:outline-none focus:border-yellow-400"
              />
            </div>
          </div>
        </div>

        {/* Scrollable Printable Page Container */}
        <div className="flex-1 bg-slate-200/60 p-4 md:p-8 overflow-y-auto print:overflow-visible print:bg-white print:p-0">
          
          {/* A4 Sheet Document Container */}
          <div
            id="printable-full-debtors-statement"
            className="max-w-4xl mx-auto bg-white border-2 border-black p-6 md:p-8 font-sans text-black relative shadow-none print:border-0 print:p-0 print:max-w-none print:w-full"
          >
            {/* Header Title Block */}
            <div className="text-center border-b-2 border-black pb-3 mb-4 print:pb-1.5 print:mb-2">
              <div className="flex items-center justify-center gap-2 text-slate-800 mb-0.5">
                <Building2 className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-700">
                  {t.buildingTitle}
                </span>
              </div>
              <h1 className="text-lg md:text-xl font-black uppercase tracking-tight text-black leading-tight">
                {t.docTitle}
              </h1>
              <div className="mt-1.5 flex flex-wrap items-center justify-center gap-2 text-[9px] font-mono uppercase print:mt-1">
                <span className="bg-slate-100 px-2 py-0.5 border border-slate-300">
                  {t.periodLabel} <strong>{activeMonthName}</strong>
                </span>
                <span className="bg-slate-100 px-2 py-0.5 border border-slate-300">
                  {t.dateGen} <strong>{currentDateStr}</strong>
                </span>
              </div>
            </div>

            {/* Key Arrears Metrics Highlights */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 border-2 border-black p-2 mb-4 bg-slate-50 print:mb-2 print:p-1.5">
              <div className="space-y-0.5 border-r border-slate-300 pr-2">
                <span className="text-[8px] font-black uppercase text-slate-500 block leading-tight">
                  {t.statTotalDebt}
                </span>
                <span className="text-sm font-black font-mono text-rose-600 block">
                  {formatDenarExact(totalArrears, lang)}
                </span>
              </div>

              <div className="space-y-0.5 border-r border-slate-300 pr-2">
                <span className="text-[8px] font-black uppercase text-slate-500 block leading-tight">
                  {t.statActiveDebtors}
                </span>
                <span className="text-sm font-black font-mono text-red-700 block">
                  {debtorsCount} <span className="text-[9px] text-slate-400 font-bold">/ {units.length}</span>
                </span>
              </div>

              <div className="space-y-0.5 border-r border-slate-300 pr-2">
                <span className="text-[8px] font-black uppercase text-slate-500 block leading-tight">
                  {t.statSettled}
                </span>
                <span className="text-sm font-black font-mono text-emerald-700 block">
                  {settledCount} <span className="text-[9px] text-slate-400 font-bold">/ {units.length}</span>
                </span>
              </div>

              <div className="space-y-0.5">
                <span className="text-[8px] font-black uppercase text-slate-500 block leading-tight">
                  {t.statTotalUnits}
                </span>
                <span className="text-sm font-black font-mono text-slate-900 block">
                  {filteredList.length}
                </span>
              </div>
            </div>

            {/* Debtors Main Table */}
            <div className="border-2 border-black mb-4 overflow-visible print:border-0 print:mb-2">
              <table className="w-full border-collapse text-left text-xs font-sans">
                <thead>
                  <tr className="bg-slate-900 text-white text-[9px] font-black uppercase tracking-wider border-b-2 border-black">
                    <th className="py-1.5 px-2.5 border-r border-slate-700 w-24">{t.colUnit}</th>
                    <th className="py-1.5 px-3 border-r border-slate-700">{t.colOwner}</th>
                    <th className="py-1.5 px-2 text-center border-r border-slate-700 w-16">{t.colType}</th>
                    <th className="py-1.5 px-3 text-right border-r border-slate-700 bg-red-950 text-white font-black">{t.colEndingDebt}</th>
                    <th className="py-1.5 px-2 text-center w-20">{t.colStatus}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300">
                  {filteredList.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-400 font-bold uppercase text-xs">
                        Нема пронајдено сопственици според избраниот филтер.
                      </td>
                    </tr>
                  ) : (
                    filteredList.map((item) => {
                      const hasDebt = item.endingDebtCurrent > 1;
                      const finalDebtVal = Math.round(item.endingDebtCurrent);

                      return (
                        <tr
                          key={item.unitId}
                          className={`hover:bg-slate-50 transition-colors font-medium text-[10px] ${
                            hasDebt ? 'bg-rose-50/30' : ''
                          }`}
                        >
                          <td className="py-1 px-2.5 border-r border-slate-200 font-mono font-black text-black">
                            {item.number}
                          </td>
                          <td className="py-1 px-3 border-r border-slate-200 font-bold uppercase text-slate-900">
                            {item.owner}
                          </td>
                          <td className="py-1 px-2 text-center border-r border-slate-200">
                            <span className={`px-1 py-0 text-[8px] font-black uppercase font-mono border ${
                              item.type === 'apartment' ? 'bg-blue-50 text-blue-900 border-blue-300' : 'bg-amber-50 text-amber-900 border-amber-300'
                            }`}>
                              {item.type === 'apartment' ? t.typeApt : t.typeStore}
                            </span>
                          </td>
                          <td className={`py-1 px-3 text-right font-mono font-black border-r border-slate-200 ${
                            hasDebt ? 'text-rose-700 bg-rose-100/50' : 'text-emerald-700 bg-emerald-50/50'
                          }`}>
                            {finalDebtVal.toLocaleString('mk-MK')} ден.
                          </td>
                          <td className="py-1 px-2 text-center">
                            {hasDebt ? (
                              <span className="px-1.5 py-0.5 bg-rose-600 text-white text-[8px] font-black uppercase tracking-wider rounded-xs inline-block">
                                {t.statusUnpaid}
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 bg-emerald-700 text-white text-[8px] font-black uppercase tracking-wider rounded-xs inline-block">
                                {t.statusPaid}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 border-t-2 border-black font-black text-[10px] font-mono">
                    <td colSpan={3} className="py-1.5 px-3 uppercase text-black font-sans border-r border-slate-300">
                      {t.totalsRow}
                    </td>
                    <td className="py-1.5 px-3 text-right border-r border-slate-300 text-rose-700 bg-rose-100/80 text-[11px] font-black">
                      {tableTotals.endingDebtSum.toLocaleString('mk-MK')} ден.
                    </td>
                    <td className="py-1.5 px-2"></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Bottom Printable Footer Wrapper */}
            <div className="break-inside-avoid print-avoid-break mt-4">
              {/* Optional Custom Notice Section */}
              <div className="mb-3 print:block">
                <div className="print:hidden mb-2">
                  <label className="block text-[10px] font-black uppercase text-slate-700 mb-1">
                    {t.noticeHeader}
                  </label>
                  <textarea
                    value={customNotice}
                    onChange={handleNoticeChange}
                    placeholder={t.noticePlaceholder}
                    rows={2}
                    className="w-full text-xs p-2 border-2 border-black font-sans focus:outline-hidden"
                  />
                </div>

                {customNotice.trim().length > 0 && (
                  <div className="border-2 border-dashed border-black p-2.5 bg-amber-50/50 text-xs font-medium leading-relaxed">
                    <span className="font-bold block uppercase text-[9px] text-amber-900 mb-0.5">
                      {t.noticeHeader}
                    </span>
                    <p className="whitespace-pre-line text-black text-[10px]">{customNotice}</p>
                  </div>
                )}
              </div>

              {/* Payment & Official Signature Footer */}
              <div className="border-2 border-black p-3 bg-slate-50 flex flex-row justify-between items-center gap-4">
                <div className="space-y-0.5 max-w-lg">
                  <p className="text-[10px] font-black uppercase text-black tracking-wider">
                    {t.bankInfoTitle}
                  </p>
                  <p className="text-[10px] font-mono font-bold text-slate-800">
                    {t.bankDetails}
                  </p>
                  <p className="text-[8px] text-slate-600 font-medium leading-tight">
                    Ве молиме сите за заостанати долгови да се изврши уплата со соодветно наведување на бројот на станот/локалот.
                  </p>
                </div>

                <div className="text-center shrink-0 min-w-[180px] border-l-2 border-black pl-4 py-0.5 space-y-2">
                  <p className="text-[9px] font-black uppercase tracking-wider text-black">
                    {t.signLabel}
                  </p>
                  <div className="border-b border-black w-28 mx-auto"></div>
                  <p className="text-[8px] font-mono uppercase text-slate-500">
                    {t.signStamp}
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
