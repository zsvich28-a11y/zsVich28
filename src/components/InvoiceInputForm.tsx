import React, { useState, useEffect } from 'react';
import { MonthlyVariables, Language, CalculatedInvoice } from '../types';
import { HelpCircle, Sparkles, Building2, Zap, Landmark, ArrowRight, UserCheck, ShieldAlert, KeyRound, Coins } from 'lucide-react';
import { formatMonthId } from '../utils';

interface InvoiceInputFormProps {
  calculatedInvoicesByMonth: Record<string, CalculatedInvoice[]>;
  activeMonthId: string;
  variables: MonthlyVariables;
  onUpdateVariables: (vars: MonthlyVariables) => void;
  lang: Language;
  apartmentFixedRatePerM2: number;
  storeFixedRatePerM2: number;
  onUpdateFixedRates: (aptRate: number, storeRate: number) => void;
  openingBalances?: { bank: number; reserve: number };
  onUpdateOpeningBalances?: (balances: { bank: number; reserve: number }) => void;
  startingMonthId?: string;
  googleClientId?: string;
  onUpdateGoogleClientId?: (clientId: string) => void;
}

export default function InvoiceInputForm({
  calculatedInvoicesByMonth,
  activeMonthId,
  variables,
  onUpdateVariables,
  lang,
  apartmentFixedRatePerM2,
  storeFixedRatePerM2,
  onUpdateFixedRates,
  openingBalances,
  onUpdateOpeningBalances,
  startingMonthId,
  googleClientId = '',
  onUpdateGoogleClientId
}: InvoiceInputFormProps) {
  const startId = startingMonthId || '2026-06';
  const isStartingMonth = activeMonthId === startId;

  // Local state for local edits
  const [elec, setElec] = useState(variables.electricity.toString());
  const [clean, setClean] = useState(variables.cleaning.toString());
  const [elev, setElev] = useState(variables.elevator.toString());
  const [acc, setAcc] = useState(variables.accounting.toString());
  const [mgm, setMgm] = useState(variables.management.toString());
  const [bank, setBank] = useState(variables.bankFees.toString());
  const [invest, setInvest] = useState((variables.investment || 0).toString());
  const [misc, setMisc] = useState((variables.misc || 0).toString());
  const [aptRate, setAptRate] = useState(apartmentFixedRatePerM2.toString());
  const [storeRate, setStoreRate] = useState(storeFixedRatePerM2.toString());
  const [gClientId, setGClientId] = useState(googleClientId);
  const initOperating = Math.max(0, (openingBalances?.bank || 0) - (openingBalances?.reserve || 0));
  const [openOperating, setOpenOperating] = useState(initOperating.toString());
  const [openReserve, setOpenReserve] = useState(openingBalances?.reserve?.toString() || '0');
  const [isSaved, setIsSaved] = useState(false);

  // Sync with prop when active month changes
  useEffect(() => {
    setElec(variables.electricity.toString());
    setClean(variables.cleaning.toString());
    setElev(variables.elevator.toString());
    setAcc(variables.accounting.toString());
    setMgm(variables.management.toString());
    setBank(variables.bankFees.toString());
    setInvest((variables.investment || 0).toString());
    setMisc((variables.misc || 0).toString());
    setAptRate(apartmentFixedRatePerM2.toString());
    setStoreRate(storeFixedRatePerM2.toString());
    setGClientId(googleClientId);
    const op = Math.max(0, (openingBalances?.bank || 0) - (openingBalances?.reserve || 0));
    setOpenOperating(op.toString());
    setOpenReserve(openingBalances?.reserve?.toString() || '0');
    setIsSaved(false);
  }, [variables, apartmentFixedRatePerM2, storeFixedRatePerM2, googleClientId, openingBalances]);

  const t = {
    MK: {
      title: 'Внесување на трошоците за избраниот месец',
      subtitle: 'Сите внесени износи за тековниот месец ќе бидат пресметани во денари и распределени соодветно по квадратура меѓу сопствениците.',
      elecLabel: 'Електрична енергија (заедничка струја)',
      cleanLabel: 'Хигиена и услуги за чистење',
      elevLabel: 'Сервисирање и одржување на лифтот',
      accLabel: 'Сметководствени услуги',
      mgmLabel: 'Управување',
      bankLabel: 'Банкарски провизии и трошоци',
      investLabel: 'Инвестициско одржување (резервен фонд)',
      miscLabel: 'Разни и вонредни трошоци',
      aptRateLabel: 'Фиксен фонд за станови (ден./м²)',
      storeRateLabel: 'Фиксен фонд за дуќани (ден./м²)',
      saveBtn: 'Пресметај и обнови ги сметките',
      successMsg: 'Износите се зачувани и сметките се успешно пресметани!',
      errorMsg: 'Ве молиме внесете валидни бројки.',
      formulaApartment: 'Се распределува само кај становите (4,868 m²)',
      formulaAll: 'Се распределува на сите станови и дуќани (5,189 m²)',
      tipTitle: 'Како се врши распределбата?',
      tipTextApartments: 'Заедничката струја и одржувањето на лифтот се распределуваат исклучиво меѓу станбените единици (становите од 1-68), врз основа на нивната квадратура.',
      tipTextStores: `Фиксните трошоци изнесуваат ${apartmentFixedRatePerM2} ден. за станови и ${storeFixedRatePerM2} ден. за деловни простории (дуќани) по м². Деловните простории (Д1-Д8) учествуваат само во расходите за хигиена, сметководство, управување, банкарски провизии, инвестиции и разни трошоци.`
    },
    EN: {
      title: 'Monthly Expenses Input',
      subtitle: 'All costs entered for the active month will be calculated and divided based on unit square footage or fixed rates.',
      elecLabel: 'Shared Electricity Fee',
      cleanLabel: 'Cleaning Services & Hygiene',
      elevLabel: 'Elevator Maintenance and Repair',
      accLabel: 'Accounting Services',
      mgmLabel: 'Building Management Firm Fee',
      bankLabel: 'Bank Commissions & Fees',
      investLabel: 'Investment Maintenance Charges',
      miscLabel: 'Miscellaneous & Emergency Costs',
      aptRateLabel: 'Reserve Fund Rate - APARTMENTS (den. / m²)',
      storeRateLabel: 'Reserve Fund Rate - STORES (den. / m²)',
      saveBtn: 'Calculate & update invoices',
      successMsg: 'Monthly invoices successfully recalculated!',
      errorMsg: 'Please enter valid numbers.',
      formulaApartment: 'Split among apartments only (4,868 m²)',
      formulaAll: 'Split among all units - apartments & stores (5,189 m²)',
      tipTitle: 'How is allocation calculated?',
      tipTextApartments: 'Common electricity and Elevator maintenance are only charged to apartments (1-68) based on their size relative to the total apartment area.',
      tipTextStores: `Fixed rates are ${apartmentFixedRatePerM2} den. per m² for apartments and ${storeFixedRatePerM2} den. per m² for stores. Stores (Д1-Д8) only pay for Hygiene, Accounting, Management, Bank Fees, Investment and Misc.`
    }
  }[lang];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numElec = parseFloat(elec) || 0;
    const numClean = parseFloat(clean) || 0;
    const numElev = parseFloat(elev) || 0;
    const numAcc = parseFloat(acc) || 0;
    const numMgm = parseFloat(mgm) || 0;
    const numBank = parseFloat(bank) || 0;
    const numInvest = parseFloat(invest) || 0;
    const numMisc = parseFloat(misc) || 0;
    const numAptRate = parseFloat(aptRate) || 0;
    const numStoreRate = parseFloat(storeRate) || 0;

    const numOpenOperating = parseFloat(openOperating) || 0;
    const numOpenReserve = parseFloat(openReserve) || 0;

    if (
      isNaN(numElec) || isNaN(numClean) || isNaN(numElev) ||
      isNaN(numAcc) || isNaN(numMgm) || isNaN(numBank) ||
      isNaN(numInvest) || isNaN(numMisc) ||
      isNaN(numAptRate) || isNaN(numStoreRate) ||
      numElec < 0 || numClean < 0 || numElev < 0 ||
      numAcc < 0 || numMgm < 0 || numBank < 0 ||
      numInvest < 0 || numMisc < 0 ||
      numAptRate < 0 || numStoreRate < 0 ||
      (isStartingMonth && (isNaN(numOpenOperating) || isNaN(numOpenReserve) || numOpenOperating < 0 || numOpenReserve < 0))
    ) {
      alert(t.errorMsg);
      return;
    }

    if (isStartingMonth && onUpdateOpeningBalances) {
      onUpdateOpeningBalances({ bank: numOpenOperating + numOpenReserve, reserve: numOpenReserve });
    }

    onUpdateFixedRates(numAptRate, numStoreRate);
    
    if (onUpdateGoogleClientId) {
      onUpdateGoogleClientId(gClientId.trim());
    }

    onUpdateVariables({
      electricity: numElec,
      cleaning: numClean,
      elevator: numElev,
      accounting: numAcc,
      management: numMgm,
      bankFees: numBank,
      investment: numInvest,
      misc: numMisc
    });

    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3500);
  };

  const totalSum = (parseFloat(elec) || 0) + (parseFloat(clean) || 0) + (parseFloat(elev) || 0) + (parseFloat(acc) || 0) + (parseFloat(mgm) || 0) + (parseFloat(bank) || 0) + (parseFloat(invest) || 0) + (parseFloat(misc) || 0);

  // Previous month calculator
  const monthIds = Object.keys(calculatedInvoicesByMonth).sort();
  const currentIndex = monthIds.indexOf(activeMonthId);
  const prevMonthId = currentIndex > 0 ? monthIds[currentIndex - 1] : null;
  const prevInvoices = prevMonthId ? calculatedInvoicesByMonth[prevMonthId] : [];
  const prevTotalPaid = prevInvoices.reduce((sum, inv) => sum + inv.payment, 0);
  const prevTotalInvoiced = prevInvoices.reduce((sum, inv) => sum + inv.totalMonthlyCharge, 0);
  const [percent, setPercent] = useState('10');
  const tenPercentOfPaid = prevTotalPaid * (parseFloat(percent) || 0) / 100;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="invoice-input-section">
      {/* Input Form Column */}
      <div className="lg:col-span-2 bg-white border-2 border-black p-6">
        <h3 className="text-2xl font-black text-black uppercase tracking-tight mb-1">{t.title}</h3>
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-6">{t.subtitle}</p>

        {/* Previous Month Calculator */}
        <div className="bg-blue-50 border-2 border-blue-200 p-4 mb-6">
          <h4 className="text-[10px] font-black text-blue-900 uppercase tracking-widest mb-3">
            {lang === 'MK' ? 'Калкулатор за претходен месец' : 'Previous Month Calculator'} ({prevMonthId || 'N/A'})
          </h4>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <p className="text-[9px] font-bold text-slate-500 uppercase">{lang === 'MK' ? 'Вкупно уплатено' : 'Total Paid'}</p>
              <p className="font-mono font-black text-black">{prevTotalPaid.toLocaleString()} ДЕН</p>
            </div>
            <div>
              <p className="text-[9px] font-bold text-slate-500 uppercase">{lang === 'MK' ? 'Вкупно фактурирано' : 'Total Invoiced'}</p>
              <p className="font-mono font-black text-black">{prevTotalInvoiced.toLocaleString()} ДЕН</p>
            </div>
            <div>
              <label htmlFor="input-percent" className="text-[9px] font-bold text-blue-600 uppercase block">
                {lang === 'MK' ? 'Процент (%)' : 'Percentage (%)'}
              </label>
              <input
                id="input-percent"
                type="number"
                min="0"
                max="100"
                className="w-16 px-2 py-1 border-2 border-blue-300 font-mono font-bold text-xs"
                value={percent}
                onChange={(e) => setPercent(e.target.value)}
              />
            </div>
            <div>
              <p className="text-[9px] font-bold text-blue-600 uppercase">{percent}% {lang === 'MK' ? 'од уплатеното' : 'of Paid'}</p>
              <p className="font-mono font-black text-blue-600">{tenPercentOfPaid.toLocaleString()} ДЕН</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMgm(tenPercentOfPaid.toFixed(2))}
            className="mt-3 px-3 py-1 bg-blue-600 text-white text-[10px] font-black uppercase tracking-wider"
          >
            {lang === 'MK' ? `Примени ${percent}% во "Управување"` : `Apply ${percent}% to "Management"`}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6" id="monthly-invoices-input-form">
          {isStartingMonth && (
            <div className="bg-amber-50 border-2 border-amber-500 p-5 space-y-4" id="initial-fund-balances-section">
              <div className="flex items-center space-x-2">
                <Coins className="w-5 h-5 text-amber-600 shrink-0" />
                <div>
                  <h4 className="text-xs font-black text-black uppercase tracking-widest">
                    {lang === 'MK' ? `ПОЧЕТНИ СОСТОЈБИ НА ФОНДОВИ (${formatMonthId(startId, 'MK').toUpperCase()})` : `INITIAL FUND BALANCES (${formatMonthId(startId, 'EN').toUpperCase()})`}
                  </h4>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">
                    {lang === 'MK' ? 'Почетни средства на сметките пред почетокот на пресметките' : 'Enter the starting balance for your records before calculations begin'}
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="space-y-1.5 flex flex-col">
                  <label htmlFor="input-openOperating" className="text-[10px] font-black uppercase tracking-widest text-slate-600">
                    {lang === 'MK' ? 'Оперативен фонд (Почетно салдо, ден.)' : 'Operating Fund (Initial Balance, den.)'}
                  </label>
                  <input
                    id="input-openOperating"
                    type="number"
                    min="0"
                    step="any"
                    className="w-full px-4 py-2.5 border-2 border-slate-300 focus:border-black bg-white font-mono font-bold text-sm outline-hidden text-black transition-all"
                    value={openOperating}
                    onChange={(e) => { setOpenOperating(e.target.value); setIsSaved(false); }}
                  />
                </div>
                
                <div className="space-y-1.5 flex flex-col">
                  <label htmlFor="input-openReserve" className="text-[10px] font-black uppercase tracking-widest text-slate-600">
                    {lang === 'MK' ? 'Резервен фонд (Почетно салдо, ден.)' : 'Reserve Fund (Initial Balance, den.)'}
                  </label>
                  <input
                    id="input-openReserve"
                    type="number"
                    min="0"
                    step="any"
                    className="w-full px-4 py-2.5 border-2 border-slate-300 focus:border-black bg-white font-mono font-bold text-sm outline-hidden text-black transition-all"
                    value={openReserve}
                    onChange={(e) => { setOpenReserve(e.target.value); setIsSaved(false); }}
                  />
                </div>

                <div className="space-y-1.5 flex flex-col bg-amber-100/50 p-2.5 border border-amber-300 rounded-sm">
                  <label className="text-[10px] font-black uppercase tracking-widest text-amber-900">
                    {lang === 'MK' ? 'Вкупно почетно на сметка' : 'Total Initial Bank Sum'}
                  </label>
                  <div className="text-lg font-black font-mono text-black mt-auto">
                    {((parseFloat(openOperating) || 0) + (parseFloat(openReserve) || 0)).toLocaleString()} <span className="text-xs">ДЕН</span>
                  </div>
                  <p className="text-[9px] text-amber-700 font-bold uppercase">
                    {lang === 'MK' ? '= Оперативен + Резервен' : '= Operating + Reserve'}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-amber-200">
                <p className="text-[10px] text-amber-900 font-bold">
                  {lang === 'MK' ? '💡 Можете да започнете целосно од 0 или да внесете ваше изборно почетно салдо.' : '💡 You can start fresh from 0 or enter your own starting balance.'}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setOpenOperating('0');
                    setOpenReserve('0');
                    setIsSaved(false);
                  }}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-black text-white text-[10px] font-black uppercase tracking-wider border border-black cursor-pointer transition-all"
                >
                  🔄 {lang === 'MK' ? 'Постави 0 за почетно салдо' : 'Reset Starting Balance to 0'}
                </button>
              </div>

              {(parseFloat(aptRate) === 0 || parseFloat(storeRate) === 0) && (
                <div className="bg-amber-100/80 border-2 border-amber-500 p-4 font-sans text-amber-950 space-y-1.5" id="initial-balances-rate-warning-card">
                  <p className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                    <span>⚠️</span>
                    {lang === 'MK' 
                      ? 'ВНИМАНИЕ: СТАПКИ ЗА РЕЗЕРВЕН ФОНД СЕ 0 ДЕН.' 
                      : 'WARNING: RESERVE FUND FIXED RATES ARE 0 DEN.'}
                  </p>
                  <p className="text-[11px] font-bold leading-normal text-amber-900">
                    {lang === 'MK'
                      ? 'Бидејќи стапката на резервен фонд е поставена на 0 ден. по m², задолжениот износ на фактурите за станарите за оваа намена ќе биде 0 ден. Поради тоа, уплатите од станарите нема да додадат нови средства во вашиот резервен фонд во извештаите. Внесете вредности во делот „ПРЕСМЕТКА НА ФИКСЕН РЕЗЕРВЕН ФОНД“ на дното на оваа форма.'
                      : 'Since your reserve fund rate is set to 0 den. per m², the billed fixed amount on tenant invoices will be 0 den. Consequently, tenant payments will NOT increment or add funds to your Reserve Fund balance. Set the rates under the "RESERVE FUND FIXED RATES" section at the bottom of this form.'}
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Electricity (Apartments only) */}
            <div className="space-y-1.5 flex flex-col">
              <label htmlFor="input-electricity" className="text-[10px] font-black uppercase tracking-widest text-slate-600 flex items-center">
                <Zap className="w-4 h-4 text-blue-600 mr-1.5 shrink-0 animate-pulse" />
                {t.elecLabel}
              </label>
              <input
                id="input-electricity"
                type="number"
                min="0"
                step="any"
                className="w-full px-4 py-2.5 border-2 border-slate-300 focus:border-black bg-white font-mono font-bold text-sm outline-hidden text-black transition-all"
                value={elec}
                onChange={(e) => { setElec(e.target.value); setIsSaved(false); }}
              />
              <p className="text-[9px] text-blue-600 font-bold uppercase tracking-wider">{t.formulaApartment}</p>
            </div>

            {/* Elevator (Apartments only) */}
            <div className="space-y-1.5 flex flex-col">
              <label htmlFor="input-elevator" className="text-[10px] font-black uppercase tracking-widest text-slate-600 flex items-center">
                <Building2 className="w-4 h-4 text-blue-600 mr-1.5 shrink-0" />
                {t.elevLabel}
              </label>
              <input
                id="input-elevator"
                type="number"
                min="0"
                step="any"
                className="w-full px-4 py-2.5 border-2 border-slate-300 focus:border-black bg-white font-mono font-bold text-sm outline-hidden text-black transition-all"
                value={elev}
                onChange={(e) => { setElev(e.target.value); setIsSaved(false); }}
              />
              <p className="text-[9px] text-blue-600 font-bold uppercase tracking-wider">{t.formulaApartment}</p>
            </div>

            {/* Cleaning/Hygiene (All) */}
            <div className="space-y-1.5 flex flex-col">
              <label htmlFor="input-cleaning" className="text-[10px] font-black uppercase tracking-widest text-slate-600 flex items-center">
                <Sparkles className="w-4 h-4 text-emerald-600 mr-1.5 shrink-0" />
                {t.cleanLabel}
              </label>
              <input
                id="input-cleaning"
                type="number"
                min="0"
                step="any"
                className="w-full px-4 py-2.5 border-2 border-slate-300 focus:border-black bg-white font-mono font-bold text-sm outline-hidden text-black transition-all"
                value={clean}
                onChange={(e) => { setClean(e.target.value); setIsSaved(false); }}
              />
              <p className="text-[9px] text-emerald-600 font-bold uppercase tracking-wider">{t.formulaAll}</p>
            </div>

            {/* Accounting (All) */}
            <div className="space-y-1.5 flex flex-col">
              <label htmlFor="input-accounting" className="text-[10px] font-black uppercase tracking-widest text-slate-600 flex items-center">
                <Landmark className="w-4 h-4 text-emerald-600 mr-1.5 shrink-0" />
                {t.accLabel}
              </label>
              <input
                id="input-accounting"
                type="number"
                min="0"
                step="any"
                className="w-full px-4 py-2.5 border-2 border-slate-300 focus:border-black bg-white font-mono font-bold text-sm outline-hidden text-black transition-all"
                value={acc}
                onChange={(e) => { setAcc(e.target.value); setIsSaved(false); }}
              />
              <p className="text-[9px] text-emerald-600 font-bold uppercase tracking-wider">{t.formulaAll}</p>
            </div>

            {/* Management (All) */}
            <div className="space-y-1.5 flex flex-col">
              <label htmlFor="input-management" className="text-[10px] font-black uppercase tracking-widest text-slate-600 flex items-center">
                <UserCheck className="w-4 h-4 text-emerald-600 mr-1.5 shrink-0" />
                {t.mgmLabel}
              </label>
              <input
                id="input-management"
                type="number"
                min="0"
                step="any"
                className="w-full px-4 py-2.5 border-2 border-slate-300 focus:border-black bg-white font-mono font-bold text-sm outline-hidden text-black transition-all"
                value={mgm}
                onChange={(e) => { setMgm(e.target.value); setIsSaved(false); }}
              />
              <p className="text-[9px] text-emerald-600 font-bold uppercase tracking-wider">{t.formulaAll}</p>
            </div>

            {/* Bank Fees (All) */}
            <div className="space-y-1.5 flex flex-col">
              <label htmlFor="input-bankFees" className="text-[10px] font-black uppercase tracking-widest text-slate-600 flex items-center">
                <KeyRound className="w-4 h-4 text-emerald-600 mr-1.5 shrink-0" />
                {t.bankLabel}
              </label>
              <input
                id="input-bankFees"
                type="number"
                min="0"
                step="any"
                className="w-full px-4 py-2.5 border-2 border-slate-300 focus:border-black bg-white font-mono font-bold text-sm outline-hidden text-black transition-all"
                value={bank}
                onChange={(e) => { setBank(e.target.value); setIsSaved(false); }}
              />
              <p className="text-[9px] text-emerald-600 font-bold uppercase tracking-wider">{t.formulaAll}</p>
            </div>

            {/* Investment Maintenance (All) */}
            <div className="space-y-1.5 flex flex-col">
              <label htmlFor="input-investment" className="text-[10px] font-black uppercase tracking-widest text-slate-600 flex items-center">
                <Building2 className="w-4 h-4 text-emerald-600 mr-1.5 shrink-0" />
                {t.investLabel}
              </label>
              <input
                id="input-investment"
                type="number"
                min="0"
                step="any"
                className="w-full px-4 py-2.5 border-2 border-slate-300 focus:border-black bg-white font-mono font-bold text-sm outline-hidden text-black transition-all"
                value={invest}
                onChange={(e) => { setInvest(e.target.value); setIsSaved(false); }}
              />
              <p className="text-[9px] text-emerald-600 font-bold uppercase tracking-wider">{t.formulaAll}</p>
            </div>

            {/* Miscellaneous (All) */}
            <div className="space-y-1.5 flex flex-col">
              <label htmlFor="input-misc" className="text-[10px] font-black uppercase tracking-widest text-slate-600 flex items-center">
                <Sparkles className="w-4 h-4 text-emerald-600 mr-1.5 shrink-0" />
                {t.miscLabel}
              </label>
              <input
                id="input-misc"
                type="number"
                min="0"
                step="any"
                className="w-full px-4 py-2.5 border-2 border-slate-300 focus:border-black bg-white font-mono font-bold text-sm outline-hidden text-black transition-all"
                value={misc}
                onChange={(e) => { setMisc(e.target.value); setIsSaved(false); }}
              />
              <p className="text-[9px] text-emerald-600 font-bold uppercase tracking-wider">{t.formulaAll}</p>
            </div>
          </div>

          {/* Fixed Rates Configuration */}
          <div className="bg-slate-50 border-2 border-dashed border-slate-300 p-5 space-y-4" id="fixed-rates-editor-inline">
            <div className="flex items-center space-x-2">
              <Coins className="w-5 h-5 text-yellow-500 shrink-0" />
              <div>
                <h4 className="text-xs font-black text-black uppercase tracking-widest">
                  {lang === 'MK' ? 'ПРЕСМЕТКА НА ФИКСЕН РЕЗЕРВЕН ФОНД (ДЕНАРИ ПО м²)' : 'RESERVE FUND FIXED RATES (DENARS PER m²)'}
                </h4>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">
                  {lang === 'MK' ? 'Прилагодете ги фиксните стапки што се множат по квадратура за секој месец' : 'Configure fixed rates applied to unit areas for the calculations'}
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Apartment Fixed Rate */}
              <div className="space-y-1.5 flex flex-col">
                <label htmlFor="input-aptRate" className="text-[10px] font-black uppercase tracking-widest text-slate-600">
                  {t.aptRateLabel}
                </label>
                <input
                  id="input-aptRate"
                  type="number"
                  min="0"
                  step="any"
                  className="w-full px-4 py-2.5 border-2 border-slate-300 focus:border-black bg-white font-mono font-bold text-sm outline-hidden text-black transition-all"
                  value={aptRate}
                  onChange={(e) => { setAptRate(e.target.value); setIsSaved(false); }}
                />
              </div>

              {/* Store Fixed Rate */}
              <div className="space-y-1.5 flex flex-col">
                <label htmlFor="input-storeRate" className="text-[10px] font-black uppercase tracking-widest text-slate-600">
                  {t.storeRateLabel}
                </label>
                <input
                  id="input-storeRate"
                  type="number"
                  min="0"
                  step="any"
                  className="w-full px-4 py-2.5 border-2 border-slate-300 focus:border-black bg-white font-mono font-bold text-sm outline-hidden text-black transition-all"
                  value={storeRate}
                  onChange={(e) => { setStoreRate(e.target.value); setIsSaved(false); }}
                />
              </div>
            </div>
          </div>

          {/* Custom Google OAuth Client Configuration */}
          <div className="bg-slate-50 border-2 border-dashed border-slate-300 p-5 space-y-4" id="google-oauth-editor">
            <div className="flex items-center space-x-2">
              <KeyRound className="w-5 h-5 text-blue-500 shrink-0" />
              <div>
                <h4 className="text-xs font-black text-black uppercase tracking-widest">
                  {lang === 'MK' ? 'ПРИЛАГОДЕН GOOGLE SIGN IN CLIENT ID (ОПЦИОНАЛНО)' : 'CUSTOM GOOGLE OAUTH CLIENT ID (OPTIONAL)'}
                </h4>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">
                  {lang === 'MK' ? 'Доколку имате грешка 403 Google Access Blocked, користете го вашиот проект healthy-zone-363907' : 'If you experience 403 Google verification errors, use your own Google Cloud project'}
                </p>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="space-y-1.5 flex flex-col">
                <label htmlFor="input-gClientId" className="text-[10px] font-black uppercase tracking-widest text-slate-600">
                  Google Client ID (OAuth 2.0 Web Client)
                </label>
                <input
                  id="input-gClientId"
                  type="text"
                  placeholder="216622282234-xxxxxxxxxxxxxxx.apps.googleusercontent.com"
                  className="w-full px-4 py-2.5 border-2 border-slate-300 focus:border-black bg-white font-mono font-bold text-sm outline-hidden text-black transition-all"
                  value={gClientId}
                  onChange={(e) => { setGClientId(e.target.value); setIsSaved(false); }}
                />
              </div>

              {/* Step-by-Step Instructions */}
              <div className="bg-white border border-slate-200 p-4 space-y-2 text-xs text-slate-700 font-medium">
                <p className="font-bold uppercase tracking-wider text-black text-[10px] mb-1">
                  {lang === 'MK' ? '📋 УПАТСТВО ЗА КРЕИРАЊЕ И ПОДЕСУВАЊЕ:' : '📋 STEP-BY-STEP SETUP GUIDE:'}
                </p>
                <ol className="list-decimal pl-4 space-y-1.5">
                  <li>
                    {lang === 'MK' ? (
                      <>Отворете ја <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-bold">Google Cloud Console</a> и изберете го вашиот проект <strong>My First Project (ID: healthy-zone-363907)</strong>.</>
                    ) : (
                      <>Open the <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-bold">Google Cloud Console</a> and select your project <strong>My First Project (ID: healthy-zone-363907)</strong>.</>
                    )}
                  </li>
                  <li>
                    {lang === 'MK' ? (
                      <>Одете во левото мени <strong>APIs & Services</strong> &rarr; <strong>Library</strong>, пребарајте <strong>Gmail API</strong> и кликнете на копчето <strong>Enable</strong> (Овозможи).</>
                    ) : (
                      <>Navigate to the sidebar menu <strong>APIs & Services</strong> &rarr; <strong>Library</strong>, search for <strong>Gmail API</strong> and click the <strong>Enable</strong> button.</>
                    )}
                  </li>
                  <li>
                    {lang === 'MK' ? (
                      <>Одете во левото мени <strong>APIs & Services</strong> &rarr; <strong>OAuth consent screen</strong>.</>
                    ) : (
                      <>Navigate to the sidebar menu <strong>APIs & Services</strong> &rarr; <strong>OAuth consent screen</strong>.</>
                    )}
                  </li>
                  <li>
                    {lang === 'MK' ? (
                      <>Скролајте до делот <strong>Test Users</strong>, кликнете <strong>Add Users</strong> и додадете ја вашата е-пошта: <code className="bg-slate-100 px-1 py-0.5 font-mono text-[11px] font-bold">zsvich28@gmail.com</code> (како и вашиот Gmail од кој праќате).</>
                    ) : (
                      <>Scroll to the <strong>Test Users</strong> section, click <strong>Add Users</strong> and add your email: <code className="bg-slate-100 px-1 py-0.5 font-mono text-[11px] font-bold">zsvich28@gmail.com</code> (along with the Gmail you are sending from).</>
                    )}
                  </li>
                  <li>
                    {lang === 'MK' ? (
                      <>Одете на табот <strong>Credentials</strong> &rarr; кликнете <strong>+ Create Credentials</strong> &rarr; изберете <strong>OAuth client ID</strong>.</>
                    ) : (
                      <>Go to the <strong>Credentials</strong> tab &rarr; click <strong>+ Create Credentials</strong> &rarr; select <strong>OAuth client ID</strong>.</>
                    )}
                  </li>
                  <li>
                    {lang === 'MK' ? (
                      <>Изберете <strong>Web application</strong> како Application Type.</>
                    ) : (
                      <>Select <strong>Web application</strong> as the Application Type.</>
                    )}
                  </li>
                  <li>
                    {lang === 'MK' ? (
                      <>Во делот <strong>Authorized JavaScript origins</strong> и во <strong>Authorized redirect URIs</strong> кликнете Add URI и внесете го точниот URL на апликацијата (без коси црти на крајот): <code className="bg-slate-100 px-1 py-0.5 font-mono text-[11px] font-bold text-blue-700 break-all">{window.location.origin}</code></>
                    ) : (
                      <>In both <strong>Authorized JavaScript origins</strong> and <strong>Authorized redirect URIs</strong>, click Add URI and enter this exact application URL (no trailing slash): <code className="bg-slate-100 px-1 py-0.5 font-mono text-[11px] font-bold text-blue-700 break-all">{window.location.origin}</code></>
                    )}
                  </li>
                  <li>
                    {lang === 'MK' ? (
                      <>Кликнете <strong>Create</strong>, копирајте го вашиот <strong>Client ID</strong>, пастирајте го погоре и кликнете на црното копче „Зачувај“ на дното.</>
                    ) : (
                      <>Click <strong>Create</strong>, copy your <strong>Client ID</strong>, paste it into the field above, and click the black "Recalculate & update" button below.</>
                    )}
                  </li>
                </ol>
              </div>
            </div>
          </div>

          {/* Metrics section showing the invoice total */}
          <div className="pt-4 border-t-2 border-black flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="font-extrabold text-black text-sm uppercase tracking-wide">
              {lang === 'MK' ? 'Вкупно раководни трошоци за месецот:' : 'Grand Total Monthly Expenses:'} <span className="text-blue-600 font-black font-mono text-lg ml-1.5">{totalSum.toLocaleString()} ДЕН</span>
            </div>
            
            <button
              id="submit-variables-btn"
              type="submit"
              className="px-6 py-3.5 font-black text-xs tracking-widest uppercase text-white bg-black hover:bg-yellow-400 hover:text-black border-2 border-black transition-all cursor-pointer shadow-none"
            >
              {t.saveBtn}
            </button>
          </div>

          {/* Success Dialog */}
          {isSaved && (
            <div id="submit-success-indicator" className="bg-emerald-100 border-2 border-black text-emerald-900 px-4 py-3 text-xs font-black uppercase tracking-wider text-center animate-scale-up">
              {t.successMsg}
            </div>
          )}
        </form>
      </div>

      {/* Allocation Guide (Sidebar explanation) */}
      <div className="bg-black text-white border-2 border-black p-6 flex flex-col justify-between">
        <div className="space-y-4">
          <div className="flex items-center space-x-2 text-yellow-400 font-black tracking-widest uppercase text-xs">
            <HelpCircle className="w-5 h-5 shrink-0" />
            <span>{t.tipTitle}</span>
          </div>

          <div className="space-y-5 text-xs tracking-wide leading-relaxed text-slate-300">
            <div>
              <p className="font-black text-yellow-400 uppercase tracking-widest text-[9px] mb-1 flex items-center">
                <span className="w-2.5 h-2.5 bg-blue-500 border border-black mr-2"></span>
                {lang === 'MK' ? 'СПЕЦИФИЧНО ЗА СТАНОВИ' : 'APARTMENTS ONLY'}
              </p>
              <p>{t.tipTextApartments}</p>
            </div>

            <div>
              <p className="font-black text-emerald-400 uppercase tracking-widest text-[9px] mb-1 flex items-center">
                <span className="w-2.5 h-2.5 bg-emerald-500 border border-black mr-2"></span>
                {lang === 'MK' ? 'ЗАЕДНИЧКИ РАСХОДИ' : 'ALL BUILDING SHARED COSTS'}
              </p>
              <p>{t.tipTextStores}</p>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-705 mt-6 flex items-center justify-between text-[10px] font-black text-slate-400 font-mono uppercase tracking-widest">
          <span>Apts: 4,868 m²</span>
          <ArrowRight className="w-3.5 h-3.5 text-yellow-400" />
          <span>Stores: 321 m²</span>
        </div>
      </div>
    </div>
  );
}
