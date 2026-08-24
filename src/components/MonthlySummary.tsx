import { useState, useEffect } from 'react';
import { CalculatedInvoice, Language, Unit, MonthlyVariables } from '../types';
import { 
  DollarSign, FileText, CheckCircle, AlertTriangle, Search, Filter, 
  ArrowRightLeft, FileSpreadsheet, Download, RefreshCw, Printer,
  Mail, Loader2, LogOut, Check, X, ShieldAlert, Send
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatDenarExact, formatDenar, formatMonthId } from '../utils';
import { initAuth, googleSignIn, logout } from '../auth';
import { sendInvoiceEmail } from '../gmailService';
import { User } from 'firebase/auth';

interface MonthlySummaryProps {
  invoices: CalculatedInvoice[];
  onUpdatePayment: (unitId: string, amount: number) => void;
  onBulkUpdatePayments: (updates: { unitId: string, amount: number }[]) => void;
  onSelectUnitInvoice: (invoice: CalculatedInvoice) => void;
  onSelectBulkPrint: () => void;
  lang: Language;
  onUpdatePreJunePayment?: (unitId: string, amount: number) => void;
  activeMonthId?: string;
  startingMonthId?: string;
  units?: Unit[];
  monthlyVariables?: MonthlyVariables;
  apartmentFixedRatePerM2?: number;
  storeFixedRatePerM2?: number;
  calculatedInvoicesByMonth?: Record<string, CalculatedInvoice[]>;
}

export default function MonthlySummary({
  invoices,
  onUpdatePayment,
  onBulkUpdatePayments,
  onSelectUnitInvoice,
  onSelectBulkPrint,
  lang,
  onUpdatePreJunePayment,
  activeMonthId = '',
  startingMonthId,
  units = [],
  monthlyVariables,
  apartmentFixedRatePerM2,
  storeFixedRatePerM2,
  calculatedInvoicesByMonth
}: MonthlySummaryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'unpaid' | 'paid'>('all');
  
  const [importText, setImportText] = useState('');
  const [showImport, setShowImport] = useState(false);
  
  // Track local edits to payments so typing is buttery-smooth, then update parent on blur or enter key
  const [localPayments, setLocalPayments] = useState<Record<string, string>>({});
  const [localPreJunePayments, setLocalPreJunePayments] = useState<Record<string, string>>({});

  // Authentication State
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessTokenState] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // Bulk Email State
  const [showBulkEmailModal, setShowBulkEmailModal] = useState(false);
  const [bulkSendingInProgress, setBulkSendingInProgress] = useState(false);
  const [sendingProgress, setSendingProgress] = useState<Array<{
    unitId: string;
    owner: string;
    unitNo: string;
    email: string;
    status: 'pending' | 'sending' | 'success' | 'failed';
    error?: string;
  }>>([]);

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

  // Find all opted-in invoices
  const optedInInvoices = invoices.filter(inv => {
    const unit = units.find(u => u.id === inv.unitId);
    return unit && unit.email && unit.emailOptIn;
  });

  const startBulkEmailFlow = () => {
    const initialProgress = optedInInvoices.map(inv => {
      const unit = units.find(u => u.id === inv.unitId)!;
      return {
        unitId: inv.unitId,
        owner: inv.owner,
        unitNo: inv.number,
        email: unit.email || '',
        status: 'pending' as const
      };
    });
    setSendingProgress(initialProgress);
    setShowBulkEmailModal(true);
  };

  const executeBulkSend = async () => {
    if (!accessToken) return;
    setBulkSendingInProgress(true);

    for (let i = 0; i < sendingProgress.length; i++) {
      const target = sendingProgress[i];
      if (target.status === 'success') continue; // Skip already sent if re-run
      
      // Update status to 'sending'
      setSendingProgress(prev => prev.map((item, idx) => idx === i ? { ...item, status: 'sending' } : item));

      // Find matching invoice
      const invoice = invoices.find(inv => inv.unitId === target.unitId);
      if (!invoice) {
        setSendingProgress(prev => prev.map((item, idx) => idx === i ? { ...item, status: 'failed', error: 'Invoice not found' } : item));
        continue;
      }

      // Small delay for UX and rate limiting
      await new Promise(resolve => setTimeout(resolve, 800));

      // Send the email
      const result = await sendInvoiceEmail({
        accessToken,
        toEmail: target.email,
        invoice,
        monthId: activeMonthId,
        lang,
        monthlyVariables,
        apartmentFixedRatePerM2,
        storeFixedRatePerM2,
        calculatedInvoicesByMonth
      });

      if (result.success) {
        setSendingProgress(prev => prev.map((item, idx) => idx === i ? { ...item, status: 'success' } : item));
      } else {
        setSendingProgress(prev => prev.map((item, idx) => idx === i ? { ...item, status: 'failed', error: result.error || 'Failed' } : item));
      }
    }

    setBulkSendingInProgress(false);
  };

  const isStartingMonth = activeMonthId === startingMonthId || activeMonthId === '2026-06';

  // Sync local payments when invoices change (e.g. when month switches)
  useEffect(() => {
    const freshPayments: Record<string, string> = {};
    const freshPrePayments: Record<string, string> = {};
    for (const inv of invoices) {
      freshPayments[inv.unitId] = inv.payment === 0 ? '' : inv.payment.toString();
      freshPrePayments[inv.unitId] = !inv.preJunePayment ? '' : inv.preJunePayment.toString();
    }
    setLocalPayments(freshPayments);
    setLocalPreJunePayments(freshPrePayments);
  }, [invoices]);

  const t = {
    EN: {
      searchPlaceholder: 'Search by tenant name or unit number...',
      totalBilled: 'Total Billed (This Month)',
      totalPaid: 'Total Paid (This Month)',
      totalOutstanding: 'Total Outstanding Debt at End',
      colUnit: 'Unit',
      colOwner: 'Owner',
      colFixed: 'Fixed',
      colVar: 'Variable',
      colMonthlyCharge: 'Billed',
      colPrevDebt: 'Old Debt',
      colPrePayment: 'Old Debt Paid',
      prePaymentPlaceholder: '0',
      colPayment: 'Payment (Input denars)',
      colBalance: 'Ending Debt',
      filterAll: 'All',
      filterUnpaid: 'Unpaid/Debtors',
      filterPaid: 'Fully Paid',
      actions: 'Invoice',
      paidLabel: 'Paid',
      unpaidLabel: 'Debt',
      printBtn: 'Print',
      paymentPlaceholder: '0',
      reconciled: 'Saved',
      printAllBtn: 'Save All as PDF',
      importBtn: 'Import from Excel',
      importTitle: 'Import Payments',
      importSubtitle: 'Paste data from Excel (Tenant name or Unit # [Tab] Payment amount)',
      importPlaceholder: 'Tenant Name\t1200\nUnit 5\t1500',
      importConfirm: 'Process Import',
      importCancel: 'Cancel',
      totalLabel: 'Total'
    },
    MK: {
      searchPlaceholder: 'Пребарај по име или број на објект...',
      totalBilled: 'Вкупно задолжено за месецот',
      totalPaid: 'Вкупно наплатено во месецот',
      totalOutstanding: 'Вкупен заостанат долг на крајот',
      colUnit: 'Објект',
      colOwner: 'Сопственик',
      colFixed: 'Фиксно',
      colVar: 'Варијабилно',
      colMonthlyCharge: 'Задолжување',
      colPrevDebt: 'Стар долг',
      colPrePayment: 'Уплатено за стар долг',
      prePaymentPlaceholder: '0',
      colPayment: 'Уплати (Внеси во денари)',
      colBalance: 'Краен долг',
      filterAll: 'Сите',
      filterUnpaid: 'Само должници',
      filterPaid: 'Исплатени',
      actions: 'Фактура',
      paidLabel: 'Исплатено',
      unpaidLabel: 'Долг',
      printBtn: 'Печати',
      paymentPlaceholder: '0',
      reconciled: 'Зачувано',
      printAllBtn: 'Зачувај сите како PDF',
      importBtn: 'Увези од Excel',
      importTitle: 'Увези уплати',
      importSubtitle: 'Залепете податоци од Excel (Име или број на објект [Tab] сума на уплата)',
      importPlaceholder: 'Име на сопственик\t1200\nОбјект 5\t1500',
      importConfirm: 'Процесирај увоз',
      importCancel: 'Откажи',
      totalLabel: 'Вкупно'
    }
  }[lang];

  // Calculations for summary boxes
  const totalBilledThisMonth = invoices.reduce((sum, item) => sum + item.totalMonthlyCharge, 0);
  const totalPaymentsReceived = invoices.reduce((sum, item) => sum + item.payment, 0);
  const totalOutstandingEndingDebt = invoices.reduce((sum, item) => sum + item.endingDebt, 0);

  // Filter calculations
  const filteredInvoiceList = invoices.filter((inv) => {
    const matchesSearch = 
      inv.owner.toLowerCase().includes(searchQuery.toLowerCase()) || 
      inv.number.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;
    
    if (filterType === 'unpaid') {
      return inv.endingDebt > 0;
    }
    if (filterType === 'paid') {
      return inv.endingDebt <= 0;
    }
    return true;
  });

  // Sums for table footer
  const sumFilteredFixed = filteredInvoiceList.reduce((sum, item) => sum + item.fixedCharge, 0);
  const sumFilteredVar = filteredInvoiceList.reduce((sum, item) => sum + item.totalVariable, 0);
  const sumFilteredBilled = filteredInvoiceList.reduce((sum, item) => sum + item.totalMonthlyCharge, 0);
  const sumFilteredPrev = filteredInvoiceList.reduce((sum, item) => sum + item.beginningDebt, 0);
  const sumFilteredPrePayment = filteredInvoiceList.reduce((sum, item) => sum + (item.preJunePayment || 0), 0);
  const sumFilteredPayment = filteredInvoiceList.reduce((sum, item) => sum + item.payment, 0);
  const sumFilteredEnding = filteredInvoiceList.reduce((sum, item) => sum + item.endingDebt, 0);

  const handleLocalPaymentChange = (unitId: string, val: string) => {
    setLocalPayments(prev => ({
      ...prev,
      [unitId]: val
    }));
  };

  const handleCommitPayment = (unitId: string) => {
    const originalVal = invoices.find(inv => inv.unitId === unitId)?.payment || 0;
    const strVal = localPayments[unitId] || '';
    const numVal = parseFloat(strVal);
    const finalVal = isNaN(numVal) || numVal < 0 ? 0 : numVal;
    
    // Only dispatch update if it actually changed
    if (finalVal !== originalVal) {
      onUpdatePayment(unitId, finalVal);
    }
  };

  const handleLocalPrePaymentChange = (unitId: string, val: string) => {
    setLocalPreJunePayments(prev => ({
      ...prev,
      [unitId]: val
    }));
  };

  const handleCommitPrePayment = (unitId: string) => {
    const originalPreVal = invoices.find(inv => inv.unitId === unitId)?.preJunePayment || 0;
    const strVal = localPreJunePayments[unitId] || '';
    const numVal = parseFloat(strVal);
    const finalVal = isNaN(numVal) || numVal < 0 ? 0 : numVal;

    if (finalVal !== originalPreVal && onUpdatePreJunePayment) {
      onUpdatePreJunePayment(unitId, finalVal);
    }
  };

  const handleImport = () => {
    const lines = importText.split('\n');
    const updates: { unitId: string, amount: number }[] = [];
    const usedUnitIds = new Set<string>();

    lines.forEach(line => {
      const parts = line.split('\t');
      if (parts.length >= 2) {
        const identifier = parts[0].trim();
        const paymentStr = parts[1].trim();
        const payment = parseFloat(paymentStr);

        if (!isNaN(payment)) {
          // Try to match by Unit Number first:
          // 1. Try to find unmatched invoice matching unit number
          let invoice = invoices.find(inv => inv.number.trim().toLowerCase() === identifier.toLowerCase() && !usedUnitIds.has(inv.unitId));
          if (!invoice) {
            // Fallback: search by number even if already matched
            invoice = invoices.find(inv => inv.number.trim().toLowerCase() === identifier.toLowerCase());
          }

          if (!invoice) {
            // 2. Try to find unmatched invoice matching owner name
            invoice = invoices.find(inv => inv.owner.trim().toLowerCase() === identifier.toLowerCase() && !usedUnitIds.has(inv.unitId));
          }
          if (!invoice) {
            // Fallback: search by owner name even if already matched
            invoice = invoices.find(inv => inv.owner.trim().toLowerCase() === identifier.toLowerCase());
          }

          if (invoice) {
            updates.push({ unitId: invoice.unitId, amount: payment });
            usedUnitIds.add(invoice.unitId);
          }
        }
      }
    });

    if (updates.length > 0) {
      onBulkUpdatePayments(updates);
    }

    setImportText('');
    setShowImport(false);
  };

  return (
    <div className="space-y-6" id="monthly-summary-section">
      {/* Overview Analytics Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-black text-white p-6 border-b-8 border-blue-600 flex items-center space-x-4">
          <div className="p-3 bg-white/10 text-white">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t.totalBilled}</p>
            <p className="text-2xl md:text-3xl font-black font-mono tracking-tight mt-0.5">{formatDenarExact(totalBilledThisMonth, lang)}</p>
          </div>
        </div>

        <div className="bg-black text-white p-6 border-b-8 border-emerald-500 flex items-center space-x-4">
          <div className="p-3 bg-white/10 text-white">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t.totalPaid}</p>
            <p className="text-2xl md:text-3xl font-black font-mono tracking-tight mt-0.5">{formatDenarExact(totalPaymentsReceived, lang)}</p>
          </div>
        </div>

        <div className="bg-black text-white p-6 border-b-8 border-rose-500 flex items-center space-x-4">
          <div className="p-3 bg-white/10 text-white">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t.totalOutstanding}</p>
            <p className="text-2xl md:text-3xl font-black font-mono tracking-tight mt-0.5">{formatDenarExact(totalOutstandingEndingDebt, lang)}</p>
          </div>
        </div>
      </div>

      {/* Gmail Invoice Bulk Delivery Panel */}
      <div className="bg-white p-6 border-2 border-black flex flex-col md:flex-row md:items-center justify-between gap-6 print:hidden" id="gmail-bulk-delivery-panel">
        <div className="flex items-start space-x-3.5">
          <div className="p-2.5 bg-yellow-400 text-black border-2 border-black shrink-0">
            <Mail className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-black">
              {lang === 'MK' ? 'Испорака на сметки преку Gmail' : 'Gmail Invoice Billing Panel'}
            </h3>
            {isAuthLoading ? (
              <div className="flex items-center space-x-2 text-stone-500 text-xs font-bold uppercase tracking-wider mt-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-black" />
                <span>{lang === 'MK' ? 'Се проверува најавата...' : 'Checking connection status...'}</span>
              </div>
            ) : !user ? (
              <div className="mt-1.5">
                <p className="text-xs text-stone-600 font-medium leading-relaxed">
                  {lang === 'MK' 
                    ? 'Поврзете го вашиот кориснички профил на Google за да ги испратите сите активни сметки до пријавените сопственици со еден клик.' 
                    : 'Connect your Google account to automatically deliver monthly invoices to all opted-in tenants.'}
                </p>
                <p className="text-[10px] text-indigo-600 font-black uppercase tracking-wider mt-1">
                  ⚠️ {lang === 'MK' ? 'Препорачано: Најавете се со zsvich28@gmail.com' : 'Recommended: sign in with zsvich28@gmail.com'}
                </p>
              </div>
            ) : (
              <div className="mt-1.5 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-stone-800 font-medium">
                    {lang === 'MK' ? 'Најавени сте како:' : 'Connected as:'}{' '}
                    <span className="font-mono font-bold text-black bg-stone-100 px-1.5 py-0.5 border border-stone-300 rounded-xs">
                      {user.email}
                    </span>
                  </span>
                  {user.email !== 'zsvich28@gmail.com' && (
                    <span className="text-[9px] font-black uppercase tracking-wider text-rose-600 bg-rose-50 border border-rose-200 px-1.5 py-0.5">
                      ⚠️ {lang === 'MK' ? 'Не е zsvich28@gmail.com' : 'Not zsvich28@gmail.com'}
                    </span>
                  )}
                </div>
                <p className="text-xs text-stone-500 font-medium">
                  {lang === 'MK'
                    ? `Пронајдени се ${optedInInvoices.length} сопственици кои се пријавени за известување по е-пошта за месецот ${formatMonthId(activeMonthId, lang)}.`
                    : `Found ${optedInInvoices.length} opted-in tenants with registered emails for ${formatMonthId(activeMonthId, lang)}.`}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 self-stretch md:self-auto justify-end">
          {!isAuthLoading && !user && (
            <button
              onClick={handleSignIn}
              className="px-5 py-3 bg-white hover:bg-slate-100 text-black border-2 border-black text-xs font-black uppercase tracking-widest flex items-center space-x-2 transition-all cursor-pointer shadow-none w-full md:w-auto justify-center"
            >
              <Mail className="w-4 h-4 text-yellow-400" />
              <span>{lang === 'MK' ? 'Најави се со Google' : 'Sign in with Google'}</span>
            </button>
          )}

          {!isAuthLoading && user && (
            <div className="flex items-center gap-2 w-full md:w-auto">
              {optedInInvoices.length > 0 ? (
                <button
                  onClick={startBulkEmailFlow}
                  className="px-5 py-3 bg-yellow-400 hover:bg-yellow-500 text-black border-2 border-black text-xs font-black uppercase tracking-widest flex items-center space-x-2 transition-all cursor-pointer shadow-none w-full md:w-auto justify-center"
                >
                  <Send className="w-4 h-4" />
                  <span>
                    {lang === 'MK' 
                      ? `Испрати до сите (${optedInInvoices.length})` 
                      : `Send to All (${optedInInvoices.length})`}
                  </span>
                </button>
              ) : (
                <div className="text-[10px] text-stone-500 font-bold uppercase tracking-wider p-2 bg-stone-50 border border-stone-200 text-center w-full">
                  ❌ {lang === 'MK' ? 'Нема пријавени сопственици за е-пошта' : 'No opted-in tenants'}
                </div>
              )}
              <button
                onClick={handleSignOut}
                title={lang === 'MK' ? 'Одјави се од Google' : 'Sign out of Google'}
                className="p-3 border-2 border-black bg-white hover:bg-rose-100 text-stone-700 hover:text-black transition-all cursor-pointer shrink-0"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Bulk Email Sending Progress Modal */}
      {showBulkEmailModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 print:hidden backdrop-blur-xs">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white border-4 border-black max-w-2xl w-full shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="p-6 border-b-4 border-black bg-slate-50 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Mail className="w-5 h-5 text-yellow-400" />
                <h3 className="text-lg font-black uppercase tracking-tight">
                  {lang === 'MK' ? 'Групно испраќање сметки преку Gmail' : 'Bulk Gmail Invoice Delivery'}
                </h3>
              </div>
              <button
                onClick={() => !bulkSendingInProgress && setShowBulkEmailModal(false)}
                disabled={bulkSendingInProgress}
                className="p-1 text-slate-400 hover:text-black cursor-pointer disabled:opacity-30 disabled:pointer-events-none"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Batch summary card */}
            <div className="p-6 bg-stone-50 border-b-2 border-black grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-3 bg-white border border-stone-300">
                <p className="text-[9px] text-stone-500 font-bold uppercase tracking-widest">{lang === 'MK' ? 'Вкупно' : 'Total Recipients'}</p>
                <p className="text-xl font-black font-mono mt-0.5">{sendingProgress.length}</p>
              </div>
              <div className="p-3 bg-white border border-stone-300">
                <p className="text-[9px] text-stone-500 font-bold uppercase tracking-widest">{lang === 'MK' ? 'Успешно' : 'Sent Successfully'}</p>
                <p className="text-xl font-black font-mono text-emerald-600 mt-0.5">
                  {sendingProgress.filter(p => p.status === 'success').length}
                </p>
              </div>
              <div className="p-3 bg-white border border-stone-300">
                <p className="text-[9px] text-stone-500 font-bold uppercase tracking-widest">{lang === 'MK' ? 'Грешки' : 'Failures'}</p>
                <p className="text-xl font-black font-mono text-rose-600 mt-0.5">
                  {sendingProgress.filter(p => p.status === 'failed').length}
                </p>
              </div>
              <div className="p-3 bg-white border border-stone-300">
                <p className="text-[9px] text-stone-500 font-bold uppercase tracking-widest">{lang === 'MK' ? 'Преостанати' : 'Remaining'}</p>
                <p className="text-xl font-black font-mono text-slate-500 mt-0.5">
                  {sendingProgress.filter(p => p.status === 'pending').length}
                </p>
              </div>
            </div>

            {/* List scroll area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {sendingProgress.map((prog) => (
                <div 
                  key={prog.unitId} 
                  className={`p-3 border-2 border-black flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 transition-all ${
                    prog.status === 'sending' ? 'bg-yellow-50 border-yellow-500 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' :
                    prog.status === 'success' ? 'bg-emerald-50 border-emerald-500 opacity-90' :
                    prog.status === 'failed' ? 'bg-rose-50 border-rose-500' : 'bg-white'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase px-1.5 py-0.5 bg-black text-white leading-none">
                        {prog.unitNo}
                      </span>
                      <span className="text-xs font-black text-black">{prog.owner}</span>
                    </div>
                    <p className="text-[11px] font-mono text-slate-500 mt-1">{prog.email}</p>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    {prog.status === 'pending' && (
                      <span className="text-[10px] font-black uppercase text-stone-400 bg-stone-100 border border-stone-200 px-2 py-1 leading-none">
                        {lang === 'MK' ? 'На чекање' : 'Pending'}
                      </span>
                    )}
                    {prog.status === 'sending' && (
                      <span className="text-[10px] font-black uppercase text-yellow-800 bg-yellow-100 border border-yellow-300 px-2 py-1 leading-none flex items-center space-x-1.5">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-yellow-600" />
                        <span>{lang === 'MK' ? 'Се испраќа...' : 'Sending...'}</span>
                      </span>
                    )}
                    {prog.status === 'success' && (
                      <span className="text-[10px] font-black uppercase text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-1 leading-none flex items-center space-x-1">
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>{lang === 'MK' ? 'Успешно' : 'Sent'}</span>
                      </span>
                    )}
                    {prog.status === 'failed' && (
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] font-black uppercase text-rose-800 bg-rose-100 border border-rose-300 px-2 py-1 leading-none">
                          {lang === 'MK' ? 'Грешка' : 'Failed'}
                        </span>
                        {prog.error && (
                          <span className="text-[9px] font-bold text-rose-600 mt-0.5 block max-w-[150px] truncate" title={prog.error}>
                            {prog.error}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="p-6 border-t-4 border-black bg-stone-50 flex items-center justify-between">
              <button
                onClick={() => setShowBulkEmailModal(false)}
                disabled={bulkSendingInProgress}
                className="px-6 py-3 border-2 border-black font-black uppercase text-xs tracking-wider text-black hover:bg-slate-100 disabled:opacity-40"
              >
                {lang === 'MK' ? 'Затвори' : 'Close'}
              </button>

              {sendingProgress.some(p => p.status === 'pending' || p.status === 'failed') ? (
                <button
                  onClick={executeBulkSend}
                  disabled={bulkSendingInProgress || !accessToken}
                  className="px-6 py-3 bg-yellow-400 hover:bg-yellow-500 text-black border-2 border-black font-black uppercase text-xs tracking-widest flex items-center space-x-2 transition-all disabled:opacity-50"
                >
                  {bulkSendingInProgress ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{lang === 'MK' ? 'Испраќање...' : 'Sending...'}</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>
                        {sendingProgress.some(p => p.status === 'failed') 
                          ? (lang === 'MK' ? 'Испрати ги повторно неуспешните' : 'Retry Failed')
                          : (lang === 'MK' ? 'Испрати сега' : 'Start Sending Now')}
                      </span>
                    </>
                  )}
                </button>
              ) : (
                <div className="p-3 bg-emerald-100 text-emerald-900 border border-emerald-400 text-xs font-black uppercase tracking-wider flex items-center space-x-1.5">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>{lang === 'MK' ? 'Сите сметки се испратени!' : 'All invoices delivered!'}</span>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* Grid Controls */}
      <div className="bg-white p-6 border-2 border-black flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-black w-5 h-5" />
          <input
            id="summary-search"
            type="text"
            placeholder={t.searchPlaceholder}
            className="w-full pl-11 pr-4 py-3 border-2 border-black bg-white focus:outline-hidden focus:ring-0 text-xs font-bold font-mono uppercase text-black placeholder-slate-400"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Filters and Batch Actions */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5">
          <div className="flex bg-slate-200 p-1 border-2 border-black self-start sm:self-auto">
            <button
              id="summary-all-btn"
              onClick={() => setFilterType('all')}
              className={`px-4 py-2 font-black uppercase text-xs tracking-widest transition-all ${
                filterType === 'all'
                  ? 'bg-black text-white shadow-none'
                  : 'text-black hover:bg-slate-300'
              }`}
            >
              {t.filterAll} ({invoices.length})
            </button>
            <button
              id="summary-unpaid-btn"
              onClick={() => setFilterType('unpaid')}
              className={`px-4 py-2 font-black uppercase text-xs tracking-widest transition-all flex items-center space-x-1 ${
                filterType === 'unpaid'
                  ? 'bg-rose-600 text-white shadow-none'
                  : 'text-black hover:bg-slate-300'
              }`}
            >
              <span>{t.filterUnpaid}</span>
              <span className="ml-1.5 bg-black text-white rounded-none px-1.5 py-0.2 text-[9px] font-mono leading-none">
                {invoices.filter(i => i.endingDebt > 0).length}
              </span>
            </button>
            <button
              id="summary-paid-btn"
              onClick={() => setFilterType('paid')}
              className={`px-4 py-2 font-black uppercase text-xs tracking-widest transition-all ${
                filterType === 'paid'
                  ? 'bg-emerald-600 text-white shadow-none'
                  : 'text-black hover:bg-slate-300'
              }`}
            >
              {t.filterPaid}
            </button>
          </div>

          <button
            id="bulk-print-trigger-dashboard-btn"
            onClick={onSelectBulkPrint}
            className="px-5 py-3 font-black uppercase text-xs tracking-widest text-white bg-black hover:bg-yellow-400 hover:text-black hover:border-black border-2 border-black transition-all flex items-center justify-center space-x-2 cursor-pointer shrink-0"
          >
            <Printer className="w-4 h-4 shrink-0 text-yellow-400 print:hidden" />
            <span>{t.printAllBtn}</span>
          </button>

          <button
            onClick={() => setShowImport(true)}
            className="px-5 py-3 font-black uppercase text-xs tracking-widest text-black bg-white border-2 border-dashed border-black hover:bg-slate-50 transition-all flex items-center justify-center space-x-2 cursor-pointer shrink-0"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>{t.importBtn}</span>
          </button>
        </div>
      </div>

      {/* Import Modal */}
      {showImport && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white border-4 border-black p-8 max-w-2xl w-full shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]"
          >
            <h3 className="text-xl font-black uppercase tracking-tight mb-2">{t.importTitle}</h3>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-6">{t.importSubtitle}</p>
            
            <textarea
              className="w-full h-64 border-2 border-black p-4 font-mono text-xs focus:outline-hidden mb-6 placeholder:text-slate-300"
              placeholder={t.importPlaceholder}
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
            />
            
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setShowImport(false)}
                className="px-6 py-3 font-black uppercase text-xs tracking-widest text-black border-2 border-black hover:bg-slate-100"
              >
                {t.importCancel}
              </button>
              <button
                onClick={handleImport}
                disabled={!importText.trim()}
                className="px-6 py-3 font-black uppercase text-xs tracking-widest text-white bg-emerald-600 border-2 border-black hover:bg-emerald-700 disabled:opacity-50"
              >
                {t.importConfirm}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Spreadsheet grid */}
      <div className="bg-white border-2 border-black overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse" id="invoices-summary-table">
            <thead>
              <tr className="bg-slate-100 border-b-2 border-black text-black font-black text-xs uppercase tracking-widest">
                <th className="py-4 px-4 text-center w-16">{t.colUnit}</th>
                <th className="py-4 px-4 w-48">{t.colOwner}</th>
                <th className="py-4 px-4 text-right w-24">{t.colFixed}</th>
                <th className="py-4 px-4 text-right w-24">{t.colVar}</th>
                <th className="py-4 px-4 text-right bg-blue-50 text-black w-28">{t.colMonthlyCharge}</th>
                <th className="py-4 px-4 text-right text-black w-28">{t.colPrevDebt}</th>
                {isStartingMonth && (
                  <th className="py-4 px-4 text-center text-rose-800 bg-rose-50/70 w-36 uppercase">{t.colPrePayment}</th>
                )}
                <th className="py-4 px-4 text-center text-black bg-yellow-50 w-36">{t.colPayment}</th>
                <th className="py-4 px-4 text-right w-28">{t.colBalance}</th>
                <th className="py-4 px-4 text-center w-24">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs text-black">
              {filteredInvoiceList.length === 0 ? (
                <tr>
                  <td colSpan={isStartingMonth ? 10 : 9} className="py-12 text-center text-slate-500 font-bold uppercase tracking-wider">
                    <div className="flex flex-col items-center justify-center space-y-2">
                       <AlertTriangle className="w-8 h-8 text-black" />
                       <p>{t.searchPlaceholder}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredInvoiceList.map((inv) => {
                  const isApartment = inv.type === 'apartment';
                  const isPaid = inv.endingDebt <= 0;
                  const currentLocalPay = localPayments[inv.unitId] ?? '';

                  return (
                    <tr key={inv.unitId} className="hover:bg-slate-100 transition-all font-mono">
                      {/* Unit No. */}
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-block px-2.5 py-1 text-[11px] font-black border border-black ${
                          isApartment 
                            ? 'bg-blue-200 text-black' 
                            : 'bg-amber-300 text-black font-mono italic'
                        }`}>
                          {inv.number}
                        </span>
                      </td>

                      {/* Owner */}
                      <td className="py-3 px-4 font-sans font-bold text-black truncate max-w-[170px]" title={inv.owner}>
                        {inv.owner}
                      </td>

                      {/* Fixed */}
                      <td className="py-3 px-4 text-right font-mono text-slate-600">
                        {inv.fixedCharge}
                      </td>

                      {/* Variable */}
                      <td className="py-3 px-4 text-right font-mono text-slate-600" title={`Електрична: ${inv.electricityCharge} лифт: ${inv.elevatorCharge} хигиена: ${inv.cleaningCharge} сметкод: ${inv.accountingCharge}`}>
                        {inv.totalVariable}
                      </td>

                      {/* Total Month Billed */}
                      <td className="py-3 px-4 text-right font-mono font-black bg-blue-50/50 text-black">
                        {inv.totalMonthlyCharge}
                      </td>

                      {/* Prev Debt */}
                      <td className={`py-3 px-4 text-right font-mono font-bold ${
                        inv.beginningDebt > 0 ? 'text-rose-600' : inv.beginningDebt < 0 ? 'text-emerald-600 font-bold' : 'text-slate-400'
                      }`}>
                        {Math.round(inv.beginningDebt)}
                      </td>

                      {/* Prev Debt Payment input cell (Only shown for first month) */}
                      {isStartingMonth && (
                        <td className="py-1 px-3 bg-rose-50/30 text-center">
                          <input
                            id={`pre-payment-input-${inv.unitId}`}
                            type="number"
                            min="0"
                            placeholder={t.prePaymentPlaceholder}
                            className="w-full px-2.5 py-1.5 text-center font-mono font-bold text-rose-800 bg-white border-2 border-dashed border-rose-300 focus:border-rose-700 focus:border-solid rounded-none outline-none"
                            value={localPreJunePayments[inv.unitId] ?? ''}
                            onChange={(e) => handleLocalPrePaymentChange(inv.unitId, e.target.value)}
                            onBlur={() => handleCommitPrePayment(inv.unitId)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleCommitPrePayment(inv.unitId);
                                (e.target as HTMLInputElement).blur();
                              }
                            }}
                          />
                        </td>
                      )}

                      {/* Payments editable cell */}
                      <td className="py-1 px-3 bg-yellow-50/35 text-center">
                        <input
                          id={`payment-input-${inv.unitId}`}
                          type="number"
                          min="0"
                          placeholder={t.paymentPlaceholder}
                          className="w-full px-2.5 py-1.5 text-center font-mono font-black text-black bg-white border-2 border-dashed border-slate-350 focus:border-black focus:border-solid rounded-none outline-none"
                          value={currentLocalPay}
                          onChange={(e) => handleLocalPaymentChange(inv.unitId, e.target.value)}
                          onBlur={() => handleCommitPayment(inv.unitId)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleCommitPayment(inv.unitId);
                              (e.target as HTMLInputElement).blur();
                            }
                          }}
                        />
                      </td>

                      {/* Total Ending Balance */}
                      <td className={`py-3 px-4 text-right font-mono font-black ${
                        isPaid 
                          ? inv.endingDebt < 0 ? 'text-blue-700 bg-blue-105/10 font-black' : 'text-emerald-700 bg-emerald-100/50 font-black' 
                          : 'text-rose-700 bg-rose-100/40'
                      }`}>
                        {Math.round(inv.endingDebt)}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-center border-l border-slate-200">
                        <button
                          id={`invoice-print-btn-${inv.unitId}`}
                          onClick={() => onSelectUnitInvoice(inv)}
                          className="px-3 py-1.5 text-[11px] font-black uppercase tracking-widest text-white bg-black hover:bg-yellow-400 hover:text-black hover:border-black border border-black transition-all flex items-center justify-center space-x-1 mx-auto cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5 shrink-0" />
                          <span>{t.printBtn}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100 border-t-4 border-b-2 border-black font-black text-xs text-black uppercase tracking-wider font-mono">
                <td className="py-4 px-4 text-center border-r border-slate-300">
                  {filteredInvoiceList.length}
                </td>
                <td className="py-4 px-4 font-sans font-black tracking-wide border-r border-slate-300">
                  {t.totalLabel}
                </td>
                <td className="py-4 px-4 text-right border-r border-slate-300">
                  {formatDenarExact(Math.round(sumFilteredFixed), lang)}
                </td>
                <td className="py-4 px-4 text-right border-r border-slate-300">
                  {formatDenarExact(Math.round(sumFilteredVar), lang)}
                </td>
                <td className="py-4 px-4 text-right bg-blue-100/60 font-black border-r border-slate-300 text-blue-900">
                  {formatDenarExact(Math.round(sumFilteredBilled), lang)}
                </td>
                <td className={`py-4 px-4 text-right border-r border-slate-300 ${
                  sumFilteredPrev > 0 ? 'text-rose-700' : sumFilteredPrev < 0 ? 'text-emerald-700' : 'text-slate-500'
                }`}>
                  {formatDenarExact(Math.round(sumFilteredPrev), lang)}
                </td>
                {isStartingMonth && (
                  <td className="py-4 px-4 text-center bg-rose-100/60 font-black border-r border-slate-300 text-rose-900 font-mono">
                    {formatDenarExact(Math.round(sumFilteredPrePayment), lang)}
                  </td>
                )}
                <td className="py-4 px-4 text-center bg-yellow-105/90 font-black border-r border-slate-300 text-amber-900">
                  {formatDenarExact(Math.round(sumFilteredPayment), lang)}
                </td>
                <td className={`py-4 px-4 text-right border-r border-slate-300 ${
                  sumFilteredEnding > 0 ? 'text-rose-700 bg-rose-100/30' : 'text-emerald-700 bg-emerald-100/30'
                }`}>
                  {formatDenarExact(Math.round(sumFilteredEnding), lang)}
                </td>
                <td className="py-4 px-4 bg-slate-100 text-center">
                  {/* Empty space under actions */}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
