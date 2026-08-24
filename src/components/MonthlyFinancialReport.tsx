import React from 'react';
import { CalculatedInvoice, Language, MonthlyVariables } from '../types';
import { Printer, FileText, X } from 'lucide-react';
import { formatDenarExact, formatMonthId } from '../utils';

interface MonthlyFinancialReportProps {
  monthId: string;
  variables: MonthlyVariables;
  invoices: CalculatedInvoice[];
  fixedRates: { apartment: number; store: number };
  onClose: () => void;
  lang: Language;
}

export default function MonthlyFinancialReport({ 
  monthId, 
  variables, 
  invoices, 
  fixedRates,
  onClose, 
  lang 
}: MonthlyFinancialReportProps) {
  const t = {
    MK: {
      reportTitle: 'МЕСЕЧЕН ФИНАНСИСКИ ИЗВЕШТАЈ',
      operatingCosts: 'ОПЕРАТИВНИ ТРОШОЦИ (ВЛЕЗНИ ФАКТУРИ)',
      unitDetails: 'ДЕТАЛЕН ПРЕГЛЕД ПО ОБЈЕКТИ',
      printBtn: 'Печати го извештајот',
      costItem: 'Ставка',
      costAmount: 'Износ',
      electricity: 'Заедничка струја - ЕД',
      cleaning: 'Хигиена',
      elevator: 'Месечно одржување лифтови',
      accounting: 'Сметководство',
      management: 'Управување (бруто со ПДД)',
      bankFees: 'Банкарска провизија',
      investment: 'Инвестициско одржување',
      misc: 'Разно',
      colUnit: 'Објект',
      colOwner: 'Сопственик',
      colArea: 'м2',
      colFixed: 'Фиксно',
      colVar: 'Варијаб.',
      colTotalBilled: 'Задолжено',
      colPrevDebt: 'Стар долг',
      colPayment: 'Уплати',
      colBalance: 'Салдо',
      summary: 'ЗБИРЕН ПРЕГЛЕД',
      totalBilled: 'Вкупно задолжено',
      totalPaid: 'Вкупно наплатено',
      totalDebt: 'Вкупно заостанат долг',
      fixedRatesTitle: 'Важечки фиксни стапки (по м2)',
      rateApartment: 'Станови:',
      rateStore: 'Дуќани:',
      calculationNote: 'Напомена: Трошоците за заедничка струја и одржување лифтови се однесуваат само на становите и се распределени пропорционално на нивната површина (м²). Останатите трошоци се распределени на сите објекти.'
    },
    EN: {
      reportTitle: 'MONTHLY FINANCIAL REPORT',
      operatingCosts: 'OPERATING COSTS (INCOMING INVOICES)',
      unitDetails: 'DETAILED UNIT OVERVIEW',
      printBtn: 'Print Report',
      costItem: 'Item',
      costAmount: 'Amount',
      electricity: 'Electricity',
      cleaning: 'Cleaning Services',
      elevator: 'Elevator Maintenance',
      accounting: 'Accounting Services',
      management: 'Management Fee',
      bankFees: 'Bank Fees',
      investment: 'Investment Fund',
      misc: 'Miscellaneous',
      colUnit: 'Unit',
      colOwner: 'Owner',
      colArea: 'm2',
      colFixed: 'Fixed',
      colVar: 'Var.',
      colTotalBilled: 'Billed',
      colPrevDebt: 'Old Debt',
      colPayment: 'Paid',
      colBalance: 'Balance',
      summary: 'SUMMARY OVERVIEW',
      totalBilled: 'Total Billed',
      totalPaid: 'Total Paid',
      totalDebt: 'Total Outstanding',
      fixedRatesTitle: 'Current Fixed Rates (per m2)',
      rateApartment: 'Apartments:',
      rateStore: 'Stores:',
      calculationNote: 'Note: Electricity and Elevator costs are charged to apartments only, distributed proportionally to area (m2). All other costs are shared by all units.'
    }
  }[lang];

  const costItems = [
    { label: t.electricity, value: variables.electricity },
    { label: t.cleaning, value: variables.cleaning },
    { label: t.elevator, value: variables.elevator },
    { label: t.accounting, value: variables.accounting },
    { label: t.management, value: variables.management },
    { label: t.bankFees, value: variables.bankFees },
    { label: t.investment, value: variables.investment },
    { label: t.misc, value: variables.misc },
  ];

  const totals = {
    billed: invoices.reduce((s, i) => s + i.totalMonthlyCharge, 0),
    paid: invoices.reduce((s, i) => s + i.payment, 0),
    debt: invoices.reduce((s, i) => s + i.endingDebt, 0)
  };

  const handlePrint = () => {
    window.print();
  };

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div 
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 bg-black/85 backdrop-blur-xs flex items-center justify-center z-50 p-2 sm:p-4 print:static print:bg-white print:p-0 overflow-hidden cursor-zoom-out print-modal-container"
    >
      <style>{`
        @media print {
          @page {
            size: A4 landscape !important;
            margin: 12mm 15mm 12mm 15mm !important;
          }
          body {
            background-color: #ffffff !important;
            color: #000000 !important;
          }
          /* Hide all other children of reports-print-area to prevent background content printing */
          #reports-print-area > *:not(.print-modal-container) {
            display: none !important;
          }
          /* Force display and clean layout of the print modal container */
          .print-modal-container {
            display: block !important;
            position: static !important;
            width: 100% !important;
            height: auto !important;
            overflow: visible !important;
            background-color: #ffffff !important;
            padding: 0 !important;
          }
          .print-avoid-break {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          /* Repeat the header on each page of the table */
          thead {
            display: table-header-group !important;
          }
        }
      `}</style>
      <div 
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full max-w-5xl h-full max-h-[95vh] sm:max-h-[90vh] border-4 border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] flex flex-col print:shadow-none print:border-0 print:max-w-none print:w-full print:h-auto cursor-default overflow-hidden animate-scale-up"
      >
        
        {/* Header Controls */}
        <div className="p-4 border-b-2 border-black flex justify-between items-center bg-slate-50 print:hidden shrink-0">
          <div className="flex items-center space-x-2">
            <FileText className="w-5 h-5" />
            <span className="font-black uppercase tracking-widest text-xs">{t.reportTitle} - {formatMonthId(monthId, lang).toUpperCase()}</span>
          </div>
          <div className="flex space-x-2">
            <button 
              onClick={handlePrint}
              className="px-4 py-2 bg-black text-white font-black uppercase text-[10px] tracking-widest flex items-center space-x-2 hover:bg-yellow-400 hover:text-black transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>{t.printBtn}</span>
            </button>
            <button 
              onClick={onClose}
              className="p-2 border-2 border-black hover:bg-black hover:text-white transition-all cursor-pointer"
              title="Close report"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Content */}
        <div className="p-8 md:p-12 print:p-0 space-y-10 overflow-y-auto flex-1 print:overflow-visible">
          
          {/* Main Title Section */}
          <div className="text-center space-y-2 border-b-4 border-black pb-8">
            <h1 className="text-3xl font-black uppercase tracking-tight">{t.reportTitle}</h1>
            <p className="text-xl font-bold font-mono tracking-widest">{formatMonthId(monthId, lang).toUpperCase()}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 print:grid-cols-2 gap-10 print-avoid-break">
            {/* Operating Costs Column */}
            <div className="space-y-4">
              <h2 className="text-sm font-black uppercase tracking-widest bg-black text-white px-3 py-1 inline-block">{t.operatingCosts}</h2>
              <table className="w-full text-xs border-collapse">
                <thead className="text-slate-500 uppercase font-black tracking-widest border-b border-black">
                  <tr>
                    <th className="py-2 text-left">{t.costItem}</th>
                    <th className="py-2 text-right">{t.costAmount}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {costItems.map((item, idx) => (
                    <tr key={idx}>
                      <td className="py-2 font-bold">{item.label}</td>
                      <td className="py-2 text-right font-mono">{formatDenarExact(item.value, lang)}</td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-black font-black">
                    <td className="py-3 uppercase tracking-widest">ВКУПНО</td>
                    <td className="py-3 text-right font-mono text-lg">{formatDenarExact(costItems.reduce((s, i) => s + i.value, 0), lang)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Summary Column */}
            <div className="space-y-4">
               <h2 className="text-sm font-black uppercase tracking-widest bg-emerald-600 text-white px-3 py-1 inline-block">{t.summary}</h2>
               
               <div className="bg-slate-50 border border-slate-200 p-4 space-y-2 mt-4">
                  <h4 className="text-[10px] font-black uppercase text-slate-400 border-b border-slate-200 pb-1">{t.fixedRatesTitle}</h4>
                  <div className="flex justify-between text-xs">
                    <span className="font-bold">{t.rateApartment}</span>
                    <span className="font-mono">{fixedRates.apartment} ден/м2</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="font-bold">{t.rateStore}</span>
                    <span className="font-mono">{fixedRates.store} ден/м2</span>
                  </div>
               </div>

               <div className="space-y-4">
                  <div className="flex justify-between items-end border-b border-dashed border-slate-300 pb-2">
                    <span className="text-xs font-bold uppercase text-slate-500">{t.totalBilled}</span>
                    <span className="text-xl font-black font-mono">{formatDenarExact(totals.billed, lang)}</span>
                  </div>
                  <div className="flex justify-between items-end border-b border-dashed border-slate-300 pb-2">
                    <span className="text-xs font-bold uppercase text-slate-500">{t.totalPaid}</span>
                    <span className="text-xl font-black font-mono text-emerald-600">{formatDenarExact(totals.paid, lang)}</span>
                  </div>
                  <div className="flex justify-between items-end bg-slate-100 p-4 border-2 border-black">
                    <span className="text-xs font-black uppercase">{t.totalDebt}</span>
                    <span className={`text-2xl font-black font-mono ${totals.debt > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                      {formatDenarExact(totals.debt, lang)}
                    </span>
                  </div>
               </div>
            </div>
          </div>

          <p className="text-[10px] italic text-slate-500 border-l-2 border-slate-300 pl-4 py-1">
            {t.calculationNote}
          </p>

          {/* Unit Detailed Table */}
          <div className="space-y-4">
            <h2 className="text-sm font-black uppercase tracking-widest bg-blue-600 text-white px-3 py-1 inline-block">{t.unitDetails}</h2>
            <div className="overflow-x-auto border-2 border-black">
              <table className="w-full text-[10px] sm:text-[11px] border-collapse leading-tight">
                <thead>
                  <tr className="bg-slate-900 text-white font-black uppercase tracking-widest text-center">
                    <th className="p-2 border-r border-slate-700">{t.colUnit}</th>
                    <th className="p-2 text-left border-r border-slate-700">{t.colOwner}</th>
                    <th className="p-2 border-r border-slate-700">{t.colArea}</th>
                    <th className="p-2 border-r border-slate-700">{t.colFixed}</th>
                    <th className="p-2 border-r border-slate-700">{t.colVar}</th>
                    <th className="p-2 border-r border-slate-700">{t.colTotalBilled}</th>
                    <th className="p-2 border-r border-slate-700">{t.colPrevDebt}</th>
                    <th className="p-2 border-r border-slate-700">{t.colPayment}</th>
                    <th className="p-2">{t.colBalance}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {invoices.map((inv) => (
                    <tr key={inv.unitId} className="hover:bg-slate-50 transition-all font-mono">
                      <td className="p-2 text-center font-black border-r border-slate-100">{inv.number}</td>
                      <td className="p-2 font-sans font-bold border-r border-slate-100">{inv.owner}</td>
                      <td className="p-2 text-center border-r border-slate-100">{inv.area}</td>
                      <td className="p-2 text-right border-r border-slate-100">{inv.fixedCharge}</td>
                      <td className="p-2 text-right border-r border-slate-100">{inv.totalVariable}</td>
                      <td className="p-2 text-right font-black border-r border-slate-100">{inv.totalMonthlyCharge}</td>
                      <td className="p-2 text-right border-r border-slate-100">{Math.round(inv.beginningDebt)}</td>
                      <td className="p-2 text-right font-black text-emerald-600 border-r border-slate-100">{inv.payment}</td>
                      <td className={`p-2 text-right font-black ${inv.endingDebt > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                        {Math.round(inv.endingDebt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Footer - Branding */}
          <div className="pt-12 border-t-2 border-black flex justify-between items-end opacity-50 font-black text-[9px] uppercase tracking-[0.2em]">
            <div>© 2026 VICH 28 BUILDING MANAGEMENT</div>
            <div>Generated by Houseman Panel v1.2</div>
          </div>
        </div>
      </div>
    </div>
  );
}
