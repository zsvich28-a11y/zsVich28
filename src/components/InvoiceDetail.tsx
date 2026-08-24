import React, { useState, useEffect } from 'react';
import { CalculatedInvoice, Language, MonthRecord, Unit, EmailAttachment, Expense } from '../types';
import { Printer, X, Calculator, Mail, Loader2, LogOut, Check, UploadCloud, FileText, Trash2, Landmark } from 'lucide-react';
import { formatMonthId, calculateBalancesForMonth, formatDenar } from '../utils';
import { initAuth, googleSignIn, logout, getAccessToken } from '../auth';
import { sendInvoiceEmail } from '../gmailService';
import { User } from 'firebase/auth';

interface InvoiceDetailProps {
  invoice: CalculatedInvoice;
  monthId: string;
  monthlyVariables: MonthRecord['variables'];
  onClose: () => void;
  lang: Language;
  apartmentFixedRatePerM2: number;
  storeFixedRatePerM2: number;
  calculatedInvoicesByMonth: Record<string, CalculatedInvoice[]>;
  units: Unit[];
  expenses: Expense[];
  openingBalances: { bank: number; reserve: number } | null;
  monthIds: string[];
  balanceOverrides?: Record<string, { bank?: number; reserve?: number; operating?: number }> | null;
  tmobilePaid?: Record<string, boolean>;
  tmobileRates?: Record<string, number>;
}

export default function InvoiceDetail({
  invoice,
  monthId,
  monthlyVariables,
  onClose,
  lang,
  apartmentFixedRatePerM2,
  storeFixedRatePerM2,
  calculatedInvoicesByMonth,
  units,
  expenses = [],
  openingBalances = null,
  monthIds = [],
  balanceOverrides = {},
  tmobilePaid = {},
  tmobileRates = {}
}: InvoiceDetailProps) {
  const isApartment = invoice.type === 'apartment';
  const currentFixedRate = isApartment ? apartmentFixedRatePerM2 : storeFixedRatePerM2;
  const monthName = formatMonthId(monthId, lang);

  // Find matching unit to get current email and opt-in settings
  const unitObj = units.find(u => u.id === invoice.unitId);
  const tenantEmail = unitObj?.email || '';
  const isOptedIn = !!unitObj?.emailOptIn;

  // Authentication State
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessTokenState] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // Email Action States
  const [isSending, setIsSending] = useState(false);
  const [emailStatus, setEmailStatus] = useState<{ success?: boolean; error?: string } | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [destinationEmail, setDestinationEmail] = useState(tenantEmail);

  // Special D7 Co-owner Dispatch states
  const [selectedD7SplitNumber, setSelectedD7SplitNumber] = useState<string>('D7/1');
  const [d7Emails, setD7Emails] = useState<Record<string, string>>({
    'D7/1': localStorage.getItem('houseman_ujp_emails') || '',
    'D7/2': localStorage.getItem('houseman_d7_2_emails') || '',
    'D7/3': localStorage.getItem('houseman_d7_3_emails') || '',
    'D7/4': localStorage.getItem('houseman_d7_4_emails') || '',
  });
  const [scannedFiles, setScannedFiles] = useState<Record<string, {
    filename: string;
    mimeType: string;
    base64Data: string;
    size: number;
  } | null>>({});

  const updateD7Email = (num: string, value: string) => {
    setD7Emails(prev => ({ ...prev, [num]: value }));
    const storageKeys: Record<string, string> = {
      'D7/1': 'houseman_ujp_emails',
      'D7/2': 'houseman_d7_2_emails',
      'D7/3': 'houseman_d7_3_emails',
      'D7/4': 'houseman_d7_4_emails',
    };
    localStorage.setItem(storageKeys[num], value);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
  };

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (!dataUrl) return;
      // Strip base64 prefix
      const base64Parts = dataUrl.split(',')[1];
      setScannedFiles(prev => ({
        ...prev,
        [selectedD7SplitNumber]: {
          filename: file.name,
          mimeType: file.type || 'application/pdf',
          base64Data: base64Parts,
          size: file.size
        }
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleSendCoOwnerEmail = async () => {
    if (!accessToken) return;
    const currentEmailInput = d7Emails[selectedD7SplitNumber];
    if (!currentEmailInput.trim()) return;

    setIsSending(true);
    setEmailStatus(null);

    // Find the matching calculated split invoice
    const splits = getD7SplitInvoices(invoice);
    const selectedSplit = splits.find(s => s.number === selectedD7SplitNumber);
    if (!selectedSplit) {
      setIsSending(false);
      setEmailStatus({ success: false, error: 'Split invoice not found' });
      return;
    }

    // Prepare attachment if any
    const currentAttachment = scannedFiles[selectedD7SplitNumber];
    const emailAttachment = currentAttachment ? {
      filename: currentAttachment.filename,
      mimeType: currentAttachment.mimeType,
      base64Data: currentAttachment.base64Data
    } : undefined;

    const result = await sendInvoiceEmail({
      accessToken,
      toEmail: currentEmailInput,
      invoice: selectedSplit,
      monthId,
      lang,
      monthlyVariables,
      apartmentFixedRatePerM2,
      storeFixedRatePerM2,
      calculatedInvoicesByMonth,
      attachment: emailAttachment
    });

    if (result.success) {
      setEmailStatus({ success: true });
    } else {
      setEmailStatus({ success: false, error: result.error });
    }
    setIsSending(false);
  };

  // Keep destination email in sync with unitObj email
  useEffect(() => {
    setDestinationEmail(tenantEmail);
  }, [tenantEmail]);

  // Auth initialization
  useEffect(() => {
    const unsubscribe = initAuth(
      (u, token) => {
        setUser(u);
        setAccessTokenState(token);
        setIsAuthLoading(false);
      },
      () => {
        setUser(null);
        setAccessTokenState(null);
        setIsAuthLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleSignIn = async () => {
    try {
      setIsAuthLoading(true);
      const res = await googleSignIn();
      if (res) {
        setUser(res.user);
        setAccessTokenState(res.accessToken);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await logout();
      setUser(null);
      setAccessTokenState(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendEmail = async () => {
    if (!accessToken) return;
    if (!destinationEmail) return;

    setIsSending(true);
    setEmailStatus(null);
    setShowConfirmModal(false);

    const result = await sendInvoiceEmail({
      accessToken,
      toEmail: destinationEmail,
      invoice,
      monthId,
      lang,
      monthlyVariables,
      apartmentFixedRatePerM2,
      storeFixedRatePerM2,
      calculatedInvoicesByMonth
    });

    if (result.success) {
      setEmailStatus({ success: true });
    } else {
      setEmailStatus({ success: false, error: result.error });
    }
    setIsSending(false);
  };

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
        if (ratio !== undefined) {
          return Math.round(remainingDebt * ratio).toString();
        }
        return Math.round(remainingDebt).toString();
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

  // Load or initialize editable announcement
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

  const handlePrint = () => {
    window.print();
  };

  const t = {
    MK: {
      typeApartment: 'стан',
      typeStore: 'деловен',
      invoiceTitle: 'ИЗВЕСТУВАЊЕ / СМЕТКА',
      buildingLabel: 'Станари на Куќен Совет',
      housemanLabel: 'Управител на зграда',
      printBtn: 'Печати сметка',
      closeBtn: 'Затвори',
    },
    EN: {
      typeApartment: 'apartment',
      typeStore: 'commercial',
      invoiceTitle: 'MONTHLY STATEMENT',
      buildingLabel: 'Building Council Tenants',
      housemanLabel: 'Building Manager',
      printBtn: 'Print Bill',
      closeBtn: 'Close',
    }
  }[lang];

  const invoicesToRender = invoice.unitId === 'lokal-d7'
    ? [invoice, ...getD7SplitInvoices(invoice)]
    : [invoice];

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-start justify-center p-4 z-50 overflow-y-auto animate-fade-in" id="invoice-detail-overlay">
      <div id="invoice-detail-modal" className="bg-white border-4 border-black max-w-4xl w-full flex flex-col shadow-none my-4 md:my-8 relative animate-scale-up print:p-0 print:m-0 print:border-0 print:shadow-none print:max-w-none print:static print:h-auto">
        
        {/* Modal Controls (Hidden during print) */}
        <div className="flex items-center justify-between p-4 border-b-2 border-black bg-slate-50 print:hidden">
          <div className="flex items-center space-x-2 text-black font-black uppercase tracking-wider text-xs">
            <Calculator className="w-5 h-5 shrink-0" />
            <span>{invoice.owner} — {invoice.number}</span>
          </div>
          <button
            id="close-modal-invoice-btn"
            onClick={onClose}
            className="p-1.5 text-black hover:bg-yellow-400 border-2 border-black rounded-none transition-all font-black text-xs cursor-pointer"
            title={t.closeBtn}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Grid Sheet */}
        <div 
          className={`p-8 print:p-0 overflow-y-auto flex-1 h-full bg-white text-black font-sans text-xs leading-none ${invoice.unitId === 'lokal-d7' ? 'multi-page-print' : ''}`} 
          id="printable-invoice"
        >
          {invoicesToRender.map((inv, idx) => {
            const isApartment = inv.type === 'apartment';
            const currentFixedRate = isApartment ? apartmentFixedRatePerM2 : storeFixedRatePerM2;
            const shareAllNum = (inv.area / 5189) * 100;
            const shareAllStr = shareAllNum.toFixed(2);
            const shareElecStr = isApartment ? ((inv.area / 4868) * 100).toFixed(2) : '0.00';
            // Constructing dynamic status alerts according to exact user Excel rules
            const LEDGERTOTAL = Math.round(inv.endingDebt);
            const RAWBILL = Math.round(inv.totalMonthlyCharge);

            let statusTitle = '';
            let statusDetail = '';

            if (lang === 'MK') {
              // First Excel Formula logic for the Status Title
              if (LEDGERTOTAL > RAWBILL) {
                statusTitle = '!!!ВЕ МОЛИМЕ ДА СЕ СЕРВИСИРА ДОЛГОТ КОН ЗАЕДНИЦАТА НА СОПСТВЕНИЦИ!!!';
              } else {
                statusTitle = 'РЕДОВНА УПЛАТА, ВИ БЛАГОДАРИМЕ';
              }

              // Second Excel Formula logic for the Status Detail
              if (LEDGERTOTAL < 0) {
                statusDetail = `НЕМА ЗА УПЛАТА ТЕКОВЕН МЕСЕЦ. СМЕТКАТА Е ПОКРИЕНА ОД АВАНС. ПРЕОСТАНАТ КРЕДИТ: ${Math.abs(LEDGERTOTAL).toFixed(0)} ДЕН.`;
              } else if (LEDGERTOTAL === 0 && RAWBILL > 0) {
                statusDetail = 'ТЕКОВНАТА СМЕТКА Е ЦЕЛОСНО ПОКРИЕНА ОД АВАНС. ----- ЗА УПЛАТА: 0.00 ДЕН.';
              } else if (LEDGERTOTAL === 0) {
                statusDetail = `НЕМА ЗАОСТАНАТ ДОЛГ. ----- ЗА УПЛАТА ТЕКОВЕН МЕСЕЦ: ${RAWBILL.toFixed(0)} ДЕН.`;
              } else if (LEDGERTOTAL < RAWBILL) {
                statusDetail = `ТЕКОВНА СМЕТКА НАМАЛЕНА ЗА АВАНС. ----- ЗА УПЛАТА: ${LEDGERTOTAL.toFixed(0)} ДЕН.`;
              } else {
                statusDetail = `ВКУПЕН ДОЛГ ЗА УПЛАТА (СО ЗАОСТАНАТ ДОЛГ): ${LEDGERTOTAL.toFixed(0)} ДЕН.`;
              }
            } else {
              // English equivalents for the formulas
              if (LEDGERTOTAL > RAWBILL) {
                statusTitle = '!!!PLEASE SETTLE THE OUTSTANDING DEBT TO THE COMMUNITY OF OWNERS!!!';
              } else {
                statusTitle = 'REGULAR PAYMENT, THANK YOU';
              }

              if (LEDGERTOTAL < 0) {
                statusDetail = `NO PAYMENT DUE CURRENT MONTH. ACCOUNT COVERED BY PREPAYMENT. REMAINING CREDIT: ${Math.abs(LEDGERTOTAL).toFixed(0)} DEN.`;
              } else if (LEDGERTOTAL === 0 && RAWBILL > 0) {
                statusDetail = 'CURRENT BILL IS FULLY COVERED BY PREPAYMENT. ----- TO PAY: 0.00 DEN.';
              } else if (LEDGERTOTAL === 0) {
                statusDetail = `NO OUTSTANDING DEBT. ----- TO PAY CURRENT MONTH: ${RAWBILL.toFixed(0)} DEN.`;
              } else if (LEDGERTOTAL < RAWBILL) {
                statusDetail = `CURRENT BILL REDUCED BY PREPAYMENT. ----- TO PAY: ${LEDGERTOTAL.toFixed(0)} DEN.`;
              } else {
                statusDetail = `TOTAL DEBT DUE (INCLUDING PAST ARREARS): ${LEDGERTOTAL.toFixed(0)} DEN.`;
              }
            }

            const pageContent = (
              <>
                <div className="invoice-print-wrapper flex flex-col justify-start w-full h-auto md:h-full print:h-full">
                  <div className="invoice-card-print bg-white border-[2.5px] border-black flex flex-col md:flex-row print:flex-row p-0 shadow-none print:border-2 print:rounded-none h-auto md:h-[71.5mm] w-full">
                  
                  {/* Left Column (65% width) */}
                  <div className="w-full md:w-[65%] print:w-[65%] border-r-0 md:border-r-[2.5px] print:border-r-[2.5px] border-black flex flex-col justify-between h-full">
                    {/* Row 1: Header Address Line */}
                    <div className="header-line border-b-[2px] border-black p-1 text-center font-bold tracking-normal uppercase text-[8.5px] bg-white text-black">
                      {lang === 'MK'
                        ? 'Заедница на сопственици на станбено-деловната зграда со адреса на ул.Вич 28 Скопје'
                        : 'Community of Owners of the Residential-Commercial Building at Address: Vich St. 28, Skopje'}
                    </div>

                    {/* Row 2: Metadata Row (5 items) */}
                    <div className="meta-block grid grid-cols-12 border-b-[2px] border-black text-[8px] leading-tight font-mono text-black items-stretch">
                      <div className="col-span-4 p-1 border-r border-black font-extrabold flex items-center justify-center text-center uppercase">
                        {lang === 'MK' ? 'ФАКТУРА ЗА' : 'BILL FOR'} {monthName}г.
                      </div>
                      <div className="col-span-1 p-0.5 border-r border-black font-bold flex items-center justify-center">
                        {lang === 'MK' ? 'бр.' : 'No.'}
                      </div>
                      <div className="col-span-3 p-0.5 border-r border-black font-bold flex items-center justify-center text-center">
                        {inv.isD7Split ? (
                          `${inv.number} - ${monthNum.toString().padStart(2, '0')}-${yearNum}`
                        ) : (
                          `${isApartment ? (lang === 'MK' ? 'стан' : 'apt') : (lang === 'MK' ? 'деловен' : 'store')} ${inv.number} - ${monthNum} - ${yearNum}`
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
                    <div className="owner-block border-b-[2.5px] border-black p-1 px-2.5 flex flex-row items-center justify-between bg-white font-sans w-full min-h-[20px] overflow-hidden">
                      <div className={`owner-name font-black uppercase tracking-tight text-black leading-tight flex-1 pr-2 ${
                        inv.owner.length > 35 ? 'text-[8.5px] long-owner-name' : 'text-[11px]'
                      }`}>
                        {inv.owner}
                      </div>
                      <div className="text-[8.5px] font-bold text-slate-500 font-mono uppercase tracking-wider text-right shrink-0">
                        {inv.customAddress ? (
                          inv.customAddress
                        ) : (
                          lang === 'MK'
                            ? `ул. Вич 28/${inv.number} Скопје`
                            : `Vich St. 28/${inv.number} Skopje`
                        )}
                      </div>
                    </div>

                    {/* Row 4: Charges Table breakdown */}
                    <div className="flex-1 overflow-hidden">
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
                            <td className="p-0.5 pr-1.5 border-r border-black text-right">{Math.round(currentFixedRate)}</td>
                            <td className="p-0.5 pr-1.5 border-r border-black text-right">
                              {(inv as any).isD7Split ? inv.area.toFixed(2) : inv.area}
                            </td>
                            <td className="p-0.5 pr-1.5 text-right font-bold">{Math.round(inv.fixedCharge)}</td>
                          </tr>

                          {/* 2. Electricity */}
                          <tr className="h-[3.8mm]">
                            <td className="p-0.5 pl-1.5 border-r border-black text-left font-sans font-bold uppercase text-[7.5px]">
                              {lang === 'MK' ? 'Заедничка струја - ЕД' : 'Shared electricity - ED'}
                            </td>
                            <td className="p-0.5 pr-1.5 border-r border-black text-right">
                              {isApartment ? Math.round(monthlyVariables.electricity) : 0}
                            </td>
                            <td className="p-0.5 pr-1.5 border-r border-black text-right">
                              {isApartment ? shareElecStr : '—'}
                            </td>
                            <td className="p-0.5 pr-1.5 text-right font-bold">
                              {Math.round(inv.electricityCharge)}
                            </td>
                          </tr>

                          {/* 3. Elevator */}
                          <tr className="h-[3.8mm]">
                            <td className="p-0.5 pl-1.5 border-r border-black text-left font-sans font-bold uppercase text-[7.5px]">
                              {lang === 'MK' ? 'Месечно одржување лифтови' : 'Monthly lift maintenance'}
                            </td>
                            <td className="p-0.5 pr-1.5 border-r border-black text-right">
                              {isApartment ? Math.round(monthlyVariables.elevator) : 0}
                            </td>
                            <td className="p-0.5 pr-1.5 border-r border-black text-right">
                              {isApartment ? shareElecStr : '—'}
                            </td>
                            <td className="p-0.5 pr-1.5 text-right font-bold">
                              {Math.round(inv.elevatorCharge)}
                            </td>
                          </tr>

                          {/* 4. Investment maintenance */}
                          <tr className="h-[3.8mm]">
                            <td className="p-0.5 pl-1.5 border-r border-black text-left font-sans font-bold uppercase text-[7.5px]">
                              {lang === 'MK' ? 'Инвестиционо одржување' : 'Investment maintenance'}
                            </td>
                            <td className="p-0.5 pr-1.5 border-r border-black text-right">
                              {Math.round(monthlyVariables.investment || 0)}
                            </td>
                            <td className="p-0.5 pr-1.5 border-r border-black text-right">
                              {shareAllStr}
                            </td>
                            <td className="p-0.5 pr-1.5 text-right font-bold">
                              {Math.round(inv.investmentCharge || 0)}
                            </td>
                          </tr>

                          {/* 5. Cleaning */}
                          <tr className="h-[3.8mm]">
                            <td className="p-0.5 pl-1.5 border-r border-black text-left font-sans font-bold uppercase text-[7.5px]">
                              {lang === 'MK' ? 'Хигиена' : 'Cleaning & hygiene'}
                            </td>
                            <td className="p-0.5 pr-1.5 border-r border-black text-right">
                              {Math.round(monthlyVariables.cleaning)}
                            </td>
                            <td className="p-0.5 pr-1.5 border-r border-black text-right">
                              {shareAllStr}
                            </td>
                            <td className="p-0.5 pr-1.5 text-right font-bold">
                              {Math.round(inv.cleaningCharge)}
                            </td>
                          </tr>

                          {/* 6. Accounting */}
                          <tr className="h-[3.8mm]">
                            <td className="p-0.5 pl-1.5 border-r border-black text-left font-sans font-bold uppercase text-[7.5px]">
                              {lang === 'MK' ? 'Сметководство' : 'Accounting'}
                            </td>
                            <td className="p-0.5 pr-1.5 border-r border-black text-right">
                              {Math.round(monthlyVariables.accounting)}
                            </td>
                            <td className="p-0.5 pr-1.5 border-r border-black text-right">
                              {shareAllStr}
                            </td>
                            <td className="p-0.5 pr-1.5 text-right font-bold">
                              {Math.round(inv.accountingCharge)}
                            </td>
                          </tr>

                          {/* 7. Management */}
                          <tr className="h-[3.8mm]">
                            <td className="p-0.5 pl-1.5 border-r border-black text-left font-sans font-bold uppercase text-[7.5px]">
                              {lang === 'MK' ? 'Управување(бруто со ПДД)' : 'Management (gross)'}
                            </td>
                            <td className="p-0.5 pr-1.5 border-r border-black text-right">
                              {Math.round(monthlyVariables.management)}
                            </td>
                            <td className="p-0.5 pr-1.5 border-r border-black text-right">
                              {shareAllStr}
                            </td>
                            <td className="p-0.5 pr-1.5 text-right font-bold">
                              {Math.round(inv.managementCharge)}
                            </td>
                          </tr>

                          {/* 8. Bank Fees */}
                          <tr className="h-[3.8mm]">
                            <td className="p-0.5 pl-1.5 border-r border-black text-left font-sans font-bold uppercase text-[7.5px]">
                              {lang === 'MK' ? 'Банкарска провизија' : 'Bank commission'}
                            </td>
                            <td className="p-0.5 pr-1.5 border-r border-black text-right">
                              {Math.round(monthlyVariables.bankFees)}
                            </td>
                            <td className="p-0.5 pr-1.5 border-r border-black text-right">
                              {shareAllStr}
                            </td>
                            <td className="p-0.5 pr-1.5 text-right font-bold">
                              {Math.round(inv.bankFeesCharge)}
                            </td>
                          </tr>

                          {/* 9. Miscellaneous */}
                          <tr className="h-[3.8mm]">
                            <td className="p-0.5 pl-1.5 border-r border-black text-left font-sans font-bold uppercase text-[7.5px]">
                              {lang === 'MK' ? 'Разно' : 'Misc'}
                            </td>
                            <td className="p-0.5 pr-1.5 border-r border-black text-right">
                              {Math.round(monthlyVariables.misc || 0)}
                            </td>
                            <td className="p-0.5 pr-1.5 border-r border-black text-right">
                              {shareAllStr}
                            </td>
                            <td className="p-0.5 pr-1.5 text-right font-bold">
                              {Math.round(inv.miscCharge || 0)}
                            </td>
                          </tr>

                        </tbody>
                      </table>
                    </div>

                    {/* Row 5: Footer block (Bank, President, and totals) aligned with grid */}
                    <div className="grid grid-cols-12 border-t-[2.5px] border-black text-[7.5px] font-mono leading-tight bg-white h-auto items-stretch">
                      
                      {/* Column A (Bank details, width 50%) */}
                      <div className="bank-details col-span-5 p-1 border-r border-black flex flex-col justify-center">
                        <p className="font-extrabold text-[7px] uppercase tracking-tight text-slate-500">
                          {lang === 'MK' ? 'Комерцијална Банка АД Скопје' : 'Komercijalna Banka AD Skopje'}
                        </p>
                        <p className="font-black mt-0.5">300000004672235 ЕДБ 4057010504720</p>
                      </div>

                      {/* Column B (President, width 30%) */}
                      <div className="president-block col-span-3 p-0.5 border-r border-black flex flex-col justify-center text-center">
                        <p className="text-[6.5px] uppercase tracking-tight font-extrabold text-slate-500 leading-none">
                          {lang === 'MK' ? 'Претседател на заедница на сопственици' : 'Owners President'}
                        </p>
                        <p className="font-serif italic border-b border-black border-dotted mx-auto w-[90%] pb-0.5 font-black text-[7.5px] mt-1 text-slate-900">
                          Ф.Зафировски
                        </p>
                      </div>

                      {/* Column C (Totals details) */}
                      <div className="values-block col-span-4 flex flex-col justify-between text-right bg-white select-text">
                        <div className="p-0.5 px-1.5 border-b border-black flex-1 flex items-center justify-between text-[7px] font-bold text-black bg-white leading-none">
                          <span className="uppercase text-[6px] font-extrabold text-slate-500 tracking-tight">{lang === 'MK' ? 'Вкупно тековен' : 'Current'}:</span>
                          <span className="font-black text-[8px] pl-2">{inv.totalMonthlyCharge}</span>
                        </div>
                        <div className="p-0.5 px-1.5 flex-1 flex items-center justify-between text-[7px] font-bold text-black bg-white leading-none">
                          <span className="uppercase text-[6px] font-extrabold text-slate-500 tracking-tight">{lang === 'MK' ? 'Заостанат долг' : 'Arrears'}:</span>
                          <span className="font-black text-[8px] pl-2">{Math.max(0, inv.beginningDebt - (inv.preJunePayment || 0))}</span>
                        </div>
                      </div>

                    </div>

                  </div>

                  {/* Right Column (Community Messages & Shaded Highlights - 35% width) */}
                  <div className="w-full md:w-[35%] print:w-[35%] flex flex-col bg-white border-l-0 md:border-l-[2.5px] print:border-l-[2.5px] border-black h-full justify-between">
                    
                    {/* Row 1: Announcements banner */}
                    <div className="bg-neutral-200 border-b-[2px] border-black p-1 text-center flex items-center justify-center min-h-[26px]">
                      <p className="text-[7.5px] font-black uppercase tracking-tight text-black leading-tight">
                        {lang === 'MK'
                          ? 'ИЗВЕСТУВАЊЕ ЗА АКТИВНОСТИ НА ЗАЕДНИЦАТА НА СОПСТВЕНИЦИ'
                          : 'COMMUNITY ACTIVITIES ANNOUNCEMENTS'}
                      </p>
                    </div>

                    {/* Row 2: Announcement text editing body */}
                    <div className="announcement-block p-1.5 text-black text-[7.5px] leading-snug flex-1 flex flex-col bg-white border-b-[2px] border-black text-left select-text whitespace-pre-wrap min-h-[100px] md:min-h-0">
                      <button
                        type="button"
                        onClick={insertAccountBalances}
                        className="print:hidden mb-2 bg-slate-900 hover:bg-emerald-600 border border-black text-white py-1 px-1.5 text-[6px] font-black uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer select-none transition-all w-full"
                        title={lang === 'MK' ? 'Вметни ја состојбата на сметките во ова поле' : 'Insert account balances into this field'}
                      >
                        <Landmark className="w-2.5 h-2.5" />
                        <span>{lang === 'MK' ? 'ВМЕТНИ СОСТОЈБА НА СМЕТКИ' : 'INSERT ACCOUNT BALANCES'}</span>
                      </button>
                      <textarea
                        id="invoice-custom-announcement"
                        value={announcement}
                        onChange={handleAnnouncementChange}
                        rows={6}
                        className="w-full h-full bg-transparent border-0 ring-0 focus:ring-0 focus:outline-hidden resize-none font-sans text-black text-[7.5px] leading-relaxed select-text print:hidden cursor-text"
                        placeholder={lang === 'MK' ? 'Внесете овде дополнително известување за сопствениците...' : 'Enter custom announcements here...'}
                      />
                      <div className="hidden print:block whitespace-pre-wrap w-full h-full text-black font-sans text-[7px] leading-relaxed select-text overflow-hidden font-normal">
                        {announcement}
                      </div>
                    </div>

                    {/* Row 3: Standalone Payment status text */}
                    <div className="status-block bg-white border-b-[2px] border-black p-1 text-center flex items-center justify-center min-h-[20px]">
                      <p className="font-black text-[7.5px] text-black uppercase tracking-tight">
                        {statusTitle}
                      </p>
                    </div>

                    {/* Row 4: Shaded bottom footer payment status details block */}
                    <div className="status-block bg-neutral-200 p-1.5 flex flex-col justify-center text-center font-mono text-black min-h-[28px] select-text">
                      <p className="text-[6.5px] leading-tight text-black font-extrabold border border-dashed border-black p-0.5 uppercase bg-white">
                        {statusDetail}
                      </p>
                    </div>

                  </div>
                </div>

                {/* Unpaid Monthly Debts History Table (3 Rows x 14 Columns) */}
                <div className="debts-history-print-table border-2 border-black text-black text-[7.5px] font-mono leading-tight bg-white overflow-hidden w-full select-text flex flex-col justify-between mt-4 md:mt-2 print:mt-0">
                  <table className="w-full text-center border-collapse h-full">
                    <thead>
                      <tr className="bg-slate-100 border-b-2 border-black text-[6.5px] font-black uppercase h-[4.1mm]">
                        <th className="p-0 border-r-2 border-black text-left pl-1.5 w-[22%] truncate font-sans font-extrabold text-black bg-slate-50">
                          {inv.owner}
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
                          const debtStr = getMonthlyDebt(inv.unitId, yearNum - 1, idx + 1, (inv as any).isD7Split ? (inv as any).d7SplitRatio : undefined);
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
                          {getYearTotal(inv.unitId, yearNum - 1, (inv as any).isD7Split ? (inv as any).d7SplitRatio : undefined) + getYearTotal(inv.unitId, yearNum, (inv as any).isD7Split ? (inv as any).d7SplitRatio : undefined)}
                        </td>
                      </tr>
                      <tr className="h-[4.1mm]">
                        <td className="p-0 border-r-2 border-black text-left pl-1.5 font-bold bg-amber-50/50 w-[22%]">
                          {yearNum}
                        </td>
                        {Array.from({ length: 12 }).map((_, idx) => {
                          const debtStr = getMonthlyDebt(inv.unitId, yearNum, idx + 1, (inv as any).isD7Split ? (inv as any).d7SplitRatio : undefined);
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
            </>
          );

            if (invoice.unitId === 'lokal-d7') {
              return (
                <div key={idx} className="print-page-single w-full mb-8 print:mb-0">
                  {pageContent}
                </div>
              );
            }

            return (
              <div key={idx} className="w-full h-auto md:h-full print:h-full flex flex-col justify-between">
                {pageContent}
              </div>
            );
          })}
        </div>

        {/* Email Status Notifications */}
        {emailStatus && (
          <div className="p-4 border-t-2 border-black bg-white print:hidden">
            {emailStatus.success ? (
              <div className="p-3 bg-emerald-50 border border-emerald-400 text-emerald-900 text-xs font-bold uppercase tracking-wider flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{lang === 'MK' ? `Сметката е успешно испратена на е-пошта!` : `Invoice sent successfully via Gmail!`}</span>
                </div>
                <button 
                  onClick={() => setEmailStatus(null)} 
                  className="p-1 text-emerald-700 hover:text-black font-black cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="p-3 bg-rose-50 border border-rose-400 text-rose-950 text-xs font-bold uppercase tracking-wider flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-rose-600 font-extrabold shrink-0">⚠️</span>
                  <span>{lang === 'MK' ? `Грешка при испраќање: ${emailStatus.error}` : `Failed to send email: ${emailStatus.error}`}</span>
                </div>
                <button 
                  onClick={() => setEmailStatus(null)} 
                  className="p-1 text-rose-700 hover:text-black font-black cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Modal Buttons (Hidden during print) */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 border-t-2 border-black bg-slate-50 print:hidden">
          {/* Gmail OAuth Integration Panel */}
          <div className="flex items-center space-x-2">
            {isAuthLoading ? (
              <div className="flex items-center space-x-2 text-stone-500 text-xs font-bold uppercase tracking-wider">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{lang === 'MK' ? 'Се вчитава автентикација...' : 'Loading authentication...'}</span>
              </div>
            ) : !user ? (
              <div className="flex flex-col space-y-1">
                <button
                  onClick={handleSignIn}
                  className="px-4 py-2.5 bg-white hover:bg-slate-100 text-black border-2 border-black text-[11px] font-black uppercase tracking-wider flex items-center space-x-2 transition-all cursor-pointer shadow-none"
                >
                  <Mail className="w-4 h-4 text-yellow-400" />
                  <span>{lang === 'MK' ? 'Најави се за испраќање со Gmail' : 'Sign in with Google for Gmail'}</span>
                </button>
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider pl-1">
                  {lang === 'MK' ? 'Препорачано: Најавете се со zsvich28@gmail.com' : 'Recommended: Log in with zsvich28@gmail.com'}
                </span>
              </div>
            ) : (
              invoice.unitId === 'lokal-d7' ? (
                <div className="flex flex-col space-y-3 w-full max-w-xl bg-white border-2 border-black p-4 shadow-sm">
                  <div className="flex items-center justify-between border-b border-stone-200 pb-2">
                    <span className="text-[11px] font-black uppercase tracking-wider text-black flex items-center space-x-1.5">
                      <Calculator className="w-4 h-4 text-yellow-500 shrink-0" />
                      <span>{lang === 'MK' ? 'СПЕЦИЈАЛЕН Д7 ПАНЕЛ ЗА СОПСТВЕНИЦИ' : 'SPECIAL D7 CO-OWNER DISPATCH'}</span>
                    </span>
                    <div className="flex items-center space-x-2">
                      <span className={`text-[9px] font-black uppercase tracking-wider truncate max-w-[150px] ${
                        user.email === 'zsvich28@gmail.com' ? 'text-emerald-600' : 'text-slate-500'
                      }`}>
                        {user.email}
                      </span>
                      <button
                        onClick={handleSignOut}
                        title={lang === 'MK' ? `Одјави се од ${user.email}` : `Sign out of ${user.email}`}
                        className="p-1 border border-black bg-white hover:bg-rose-100 text-stone-700 hover:text-black transition-all cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Co-owner Select Dropdown */}
                  <div>
                    <label className="block text-[9px] font-black uppercase text-slate-500 mb-1">
                      {lang === 'MK' ? 'Избери сопственик:' : 'Select Co-owner:'}
                    </label>
                    <select
                      value={selectedD7SplitNumber}
                      onChange={(e) => setSelectedD7SplitNumber(e.target.value)}
                      className="w-full text-xs font-bold uppercase tracking-wide border-2 border-black p-2 bg-yellow-50 focus:ring-0 focus:outline-hidden"
                    >
                      <option value="D7/1">D7/1 - УЈП Штип (Министерство за финансии)</option>
                      <option value="D7/2">D7/2 - Гроздан Петковски</option>
                      <option value="D7/3">D7/3 - Зоран Денковски</option>
                      <option value="D7/4">D7/4 - Михаил Тренчев</option>
                    </select>
                  </div>

                  {/* Email Inputs */}
                  <div>
                    <label className="block text-[9px] font-black uppercase text-slate-500 mb-1">
                      {selectedD7SplitNumber === 'D7/1'
                        ? (lang === 'MK' ? 'Е-пошти за УЈП (разделени со запирка):' : 'Emails for UJP (separated by comma):')
                        : (lang === 'MK' ? 'Е-пошта на сопственикот:' : 'Co-owner Email:')}
                    </label>
                    <input
                      type="text"
                      value={d7Emails[selectedD7SplitNumber]}
                      onChange={(e) => updateD7Email(selectedD7SplitNumber, e.target.value)}
                      placeholder={selectedD7SplitNumber === 'D7/1' ? "zsvich28@gmail.com, ujp@ujp.gov.mk" : "owner@example.com"}
                      className="w-full px-3 py-2 border-2 border-black font-mono font-bold text-xs focus:ring-0 focus:outline-hidden bg-stone-50"
                    />
                    {selectedD7SplitNumber === 'D7/1' && (
                      <span className="text-[9px] font-medium text-stone-500 block mt-1">
                        {lang === 'MK' ? 'Внесете повеќе е-пошти раздвоени со запирка за истовремено праќање' : 'Enter multiple comma-separated emails to send to all at once'}
                      </span>
                    )}
                  </div>

                  {/* File Upload / Drag & Drop Section */}
                  <div className="border-2 border-dashed border-stone-300 hover:border-black p-3 bg-stone-50 transition-all text-center relative min-h-[76px] flex flex-col justify-center">
                    {!scannedFiles[selectedD7SplitNumber] ? (
                      <>
                        <input
                          type="file"
                          id="d7-scanned-file-upload"
                          className="absolute inset-0 opacity-0 cursor-pointer z-10"
                          accept="application/pdf,image/*"
                          onChange={handleFileChange}
                        />
                        <div className="flex flex-col items-center space-y-1 relative z-0">
                          <UploadCloud className="w-6 h-6 text-stone-400" />
                          <span className="text-[10px] font-bold uppercase text-stone-600">
                            {lang === 'MK' ? 'Прикачи потпишана & скенирана сметка' : 'Upload signed & scanned invoice'}
                          </span>
                          <span className="text-[8px] font-medium text-stone-400">
                            {lang === 'MK' ? 'Поддржува PDF или слики' : 'Supports PDF or images'}
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center justify-between bg-stone-100 p-2 border border-stone-200 text-left relative z-10">
                        <div className="flex items-center space-x-2 truncate">
                          <FileText className="w-5 h-5 text-yellow-500 shrink-0" />
                          <div className="truncate">
                            <p className="text-[10px] font-black text-black truncate leading-tight">
                              {scannedFiles[selectedD7SplitNumber]?.filename}
                            </p>
                            <p className="text-[8px] font-mono text-slate-500 font-bold">
                              {scannedFiles[selectedD7SplitNumber] ? (scannedFiles[selectedD7SplitNumber]!.size / 1024).toFixed(1) : 0} KB
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            setScannedFiles(prev => ({
                              ...prev,
                              [selectedD7SplitNumber]: null
                            }));
                          }}
                          className="p-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-300 text-rose-600 hover:text-black transition-all cursor-pointer relative z-20"
                          title={lang === 'MK' ? 'Отстрани датотека' : 'Remove file'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Send Button */}
                  <button
                    onClick={handleSendCoOwnerEmail}
                    disabled={isSending || !d7Emails[selectedD7SplitNumber].trim()}
                    className="w-full py-2 bg-yellow-400 hover:bg-yellow-500 text-black border-2 border-black text-[11px] font-black uppercase tracking-wider flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-none disabled:opacity-50 disabled:pointer-events-none"
                  >
                    {isSending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>{lang === 'MK' ? 'СЕ ИСПРАЌА...' : 'SENDING...'}</span>
                      </>
                    ) : (
                      <>
                        <Mail className="w-4 h-4 shrink-0" />
                        <span>
                          {lang === 'MK' 
                            ? `ИСПРАТИ ФАКТУРА ${selectedD7SplitNumber} ПРЕКУ Е-ПОШТА` 
                            : `SEND INVOICE ${selectedD7SplitNumber} VIA EMAIL`}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <div className="flex flex-col space-y-1">
                    {!tenantEmail ? (
                      <span className="text-[10px] font-black uppercase text-rose-500 bg-rose-50 border border-rose-300 p-1.5 leading-none">
                        ⚠️ {lang === 'MK' ? 'Нема внесено е-пошта во Список' : 'No email set in Tenant List'}
                      </span>
                    ) : (
                      <button
                        onClick={() => {
                          setDestinationEmail(tenantEmail);
                          setShowConfirmModal(true);
                        }}
                        disabled={isSending}
                        className="px-4 py-2.5 bg-yellow-400 hover:bg-yellow-500 text-black border-2 border-black text-[11px] font-black uppercase tracking-wider flex items-center space-x-2 transition-all cursor-pointer shadow-none disabled:opacity-50"
                      >
                        <Mail className="w-4 h-4 shrink-0" />
                        <span>{lang === 'MK' ? 'Испрати по е-пошта' : 'Send via Email'}</span>
                      </button>
                    )}
                    <span className={`text-[9px] font-black uppercase tracking-wider pl-1 truncate max-w-[200px] ${
                      user.email === 'zsvich28@gmail.com' ? 'text-emerald-600' : 'text-slate-500'
                    }`}>
                      {lang === 'MK' ? `Испраќач: ${user.email}` : `Sender: ${user.email}`}
                    </span>
                  </div>
                  <button
                    onClick={handleSignOut}
                    title={lang === 'MK' ? `Одјави се од ${user.email}` : `Sign out of ${user.email}`}
                    className="p-2 border-2 border-black bg-white hover:bg-rose-100 text-stone-700 hover:text-black transition-all cursor-pointer self-start"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              )
            )}
          </div>

          {/* Standard Close & Print Actions */}
          <div className="flex items-center justify-end space-x-3">
            <button
              id="modal-close-cancel-btn"
              onClick={onClose}
              className="px-5 py-2.5 text-xs font-black uppercase tracking-widest text-black hover:bg-slate-200 transition-all cursor-pointer"
            >
              {t.closeBtn}
            </button>
            <button
              id="modal-print-invoice-btn"
              onClick={handlePrint}
              className="px-6 py-2.5 font-black uppercase tracking-widest text-white bg-black hover:bg-yellow-400 hover:text-black hover:border-black border border-black flex items-center space-x-1.5 transition-all cursor-pointer shadow-none"
            >
              <Printer className="w-4 h-4 shrink-0" />
              <span>{t.printBtn}</span>
            </button>
          </div>
        </div>

        {/* Custom Confirmation Modal Overlay */}
        {showConfirmModal && (
          <div className="absolute inset-0 bg-black/75 flex items-center justify-center p-6 z-50 print:hidden backdrop-blur-xs">
            <div className="bg-white border-4 border-black p-6 max-w-md w-full shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="absolute top-4 right-4 p-1 text-slate-400 hover:text-black cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
              
              <h3 className="text-sm font-black uppercase tracking-wider text-black mb-3 flex items-center space-x-2">
                <Mail className="w-4 h-4 text-yellow-400" />
                <span>{lang === 'MK' ? 'Потврди праќање е-пошта' : 'Confirm Invoice Email'}</span>
              </h3>
              
              <p className="text-xs text-slate-700 font-medium mb-4 leading-relaxed">
                {lang === 'MK'
                  ? `Дали сте сигурни дека сакате да ја испратите оваа сметка за месец ${monthName} на сопственикот ${invoice.owner}?`
                  : `Are you sure you want to send this invoice statement for ${monthName} to ${invoice.owner}?`}
              </p>

              <div className="mb-5">
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                  {lang === 'MK' ? 'Адреса за испорака:' : 'Recipient Email Address:'}
                </label>
                <input
                  type="email"
                  className="w-full px-3 py-2 border-2 border-black font-mono font-bold text-xs focus:ring-0 focus:outline-hidden bg-stone-50"
                  value={destinationEmail}
                  onChange={(e) => setDestinationEmail(e.target.value)}
                  placeholder="name@example.com"
                />
                {!isOptedIn && tenantEmail && (
                  <p className="text-[10px] text-rose-600 font-bold mt-1.5 uppercase tracking-wide">
                    ⚠️ {lang === 'MK' ? 'Забелешка: Станарот не е пријавен за е-известувања.' : 'Notice: This tenant has not opted-in for email billing.'}
                  </p>
                )}
              </div>

              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="px-4 py-2 border-2 border-black text-xs font-black uppercase tracking-wider text-black hover:bg-slate-100 transition-all cursor-pointer"
                >
                  {lang === 'MK' ? 'Откажи' : 'Cancel'}
                </button>
                <button
                  onClick={handleSendEmail}
                  disabled={!destinationEmail || isSending}
                  className="px-5 py-2.5 bg-black text-white hover:bg-yellow-400 hover:text-black hover:border-black border border-black text-xs font-black uppercase tracking-wider flex items-center space-x-2 transition-all cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
                >
                  {isSending ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>{lang === 'MK' ? 'Се испраќа...' : 'Sending...'}</span>
                    </>
                  ) : (
                    <>
                      <Mail className="w-3.5 h-3.5 shrink-0" />
                      <span>{lang === 'MK' ? 'Испрати сега' : 'Send Now'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
