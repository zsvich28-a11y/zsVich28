import React from 'react';
import { Printer, X, FileText } from 'lucide-react';
import { Language } from '../types';
import { formatMonthId } from '../utils';

interface TenantHistoryRecord {
  monthId: string;
  beginningDebt: number;
  totalMonthlyCharge: number;
  payment: number;
  preJunePayment?: number;
  endingDebt: number;
}

interface TenantDebtPrintProps {
  number: string;
  owner: string;
  type: 'apartment' | 'store';
  history: TenantHistoryRecord[];
  onClose: () => void;
  lang: Language;
}

export default function TenantDebtPrint({
  number,
  owner,
  type,
  history,
  onClose,
  lang,
}: TenantDebtPrintProps) {
  const handlePrint = () => {
    window.print();
  };

  const currentDateStr = new Date().toLocaleDateString(lang === 'MK' ? 'mk-MK' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Calculate totals
  const startingDebt = history[0] ? Math.round(history[0].beginningDebt) : 0;
  const lastRecord = history[history.length - 1];
  const endingAccumulatedDebt = lastRecord ? Math.round(lastRecord.endingDebt) : 0;

  const totalBilledInPeriod = history
    .filter(h => h.monthId !== 'pre-june')
    .reduce((sum, h) => sum + Math.round(h.totalMonthlyCharge), 0);
  const totalPaidInPeriod = history.reduce((sum, h) => sum + Math.round(h.payment) + Math.round(h.preJunePayment || 0), 0);

  const t = {
    MK: {
      modalTitle: 'ИЗВЕШТАЈ И ПЕЧАТЕЊЕ НА ИСТОРИЈАТА НА ДОЛГОТ',
      modalSubtitle: 'Прилагодете ја и зачувајте ја комплетната историја на долгот за сопственикот во PDF',
      printBtn: 'Зачувај во PDF / Печати',
      closeBtn: 'Затвори',
      docTitle: 'ИЗВЕШТАЈ ЗА ТЕКОВНИТЕ И ЗАОСТАНАТИТЕ ДОЛГОВИ',
      propertyLabel: 'Објект (Стан/Локал)',
      ownerLabel: 'Сопственик / Корисник',
      preJuneDebtLabel: 'Почетен заостанат долг пред јуни 2026 г.',
      totalBilledLabel: 'Вкупно задолжено во периодот',
      totalPaidLabel: 'Вкупно уплатено во периодот',
      finalDebtLabel: 'Вкупен тековен долг за плаќање',
      tableMonth: 'Сметководствен месец',
      tableBilled: 'Месечно задолжување (ден.)',
      tablePaid: 'Извршена уплата (ден.)',
      tableOutstanding: 'Месечен преостанат долг (ден.)',
      tableStatus: 'Статус за месецот',
      issuerLabel: 'Издавач',
      issuerValue: 'Претседател на ЗС - Ф. Зафировски',
      bankLabel: 'Информации за плаќање',
      bankValue: 'Комерцијална банка АД Скопје — Жиро-сметка: 300000004672235, ЕДБ 4057010504720',
      statusPaid: 'ИСПЛАТЕНО',
      statusPartial: 'ДЕЛУМНО',
      statusUnpaid: 'НЕПЛАТЕНО',
      statusOverpaid: 'ПРЕПЛАТЕНО',
      dateGenerated: 'Датум на изготвување на извештајот',
      pageMeta: 'Заедница на сопственици на станбено-деловната зграда на ул. Вич бр. 28, Скопје',
      signLabel: 'Потпис и печат',
    },
    EN: {
      modalTitle: 'PRINT TENANT DEBT LEDGER REPORT',
      modalSubtitle: 'Customize and save individual billing and payment records into a single PDF file',
      printBtn: 'Save to PDF / Print',
      closeBtn: 'Close',
      docTitle: 'INDIVIDUAL DEBT & PAYMENT HISTORY LEDGER',
      propertyLabel: 'Property (Apt/Store)',
      ownerLabel: 'Tenant / Owner',
      preJuneDebtLabel: 'Pre-June 2026 Starting Overdue Arrears',
      totalBilledLabel: 'Total Billed in Period',
      totalPaidLabel: 'Total Paid in Period',
      finalDebtLabel: 'Total Outstanding Balance Due',
      tableMonth: 'Accounting Month',
      tableBilled: 'Monthly Amount Due (denar)',
      tablePaid: 'Amount Paid (denar)',
      tableOutstanding: 'Monthly Balance (denar)',
      tableStatus: 'Monthly Status',
      issuerLabel: 'Issued By',
      issuerValue: 'President of Community - F.Zafirovski',
      bankLabel: 'Payment Information',
      bankValue: 'Komercijalna Banka AD Skopje — Account: 300000004672235, Tax ID 4057010504720',
      statusPaid: 'FULLY PAID',
      statusPartial: 'PARTIALLY PAID',
      statusUnpaid: 'UNPAID',
      statusOverpaid: 'OVERPAID',
      dateGenerated: 'Report generation date',
      pageMeta: 'Community of Owners of the Residential-Commercial Building at Vich St. 28, Skopje',
      signLabel: 'Authorized Signature',
    }
  }[lang];

  return (
    <div 
      id="single-debtor-print-modal"
      className="fixed inset-0 bg-neutral-900/90 backdrop-blur-xs flex items-center justify-center p-0 z-50 overflow-y-auto print:static print:bg-white print:p-0 print:overflow-visible"
    >
      <div className="bg-slate-100 max-w-4xl w-full flex flex-col h-full md:h-[90vh] md:my-8 border-4 border-black shadow-none font-sans relative print:border-0 print:h-auto print:my-0 print:bg-white animate-scale-up">
        
        {/* Header toolbar - Hidden in printing */}
        <div className="bg-black text-white p-5 border-b-4 border-black flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden shrink-0">
          <div>
            <div className="flex items-center space-x-2">
              <Printer className="w-5 h-5 text-yellow-400" />
              <h1 className="text-lg font-black uppercase tracking-wide">{t.modalTitle}</h1>
            </div>
            <p className="text-[10px] text-slate-400 uppercase mt-0.5 tracking-wider">{t.modalSubtitle}</p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="py-2 px-4 bg-yellow-400 hover:bg-yellow-300 text-black border-2 border-black font-black text-xs uppercase tracking-widest flex items-center space-x-1.5 cursor-pointer transition-all"
            >
              <Printer className="w-4 h-4 shrink-0" />
              <span>{t.printBtn}</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 border-2 border-slate-705 bg-slate-900 text-slate-300 hover:text-white hover:border-white transition-all cursor-pointer"
              title={t.closeBtn}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Preview Area */}
        <div className="flex-1 bg-slate-200/50 p-6 md:p-12 overflow-y-auto print:overflow-visible print:bg-white print:p-0">
          
          {/* Printable Sheet */}
          <div 
            id="printable-debtor-statement"
            className="max-w-3xl mx-auto bg-white border-2 border-black p-8 font-sans text-black relative shadow-none print:border-0 print:p-0 print:max-w-none print:w-full"
          >
            {/* Page header metadata */}
            <div className="text-center border-b border-black pb-4 mb-6">
              <p className="text-[9px] font-black uppercase tracking-wider text-stone-500 mb-1.5">
                {t.pageMeta}
              </p>
              <h1 className="text-lg font-black uppercase tracking-normal leading-tight">
                {t.docTitle}
              </h1>
              <div className="mt-2.5 flex justify-center gap-4 text-[10px] font-mono uppercase bg-stone-50 py-1.5 px-4 border border-stone-200 inline-block">
                <span>{t.dateGenerated}: <strong>{currentDateStr}</strong></span>
              </div>
            </div>

            {/* Tenant and Unit Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 border-2 border-black p-4 mb-6 bg-slate-50/50">
              <div className="space-y-1">
                <span className="text-[9px] font-black uppercase text-stone-500 tracking-wider block">{t.ownerLabel}</span>
                <span className="text-sm font-black text-black uppercase">{owner}</span>
              </div>
              <div className="space-y-1">
                <span className="text-[9px] font-black uppercase text-stone-500 tracking-wider block">{t.propertyLabel}</span>
                <span className="text-sm font-black text-black flex items-center gap-1.5">
                  <span className="px-2 py-0.5 border border-black text-xs font-mono font-black bg-white inline-block">
                    {number}
                  </span>
                  <span className="text-xs uppercase text-slate-500 font-bold">
                    ({type === 'apartment' ? (lang === 'MK' ? 'СТАН' : 'APARTMENT') : (lang === 'MK' ? 'ДЕЛОБЕН' : 'STORE')})
                  </span>
                </span>
              </div>

              <div className="col-span-1 md:col-span-2 border-t border-stone-300 pt-3 mt-1 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-0.5">
                  <span className="text-[9px] font-bold uppercase text-stone-550 block">{t.preJuneDebtLabel}</span>
                  <span className="text-xs font-mono font-black text-stone-600">{startingDebt.toLocaleString('mk-MK')} ден.</span>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[9px] font-bold uppercase text-stone-550 block">{t.totalBilledLabel}</span>
                  <span className="text-xs font-mono font-black text-blue-900">{totalBilledInPeriod.toLocaleString('mk-MK')} ден.</span>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[9px] font-bold uppercase text-stone-550 block">{t.totalPaidLabel}</span>
                  <span className="text-xs font-mono font-black text-emerald-900">{totalPaidInPeriod.toLocaleString('mk-MK')} ден.</span>
                </div>
              </div>
            </div>

            {/* Statement Table of Month-by-Month Record entries */}
            <div className="mb-6 overflow-hidden border border-black">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-stone-100 border-b border-black text-[9px] font-black text-stone-700 uppercase tracking-widest">
                    <th className="py-2.5 px-4">{t.tableMonth}</th>
                    <th className="py-2.5 px-4 text-right">{t.tableBilled}</th>
                    <th className="py-2.5 px-4 text-right">{t.tablePaid}</th>
                    <th className="py-2.5 px-4 text-right">{t.tableOutstanding}</th>
                    <th className="py-2.5 px-4 text-center">{t.tableStatus}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200">
                  {history.map((rec) => {
                    const pre = Math.round(rec.preJunePayment || 0);
                    const billed = Math.round(rec.totalMonthlyCharge);
                    const paid = Math.round(rec.payment) + pre;
                    const outstanding = billed - paid;

                    let statusLabel = '';
                    let statusClass = '';

                    if (outstanding > 0) {
                      if (paid > 0) {
                        statusLabel = t.statusPartial;
                        statusClass = 'bg-amber-100 text-amber-900 border-amber-300';
                      } else {
                        statusLabel = t.statusUnpaid;
                        statusClass = 'bg-rose-100 text-rose-900 border-rose-300';
                      }
                    } else if (outstanding < 0) {
                      statusLabel = t.statusOverpaid;
                      statusClass = 'bg-blue-100 text-blue-900 border-blue-300';
                    } else {
                      statusLabel = t.statusPaid;
                      statusClass = 'bg-emerald-100 text-emerald-900 border-emerald-300';
                    }

                    return (
                      <tr key={rec.monthId} className="hover:bg-slate-50 transition-colors font-medium">
                        <td className="py-2.5 px-4 font-bold text-stone-900">
                          {formatMonthId(rec.monthId, lang)}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono font-bold text-stone-700">
                          {billed.toLocaleString('mk-MK')}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono font-bold text-emerald-600">
                          {paid > 0 ? `-${paid.toLocaleString('mk-MK')}` : '0'}
                        </td>
                        <td className={`py-2.5 px-4 text-right font-mono font-black ${
                          outstanding > 0 ? 'text-rose-600' : outstanding < 0 ? 'text-blue-600' : 'text-emerald-700'
                        }`}>
                          {outstanding.toLocaleString('mk-MK')}
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <span className={`px-2 py-0.5 border text-[8px] font-black tracking-wider uppercase inline-block leading-none ${statusClass}`}>
                            {statusLabel}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Total Balance Due Banner / Final Reconciliation */}
            <div className="border-4 border-black p-4 mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center bg-yellow-50/45 gap-4">
              <div>
                <span className="text-[10px] font-black uppercase text-stone-500 tracking-wider block">
                  {t.finalDebtLabel} (КРАЈНА СОСТОЈБА КОН ЗАЕДНИЦАТА)
                </span>
                <p className="text-[8.5px] italic text-stone-500 mt-0.5 leading-snug uppercase">
                  {lang === 'MK' 
                    ? '*Пресметано со собирање на почетниот заостанат долг и сите последователни задолженија минус извршените уплати.' 
                    : '*Calculated by combining pre-existing starting debt and all period billing assessments, less total credits settled.'}
                </p>
              </div>
              <div className="text-right shrink-0">
                <span className={`text-2xl font-black font-mono inline-block border-b-2 border-black border-dashed pb-0.5 ${
                  endingAccumulatedDebt > 0 ? 'text-rose-600' : 'text-emerald-700'
                }`}>
                  {endingAccumulatedDebt.toLocaleString('mk-MK')} ден.
                </span>
              </div>
            </div>

            {/* Bank and Legal Block */}
            <div className="border-t border-black pt-5 text-[9px] leading-relaxed text-stone-550 font-mono space-y-1">
              <div>
                <strong>{t.issuerLabel}:</strong> {t.issuerValue}
              </div>
              <div>
                <strong>{t.bankLabel}:</strong> <span className="text-black font-semibold">{t.bankValue}</span>
              </div>
            </div>

            {/* Signatures Row */}
            <div className="mt-12 flex justify-between items-end border-t border-stone-200 pt-6">
              <div className="text-center font-mono">
                <div className="w-36 border-b border-stone-400 mx-auto mb-1"></div>
                <p className="text-[9px] uppercase font-bold text-stone-500">{t.signLabel}</p>
              </div>
              <div className="text-center font-mono text-[9px] uppercase text-stone-400">
                VICH 28 SYSTEM RECORD
              </div>
            </div>

          </div>

        </div>

        {/* Bottom toolbar - Hidden in printing */}
        <div className="bg-slate-50 border-t-2 border-black p-4 flex justify-end space-x-3.5 print:hidden shrink-0">
          <button
            onClick={onClose}
            className="py-2 px-5 bg-white text-black hover:bg-slate-100 border border-black font-bold text-xs uppercase tracking-widest cursor-pointer transition-all"
          >
            {t.closeBtn}
          </button>
          <button
            onClick={handlePrint}
            className="py-2.5 px-6 bg-black text-white hover:bg-yellow-400 hover:text-black border-2 border-black font-black text-xs uppercase tracking-widest flex items-center space-x-2 cursor-pointer transition-all"
          >
            <Printer className="w-4 h-4 shrink-0" />
            <span>{t.printBtn}</span>
          </button>
        </div>

      </div>
    </div>
  );
}
