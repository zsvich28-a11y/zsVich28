import React, { useState, useEffect } from 'react';
import { CalculatedInvoice, Language, MonthRecord, Unit, Expense } from '../types';
import { Printer, X, Check, Square, CheckSquare, Search, Filter, AlertCircle, FileText, Landmark } from 'lucide-react';
import { formatMonthId, calculateBalancesForMonth, formatDenar } from '../utils';

interface AllInvoicesPrintProps {
  invoices: CalculatedInvoice[];
  monthId: string;
  monthlyVariables: MonthRecord['variables'];
  onClose: () => void;
  lang: Language;
  apartmentFixedRatePerM2: number;
  storeFixedRatePerM2: number;
  calculatedInvoicesByMonth: Record<string, CalculatedInvoice[]>;
  units?: Unit[];
  expenses: Expense[];
  openingBalances: { bank: number; reserve: number } | null;
  monthIds: string[];
  balanceOverrides?: Record<string, { bank?: number; reserve?: number; operating?: number }> | null;
  tmobilePaid?: Record<string, boolean>;
  tmobileRates?: Record<string, number>;
}

export default function AllInvoicesPrint({
  invoices,
  monthId,
  monthlyVariables,
  onClose,
  lang,
  apartmentFixedRatePerM2,
  storeFixedRatePerM2,
  calculatedInvoicesByMonth,
  units = [],
  expenses = [],
  openingBalances = null,
  monthIds = [],
  balanceOverrides = {},
  tmobilePaid = {},
  tmobileRates = {}
}: AllInvoicesPrintProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'debtors' | 'prepaid'>('all');
  const [excludeEmailOptIn, setExcludeEmailOptIn] = useState(false);

  const [selectedUnitIds, setSelectedUnitIds] = useState<Record<string, boolean>>(() => {
    // By default, select all units for printing
    const initial: Record<string, boolean> = {};
    invoices.forEach(inv => {
      initial[inv.unitId] = true;
    });
    return initial;
  });

  const isEmailOptedIn = (inv: CalculatedInvoice) => {
    const unit = units.find(u => u.id === inv.unitId);
    return !!(unit && unit.email && unit.emailOptIn);
  };

  const monthName = formatMonthId(monthId, lang);
  const [yearStr, monthStr] = monthId.split('-');
  const yearNum = parseInt(yearStr, 10);
  const monthNum = parseInt(monthStr, 10);
  const lastDayNum = new Date(yearNum, monthNum, 0).getDate();

  const isJune = monthNum === 6;
  const issuedDateStr = isJune 
    ? `01.07.${yearStr}` 
    : `01.${monthStr}.${yearStr}`;
  const dueDateStr = isJune 
    ? `31.07.${yearStr}` 
    : `${lastDayNum}.${monthStr}.${yearStr}`;

  // Shared announcement synced with localStorage
  const [announcement, setAnnouncement] = useState(() => {
    return localStorage.getItem('invoice_announcement') || 
      (lang === 'MK' 
        ? 'Адресата за е-пошта на заедницата е променета во zsvich28@gmail.com, претходниот претставник на заедницата одби да го предаде пристапот до неа.'
        : 'The email address of the community has been changed to zsvich28@gmail.com, the previous representative refused to hand over access.');
  });

  const handleAnnouncementChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setAnnouncement(val);
    localStorage.setItem('invoice_announcement', val);
  };

  const insertAccountBalances = () => {
    const balances = calculateBalancesForMonth({
      monthId,
      monthIds,
      calculatedInvoicesByMonth,
      expenses,
      openingBalances,
      balanceOverrides,
      tmobilePaid,
      tmobileRates
    });

    const bankStr = formatDenar(balances.bank, lang);
    const operStr = formatDenar(balances.operating, lang);
    const resStr = formatDenar(balances.reserve, lang);

    const balanceText = lang === 'MK'
      ? `СОСТОЈБА НА СМЕТКИ ЗА МЕСЕЦ ${monthName.toUpperCase()}:\n- Вкупно на жиро сметка: ${bankStr}\n- Оперативен фонд: ${operStr}\n- Резервен фонд: ${resStr}`
      : `ACCOUNT BALANCES FOR THE MONTH OF ${monthName.toUpperCase()}:\n- Total Bank Account Balance: ${bankStr}\n- Operating Fund: ${operStr}\n- Reserve Fund: ${resStr}`;

    const separator = announcement.trim() ? '\n\n' : '';
    const newVal = announcement + separator + balanceText;
    setAnnouncement(newVal);
    localStorage.setItem('invoice_announcement', newVal);
  };

  const handleToggleSelectAll = (checked: boolean) => {
    const updated: Record<string, boolean> = {};
    invoices.forEach(inv => {
      updated[inv.unitId] = checked;
    });
    setSelectedUnitIds(updated);
  };

  const handlePrint = () => {
    window.print();
  };

  // Filter which invoices are visible in the bulk print manager on screen
  const matchesSearchAndFilter = (inv: CalculatedInvoice) => {
    const matchesSearch = 
      inv.owner.toLowerCase().includes(searchQuery.toLowerCase()) || 
      inv.number.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;

    if (filterType === 'debtors' && inv.endingDebt <= 0) {
      return false;
    }
    if (filterType === 'prepaid' && inv.endingDebt >= 0) {
      return false;
    }

    if (excludeEmailOptIn && isEmailOptedIn(inv)) {
      return false;
    }

    return true;
  };

  const filteredInvoices = invoices.filter(matchesSearchAndFilter);
  const invoicesToPrint = invoices.filter(inv => {
    if (!selectedUnitIds[inv.unitId]) return false;
    if (excludeEmailOptIn && isEmailOptedIn(inv)) return false;
    return true;
  });

  const getD7SplitInvoices = (originalInvoice: CalculatedInvoice): CalculatedInvoice[] => {
    const coOwners = [
      {
        name: 'МИНИСТЕРСТВО ЗА ФИНАНСИИ УПРАВА ЗА ЈАВНИ ПРИХОДИ РЕГИОНАЛНА ДИРЕКЦИЈА ШТИП',
        shareText: '52.56%',
        ratio: 226 / 430,
        number: 'D7/1',
        customAddress: 'Плоштад Слобода ББ Штип'
      },
      {
        name: 'Гроздан Петковски',
        shareText: '17.44%',
        ratio: 75 / 430,
        number: 'D7/2',
        customAddress: 'ул.М.Тито 151/25 К.Паланка'
      },
      {
        name: 'Зоран Денковски',
        shareText: '21.63%',
        ratio: 93 / 430,
        number: 'D7/3',
        customAddress: 'ул.А.Прешева 21 Куманово'
      },
      {
        name: 'Михаил Тренчев',
        shareText: '8.37%',
        ratio: 36 / 430,
        number: 'D7/4',
        customAddress: 'ул.В.Јоциќ Кратово'
      }
    ];

    return coOwners.map((owner) => {
      const scale = (val: number) => Math.round(val * owner.ratio);
      
      const fixedCharge = scale(originalInvoice.fixedCharge);
      const electricityCharge = scale(originalInvoice.electricityCharge);
      const elevatorCharge = scale(originalInvoice.elevatorCharge);
      const cleaningCharge = scale(originalInvoice.cleaningCharge);
      const accountingCharge = scale(originalInvoice.accountingCharge);
      const managementCharge = scale(originalInvoice.managementCharge);
      const bankFeesCharge = scale(originalInvoice.bankFeesCharge);
      const investmentCharge = scale(originalInvoice.investmentCharge || 0);
      const miscCharge = scale(originalInvoice.miscCharge || 0);

      const totalVariable = electricityCharge + elevatorCharge + cleaningCharge + accountingCharge + managementCharge + bankFeesCharge + investmentCharge + miscCharge;
      const totalMonthlyCharge = fixedCharge + totalVariable;

      const beginningDebt = scale(originalInvoice.beginningDebt);
      const payment = scale(originalInvoice.payment);
      const preJunePayment = originalInvoice.preJunePayment ? scale(originalInvoice.preJunePayment) : 0;
      const endingDebt = scale(originalInvoice.endingDebt);

      return {
        ...originalInvoice,
        owner: `${owner.name} (${owner.shareText})`,
        number: owner.number,
        customAddress: owner.customAddress,
        isD7Split: true,
        d7SplitRatio: owner.ratio,
        area: originalInvoice.area * owner.ratio,
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
        preJunePayment,
        endingDebt
      };
    });
  };

  // Group invoicesToPrint into pages of 3 to fit horizontal style layout on A4 portrait (3 per page)
  const apartments = invoicesToPrint.filter(inv => inv.type === 'apartment');
  const storesExceptD7 = invoicesToPrint.filter(inv => inv.type === 'store' && inv.unitId !== 'lokal-d7');
  const d7Invoice = invoicesToPrint.find(inv => inv.unitId === 'lokal-d7');
  const d7Group = d7Invoice ? [d7Invoice, ...getD7SplitInvoices(d7Invoice)] : [];

  const chunkArray = <T,>(arr: T[], size: number): T[][] => {
    const result: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
      result.push(arr.slice(i, i + size));
    }
    return result;
  };

  const apartmentPages = chunkArray(apartments, 3);
  const storeExceptD7Pages = chunkArray(storesExceptD7, 3);
  const d7Pages = chunkArray(d7Group, 3);

  const allPages = [
    ...apartmentPages.map((page, idx) => ({
      type: 'apartment' as const,
      key: `apt-page-${idx}`,
      pageNum: idx + 1,
      invoices: page
    })),
    ...storeExceptD7Pages.map((page, idx) => ({
      type: 'store' as const,
      key: `store-page-${idx}`,
      pageNum: idx + 1,
      invoices: page
    })),
    ...d7Pages.map((page, idx) => ({
      type: 'd7' as const,
      key: `d7-page-${idx}`,
      pageNum: idx + 1,
      invoices: page
    }))
  ];

  const t = {
    MK: {
      title: 'ПЕЧАТЕЊЕ НА СИТЕ ФАКТУРИ / PDF СЛУЖБА',
      subtitle: 'Прилагодете ги и банално испечатете ги сите фактури одеднаш во еден PDF документ',
      totalSelected: 'Избрани за печатење',
      printBtn: 'Зачувај како PDF / Печати сите',
      closeBtn: 'Затвори',
      announcementTitle: 'Уреди известување за сите',
      filterAll: 'Сите објекти',
      filterDebtors: 'Само должници',
      filterPrepaid: 'Само претплатени (Аванс)',
      searchPlaceholder: 'Пребарај за преглед...',
      btnSelectAll: 'Избери сите',
      btnUnselectAll: 'Откажи сите',
      billFor: 'ФАКТУРА ЗА',
      communcationTitle: 'ИЗВЕСТУВАЊЕ ЗА АКТИВНОСТИ НА ЗАЕДНИЦАТА НА СОПСТВЕНИЦИ',
      bankTitle: 'Комерцијална Банка АД Скопје',
      excludeEmailOptIn: 'Исклучи корисници со е-пошта'
    },
    EN: {
      title: 'BATCH PRINT INVOICES / SAVE ALL TO PDF',
      subtitle: 'Customize and print all monthly statements into a single, cohesive PDF file',
      totalSelected: 'Selected for print',
      printBtn: 'Save to PDF / Print All',
      closeBtn: 'Close',
      announcementTitle: 'Edit announcement for all',
      filterAll: 'All units',
      filterDebtors: 'Debtors only',
      filterPrepaid: 'Prepayments/Credits',
      searchPlaceholder: 'Search for preview...',
      btnSelectAll: 'Select All',
      btnUnselectAll: 'Deselect All',
      billFor: 'BILL FOR',
      communcationTitle: 'ANNOUNCEMENTS FROM THE COMMUNITY BOARD OF OWNERS',
      bankTitle: 'Komercijalna Banka AD Skopje',
      excludeEmailOptIn: 'Exclude email invoice opt-in'
    }
  }[lang];

  return (
    <div className="fixed inset-0 bg-neutral-900/90 backdrop-blur-xs flex items-center justify-center p-0 z-50 overflow-y-auto print:static print:bg-white print:p-0 print:overflow-visible" id="batch-print-modal">
      <div className="bg-slate-100 max-w-7xl w-full flex flex-col h-full md:h-[92vh] md:my-8 border-4 border-black shadow-none font-sans relative print:border-0 print:h-auto print:my-0 print:bg-white">
        
        {/* Bulk Controller header - Hidden in printing */}
        <div className="bg-black text-white p-5 border-b-4 border-black flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden shrink-0">
          <div>
            <div className="flex items-center space-x-2">
              <Printer className="w-6 h-6 text-yellow-400" />
              <h1 className="text-xl font-extrabold uppercase tracking-wide">{t.title}</h1>
            </div>
            <p className="text-[11px] text-slate-400 uppercase mt-1 tracking-wider">{t.subtitle}</p>
          </div>

          <div className="flex items-center space-x-2.5">
            <button
              id="bulk-print-close-btn-top"
              onClick={onClose}
              className="p-2 border-2 border-slate-700 bg-slate-900 text-slate-300 hover:text-white hover:border-white transition-all rounded-none cursor-pointer"
              title={t.closeBtn}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Dashboard layout dividing setting manager (left/top) and actual print pages list (right) */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden print:overflow-visible print:block">
          
          {/* Side Settings / Filter Sidebar - Hidden in printing */}
          <div className="w-full md:w-80 bg-white border-b-2 md:border-b-0 md:border-r-4 border-black p-5 flex flex-col space-y-5 overflow-y-auto print:hidden shrink-0">
            
            {/* Action Bar */}
            <div className="bg-black text-white p-4 border-2 border-black flex flex-col space-y-3">
              <div>
                <p className="text-[10px] font-black uppercase text-yellow-400 tracking-widest">{t.totalSelected}</p>
                <p className="text-3xl font-black font-mono mt-0.5">{invoicesToPrint.length} / {invoices.length}</p>
              </div>
              <button
                id="bulk-trigger-print-btn"
                disabled={invoicesToPrint.length === 0}
                onClick={handlePrint}
                className="w-full py-3 px-4 font-black text-xs uppercase tracking-widest text-black bg-yellow-400 hover:bg-yellow-300 border-2 border-black rounded-none cursor-pointer flex items-center justify-center space-x-2 disabled:bg-slate-300 disabled:text-slate-500 disabled:border-slate-400 disabled:cursor-not-allowed transition-all"
              >
                <Printer className="w-4 h-4" />
                <span>{t.printBtn}</span>
              </button>
            </div>

            {/* Editable Broadcast Announcement (Propagates to all invoices natively since it lives in localStorage) */}
            <div className="border-2 border-black p-4 bg-slate-50 flex flex-col space-y-3">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-dashed border-slate-300 pb-2">
                <label htmlFor="bulk-broadcast-message" className="text-xs font-black uppercase tracking-wider text-black flex items-center space-x-1.5">
                  <FileText className="w-4 h-4 shrink-0 text-black" />
                  <span>{t.announcementTitle}</span>
                </label>
              </div>

              <button
                type="button"
                onClick={insertAccountBalances}
                className="w-full mt-1 bg-slate-900 hover:bg-emerald-600 text-white border-2 border-black py-1.5 px-3 text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                title={lang === 'MK' ? 'Вметни ја тековната состојба во известувањето' : 'Insert current balances into the announcement'}
              >
                <Landmark className="w-3.5 h-3.5" />
                <span>{lang === 'MK' ? 'ВМЕТНИ СОСТОЈБА НА СМЕТКИ' : 'INSERT ACCOUNT BALANCES'}</span>
              </button>

              <textarea
                id="bulk-broadcast-message"
                value={announcement}
                onChange={handleAnnouncementChange}
                rows={5}
                className="w-full text-xs p-2.5 bg-white border-2 border-black focus:outline-hidden focus:ring-0 font-sans text-black leading-normal resize-none"
                placeholder="Внесете заедница објава..."
              />
            </div>

            {/* Toggle selections panel */}
            <div className="border-2 border-black p-4 space-y-3.5 bg-slate-50">
              <p className="text-xs font-black uppercase tracking-wider text-black">Избор на објекти</p>
              <div className="flex space-x-2">
                <button
                  id="bulk-select-all"
                  onClick={() => handleToggleSelectAll(true)}
                  className="flex-1 py-1 px-2 border border-black bg-white text-black hover:bg-slate-100 text-[10px] font-black uppercase tracking-wider"
                >
                  {t.btnSelectAll}
                </button>
                <button
                  id="bulk-deselect-all"
                  onClick={() => handleToggleSelectAll(false)}
                  className="flex-1 py-1 px-2 border border-black bg-white text-black hover:bg-slate-100 text-[10px] font-black uppercase tracking-wider"
                >
                  {t.btnUnselectAll}
                </button>
              </div>

              {/* Filters list */}
              <div className="space-y-1.5 pt-1 border-t border-slate-300">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 w-3.5 h-3.5" />
                  <input
                    id="bulk-search-units"
                    type="text"
                    placeholder={t.searchPlaceholder}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-2 py-1.5 border border-black bg-white text-[10px] uppercase font-mono font-bold"
                  />
                </div>

                <div className="flex flex-col space-y-1.5 pt-2">
                  {(['all', 'debtors', 'prepaid'] as const).map(type => (
                    <button
                      key={type}
                      id={`bulk-filter-${type}`}
                      onClick={() => setFilterType(type)}
                      className={`text-left py-1 px-2 font-bold text-[10px] uppercase tracking-wider border ${
                        filterType === type 
                          ? 'bg-black text-white border-black' 
                          : 'bg-white text-black border-slate-350 hover:bg-slate-100'
                      }`}
                    >
                      {type === 'all' && `${t.filterAll} (${invoices.length})`}
                      {type === 'debtors' && `${t.filterDebtors} (${invoices.filter(i => i.endingDebt > 0).length})`}
                      {type === 'prepaid' && `${t.filterPrepaid} (${invoices.filter(i => i.endingDebt < 0).length})`}
                    </button>
                  ))}
                </div>

                <div className="pt-2 border-t border-slate-200">
                  <label className="flex items-center space-x-2 cursor-pointer select-none">
                    <input
                      id="bulk-exclude-email-optin"
                      type="checkbox"
                      checked={excludeEmailOptIn}
                      onChange={(e) => setExcludeEmailOptIn(e.target.checked)}
                      className="rounded-none border-2 border-black text-black focus:ring-0 focus:outline-hidden w-3.5 h-3.5 cursor-pointer"
                    />
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-700">
                      {t.excludeEmailOptIn}
                    </span>
                  </label>
                </div>
              </div>

              {/* Scrollable multi-checkbox list */}
              <div className="max-h-52 overflow-y-auto border border-black divide-y divide-slate-250 bg-white">
                {filteredInvoices.map(inv => (
                  <label
                    key={inv.unitId}
                    className="flex items-center space-x-2.5 p-2 hover:bg-slate-50 cursor-pointer text-[11px] font-mono select-none"
                  >
                    <input
                      id={`bulk-checkbox-${inv.unitId}`}
                      type="checkbox"
                      checked={!!selectedUnitIds[inv.unitId]}
                      onChange={(e) => {
                        setSelectedUnitIds(prev => ({
                          ...prev,
                          [inv.unitId]: e.target.checked
                        }));
                      }}
                      className="rounded-none border-2 border-black text-black focus:ring-0 focus:outline-hidden"
                    />
                    <span className="font-extrabold w-8 inline-block">{inv.number}</span>
                    <span className="truncate font-sans font-medium text-slate-700 block-1">{inv.owner}</span>
                  </label>
                ))}
              </div>
            </div>

          </div>

          {/* Core Invoice Preview & Print Container */}
          <div id="bulk-print-preview-container" className="flex-1 bg-slate-200/60 p-6 md:p-8 overflow-y-auto print:overflow-visible print:bg-white print:p-0 select-none">
            
            {/* Visual Header above invoices in app view */}
            <div className="max-w-4xl mx-auto mb-6 bg-slate-900 text-white p-4 border-2 border-black flex items-center justify-between print:hidden">
              <div className="flex items-center space-x-2.5 text-[11px] uppercase tracking-wider font-extrabold">
                <FileText className="w-4 h-4 text-yellow-400" />
                <span>Општ преглед ({invoicesToPrint.length} фактури / {allPages.length} страници)</span>
              </div>
              <p className="text-[10px] text-slate-400 uppercase font-bold">Печатење: А4 Портрет (Portrait) — 3 хоризонтални фактури по страна</p>
            </div>

            {/* Empty state when deselecting everything */}
            {invoicesToPrint.length === 0 && (
              <div className="max-w-4xl mx-auto bg-white border-2 border-dashed border-slate-400 py-16 px-4 text-center print:hidden">
                <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                <p className="text-black font-black uppercase text-sm tracking-wider">Нема избрани фактури за печатење</p>
                <p className="text-xs text-slate-500 mt-1 uppercase">Ве молиме селектирајте барем еден стан од левата табела за преглед.</p>
              </div>
            )}

            {/* Print Area rendered page by page */}
            <div className="max-w-7xl mx-auto space-y-12 print:space-y-0 print:max-w-none print:w-full" id="bulk-printable-area">
              {allPages.map((page, pageIdx) => (
                <div
                  key={page.key}
                  className="print-page bg-white p-4 mb-8 print:p-0 print:mb-0"
                >
                  {/* Page Indicator (Hidden in print) */}
                  <div className="col-span-full bg-slate-800 text-white px-4 py-2 text-[10px] uppercase font-bold flex justify-between items-center print:hidden rounded-sm mb-4">
                    <span>
                      Страница {pageIdx + 1} - {page.type === 'apartment' ? 'Станови (Апартмани)' : page.type === 'd7' ? 'Деловни простории (Локал Д7 со косопственици)' : 'Деловни простории (Локали)'}
                    </span>
                    <span>
                      {page.invoices.length} / 3 фактури
                    </span>
                  </div>

                  {/* Render up to 3 horizontal invoices in a stacked vertical grid layout */}
                  <div className="print-page-grid grid grid-cols-1 gap-6 print:grid-cols-1 print:grid-rows-3 print:gap-[4mm] print:p-[2mm] h-full w-full">
                    {page.invoices.map((invoice) => {
                      const isApartment = invoice.type === 'apartment';
                      const currentFixedRate = isApartment ? apartmentFixedRatePerM2 : storeFixedRatePerM2;
                      
                      // Percentages logic
                      const shareAllNum = (invoice.area / 5189) * 100;
                      const shareAllStr = shareAllNum.toFixed(2);
                      const shareElecStr = isApartment ? ((invoice.area / 4868) * 100).toFixed(2) : '0.00';

                      // Status rules
                      const LEDGERTOTAL = Math.round(invoice.endingDebt);
                      const RAWBILL = Math.round(invoice.totalMonthlyCharge);

                      let statusTitle = '';
                      let statusDetail = '';

                      if (lang === 'MK') {
                        if (LEDGERTOTAL > RAWBILL) {
                          statusTitle = '!!!ВЕ МОЛИМЕ ДА СЕ СЕРВИСИРА ДОЛГОТ КОН ЗАЕДНИЦАТА НА СОПСТВЕНИЦИ!!!';
                        } else {
                          statusTitle = 'РЕДОВНА УПЛАТА, ВИ БЛАГОДАРИМЕ';
                        }

                        if (LEDGERTOTAL < 0) {
                          statusDetail = `НЕМА ЗА УПЛАТА ТЕКОВЕН МЕСЕЦ. СМЕТКАТА Е ПОКРИЕНА ОД АВАНС. ПРЕОСТАНАТ КРЕДИТ: ${Math.abs(LEDGERTOTAL)} ДЕН.`;
                        } else if (LEDGERTOTAL === 0 && RAWBILL > 0) {
                          statusDetail = 'ТЕКОВНАТА СМЕТКА Е ЦЕЛОСНО ПОКРИЕНА ОД АВАНС. ----- ЗА УПЛАТА: 0 ДЕН.';
                        } else if (LEDGERTOTAL === 0) {
                          statusDetail = `НЕМА ЗАОСТАНАТ ДОЛГ. ----- ЗА УПЛАТА ТЕКОВЕН МЕСЕЦ: ${RAWBILL} ДЕН.`;
                        } else if (LEDGERTOTAL < RAWBILL) {
                          statusDetail = `ТЕКОВНА СМЕТКА НАМАЛЕНА ЗА АВАНС. ----- ЗА УПЛАТА: ${LEDGERTOTAL} ДЕН.`;
                        } else {
                          statusDetail = `ВКУПЕН ДОЛГ ЗА УПЛАТА (СО ЗАОСТАНАТ ДОЛГ): ${LEDGERTOTAL} ДЕН.`;
                        }
                      } else {
                        if (LEDGERTOTAL > RAWBILL) {
                          statusTitle = '!!!PLEASE SETTLE THE OUTSTANDING DEBT TO THE COMMUNITY OF OWNERS!!!';
                        } else {
                          statusTitle = 'REGULAR PAYMENT, THANK YOU';
                        }

                        if (LEDGERTOTAL < 0) {
                          statusDetail = `NO PAYMENT DUE CURRENT MONTH. ACCOUNT COVERED BY PREPAYMENT. REMAINING CREDIT: ${Math.abs(LEDGERTOTAL)} DEN.`;
                        } else if (LEDGERTOTAL === 0 && RAWBILL > 0) {
                          statusDetail = 'CURRENT BILL IS FULLY COVERED BY PREPAYMENT. ----- TO PAY: 0 DEN.';
                        } else if (LEDGERTOTAL === 0) {
                          statusDetail = `NO OUTSTANDING DEBT. ----- TO PAY CURRENT MONTH: ${RAWBILL} DEN.`;
                        } else if (LEDGERTOTAL < RAWBILL) {
                          statusDetail = `CURRENT BILL REDUCED BY PREPAYMENT. ----- TO PAY: ${LEDGERTOTAL} DEN.`;
                        } else {
                          statusDetail = `TOTAL DEBT DUE (INCLUDING PAST ARREARS): ${LEDGERTOTAL} DEN.`;
                        }
                      }

                      // Monthly Debt getter helper with Backward Debt Distribution (FIFO-based) to prevent double counting carryover debts
                      const getMonthlyDebt = (uId: string, yr: number, mo: number, ratio?: number): string => {
                        // Hide future months relative to the invoice being viewed/printed
                        if (yr > yearNum || (yr === yearNum && mo > monthNum)) {
                          return '0';
                        }

                        const targetMonthId = `${yearNum}-${monthNum.toString().padStart(2, '0')}`;
                        const sortedMonthIds = Object.keys(calculatedInvoicesByMonth)
                          .filter(mId => mId <= targetMonthId)
                          .sort();

                        const targetInvoices = calculatedInvoicesByMonth[targetMonthId];
                        const targetInv = targetInvoices?.find(i => i.unitId === uId);
                        if (!targetInv) return '0';

                        let remainingDebt = targetInv.endingDebt;
                        if (remainingDebt <= 0) {
                          // If there's a prepayment, show it only in the current/active month cell
                          const queryMonthId = `${yr}-${mo.toString().padStart(2, '0')}`;
                          if (queryMonthId === targetMonthId) {
                            const rawPrepayment = Math.round(remainingDebt);
                            if (ratio !== undefined) {
                              return Math.round(rawPrepayment * ratio).toString();
                            }
                            return rawPrepayment.toString();
                          }
                          return '0';
                        }

                        // Distribute positive remaining debt backward across chronological months
                        const reverseMonthIds = [...sortedMonthIds].reverse();
                        const distributed: Record<string, number> = {};

                        for (let idx = 0; idx < reverseMonthIds.length; idx++) {
                          const mId = reverseMonthIds[idx];
                          const inv = calculatedInvoicesByMonth[mId]?.find(i => i.unitId === uId);
                          if (!inv) continue;

                          const isFirstMonth = (mId === sortedMonthIds[0]);
                          const capacity = isFirstMonth 
                            ? (inv.beginningDebt + inv.totalMonthlyCharge) 
                            : inv.totalMonthlyCharge;

                          if (remainingDebt > 0) {
                            if (capacity > 0) {
                              const allocated = Math.min(remainingDebt, capacity);
                              distributed[mId] = allocated;
                              remainingDebt -= allocated;
                            } else {
                              distributed[mId] = 0;
                            }
                          } else {
                            distributed[mId] = 0;
                          }
                        }

                        // Add any remaining unallocated debt to the first month so totals always reconcile perfectly
                        if (remainingDebt > 0 && sortedMonthIds.length > 0) {
                          const firstMonthId = sortedMonthIds[0];
                          distributed[firstMonthId] = (distributed[firstMonthId] || 0) + remainingDebt;
                        }

                        const queryMonthId = `${yr}-${mo.toString().padStart(2, '0')}`;
                        const rawVal = distributed[queryMonthId] || 0;
                        if (ratio !== undefined) {
                          return Math.round(rawVal * ratio).toString();
                        }
                        return Math.round(rawVal).toString();
                      };

                      const getYearTotal = (uId: string, yr: number, ratio?: number): number => {
                        let sum = 0;
                        for (let m = 1; m <= 12; m++) {
                          sum += Number(getMonthlyDebt(uId, yr, m, ratio));
                        }
                        return sum;
                      };

                      return (
                        <div
                          key={`${invoice.unitId}-${invoice.number}`}
                          className="invoice-print-wrapper flex flex-col justify-start w-full"
                          id={`bulk-invoice-node-${invoice.unitId}-${invoice.number.replace('/', '-')}`}
                        >
                          <div className="invoice-card-print bg-white border-[2.5px] border-black flex flex-row p-0 shadow-none print:border-2 print:rounded-none w-full">
                          {/* Left Column (65% width) */}
                          <div className="w-[65%] border-r-[2.5px] border-black flex flex-col justify-between h-full">
                            {/* Row 1: Header Address Line */}
                            <div className="header-line border-b-[2px] border-black p-1 text-center font-bold tracking-normal uppercase text-[8.5px] bg-white text-black">
                              {lang === 'MK'
                                ? 'Заедница на сопственици на станбено-деловната зграда на ул. Вич бр. 28, Скопје'
                                : 'Community of Owners of the Residential-Commercial Building at Address: Vich St. 28, Skopje'}
                            </div>

                            {/* Row 2: Metadata Row (5 items) */}
                            <div className="meta-block grid grid-cols-12 border-b-[2px] border-black text-[8px] leading-tight font-mono text-black items-stretch">
                              <div className="col-span-4 p-1 border-r border-black font-extrabold flex items-center justify-center text-center uppercase">
                                {lang === 'MK' ? 'СМЕТКА ЗА' : 'BILL FOR'} {monthName} г.
                              </div>
                              <div className="col-span-1 p-0.5 border-r border-black font-bold flex items-center justify-center">
                                {lang === 'MK' ? 'бр.' : 'No.'}
                              </div>
                              <div className="col-span-3 p-0.5 border-r border-black font-bold flex items-center justify-center text-center">
                                {invoice.isD7Split ? (
                                  `${invoice.number} - ${monthNum.toString().padStart(2, '0')}-${yearNum}`
                                ) : (
                                  `${isApartment ? (lang === 'MK' ? 'стан' : 'apt') : (lang === 'MK' ? 'деловен' : 'store')} ${invoice.number} - ${monthNum} - ${yearNum}`
                                )}
                              </div>
                              <div className="col-span-2 p-0.5 border-r border-black flex flex-col justify-center text-center">
                                <span className="text-[6.5px] text-slate-500 font-sans">{lang === 'MK' ? 'Промет на' : 'Issued'}</span>
                                <span className="font-bold">{issuedDateStr}</span>
                              </div>
                              <div className="col-span-2 p-0.5 flex flex-col justify-center text-center">
                                <span className="text-[6.5px] text-slate-500 font-sans">{lang === 'MK' ? 'Платете до' : 'Due'}</span>
                                <span className="font-bold">{dueDateStr}</span>
                              </div>
                            </div>

                            {/* Row 3: Owner block (Owner Name and Address) */}
                            <div className="owner-block border-b-[2.5px] border-black p-1 px-2.5 flex flex-row items-center justify-between bg-white font-sans min-h-[20px] overflow-hidden">
                              <div className={`owner-name font-black uppercase tracking-tight text-black leading-tight flex-1 pr-2 ${
                                invoice.owner.length > 35 ? 'text-[8.5px] long-owner-name' : 'text-[11px]'
                              }`}>
                                {invoice.owner}
                              </div>
                              <div className="text-[8.5px] font-bold text-slate-500 font-mono uppercase tracking-wider text-right shrink-0">
                                {invoice.customAddress ? (
                                  invoice.customAddress
                                ) : (
                                  lang === 'MK'
                                    ? `ул. Вич 28/${invoice.number} Скопје`
                                    : `Vich St. 28/${invoice.number} Skopje`
                                )}
                              </div>
                            </div>

                            {/* Row 4: Charges Table breakdown */}
                            <div className="flex-1 flex flex-col overflow-hidden">
                              <table className="w-full h-full text-left border-collapse font-mono text-[8px]">
                                <thead>
                                  <tr className="border-b border-black text-black font-extrabold uppercase text-[7px] tracking-wider bg-slate-50 h-4">
                                    <th className="p-0.5 pl-1.5 border-r border-black text-left w-[50%]">{lang === 'MK' ? 'Месечни трошоци' : 'Monthly expenses'}</th>
                                    <th className="p-0.5 pr-1.5 border-r border-black text-right w-[16%]">{lang === 'MK' ? 'Износ на фактура' : 'Invoice Amount'}</th>
                                    <th className="p-0.5 pr-1.5 border-r border-black text-right w-[14%]">{lang === 'MK' ? '.% од фак.' : '.% of Inv.'}</th>
                                    <th className="p-0.5 pr-1.5 text-right w-[20%]">{lang === 'MK' ? 'Ваш дел од трошокот' : 'Your share'}</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-black/35 text-black">
                                  
                                  {/* 1. Fixed Reserve Fund */}
                                  <tr className="h-[3.8mm]">
                                    <td className="p-0.5 pl-1.5 border-r border-black text-left font-sans font-bold uppercase text-[7.5px]">
                                      {lang === 'MK' ? `Резервен фонд( ${currentFixedRate} денари x м2)` : `Reserve fund (${currentFixedRate} denars x m2)`}
                                    </td>
                                    <td className="p-0.5 pr-1.5 border-r border-black text-right">{currentFixedRate.toFixed(0)}</td>
                                    <td className="p-0.5 pr-1.5 border-r border-black text-right">
                                      {(invoice as any).isD7Split ? invoice.area.toFixed(2) : `${invoice.area}.00`}
                                    </td>
                                    <td className="p-0.5 pr-1.5 text-right font-bold">{invoice.fixedCharge.toFixed(0)}</td>
                                  </tr>

                                  {/* 2. Electricity */}
                                  <tr className="h-[3.8mm]">
                                    <td className="p-0.5 pl-1.5 border-r border-black text-left font-sans font-bold uppercase text-[7.5px]">
                                      {lang === 'MK' ? 'Заедничка струја - ЕД' : 'Shared electricity - ED'}
                                    </td>
                                    <td className="p-0.5 pr-1.5 border-r border-black text-right">
                                      {isApartment ? monthlyVariables.electricity.toFixed(0) : '0.00'}
                                    </td>
                                    <td className="p-0.5 pr-1.5 border-r border-black text-right">
                                      {isApartment ? shareElecStr : '—'}
                                    </td>
                                    <td className="p-0.5 pr-1.5 text-right font-bold">
                                      {invoice.electricityCharge.toFixed(0)}
                                    </td>
                                  </tr>

                                  {/* 3. Elevator */}
                                  <tr className="h-[3.8mm]">
                                    <td className="p-0.5 pl-1.5 border-r border-black text-left font-sans font-bold uppercase text-[7.5px]">
                                      {lang === 'MK' ? 'Месечно одржување лифтови' : 'Monthly lift maintenance'}
                                    </td>
                                    <td className="p-0.5 pr-1.5 border-r border-black text-right">
                                      {isApartment ? monthlyVariables.elevator.toFixed(0) : '0.00'}
                                    </td>
                                    <td className="p-0.5 pr-1.5 border-r border-black text-right">
                                      {isApartment ? shareElecStr : '—'}
                                    </td>
                                    <td className="p-0.5 pr-1.5 text-right font-bold">
                                      {invoice.elevatorCharge.toFixed(0)}
                                    </td>
                                  </tr>

                                  {/* 4. Investment maintenance */}
                                  <tr className="h-[3.8mm]">
                                    <td className="p-0.5 pl-1.5 border-r border-black text-left font-sans font-bold uppercase text-[7.5px]">
                                      {lang === 'MK' ? 'Инвестиционо одржување' : 'Investment maintenance'}
                                    </td>
                                    <td className="p-0.5 pr-1.5 border-r border-black text-right">
                                      {(monthlyVariables.investment || 0).toFixed(0)}
                                    </td>
                                    <td className="p-0.5 pr-1.5 border-r border-black text-right">
                                      {shareAllStr}
                                    </td>
                                    <td className="p-0.5 pr-1.5 text-right font-bold">
                                      {(invoice.investmentCharge || 0).toFixed(0)}
                                    </td>
                                  </tr>

                                  {/* 5. Cleaning */}
                                  <tr className="h-[3.8mm]">
                                    <td className="p-0.5 pl-1.5 border-r border-black text-left font-sans font-bold uppercase text-[7.5px]">
                                      {lang === 'MK' ? 'Хигиена' : 'Cleaning & hygiene'}
                                    </td>
                                    <td className="p-0.5 pr-1.5 border-r border-black text-right">
                                      {monthlyVariables.cleaning.toFixed(0)}
                                    </td>
                                    <td className="p-0.5 pr-1.5 border-r border-black text-right">
                                      {shareAllStr}
                                    </td>
                                    <td className="p-0.5 pr-1.5 text-right font-bold">
                                      {invoice.cleaningCharge.toFixed(0)}
                                    </td>
                                  </tr>

                                  {/* 6. Accounting */}
                                  <tr className="h-[3.8mm]">
                                    <td className="p-0.5 pl-1.5 border-r border-black text-left font-sans font-bold uppercase text-[7.5px]">
                                      {lang === 'MK' ? 'Сметководство' : 'Accounting'}
                                    </td>
                                    <td className="p-0.5 pr-1.5 border-r border-black text-right">
                                      {monthlyVariables.accounting.toFixed(0)}
                                    </td>
                                    <td className="p-0.5 pr-1.5 border-r border-black text-right">
                                      {shareAllStr}
                                    </td>
                                    <td className="p-0.5 pr-1.5 text-right font-bold">
                                      {invoice.accountingCharge.toFixed(0)}
                                    </td>
                                  </tr>

                                  {/* 7. Management */}
                                  <tr className="h-[3.8mm]">
                                    <td className="p-0.5 pl-1.5 border-r border-black text-left font-sans font-bold uppercase text-[7.5px]">
                                      {lang === 'MK' ? 'Управување(бруто со ПДД)' : 'Management (gross)'}
                                    </td>
                                    <td className="p-0.5 pr-1.5 border-r border-black text-right">
                                      {monthlyVariables.management.toFixed(0)}
                                    </td>
                                    <td className="p-0.5 pr-1.5 border-r border-black text-right">
                                      {shareAllStr}
                                    </td>
                                    <td className="p-0.5 pr-1.5 text-right font-bold">
                                      {invoice.managementCharge.toFixed(0)}
                                    </td>
                                  </tr>

                                  {/* 8. Bank Fees */}
                                  <tr className="h-[3.8mm]">
                                    <td className="p-0.5 pl-1.5 border-r border-black text-left font-sans font-bold uppercase text-[7.5px]">
                                      {lang === 'MK' ? 'Банкарска провизија' : 'Bank commission'}
                                    </td>
                                    <td className="p-0.5 pr-1.5 border-r border-black text-right">
                                      {monthlyVariables.bankFees.toFixed(0)}
                                    </td>
                                    <td className="p-0.5 pr-1.5 border-r border-black text-right">
                                      {shareAllStr}
                                    </td>
                                    <td className="p-0.5 pr-1.5 text-right font-bold">
                                      {invoice.bankFeesCharge.toFixed(0)}
                                    </td>
                                  </tr>

                                  {/* 9. Miscellaneous */}
                                  <tr className="h-[3.8mm]">
                                    <td className="p-0.5 pl-1.5 border-r border-black text-left font-sans font-bold uppercase text-[7.5px]">
                                      {lang === 'MK' ? 'Разно' : 'Misc'}
                                    </td>
                                    <td className="p-0.5 pr-1.5 border-r border-black text-right">
                                      {(monthlyVariables.misc || 0).toFixed(0)}
                                    </td>
                                    <td className="p-0.5 pr-1.5 border-r border-black text-right">
                                      {shareAllStr}
                                    </td>
                                    <td className="p-0.5 pr-1.5 text-right font-bold">
                                      {(invoice.miscCharge || 0).toFixed(0)}
                                    </td>
                                  </tr>

                                </tbody>
                              </table>
                            </div>

                            {/* Row 5: Footer block (Bank, President, and totals) aligned with grid */}
                            <div className="grid grid-cols-12 border-t-[2.5px] border-black text-[7.5px] font-mono leading-tight bg-white h-auto items-stretch">
                              
                              {/* Column A (Bank details, width 50%) */}
                              <div className="bank-details col-span-5 p-1 border-r border-black flex flex-col justify-center text-left">
                                <p className="font-extrabold text-[7px] uppercase tracking-tight text-slate-500">
                                  {lang === 'MK' ? 'Комерцијална банка АД Скопје' : 'Komercijalna Banka AD Skopje'}
                                </p>
                                <p className="font-black mt-0.5">300000004672235 ЕДБ 4057010504720</p>
                              </div>

                              {/* Column B (President, width 30%) */}
                              <div className="president-block col-span-3 p-0.5 border-r border-black flex flex-col justify-center text-center">
                                <p className="text-[6.5px] uppercase tracking-tight font-extrabold text-slate-500 leading-none">
                                  {lang === 'MK' ? 'Претседател на заедницата на сопственици' : 'Owners President'}
                                </p>
                                <p className="font-serif italic border-b border-black border-dotted mx-auto w-[90%] pb-0.5 font-black text-[7.5px] mt-1 text-slate-900">
                                  Ф. Зафировски
                                </p>
                              </div>

                              {/* Column C (Totals details) */}
                              <div className="values-block col-span-4 flex flex-col justify-between text-right bg-white select-text">
                                <div className="p-0.5 px-1.5 border-b border-black flex-1 flex items-center justify-between text-[7px] font-bold text-black bg-white leading-none">
                                  <span className="uppercase text-[6px] font-extrabold text-slate-500 tracking-tight">{lang === 'MK' ? 'Вкупно тековен' : 'Current'}:</span>
                                  <span className="font-black text-[8px] pl-2">{invoice.totalMonthlyCharge}</span>
                                </div>
                                <div className="p-0.5 px-1.5 flex-1 flex items-center justify-between text-[7px] font-bold text-black bg-white leading-none">
                                  <span className="uppercase text-[6px] font-extrabold text-slate-500 tracking-tight">{lang === 'MK' ? 'Заостанат долг' : 'Arrears'}:</span>
                                  <span className="font-black text-[8px] pl-2">{Math.max(0, invoice.beginningDebt - (invoice.preJunePayment || 0))}</span>
                                </div>
                              </div>

                            </div>

                          </div>

                          {/* Right Column (Community Messages & Shaded Highlights - 35% width) */}
                          <div className="w-[35%] flex flex-col bg-white border-l-0 h-full justify-between">
                            
                            {/* Row 1: Announcements banner */}
                            <div className="bg-neutral-200 border-b-[2px] border-black p-1 text-center flex items-center justify-center h-[26px]">
                              <p className="text-[7.5px] font-black uppercase tracking-tight text-black leading-tight">
                                {lang === 'MK'
                                  ? 'ИЗВЕСТУВАЊЕ ЗА АКТИВНОСТИ НА ЗАЕДНИЦАТА НА СОПСТВЕНИЦИ'
                                  : 'COMMUNITY ACTIVITIES ANNOUNCEMENTS'}
                              </p>
                            </div>

                            {/* Row 2: Announcement text editing body */}
                            <div className="announcement-block p-1.5 text-black text-[7.5px] leading-snug flex-1 flex flex-col bg-white border-b-[2px] border-black text-left select-text whitespace-pre-wrap overflow-hidden">
                              {announcement}
                            </div>

                            {/* Row 3: Standalone Payment status text */}
                            <div className="status-block bg-white border-b-[2px] border-black p-1 text-center flex items-center justify-center h-[20px]">
                              <p className="font-black text-[7.5px] text-black uppercase tracking-tight">
                                {statusTitle}
                              </p>
                            </div>

                            {/* Row 4: Shaded bottom footer payment status details block */}
                            <div className="total-highlight bg-neutral-200 p-1.5 flex flex-col justify-center text-center font-mono text-black h-[28px] select-text">
                              <p className="text-[6.5px] leading-tight text-black font-extrabold border border-dashed border-black p-0.5 uppercase bg-white">
                                {statusDetail}
                              </p>
                            </div>

                          </div>
                        </div>

                        {/* Unpaid Monthly Debts History Table (3 Rows x 14 Columns) */}
                        <div className="debts-history-print-table border-2 border-black text-black text-[7.5px] font-mono leading-tight bg-white overflow-hidden w-full select-text flex flex-col justify-between">
                          <table className="w-full text-center border-collapse h-full">
                            <thead>
                              <tr className="bg-slate-100 border-b-2 border-black text-[6.5px] font-black uppercase h-[4.1mm]">
                                <th className="p-0 border-r-2 border-black text-left pl-1.5 w-[22%] truncate font-sans font-extrabold text-black bg-slate-50">
                                  {invoice.owner}
                                </th>
                                {Array.from({ length: 12 }).map((_, idx) => {
                                  const isCurrentMonth = (idx + 1) === monthNum;
                                  return (
                                    <th 
                                      key={idx} 
                                      className={`p-0 border-r-2 border-black w-[6%] text-center font-black ${
                                        isCurrentMonth 
                                          ? 'bg-yellow-400 text-black text-[7.5px]' 
                                          : 'text-black bg-slate-50'
                                      }`}
                                    >
                                      {idx + 1}
                                    </th>
                                  );
                                })}
                                <th className="p-0 w-[6%] text-center font-sans font-extrabold text-black bg-slate-150">
                                  {lang === 'MK' ? 'ВКУПНО' : 'TOTAL'}
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr className="border-b-2 border-black h-[4.1mm]">
                                <td className="p-0 border-r-2 border-black text-left pl-1.5 font-bold w-[22%] bg-slate-50/50">
                                  {yearNum - 1}
                                </td>
                                {Array.from({ length: 12 }).map((_, idx) => {
                                  const debtStr = getMonthlyDebt(invoice.unitId, yearNum - 1, idx + 1, (invoice as any).isD7Split ? (invoice as any).d7SplitRatio : undefined);
                                  const debtNum = Number(debtStr);
                                  return (
                                    <td 
                                      key={idx} 
                                      className={`p-0 border-r-2 border-black text-center w-[6%] font-mono font-bold text-[7px] ${
                                        debtNum > 0 
                                          ? 'bg-rose-100/70 text-rose-800 font-black' 
                                          : 'text-slate-300 font-normal'
                                      }`}
                                    >
                                      {debtNum > 0 ? Math.round(debtNum) : '—'}
                                    </td>
                                  );
                                })}
                                <td rowSpan={2} className="p-0 font-black text-center w-[6%] bg-slate-100 text-black text-[8px] align-middle border-l-2 border-black">
                                  {getYearTotal(invoice.unitId, yearNum - 1, (invoice as any).isD7Split ? (invoice as any).d7SplitRatio : undefined) + getYearTotal(invoice.unitId, yearNum, (invoice as any).isD7Split ? (invoice as any).d7SplitRatio : undefined)}
                                </td>
                              </tr>
                              <tr className="h-[4.1mm]">
                                <td className="p-0 border-r-2 border-black text-left pl-1.5 font-bold bg-amber-50/50 w-[22%]">
                                  {yearNum}
                                </td>
                                {Array.from({ length: 12 }).map((_, idx) => {
                                  const debtStr = getMonthlyDebt(invoice.unitId, yearNum, idx + 1, (invoice as any).isD7Split ? (invoice as any).d7SplitRatio : undefined);
                                  const debtNum = Number(debtStr);
                                  const isCurrentMonth = (idx + 1) === monthNum;
                                  return (
                                    <td 
                                      key={idx} 
                                      className={`p-0 border-r-2 border-black text-center w-[6%] font-mono text-[7px] ${
                                        isCurrentMonth
                                          ? 'bg-yellow-300/80 font-black text-black border-x-2 border-black'
                                          : debtNum > 0 
                                            ? 'bg-rose-100/70 text-rose-800 font-black' 
                                            : 'text-slate-300 font-normal'
                                      }`}
                                    >
                                      {debtNum > 0 ? Math.round(debtNum) : '—'}
                                    </td>
                                  );
                                })}
                              </tr>
                            </tbody>
                          </table>
                        </div>

                      </div>
                    );
                    })}

                    {/* Fill empty cells with safe spacers to preserve 3-row grid structure on page */}
                    {page.invoices.length < 3 && Array.from({ length: 3 - page.invoices.length }).map((_, emptyIdx) => (
                      <div key={`empty-${emptyIdx}`} className="hidden md:block print:hidden opacity-10 bg-slate-100 border-2 border-slate-350 border-dashed rounded-md h-full min-h-[140px]" />
                    ))}
                  </div>
                </div>
              ))}
            </div>

          </div>

        </div>

        {/* Modal Bottom control buttons - Hidden in printing */}
        <div className="flex justify-end space-x-3 p-4 border-t-2 border-black bg-slate-50 print:hidden shrink-0">
          <button
            id="bulk-print-close-btn-bottom"
            onClick={onClose}
            className="px-5 py-2.5 text-xs font-black uppercase tracking-widest text-black hover:bg-slate-200 transition-all cursor-pointer"
          >
            {t.closeBtn}
          </button>
          <button
            id="bulk-print-action-btn-bottom"
            disabled={invoicesToPrint.length === 0}
            onClick={handlePrint}
            className="px-6 py-2.5 font-black uppercase tracking-widest text-white bg-black hover:bg-yellow-400 hover:text-black hover:border-black border border-black flex items-center space-x-1.5 transition-all cursor-pointer shadow-none disabled:bg-slate-300 disabled:text-slate-500 disabled:border-slate-400 disabled:cursor-not-allowed"
          >
            <Printer className="w-4 h-4 shrink-0" />
            <span>{t.printBtn}</span>
          </button>
        </div>

      </div>
    </div>
  );
}
