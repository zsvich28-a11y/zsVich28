import React, { useEffect, useState } from 'react';
import { Language } from '../types';
import { 
  macedonianNumberToWords, 
  formatMonthId, 
  MONTH_NAMES 
} from '../utils';
import { 
  Smartphone, 
  Printer, 
  Calendar, 
  DollarSign, 
  Hash, 
  Save, 
  MapPin, 
  Mail, 
  Phone, 
  Landmark, 
  Check, 
  AlertCircle,
  CheckCircle2,
  XCircle,
  Eye,
  Clock,
  ArrowRight,
  Search,
  SlidersHorizontal,
  Coins
} from 'lucide-react';

interface TMobileInvoicesProps {
  activeMonthId: string;
  lang: Language;
  tmobileRates: Record<string, number>;
  tmobileDates: Record<string, string>;
  tmobileNos: Record<string, string>;
  onUpdateRate: (monthId: string, rate: number) => void;
  onUpdateDate: (monthId: string, dateStr: string) => void;
  onUpdateNo: (monthId: string, invoiceNo: string) => void;
  monthIds: string[];
  tmobileInvoiced?: Record<string, boolean>;
  tmobilePaid?: Record<string, boolean>;
  tmobilePaidDates?: Record<string, string>;
  tmobileNotes?: Record<string, string>;
  onUpdateInvoiced: (monthId: string, value: boolean) => void;
  onUpdatePaid: (monthId: string, value: boolean) => void;
  onUpdatePaidDate: (monthId: string, dateStr: string) => void;
  onUpdateNote: (monthId: string, noteStr: string) => void;
  onSelectMonth?: (monthId: string) => void;
}

export default function TMobileInvoices({
  activeMonthId,
  lang,
  tmobileRates,
  tmobileDates,
  tmobileNos,
  onUpdateRate,
  onUpdateDate,
  onUpdateNo,
  monthIds = [],
  tmobileInvoiced = {},
  tmobilePaid = {},
  tmobilePaidDates = {},
  tmobileNotes = {},
  onUpdateInvoiced,
  onUpdatePaid,
  onUpdatePaidDate,
  onUpdateNote,
  onSelectMonth,
}: TMobileInvoicesProps) {
  
  // 1. Calculate smart default invoicing date for the 28th of the month
  const calculateDefaultInvoiceDate = (monthId: string): string => {
    const [yearStr, monthStr] = monthId.split('-');
    const year = parseInt(yearStr);
    const month = parseInt(monthStr);
    if (isNaN(year) || isNaN(month)) return '';
    
    // Create date for the 28th of this month
    const date = new Date(year, month - 1, 28);
    const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
    
    const adjustedDate = new Date(date);
    if (dayOfWeek === 6) {
      // Saturday -> Move back to Friday (27th)
      adjustedDate.setDate(27);
    } else if (dayOfWeek === 0) {
      // Sunday -> Move forward to Monday (29th)
      adjustedDate.setDate(29);
    }
    
    const yyyy = adjustedDate.getFullYear();
    const mm = String(adjustedDate.getMonth() + 1).padStart(2, '0');
    const dd = String(adjustedDate.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const getDefaultInvoiceNo = (monthId: string): string => {
    const [yearStr, monthStr] = monthId.split('-');
    let year = parseInt(yearStr, 10);
    let month = parseInt(monthStr, 10);
    if (isNaN(year) || isNaN(month)) return '';
    
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
    const nextMonthStr = month.toString().padStart(2, '0');
    return `${nextMonthStr}-${year}`;
  };

  // 2. Fetch specific month states or default them
  const currentRate = tmobileRates[activeMonthId] !== undefined ? tmobileRates[activeMonthId] : 61.50;
  
  const defaultDate = calculateDefaultInvoiceDate(activeMonthId);
  const currentDate = tmobileDates[activeMonthId] || defaultDate;
  
  // Calculate default invoice number based on month-year shifted by +1
  const defaultInvoiceNo = () => {
    return getDefaultInvoiceNo(activeMonthId);
  };
  const currentInvoiceNo = tmobileNos[activeMonthId] || defaultInvoiceNo();

  // Local editable controls loaded from prop states
  const [rateInput, setRateInput] = useState(currentRate.toString());
  const [dateInput, setDateInput] = useState(currentDate);
  const [noInput, setNoInput] = useState(currentInvoiceNo);
  const [feedbackMsg, setFeedbackMsg] = useState('');

  // T-Mobile Invoices tracker states
  const [trackerFilter, setTrackerFilter] = useState<'all' | 'pending' | 'paid' | 'invoiced'>('all');
  const [trackerSearch, setTrackerSearch] = useState('');

  // Settle inputs when month moves
  useEffect(() => {
    const r = tmobileRates[activeMonthId] !== undefined ? tmobileRates[activeMonthId] : 61.50;
    const d = tmobileDates[activeMonthId] || calculateDefaultInvoiceDate(activeMonthId);
    const n = tmobileNos[activeMonthId] || getDefaultInvoiceNo(activeMonthId);
    
    setRateInput(r.toString());
    setDateInput(d);
    setNoInput(n);
    setFeedbackMsg('');
  }, [activeMonthId, tmobileRates, tmobileDates, tmobileNos]);

  // Handle manual changes saving
  const handleSaveSettings = () => {
    const numRate = parseFloat(rateInput);
    if (isNaN(numRate) || numRate <= 0) {
      alert(lang === 'MK' ? 'Ве молиме внесете валиден курс на EUR.' : 'Please input a valid EUR exchange rate.');
      return;
    }
    
    onUpdateRate(activeMonthId, numRate);
    onUpdateDate(activeMonthId, dateInput);
    onUpdateNo(activeMonthId, noInput);

    setFeedbackMsg(lang === 'MK' ? 'Податоците се зачувани!' : 'Invoice settings saved!');
    setTimeout(() => setFeedbackMsg(''), 3000);
  };

  // 3. Mathematical derivations
  const eurQuantity = 300;
  const denarsValue = Math.round(eurQuantity * currentRate);
  
  // Calculate corresponding formatted Macedonian and English month/year names for explanation
  const getInvoiceMonthString = (langKey: 'MK' | 'EN'): string => {
    const [yearStr, monthStr] = activeMonthId.split('-');
    let year = parseInt(yearStr, 10);
    let month = parseInt(monthStr, 10);
    
    // In current month N we are invoicing for month N + 1 (e.g. June invoices for July)
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
    
    const mIdx = month - 1;
    const mName = MONTH_NAMES[langKey][mIdx] || '';
    return `${mName.toLowerCase()} ${year}`;
  };

  // Get digits to words transcription for MKD total
  const transcribedDenars = macedonianNumberToWords(denarsValue);

  // Derive due date (15 days from issuance date)
  const getDueDate = (invoiceDateStr: string) => {
    if (!invoiceDateStr) return '';
    const date = new Date(invoiceDateStr);
    if (isNaN(date.getTime())) return '';
    
    date.setDate(date.getDate() + 15);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };
  
  const dueDateInput = getDueDate(dateInput);

  // Friendly date formatting helpers for Macedonian / English style printing
  const formatDateForPrint = (dateString: string) => {
    if (!dateString) return '';
    const [y, m, d] = dateString.split('-');
    return `${d}.${m}.${y} година`;
  };

  const handlePrint = () => {
    const printContent = document.getElementById('invoice-a4-paper-page');
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      window.print();
      return;
    }

    const title = lang === 'MK' 
      ? `Т-Мобиле Фактура - ${currentInvoiceNo}` 
      : `T-Mobile Invoice - ${currentInvoiceNo}`;

    printWindow.document.write(`
      <html>
        <head>
          <title>${title}</title>
          <meta charset="utf-8" />
          <style>
            @media print {
              @page {
                size: A4 portrait;
                margin: 10mm 15mm 10mm 15mm;
              }
              body {
                margin: 0 !important;
                padding: 0 !important;
                background-color: white !important;
                color: black !important;
              }
            }
            body {
              background-color: #f1f5f9;
              display: flex;
              justify-content: center;
              padding: 20px 0;
              margin: 0;
              font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
            }
            #invoice-a4-paper-page {
              background-color: white !important;
              color: black !important;
              box-shadow: 0 10px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1) !important;
              border: 1px solid #e2e8f0 !important;
              width: 210mm !important;
              min-height: 297mm !important;
              padding: 8mm 12mm !important;
              box-sizing: border-box !important;
            }
            @media print {
              body {
                background-color: white !important;
                padding: 0 !important;
              }
              #invoice-a4-paper-page {
                box-shadow: none !important;
                border: none !important;
                width: 100% !important;
                min-height: auto !important;
                padding: 0 !important;
                margin: 0 !important;
              }
            }
          </style>
        </head>
        <body>
          <div id="invoice-a4-paper-page" style="letter-spacing: 0.015em; display: flex; flex-direction: column; justify-content: space-between; height: 100%;">
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
    <div className="space-y-6" id="t-mobile-invoices-tab">
      
      {/* 1. Configuration Panel Toolbar (Excluded from Printing) */}
      <div className="bg-white p-6 border-2 border-black flex flex-col xl:flex-row xl:items-center justify-between gap-6 print:hidden">
        <div className="flex items-start space-x-3.5">
          <div className="p-2.5 bg-black text-white border-2 border-black shrink-0">
            <Smartphone className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-black text-black uppercase tracking-tight">
              {lang === 'MK' ? 'Т-МОБИЛЕ (МАКЕДОНСКИ ТЕЛЕКОМ) ФАКТУРИРАЊЕ' : 'T-MOBILE (MAKEDONSKI TELEKOM) INVOICING'}
            </h3>
            <p className="text-xs text-slate-500 font-bold mt-1 uppercase tracking-wider">
              {lang === 'MK' 
                ? 'Управувајте и печатете ги месечните фактури за закуп на покрив од 300 евра.' 
                : 'Configure and print the monthly roof-contract invoice of €300.'
              }
            </p>
          </div>
        </div>

        {/* Input variables & Control buttons */}
        <div className="flex flex-wrap items-center gap-4">
          
          {/* Invoice No */}
          <div className="flex flex-col">
            <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1 flex items-center gap-1">
              <Hash className="w-3 h-3 text-slate-400" />
              {lang === 'MK' ? 'Број на фактура:' : 'Invoice No:'}
            </label>
            <input
              type="text"
              value={noInput}
              onChange={(e) => setNoInput(e.target.value)}
              className="px-3 py-1.5 border-2 border-black text-xs font-mono font-black uppercase focus:outline-hidden"
              placeholder="e.g., 06-2026"
            />
          </div>

          {/* Date Picker */}
          <div className="flex flex-col">
            <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-slate-400" />
              {lang === 'MK' ? 'Датум на фактурирање:' : 'Invoicing Date:'}
            </label>
            <input
              type="date"
              value={dateInput}
              onChange={(e) => setDateInput(e.target.value)}
              className="px-3 py-1.5 border-2 border-black text-xs font-bold focus:outline-hidden"
            />
          </div>

          {/* Exchange Rate Input (Hidden from print, used for calculation) */}
          <div className="flex flex-col">
            <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1 flex items-center gap-1">
              <DollarSign className="w-3 h-3 text-slate-400" />
              {lang === 'MK' ? 'Среден курс на ЕУР (ден.):' : 'EUR Exchange Rate (MKD):'}
            </label>
            <input
              type="number"
              step="0.0001"
              value={rateInput}
              onChange={(e) => setRateInput(e.target.value)}
              className="px-3 py-1.5 border-2 border-black text-xs font-black font-mono focus:outline-hidden w-40"
              placeholder="61.50"
            />
          </div>

          {/* Actions */}
          <div className="flex items-end gap-2 pt-4">
            <button
              onClick={handleSaveSettings}
              className="px-4 py-2 bg-black text-white text-xs font-black uppercase tracking-widest border-2 border-black hover:bg-slate-800 flex items-center gap-1.5 cursor-pointer leading-tight"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{lang === 'MK' ? 'ЗАЧУВАЈ' : 'SAVE'}</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-yellow-400 text-black text-xs font-black uppercase tracking-widest border-2 border-black hover:bg-yellow-500 flex items-center gap-1.5 cursor-pointer leading-tight"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{lang === 'MK' ? 'ПЕЧАТИ (A4)' : 'PRINT (A4)'}</span>
            </button>
          </div>

        </div>
      </div>

      {feedbackMsg && (
        <div className="bg-indigo-50 border-2 border-indigo-500 p-3 flex items-center space-x-2 text-indigo-800 text-xs font-bold font-mono tracking-wider animate-pulse print:hidden">
          <Check className="w-4 h-4 text-indigo-600 shrink-0" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* Weekend shifting explanation note */}
      {(() => {
        const defaultDateOriginal = `${activeMonthId.split('-')[0]}-${activeMonthId.split('-')[1]}-28`;
        const originalD = new Date(defaultDateOriginal);
        const day = originalD.getDay();
        const landsOnWeekend = day === 0 || day === 6;
        if (landsOnWeekend) {
          return (
            <div className="bg-amber-50 border-2 border-amber-500 p-4 shrink-0 flex items-start space-x-3 print:hidden">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-black text-amber-800 uppercase tracking-wide">
                  {lang === 'MK' ? 'ВИКЕНД ПРИЛАГОДУВАЊЕ НА ДАТУМОТ' : 'WEEKEND DATE ADJUSTMENT LOGIC'}
                </p>
                <p className="text-[11px] text-amber-700 font-bold mt-1 uppercase leading-snug">
                  {lang === 'MK' 
                    ? `28-ми во овој месец (${formatDateForPrint(defaultDateOriginal)}) паѓа во ${day === 6 ? 'сабота' : 'недела'}. Датумот на фактурирање автоматски се помести на ${formatDateForPrint(defaultDate)} (${day === 6 ? 'петок' : 'понеделник'}). Слободно сменете го датумот доколку имате потреба.`
                    : `The 28th of this month falls on a ${day === 6 ? 'Saturday' : 'Sunday'}. The system default automatically shifted to ${formatDateForPrint(defaultDate)} (${day === 6 ? 'Friday' : 'Monday'}). You can fully edit this above.`
                  }
                </p>
              </div>
            </div>
          );
        }
        return null;
      })()}

      {/* 2. THE PRINTABLE A4 SHEET container */}
      <div className="flex justify-center w-full print:block print:w-full print:p-0 print:m-0" id="printable-sheet-wrapper">
        
        {/* Real A4 Paper dimensions representation in browser preview, full-width on print */}
        <div 
          className="w-full max-w-[800px] bg-white border-2 border-slate-300 md:shadow-xl p-8 md:p-14 text-black text-[13px] leading-relaxed relative flex flex-col justify-between aspect-[1/1.414] print:shadow-none print:border-none print:m-0 print:p-[8mm_12mm] print:max-w-none print:w-full print:h-full print:text-black font-sans"
          id="invoice-a4-paper-page"
          style={{ letterSpacing: '0.015em' }}
        >
          {/* Main Content Area */}
          <div className="space-y-4 md:space-y-6 print:space-y-3">
            
            {/* Header Title Banner */}
            <div className="text-center font-black uppercase text-xs md:text-base border-b-2 border-black pb-2.5 print:pb-1.5 leading-tight tracking-tight mt-0 flex flex-col items-center">
              <span>ЗАЕДНИЦА НА СОПСТВЕНИЦИ НА СТАНБЕНО-ДЕЛОВНАТА ЗГРАДА</span>
              <span className="mt-0.5">НА УЛ. ВИЧ БР. 28, СКОПЈЕ</span>
            </div>

            {/* Seller and Buyer dual block layout */}
            <div className="grid grid-cols-2 gap-4 md:gap-8 print:gap-4 text-[11.5px] md:text-[12px]">
              
              {/* Seller Information (Left side) */}
              <div className="space-y-0.5 bg-stone-50 border border-slate-200 p-3.5 print:p-2.5">
                <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider block border-b border-stone-200 pb-1 mb-1.5 print:mb-1">ИЗДАВАЧ</span>
                <p className="font-bold text-black uppercase">Заедница на сопственици - Вич 28</p>
                <p className="text-stone-700">ул. Вич бр. 28, Скопје</p>
                <p className="mt-2 print:mt-1 text-black font-semibold leading-normal">
                  Трансакциска сметка:<br/>
                  <strong className="text-sm font-black font-mono tracking-tight text-blue-900 block mt-0.5">300 000 004 672 235</strong>
                  <span className="text-stone-500 font-medium block">Комерцијална банка АД Скопје</span>
                </p>
                <p className="pt-1 text-stone-700 font-semibold uppercase">
                  ЕДБ: <strong className="font-mono text-black font-bold">4057010504720</strong>
                </p>
              </div>

              {/* Buyer Information (Right side) */}
              <div className="space-y-0.5 border border-slate-200 p-3.5 print:p-2.5 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider block border-b border-stone-200 pb-1 mb-1.5 print:mb-1">ПРИМАЧ</span>
                  <p className="font-black text-[13px] text-black uppercase">МАКЕДОНСКИ ТЕЛЕКОМ АД СКОПЈЕ</p>
                  <p className="text-stone-700 font-bold mt-1">Кеј 13ти-Ноември бр.6,</p>
                  <p className="text-stone-700 font-bold">1000 Скопје</p>
                </div>
                <div className="pt-2 print:pt-1 mt-auto border-t border-dashed border-stone-200">
                  <p className="text-[11px] font-black uppercase text-indigo-900 bg-indigo-50 border border-indigo-200 px-2 py-0.5 inline-block">
                    Архива/Сектор за сметководство и даноци
                  </p>
                </div>
              </div>

            </div>

            {/* Space with Invoice metadata block */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 border-y border-stone-300 py-3 print:py-1.5">
              <div>
                <h1 className="text-xl md:text-2xl font-black uppercase tracking-tight text-black flex items-center">
                  ФАКТУРА бр. <span className="ml-2 font-mono text-black text-xl md:text-2xl font-black tracking-wider">{currentInvoiceNo}</span>
                </h1>
              </div>

              {/* Date Metadata side table */}
              <div className="text-[11px] font-bold space-y-1 uppercase tracking-wide self-stretch sm:self-auto bg-stone-50 border border-stone-200 p-2.5 print:p-2 leading-normal">
                <div className="flex justify-between gap-6">
                  <span className="text-[10px] text-stone-500 select-none">Датум на издавање:</span>
                  <span className="font-mono text-black">{formatDateForPrint(dateInput)}</span>
                </div>
                <div className="flex justify-between gap-6">
                  <span className="text-[10px] text-stone-500 select-none">Рок за плаќање:</span>
                  <span className="font-mono text-red-700 font-black">{formatDateForPrint(dueDateInput)}</span>
                </div>
                <div className="flex justify-between gap-6 border-t border-stone-200 pt-1 mt-1 text-[9px] text-slate-500">
                  <span>Услови за плаќање:</span>
                  <span>15 дена од датум на издавање</span>
                </div>
                <div className="flex justify-between gap-6">
                  <span className="text-[10px] text-stone-500 select-none">Место на издавање:</span>
                  <span className="text-black">Скопје</span>
                </div>
              </div>
            </div>

            {/* Middle description detailed text block */}
            <div className="space-y-2 print:space-y-1.5">
              <span className="text-[10px] font-black uppercase text-stone-400 tracking-wider">ОПИС НА ПОБАРУВАЊЕТО</span>
              
              <div className="bg-stone-50 border border-slate-300 rounded-none p-4 print:p-3 text-justify hover:bg-slate-50 transition-colors">
                <p className="text-[13px] leading-relaxed text-black font-semibold">
                  Закупнина од <strong className="text-black font-black">300 евра</strong> за месецот <strong className="text-indigo-900 font-black uppercase">{getInvoiceMonthString('MK')}</strong> за користење на дел од покривот на зградата на ул. Вич бр. 28, Скопје, согласно со договорот бр. 10-8272/1 од 20.04.2010 година и Записникот за вклучување во работа број 10-8272/2 од 06.12.2010 година.
                </p>
              </div>
            </div>

            {/* Calculations Table block */}
            <div className="border border-black">
              {/* Header row */}
              <div className="grid grid-cols-12 bg-black text-white text-[10px] font-black uppercase tracking-wider text-center py-2 print:py-1.5">
                <div className="col-span-1 border-r border-stone-700">рб</div>
                <div className="col-span-5 border-r border-stone-700 text-left pl-3">Опис на услугата</div>
                <div className="col-span-1 border-r border-stone-700">ЕД</div>
                <div className="col-span-1 border-r border-stone-700">Кол.</div>
                <div className="col-span-2 border-r border-stone-700 text-right pr-2">Износ (EUR)</div>
                <div className="col-span-2 text-right pr-3">Вкупно (MKD)</div>
              </div>

              {/* Data row */}
              <div className="grid grid-cols-12 text-[12px] text-center border-b border-stone-300 py-3 print:py-2 items-center">
                <div className="col-span-1 font-mono text-stone-500 font-bold">1</div>
                <div className="col-span-5 text-left pl-3 font-semibold pr-2 leading-tight">
                  Месечен закуп за антени/покрив ({getInvoiceMonthString('MK')})
                </div>
                <div className="col-span-1 font-bold">мес.</div>
                <div className="col-span-1 font-mono font-bold">1</div>
                <div className="col-span-2 text-right pr-2 font-mono font-black">
                  €300.00
                </div>
                <div className="col-span-2 text-right pr-3 font-mono font-black text-black text-[13px]">
                  {denarsValue.toLocaleString('mk-MK')} ден.
                </div>
              </div>

              {/* Exchange rate info sub line */}
              <div className="bg-stone-50 p-2.5 print:p-2 text-[11px] font-bold text-stone-700 leading-normal border-b border-black flex flex-col gap-0.5">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                  <span>Среден курс за EUR според курсната листа на НБРМ на денот на фактурирање:</span>
                  <span className="font-mono text-black font-black bg-white px-2 py-0.5 border border-slate-300">
                    1 EUR = {currentRate.toFixed(4)} MKD
                  </span>
                </div>
              </div>

              {/* Total Summary Row */}
              <div className="grid grid-cols-12 bg-stone-100 py-2.5 print:py-2 text-right">
                <div className="col-span-8 text-[11px] font-black uppercase tracking-wider text-black pr-4 self-center select-none">
                  ВКУПНО ЗА ПЛАЌАЊЕ:
                </div>
                <div className="col-span-4 pr-3 text-right">
                  <div className="font-mono font-black text-black text-lg leading-none border-b border-black pb-1 inline-block">
                    {denarsValue.toLocaleString('mk-MK')} ден.
                  </div>
                </div>
              </div>
            </div>

            {/* Word transcription container */}
            <div className="bg-stone-50 border border-slate-200 p-3.5 print:p-2.5 text-[11.5px] md:text-[12px] rounded-none">
              <p className="text-black font-semibold leading-relaxed uppercase tracking-wide">
                Вкупно со зборови: <span className="font-black text-indigo-950 underline decoration-indigo-200 decoration-2">{transcribedDenars} денари</span>.
              </p>
            </div>

            {/* General fiscal notes or reference */}
            <div className="text-[9px] md:text-[10px] text-slate-500 leading-normal space-y-0.5">
              <p>
                * НАПОМЕНА: Заедницата на сопственици на ул.Вич бр. 28 Скопје не е ДДВ обврзник. Фактурата е ослободена согласно законските прописи за сопственички заедници кои не профитираат дополнително освен тековно инвестирање.
              </p>
              <p>
                * Референца: Согласно Договор бр.10-8272/1 од 20.04.2010 г. Средствата се исплаќаат директно на горенаведената жиро сметка.
              </p>
            </div>

          </div>

          {/* Bottom Footer Area - Signatures and contacts */}
          <div className="space-y-4 md:space-y-6 mt-6 md:mt-10 print:mt-4 print:space-y-3">
            
            {/* Signature Block */}
            <div className="grid grid-cols-2 gap-8 text-[11px] md:text-[12px] pt-1">
              
              {/* Recipient signature */}
              <div className="space-y-6">
                <p className="font-bold text-stone-700 uppercase tracking-wide">Фактурата ја примил:</p>
                <div className="border-t border-black w-4/5 pt-1">
                  <p className="text-[10px] font-bold text-stone-400 uppercase">Потпис на овластено лице, датум и печат</p>
                </div>
              </div>

              {/* Issuer Signature */}
              <div className="space-y-6 text-right flex flex-col items-end">
                <div className="text-right">
                  <p className="font-bold text-stone-700 uppercase tracking-wide">За издавачот:</p>
                  <p className="text-[11px] text-stone-500 font-semibold uppercase mt-0.5">Претседател на заедницата</p>
                </div>
                <div className="border-t border-black w-4/5 pt-1 text-right">
                  <p className="font-black text-black uppercase text-[11.5px] tracking-tight">Филип Зафировски</p>
                  <p className="text-[9px] font-bold text-stone-400 uppercase leading-snug">Овластено лице за потпишување фактури</p>
                </div>
              </div>

            </div>

            {/* Address bar / final print-safe official footer */}
            <div className="border-t border-stone-300 pt-2 flex flex-col md:flex-row justify-between items-center text-[10px] text-stone-500 font-bold uppercase tracking-wider gap-2 select-none">
              <div className="flex items-center space-x-1.5">
                <MapPin className="w-3.5 h-3.5 text-stone-400" />
                <span>Заедница на сопственици на зградата на ул. Вич бр. 28, Скопје</span>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-1">
                  <Mail className="w-3.5 h-3.5 text-stone-400" />
                  <span className="font-mono lowercase">zsvich28@gmail.com</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Phone className="w-3.5 h-3.5 text-stone-400" />
                  <span className="font-mono">072260616</span>
                </div>
              </div>
            </div>

          </div>

        </div>
      </div>

      {/* 3. T-MOBILE INVOICE & PAYMENT TRACKER (Excluded from print) */}
      <div className="bg-white border-2 border-black p-6 space-y-6 print:hidden" id="tmobile-tracker-section">
        
        {/* Tracker Header */}
        <div className="border-b-2 border-black pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-black text-white shrink-0">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-md font-black text-black uppercase tracking-tight">
                {lang === 'MK' ? 'СЛЕДЕЊЕ НА ФАКТУРИ И НАПЛАТА' : 'INVOICE & PAYMENT TRACKER'}
              </h3>
              <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">
                {lang === 'MK'
                  ? 'Следете кои месеци се фактурирани и наплатени од Македонски Телеком.'
                  : 'Track which months have been invoiced and paid by Makedonski Telekom.'
                }
              </p>
            </div>
          </div>
          
          <div className="text-[10px] font-mono font-bold bg-slate-100 border border-slate-300 px-2.5 py-1 text-slate-600 uppercase">
            {lang === 'MK' ? `Вкупно следени: ${monthIds.length} месеци` : `Tracking: ${monthIds.length} months`}
          </div>
        </div>

        {/* Tracker Smart Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Stats: Collected */}
          <div className="border-2 border-black bg-emerald-50 p-4 relative overflow-hidden flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-black uppercase text-emerald-800 tracking-wider">
                {lang === 'MK' ? 'ВКУПНО НАПЛАТЕНО' : 'TOTAL PAID / COLLECTED'}
              </span>
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="mt-4">
              <div className="font-mono text-xl md:text-2xl font-black text-emerald-950">
                {Math.round(monthIds.reduce((sum, mId) => {
                  if (!!tmobilePaid[mId]) {
                    const rate = tmobileRates[mId] !== undefined ? tmobileRates[mId] : 61.50;
                    return sum + (300 * rate);
                  }
                  return sum;
                }, 0)).toLocaleString('mk-MK')} ден.
              </div>
              <p className="text-[11px] text-emerald-800 font-bold mt-1 uppercase">
                {lang === 'MK' 
                  ? `Раздолжени ${monthIds.filter(mId => !!tmobilePaid[mId]).length} месеци` 
                  : `Cleared ${monthIds.filter(mId => !!tmobilePaid[mId]).length} months`
                }
              </p>
            </div>
          </div>

          {/* Stats: Invoiced & Pending */}
          <div className="border-2 border-black bg-amber-50 p-4 relative overflow-hidden flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-black uppercase text-amber-800 tracking-wider">
                {lang === 'MK' ? 'ФАКТУРИРАНО & ЧЕКА ПЛАЌАЊЕ' : 'INVOICED & PENDING'}
              </span>
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div className="mt-4">
              <div className="font-mono text-xl md:text-2xl font-black text-amber-950">
                {Math.round(monthIds.reduce((sum, mId) => {
                  if (!!tmobileInvoiced[mId] && !tmobilePaid[mId]) {
                    const rate = tmobileRates[mId] !== undefined ? tmobileRates[mId] : 61.50;
                    return sum + (300 * rate);
                  }
                  return sum;
                }, 0)).toLocaleString('mk-MK')} ден.
              </div>
              <p className="text-[11px] text-amber-800 font-bold mt-1 uppercase">
                {lang === 'MK' 
                  ? `${monthIds.filter(mId => !!tmobileInvoiced[mId] && !tmobilePaid[mId]).length} фактури не се платени` 
                  : `${monthIds.filter(mId => !!tmobileInvoiced[mId] && !tmobilePaid[mId]).length} unpaid invoices pending`
                }
              </p>
            </div>
          </div>

          {/* Stats: Remaining / Not Invoiced */}
          <div className="border-2 border-black bg-stone-50 p-4 relative overflow-hidden flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-black uppercase text-stone-500 tracking-wider">
                {lang === 'MK' ? 'НЕФАКТУРИРАНО СÈ УШТЕ' : 'NOT YET INVOICED'}
              </span>
              <XCircle className="w-5 h-5 text-stone-400" />
            </div>
            <div className="mt-4">
              <div className="font-mono text-xl md:text-2xl font-black text-stone-900">
                {monthIds.filter(mId => !tmobileInvoiced[mId]).length} мес.
              </div>
              <p className="text-[11px] text-stone-500 font-bold mt-1 uppercase">
                {lang === 'MK' ? 'Потребно е да се издаде фактура' : 'Required to generate invoice'}
              </p>
            </div>
          </div>

        </div>

        {/* Toolbar: Search & Filters */}
        <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3 bg-slate-50 p-4 border border-slate-300">
          
          {/* Search box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={trackerSearch}
              onChange={(e) => setTrackerSearch(e.target.value)}
              placeholder={lang === 'MK' ? 'Пребарај според месец или година...' : 'Search by month or year...'}
              className="w-full pl-9 pr-4 py-2 text-xs border border-slate-300 hover:border-slate-400 focus:border-black focus:outline-hidden bg-white text-black font-bold"
            />
          </div>

          {/* Filter Toggles */}
          <div className="flex flex-wrap gap-1">
            <button
              onClick={() => setTrackerFilter('all')}
              className={`px-3 py-1.5 text-xs font-black uppercase tracking-wider ${
                trackerFilter === 'all' 
                  ? 'bg-black text-white' 
                  : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
              }`}
            >
              {lang === 'MK' ? 'Сите' : 'All'}
            </button>
            <button
              onClick={() => setTrackerFilter('invoiced')}
              className={`px-3 py-1.5 text-xs font-black uppercase tracking-wider ${
                trackerFilter === 'invoiced'
                  ? 'bg-blue-900 text-white'
                  : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
              }`}
            >
              {lang === 'MK' ? 'Издадени' : 'Invoiced'}
            </button>
            <button
              onClick={() => setTrackerFilter('pending')}
              className={`px-3 py-1.5 text-xs font-black uppercase tracking-wider ${
                trackerFilter === 'pending'
                  ? 'bg-amber-500 text-white'
                  : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
              }`}
            >
              {lang === 'MK' ? 'Неплатени' : 'Unpaid'}
            </button>
            <button
              onClick={() => setTrackerFilter('paid')}
              className={`px-3 py-1.5 text-xs font-black uppercase tracking-wider ${
                trackerFilter === 'paid'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
              }`}
            >
              {lang === 'MK' ? 'Наплатени' : 'Paid'}
            </button>
          </div>

        </div>

        {/* Detailed Tracking List Container */}
        <div className="border border-slate-300 overflow-x-auto">
          <table className="w-full text-left text-xs text-black border-collapse">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-300 text-[10px] font-black uppercase tracking-wider text-slate-500">
                <th className="p-3 text-center w-12">#</th>
                <th className="p-3 min-w-40">{lang === 'MK' ? 'Месец' : 'Month'}</th>
                <th className="p-3 min-w-28">{lang === 'MK' ? 'Бр. Фактура' : 'Invoice No'}</th>
                <th className="p-3 text-right font-mono min-w-32">{lang === 'MK' ? 'Износ (Курс)' : 'Amount (Rate)'}</th>
                <th className="p-3 text-center min-w-36">{lang === 'MK' ? 'Фактурирано' : 'Invoiced'}</th>
                <th className="p-3 text-center min-w-36">{lang === 'MK' ? 'Наплатено' : 'Payment Received'}</th>
                <th className="p-3 min-w-44">{lang === 'MK' ? 'Забелешка / Идент.' : 'Notes / Tx Ref'}</th>
                <th className="p-3 text-center min-w-32">{lang === 'MK' ? 'Акција' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {(() => {
                const filtered = monthIds.filter(mId => {
                  const isInvoiced = !!tmobileInvoiced[mId];
                  const isPaid = !!tmobilePaid[mId];
                  
                  const monthNameMK = formatMonthId(mId, 'MK').toLowerCase();
                  const monthNameEN = formatMonthId(mId, 'EN').toLowerCase();
                  const matchesSearch = monthNameMK.includes(trackerSearch.toLowerCase()) || 
                                        monthNameEN.includes(trackerSearch.toLowerCase()) || 
                                        mId.includes(trackerSearch);

                  if (!matchesSearch) return false;

                  if (trackerFilter === 'pending') return isInvoiced && !isPaid;
                  if (trackerFilter === 'paid') return isPaid;
                  if (trackerFilter === 'invoiced') return isInvoiced;
                  return true;
                });

                if (filtered.length === 0) {
                  return (
                    <tr>
                      <td colSpan={8} className="p-8 text-center font-bold text-slate-400 bg-slate-50 uppercase tracking-widest text-[11px]">
                        {lang === 'MK' ? 'Нема пронајдени записи.' : 'No tracking records match selection.'}
                      </td>
                    </tr>
                  );
                }

                return filtered.map((mId, idx) => {
                  const rate = tmobileRates[mId] !== undefined ? tmobileRates[mId] : 61.50;
                  const amt = 300 * rate;
                  const invoiceNo = tmobileNos[mId] || getDefaultInvoiceNo(mId);
                  const isInvoiced = !!tmobileInvoiced[mId];
                  const isPaid = !!tmobilePaid[mId];
                  const note = tmobileNotes[mId] || '';
                  const payDate = tmobilePaidDates[mId] || '';

                  const isCurrentActive = mId === activeMonthId;

                  return (
                    <tr 
                      key={mId} 
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isCurrentActive ? 'bg-amber-50/40 border-l-4 border-l-yellow-400' : ''
                      }`}
                    >
                      {/* # index */}
                      <td className="p-3 text-center font-mono text-slate-400 font-bold">{idx + 1}</td>
                      
                      {/* Month Name */}
                      <td className="p-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-extrabold text-black block tracking-tight">
                            {formatMonthId(mId, lang)}
                          </span>
                          {isCurrentActive && (
                            <span className="text-[9px] bg-yellow-300 text-black font-black px-1.5 py-0.5 rounded-sm uppercase scale-90">
                              {lang === 'MK' ? 'Селектирана' : 'Viewing'}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono tracking-tighter block mt-0.5">{mId}</span>
                      </td>

                      {/* Invoice No */}
                      <td className="p-3 font-mono font-black uppercase text-slate-700">
                        {invoiceNo}
                      </td>

                      {/* Dynamic amount */}
                      <td className="p-3 text-right leading-snug">
                        <div className="font-mono font-extrabold text-black">
                          {Math.round(amt).toLocaleString('mk-MK')} ден.
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5 select-none">
                          300€ @ {rate.toFixed(4)}
                        </div>
                      </td>

                      {/* Invoiced Status checkbox & tag */}
                      <td className="p-3 text-center">
                        <div className="flex flex-col items-center gap-1.5 justify-center">
                          <label className="relative flex items-center gap-1.5 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={isInvoiced}
                              onChange={(e) => onUpdateInvoiced(mId, e.target.checked)}
                              className="w-4 h-4 accent-blue-900 cursor-pointer rounded-sm border-2 border-black"
                            />
                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-xs mt-0.5 ${
                              isInvoiced 
                                ? 'bg-blue-100 text-blue-900 border border-blue-300' 
                                : 'bg-slate-100 text-slate-400 border border-slate-200'
                            }`}>
                              {isInvoiced ? (lang === 'MK' ? 'ИСПРАТЕНА' : 'SENT') : (lang === 'MK' ? 'НЕИЗДАДЕНА' : 'DRAFT')}
                            </span>
                          </label>
                        </div>
                      </td>

                      {/* Paid Status checkbox & paid date input */}
                      <td className="p-3 text-center">
                        <div className="flex flex-col items-center gap-1.5 justify-center">
                          <label className="relative flex items-center gap-1.5 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={isPaid}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                onUpdatePaid(mId, checked);
                                if (checked && !payDate) {
                                  // Auto-fill payment date to current date
                                  const localToday = new Date().toISOString().split('T')[0];
                                  onUpdatePaidDate(mId, localToday);
                                }
                              }}
                              className="w-4 h-4 accent-emerald-600 cursor-pointer rounded-sm border-2 border-black"
                            />
                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-xs mt-0.5 ${
                              isPaid 
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}>
                              {isPaid ? (lang === 'MK' ? 'НАПЛАТЕНА' : 'PAID') : (lang === 'MK' ? 'НЕПЛАТЕНА' : 'UNPAID')}
                            </span>
                          </label>
                          
                          {/* Payment Date Picker (only show if paid) */}
                          {isPaid && (
                            <div className="flex items-center space-x-1 mt-1 font-mono">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              <input
                                type="date"
                                value={payDate}
                                onChange={(e) => onUpdatePaidDate(mId, e.target.value)}
                                className="px-1.5 py-0.5 text-[10px] border border-slate-300 focus:outline-hidden focus:border-black font-mono w-24 text-center cursor-pointer bg-white"
                              />
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Bank Order / Notes */}
                      <td className="p-3">
                        <input
                          type="text"
                          value={note}
                          onChange={(e) => onUpdateNote(mId, e.target.value)}
                          placeholder={lang === 'MK' ? 'Пл. налог / Извод бр...' : 'Tx ref, check order #...'}
                          className="w-full px-2.5 py-1 text-xs border border-slate-300 focus:border-black hover:border-slate-400 focus:outline-hidden text-black font-semibold bg-white"
                        />
                      </td>

                      {/* Quick Actions */}
                      <td className="p-3 text-center">
                        <button
                          onClick={() => {
                            if (onSelectMonth) {
                              onSelectMonth(mId);
                              document.getElementById('t-mobile-invoices-tab')?.scrollIntoView({ behavior: 'smooth' });
                            }
                          }}
                          className={`px-2.5 py-1 w-full text-[10px] font-black uppercase tracking-wider border flex items-center justify-center gap-1.5 hover:bg-slate-100 hover:text-black cursor-pointer ${
                            isCurrentActive 
                              ? 'bg-yellow-400 text-black border-yellow-500' 
                              : 'bg-white text-slate-700 border-slate-300'
                          }`}
                        >
                          <Eye className="w-3.5 h-3.5 shrink-0" />
                          <span>{lang === 'MK' ? 'ПРИКАЖИ' : 'VIEW'}</span>
                        </button>
                      </td>

                    </tr>
                  );
                });
              })()}
            </tbody>
          </table>
        </div>

      </div>

    </div>
  );
}
