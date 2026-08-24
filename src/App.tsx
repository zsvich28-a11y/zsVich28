import { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { Unit, MonthlyVariables, MonthRecord, CalculatedInvoice, Language, Expense } from './types';
import { INITIAL_UNITS, INITIAL_STARTING_DEBTS } from './data';
import { calculateChronologicalInvoices, generateMonthList, formatMonthId, formatDenarExact } from './utils';
import TenantList from './components/TenantList';
import InvoiceInputForm from './components/InvoiceInputForm';
import MonthlySummary from './components/MonthlySummary';
import InvoiceDetail from './components/InvoiceDetail';
import AllInvoicesPrint from './components/AllInvoicesPrint';
import Reports from './components/Reports';
import AccountBalance from './components/AccountBalance';
import ExpenseTracker from './components/ExpenseTracker';
import TMobileInvoices from './components/TMobileInvoices';
import DebtorList from './components/DebtorList';
import TenantDebtPrint from './components/TenantDebtPrint';
import FullDebtorsPrint, { DebtorSummaryItem } from './components/FullDebtorsPrint';
import PublicPortal from './components/PublicPortal';
import PortalAdmin from './components/PortalAdmin';
import { DEFAULT_ANNOUNCEMENTS, DEFAULT_FUTURE_PLANS, DEFAULT_EMERGENCY_CONTACTS, DEFAULT_POLLS, generateUnitPin, generatePollPinsForUnits } from './portalDefaults';
import { Announcement, FuturePlan, EmergencyContact, ReportedIssue, Poll, UnitPin } from './types';
import { 
  Building, Calendar, Languages, ClipboardList, Coins, Landmark, 
  HelpCircle, Settings, ArrowRight, ShieldCheck, Mail, Printer,
  Receipt, Archive, Upload, Download, Trash2, Check, AlertTriangle,
  Globe, Lock, Key, X, Wrench, Shield
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [lang, setLang] = useState<Language>('MK');
  const [activeTab, setActiveTab] = useState<'summary' | 'inputs' | 'tenants' | 'reports' | 'balance' | 'spending' | 'tmobile' | 'debtors' | 'portal'>('summary');
  
  // View mode: 'public' (Resident Public Portal) vs 'admin' (Management Dashboard)
  // ALWAYS default to 'public' for any new visitor/device/session.
  // Admin authentication is preserved per-tab/browser session via sessionStorage.
  const [viewMode, setViewMode] = useState<'public' | 'admin'>(() => {
    try {
      const sessionSaved = sessionStorage.getItem('houseman_viewMode');
      if (sessionSaved === 'admin') return 'admin';
    } catch (e) { /* ignore */ }
    return 'public';
  });

  const [adminPin, setAdminPin] = useState<string>(() => {
    return localStorage.getItem('houseman_adminPin') || '2828';
  });

  const [showPinModal, setShowPinModal] = useState<boolean>(false);
  const [enteredPin, setEnteredPin] = useState<string>('');
  const [pinError, setPinError] = useState<string>('');

  // Portal State
  const [announcements, setAnnouncements] = useState<Announcement[]>(() => {
    const saved = localStorage.getItem('houseman_announcements');
    if (saved) { try { return JSON.parse(saved); } catch (e) { /* ignore */ } }
    return DEFAULT_ANNOUNCEMENTS;
  });

  const [futurePlans, setFuturePlans] = useState<FuturePlan[]>(() => {
    const saved = localStorage.getItem('houseman_futurePlans');
    if (saved) { try { return JSON.parse(saved); } catch (e) { /* ignore */ } }
    return DEFAULT_FUTURE_PLANS;
  });

  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>(() => {
    const saved = localStorage.getItem('houseman_emergencyContacts');
    if (saved) { try { return JSON.parse(saved); } catch (e) { /* ignore */ } }
    return DEFAULT_EMERGENCY_CONTACTS;
  });

  const [reportedIssues, setReportedIssues] = useState<ReportedIssue[]>(() => {
    const saved = localStorage.getItem('houseman_reportedIssues');
    if (saved) { try { return JSON.parse(saved); } catch (e) { /* ignore */ } }
    return [];
  });

  const [polls, setPolls] = useState<Poll[]>(() => {
    const saved = localStorage.getItem('houseman_polls');
    let loaded: Poll[] = DEFAULT_POLLS;
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) loaded = parsed;
      } catch (e) { /* ignore */ }
    }
    const allUnitNums = INITIAL_UNITS.map(u => u.number);
    return loaded.map(p => {
      if (p.pins && Object.keys(p.pins).length >= 70) return p;
      return {
        ...p,
        pins: generatePollPinsForUnits(p.id, allUnitNums)
      };
    });
  });

  const sanitizePinsMap = (pins: Record<string, string>): Record<string, string> => {
    const sanitized: Record<string, string> = { ...pins };
    INITIAL_UNITS.forEach(u => {
      const current = sanitized[u.number];
      if (!current || !/^\d{4}$/.test(current)) {
        sanitized[u.number] = generateUnitPin(u.number);
      }
    });
    return sanitized;
  };

  const [unitPins, setUnitPins] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('houseman_unitPins');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          return sanitizePinsMap(parsed);
        }
      } catch (e) { /* ignore */ }
    }
    const pinsMap: Record<string, string> = {};
    INITIAL_UNITS.forEach(u => {
      pinsMap[u.number] = generateUnitPin(u.number);
    });
    return pinsMap;
  });
  
  const [config, setConfig] = useState(() => {
    const saved = localStorage.getItem('houseman_config');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (typeof parsed.apartmentFixedRatePerM2 === 'number' && typeof parsed.storeFixedRatePerM2 === 'number') {
          return parsed;
        }
      } catch (e) { /* ignore */ }
    }
    return {
      apartmentFixedRatePerM2: 2,
      storeFixedRatePerM2: 5,
      startingMonthId: '2026-06'
    };
  });

  // Dynamic starting month ID
  const startMonthId = config.startingMonthId || '2026-06';

  // Calculate total months remaining until December 2036
  const getRemainingMonthsCount = (startId: string) => {
    const [startYear, startMonth] = startId.split('-').map(Number);
    const sYr = isNaN(startYear) ? 2026 : startYear;
    const sMn = isNaN(startMonth) ? 6 : startMonth;
    if (sYr > 2036) return 12;
    return (2036 - sYr) * 12 + (12 - sMn + 1);
  };

  const monthIds = generateMonthList(startMonthId, getRemainingMonthsCount(startMonthId));
  
  const [activeMonthId, setActiveMonthId] = useState<string>(() => {
    const saved = localStorage.getItem('houseman_active_month_id');
    return saved || startMonthId;
  });
  
  // 0. Persistent Units state
  const [units, setUnits] = useState<Unit[]>(() => {
    const saved = localStorage.getItem('houseman_units');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* ignore */ }
    }
    return INITIAL_UNITS.map(u => ({ ...u, debts: 0 }));
  });

  const [expenses, setExpenses] = useState<Expense[]>(() => {
    const saved = localStorage.getItem('houseman_expenses');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* ignore */ }
    }
    return [];
  });

  const [openingBalances, setOpeningBalances] = useState<{bank: number, reserve: number}>(() => {
    const saved = localStorage.getItem('houseman_openingBalances');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* ignore */ }
    }
    return { bank: 301917, reserve: 121836 };
  });

  const [balanceOverrides, setBalanceOverrides] = useState<Record<string, { bank?: number; reserve?: number; operating?: number }>>(() => {
    const saved = localStorage.getItem('houseman_balanceOverrides');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* ignore */ }
    }
    return {};
  });

  const [startingDebts, setStartingDebts] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem('houseman_startingDebts');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) { /* ignore */ }
    }
    // Initialize to pre-June debts loaded from data dataset
    const initial: Record<string, number> = { ...INITIAL_STARTING_DEBTS };
    INITIAL_UNITS.forEach(u => {
       if (initial[u.id] === undefined) {
         initial[u.id] = 0;
       }
    });
    return initial;
  });

  const [preJunePayments, setPreJunePayments] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem('houseman_preJunePayments');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) { /* ignore */ }
    }
    return {};
  });

  const [records, setRecords] = useState<Record<string, MonthRecord>>(() => {
    const saved = localStorage.getItem('houseman_monthlyRecords');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* ignore */ }
    }
    const initial: Record<string, MonthRecord> = {};
    monthIds.forEach(mId => {
      initial[mId] = {
        monthId: mId,
        variables: { electricity: 0, cleaning: 0, elevator: 0, accounting: 0, management: 0, bankFees: 0, investment: 0, misc: 0 },
        payments: {}
      };
    });
    return initial;
  });

  // Track the printable invoice overlay details
  const [selectedInvoice, setSelectedInvoice] = useState<CalculatedInvoice | null>(null);

  // State for bulk printing all invoices
  const [showBulkPrint, setShowBulkPrint] = useState(false);

  // State for printing single tenant history
  const [printTenantItem, setPrintTenantItem] = useState<{
    number: string;
    owner: string;
    type: 'apartment' | 'store';
    history: any[];
  } | null>(null);

  // State for printing full debtors summary report
  const [fullDebtorsPrintList, setFullDebtorsPrintList] = useState<DebtorSummaryItem[] | null>(null);

  // T-Mobile Invoicing custom parameters
  const [tmobileRates, setTmobileRates] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem('houseman_tmobile_rates');
    try {
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  const [tmobileDates, setTmobileDates] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('houseman_tmobile_dates');
    try {
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  const [tmobileNos, setTmobileNos] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('houseman_tmobile_nos');
    try {
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  const [tmobileInvoiced, setTmobileInvoiced] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem('houseman_tmobile_invoiced');
    try { return saved ? JSON.parse(saved) : {}; } catch (e) { return {}; }
  });

  const [tmobilePaid, setTmobilePaid] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem('houseman_tmobile_paid');
    try { return saved ? JSON.parse(saved) : {}; } catch (e) { return {}; }
  });

  const [tmobilePaidDates, setTmobilePaidDates] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('houseman_tmobile_paid_dates');
    try { return saved ? JSON.parse(saved) : {}; } catch (e) { return {}; }
  });

  const [tmobileNotes, setTmobileNotes] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('houseman_tmobile_notes');
    try { return saved ? JSON.parse(saved) : {}; } catch (e) { return {}; }
  });

  const handleUpdateTmobileRate = (monthId: string, rate: number) => {
    setTmobileRates(prev => ({ ...prev, [monthId]: rate }));
  };

  const handleUpdateTmobileDate = (monthId: string, dateStr: string) => {
    setTmobileDates(prev => ({ ...prev, [monthId]: dateStr }));
  };

  const handleUpdateTmobileNo = (monthId: string, invoiceNo: string) => {
    setTmobileNos(prev => ({ ...prev, [monthId]: invoiceNo }));
  };

  const handleUpdateTmobileInvoiced = (monthId: string, value: boolean) => {
    setTmobileInvoiced(prev => ({ ...prev, [monthId]: value }));
  };

  const handleUpdateTmobilePaid = (monthId: string, value: boolean) => {
    setTmobilePaid(prev => ({ ...prev, [monthId]: value }));
  };

  const handleUpdateTmobilePaidDate = (monthId: string, dateStr: string) => {
    setTmobilePaidDates(prev => ({ ...prev, [monthId]: dateStr }));
  };

  const handleUpdateTmobileNote = (monthId: string, noteStr: string) => {
    setTmobileNotes(prev => ({ ...prev, [monthId]: noteStr }));
  };

  // Archiving system states
  const [showArchiveManager, setShowArchiveManager] = useState(false);
  const [serverArchives, setServerArchives] = useState<{ filename: string; createdAt: string; size: number }[]>([]);
  const [selectedArchiveYear, setSelectedArchiveYear] = useState<string>('2026');
  const [isClearingYearAfterArchive, setIsClearingYearAfterArchive] = useState<boolean>(false);
  const [archiveStatus, setArchiveStatus] = useState<{ type: 'success' | 'error' | ''; text: string }>({ type: '', text: '' });

  const fetchServerArchives = async () => {
    try {
      const res = await fetch('/api/archives');
      if (res.ok) {
        const data = await res.json();
        setServerArchives(data);
      }
    } catch (err) {
      console.error("Failed to fetch archives:", err);
    }
  };

  const showStatusMsg = (type: 'success' | 'error', text: string) => {
    setArchiveStatus({ type, text });
    setTimeout(() => {
      setArchiveStatus({ type: '', text: '' });
    }, 5000);
  };

  // Create Year Archive Snapshots
  const handleArchiveYear = async (year: string, clearData: boolean) => {
    try {
      // 1. Build the payload representing compiled state
      const archivePayload = {
        archiveType: 'year-snapshot',
        archiveYear: year,
        units,
        expenses,
        openingBalances,
        startingDebts,
        records,
        config,
        lang,
        createdAt: new Date().toISOString()
      };

      const filename = `archive-${year}.json`;

      // 2. Save directly to server HDD
      const srvRes = await fetch('/api/archive/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename, data: archivePayload })
      });

      if (!srvRes.ok) {
        throw new Error(lang === 'MK' ? 'Неуспешно зачувување на серверот.' : 'Failed to save to server HDD.');
      }

      // 3. Download to client local disk automatically
      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(archivePayload, null, 2))}`;
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', jsonString);
      downloadAnchor.setAttribute('download', filename);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      // 4. Optionally clear that year's dynamic parameters and roll over
      if (clearData) {
        const decemberMonthId = `${year}-12`;
        const decInvoices = calculatedInvoicesByMonth[decemberMonthId] || [];
        
        // A. Roll over starting debts to the next year
        const rolledDebts: Record<string, number> = {};
        units.forEach(unit => {
          const matchingInvoice = decInvoices.find(inv => inv.unitId === unit.id);
          rolledDebts[unit.id] = matchingInvoice ? matchingInvoice.endingDebt : 0;
        });

        // B. Roll over opening balances (Reserve and Bank)
        const reserveStartingBalance = openingBalances?.reserve || 0;
        let reserveRevenueTotal = 0;
        let reserveSpentTotal = 0;
        let bankRevenueTotal = 0;
        let bankSpentTotal = 0;

        monthIds.forEach(mId => {
          if (mId <= decemberMonthId) {
            const invoices = calculatedInvoicesByMonth[mId] || [];
            invoices.forEach(inv => {
              // Reserve revenue
              if (inv.payment > 0 && inv.totalMonthlyCharge > 0) {
                const ratio = inv.fixedCharge / inv.totalMonthlyCharge;
                reserveRevenueTotal += inv.payment * ratio;
              }
              // Bank revenue (entire payment received)
              bankRevenueTotal += inv.payment;
            });
            
            // Expenses
            const monthExpenses = expenses.filter(exp => exp.monthId === mId || (exp.date && exp.date.startsWith(mId)));
            monthExpenses.forEach(exp => {
              if (exp.fundType === 'reserve') {
                reserveSpentTotal += exp.amount;
              }
              bankSpentTotal += exp.amount;
            });
          }
        });

        const endingReserve = Math.max(0, reserveStartingBalance + reserveRevenueTotal - reserveSpentTotal);
        const endingBank = Math.max(0, (openingBalances?.bank || 0) + bankRevenueTotal - bankSpentTotal);

        const newOpeningBalances = { bank: endingBank, reserve: endingReserve };

        // C. Clear expenses belonging to months of that year
        setExpenses(prev => prev.filter(exp => !exp.monthId.startsWith(`${year}-`)));
        
        // D. Reset variables and payments for months belonging to that year
        setRecords(prev => {
          const updated = { ...prev };
          Object.keys(updated).forEach(mId => {
            if (mId.startsWith(`${year}-`)) {
              updated[mId] = {
                monthId: mId,
                variables: { electricity: 0, cleaning: 0, elevator: 0, accounting: 0, management: 0, bankFees: 0, investment: 0, misc: 0 },
                payments: {}
              };
            }
          });
          return updated;
        });

        // E. Commit rolled configurations
        setStartingDebts(rolledDebts);
        setOpeningBalances(newOpeningBalances);
        
        const nextYearNum = parseInt(year) + 1;
        const nextYearStartMonthId = `${nextYearNum}-01`;
        setConfig(prev => ({
          ...prev,
          startingMonthId: nextYearStartMonthId
        }));

        showStatusMsg('success', lang === 'MK' 
          ? `Успешно архивирано во "${filename}". Вкупните долгови, состојби и баланси се префрлени за ${nextYearNum} година, а податоците за ${year} година се исчистени!` 
          : `Successfully archived to "${filename}". Outstanding debts, ending fund balances, and configurations rolled over to ${nextYearNum}, and cleared indices of year ${year}!`);
      } else {
        showStatusMsg('success', lang === 'MK' 
          ? `Успешно креирано и преземено архива-фајл "${filename}"!` 
          : `Successfully created and downloaded archive file "${filename}"!`);
      }

      // Refresh archive list
      await fetchServerArchives();
    } catch (err: any) {
      console.error(err);
      showStatusMsg('error', err.message || (lang === 'MK' ? 'Грешка при создавање архива.' : 'Error creating archive.'));
    }
  };

  // Load / Restore from a selected Server archive file
  const handleLoadArchive = async (filename: string) => {
    const confirmMsg = lang === 'MK'
      ? `Предупредување: Вчитувањето на архивата "${filename}" ќе ги замени СИТЕ моментални податоци во системот со тие од зачуваниот момент. Дали сакате да продолжите?`
      : `Warning: Loading archive "${filename}" will overwrite ALL current workspace data with the states in that snapshot. Do you want to proceed?`;
    
    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await fetch('/api/archive/load', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename })
      });

      if (!res.ok) {
        throw new Error('Could not load archive file from server');
      }

      const loadedData = await res.json();
      applyLoadedData(loadedData);
      showStatusMsg('success', lang === 'MK' ? `Успешно вратена состојба од архива "${filename}"!` : `Successfully restored system state from archive "${filename}"!`);
    } catch (err: any) {
      console.error(err);
      showStatusMsg('error', lang === 'MK' ? 'Грешка при вчитување на архивата.' : 'Error loading the archive file.');
    }
  };

  // Delete Server Archive
  const handleDeleteArchive = async (filename: string) => {
    const confirmMsg = lang === 'MK'
      ? `Дали сте сигурни дека сакате трајно да ја избришете архивата "${filename}" од серверот? Папката повеќе нема да биде достапна!`
      : `Are you sure you want to permanently delete archive "${filename}" from the server? This file will be lost raw!`;

    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await fetch(`/api/archive/${filename}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        showStatusMsg('success', lang === 'MK' ? 'Архивата е успешно избришана.' : 'Archive successfully deleted.');
        await fetchServerArchives();
      } else {
        throw new Error('Failed to delete');
      }
    } catch (err) {
      showStatusMsg('error', lang === 'MK' ? 'Грешка при бришење на архивата.' : 'Error deleting the archive file.');
    }
  };

  const applyLoadedData = (loadedData: any) => {
    if (loadedData.units) setUnits(loadedData.units);
    if (loadedData.expenses) setExpenses(loadedData.expenses);
    if (loadedData.openingBalances) setOpeningBalances(loadedData.openingBalances);
    if (loadedData.balanceOverrides) setBalanceOverrides(loadedData.balanceOverrides);
    if (loadedData.startingDebts) setStartingDebts(loadedData.startingDebts);
    if (loadedData.preJunePayments) setPreJunePayments(loadedData.preJunePayments);
    if (loadedData.records) setRecords(loadedData.records);
    if (loadedData.config) setConfig(loadedData.config);
    if (loadedData.activeMonthId) setActiveMonthId(loadedData.activeMonthId);
    if (loadedData.lang) setLang(loadedData.lang);
    if (loadedData.tmobileRates) setTmobileRates(loadedData.tmobileRates);
    if (loadedData.tmobileDates) setTmobileDates(loadedData.tmobileDates);
    if (loadedData.tmobileNos) setTmobileNos(loadedData.tmobileNos);
    if (loadedData.tmobileInvoiced) setTmobileInvoiced(loadedData.tmobileInvoiced);
    if (loadedData.tmobilePaid) setTmobilePaid(loadedData.tmobilePaid);
    if (loadedData.tmobilePaidDates) setTmobilePaidDates(loadedData.tmobilePaidDates);
    if (loadedData.tmobileNotes) setTmobileNotes(loadedData.tmobileNotes);
    if (loadedData.announcements) setAnnouncements(loadedData.announcements);
    if (loadedData.futurePlans) setFuturePlans(loadedData.futurePlans);
    if (loadedData.emergencyContacts) setEmergencyContacts(loadedData.emergencyContacts);
    if (loadedData.reportedIssues) setReportedIssues(loadedData.reportedIssues);
    if (loadedData.polls) setPolls(loadedData.polls);
    if (loadedData.unitPins) setUnitPins(sanitizePinsMap(loadedData.unitPins));
    if (loadedData.adminPin) setAdminPin(loadedData.adminPin);
  };

  // Upload custom local backup json
  const handleUploadBackupJson = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const loadedData = JSON.parse(event.target?.result as string);
         const confirmMsg = lang === 'MK'
          ? 'Потврда: Дали сте сигурни за увоз на овој бекап фајл сесија? Ова целосно ја обновува состојбата на серверот и прелистувачот.'
          : 'Confirm: Are you sure you want to import this visual backup session? This fully synchronizes state on server and local cache.';
        if (!window.confirm(confirmMsg)) return;
        
        applyLoadedData(loadedData);

        // Immediately push imported backup to the server storage
        try {
          await fetch('/api/data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(loadedData)
          });
        } catch (e) { /* ignore */ }

        showStatusMsg('success', lang === 'MK' ? 'Локалниот бекап е успешно вчитан и синхронизиран со серверот!' : 'Personal local backup successfully restored and saved to server!');
      } catch (err) {
        showStatusMsg('error', lang === 'MK' ? 'Невалиден или корумпиран JSON фајл.' : 'Invalid or corrupted JSON file schema.');
      }
    };
    reader.readAsText(file);
  };

  // Complete snapshot creation
  const handleDownloadFullBackup = () => {
    const backupData = {
      archiveType: 'complete-backup',
      units,
      expenses,
      openingBalances,
      balanceOverrides,
      startingDebts,
      preJunePayments,
      records,
      config,
      activeMonthId,
      lang,
      tmobileRates,
      tmobileDates,
      tmobileNos,
      tmobileInvoiced,
      tmobilePaid,
      tmobilePaidDates,
      tmobileNotes,
      announcements,
      futurePlans,
      emergencyContacts,
      reportedIssues,
      polls,
      unitPins,
      adminPin,
      createdAt: new Date().toISOString()
    };
    const filename = `data.json`;
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(backupData, null, 2))}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonString);
    downloadAnchor.setAttribute('download', filename);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showStatusMsg('success', lang === 'MK' ? 'Преземен е најновиот data.json фајл подготвен за зачувување во GitHub!' : 'Downloaded latest data.json ready for GitHub commit!');
  };

  const [dataLoaded, setDataLoaded] = useState(false);

  // Load state from local server (HDD) if available, or auto-sync from LocalStorage to server if server is empty
  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch('/api/data');
        if (res.ok) {
          const data = await res.json();
          // If server data exists and has units, use server data
          if (data && Object.keys(data).length > 0 && data.units && data.units.length > 0) {
            if (data.units) setUnits(data.units);
            if (data.expenses) setExpenses(data.expenses);
            if (data.openingBalances) setOpeningBalances(data.openingBalances);
            if (data.balanceOverrides) setBalanceOverrides(data.balanceOverrides);
            if (data.startingDebts) {
              setStartingDebts(data.startingDebts);
            } else {
              const initial: Record<string, number> = { ...INITIAL_STARTING_DEBTS };
              INITIAL_UNITS.forEach(u => {
                if (initial[u.id] === undefined) {
                  initial[u.id] = 0;
                }
              });
              setStartingDebts(initial);
            }
            if (data.preJunePayments) setPreJunePayments(data.preJunePayments);
            if (data.records) setRecords(data.records);
            if (data.config) setConfig(data.config);
            if (data.activeMonthId) {
              setActiveMonthId(data.activeMonthId);
            }
            if (data.lang) setLang(data.lang);
            if (data.tmobileRates) setTmobileRates(data.tmobileRates);
            if (data.tmobileDates) setTmobileDates(data.tmobileDates);
            if (data.tmobileNos) setTmobileNos(data.tmobileNos);
            if (data.tmobileInvoiced) setTmobileInvoiced(data.tmobileInvoiced);
            if (data.tmobilePaid) setTmobilePaid(data.tmobilePaid);
            if (data.tmobilePaidDates) setTmobilePaidDates(data.tmobilePaidDates);
            if (data.tmobileNotes) setTmobileNotes(data.tmobileNotes);
            if (data.announcements) setAnnouncements(data.announcements);
            if (data.futurePlans) setFuturePlans(data.futurePlans);
            if (data.emergencyContacts) setEmergencyContacts(data.emergencyContacts);
            if (data.reportedIssues) setReportedIssues(data.reportedIssues);
            if (data.polls) setPolls(data.polls);
            if (data.unitPins) setUnitPins(sanitizePinsMap(data.unitPins));
            if (data.adminPin) setAdminPin(data.adminPin);
            setDataLoaded(true);
            return;
          }
        }
      } catch (err) {
        console.warn("Could not load from API, using LocalStorage fallback:", err);
      }

      // If server was empty or unreachable, check if we have data in LocalStorage to push back to server!
      try {
        const savedUnits = localStorage.getItem('houseman_units');
        if (savedUnits) {
          const parsedUnits = JSON.parse(savedUnits);
          if (Array.isArray(parsedUnits) && parsedUnits.length > 0) {
            // Restore all keys from local storage
            const localPayload: any = { units: parsedUnits };
            const savedExpenses = localStorage.getItem('houseman_expenses');
            if (savedExpenses) localPayload.expenses = JSON.parse(savedExpenses);
            const savedRecords = localStorage.getItem('houseman_monthlyRecords');
            if (savedRecords) localPayload.records = JSON.parse(savedRecords);
            const savedDebts = localStorage.getItem('houseman_startingDebts');
            if (savedDebts) localPayload.startingDebts = JSON.parse(savedDebts);
            const savedPreJune = localStorage.getItem('houseman_preJunePayments');
            if (savedPreJune) localPayload.preJunePayments = JSON.parse(savedPreJune);
            const savedOpening = localStorage.getItem('houseman_openingBalances');
            if (savedOpening) localPayload.openingBalances = JSON.parse(savedOpening);
            const savedOverrides = localStorage.getItem('houseman_balanceOverrides');
            if (savedOverrides) localPayload.balanceOverrides = JSON.parse(savedOverrides);
            const savedAnnouncements = localStorage.getItem('houseman_announcements');
            if (savedAnnouncements) localPayload.announcements = JSON.parse(savedAnnouncements);
            const savedPlans = localStorage.getItem('houseman_futurePlans');
            if (savedPlans) localPayload.futurePlans = JSON.parse(savedPlans);
            const savedContacts = localStorage.getItem('houseman_emergencyContacts');
            if (savedContacts) localPayload.emergencyContacts = JSON.parse(savedContacts);
            const savedIssues = localStorage.getItem('houseman_reportedIssues');
            if (savedIssues) localPayload.reportedIssues = JSON.parse(savedIssues);
            const savedPolls = localStorage.getItem('houseman_polls');
            if (savedPolls) localPayload.polls = JSON.parse(savedPolls);
            const savedPins = localStorage.getItem('houseman_unitPins');
            if (savedPins) localPayload.unitPins = JSON.parse(savedPins);
            const savedAdminPin = localStorage.getItem('houseman_adminPin');
            if (savedAdminPin) localPayload.adminPin = savedAdminPin;

            // Apply to state
            applyLoadedData(localPayload);

            // Auto-persist immediately to the empty server!
            fetch('/api/data', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(localPayload)
            }).catch(() => {});
          }
        }
      } catch (e) {
        console.error("Error restoring from LocalStorage to server:", e);
      }

      setDataLoaded(true);
    }
    loadData();
  }, []);

  // Save states on updates (LocalStorage instantly, and HDD with debounced api requests)
  useEffect(() => {
    if (!dataLoaded) return;

    // LocalStorage backup
    localStorage.setItem('houseman_units', JSON.stringify(units));
    localStorage.setItem('houseman_expenses', JSON.stringify(expenses));
    localStorage.setItem('houseman_openingBalances', JSON.stringify(openingBalances));
    localStorage.setItem('houseman_balanceOverrides', JSON.stringify(balanceOverrides));
    localStorage.setItem('houseman_startingDebts', JSON.stringify(startingDebts));
    localStorage.setItem('houseman_preJunePayments', JSON.stringify(preJunePayments));
    localStorage.setItem('houseman_monthlyRecords', JSON.stringify(records));
    localStorage.setItem('houseman_config', JSON.stringify(config));
    localStorage.setItem('houseman_active_month_id', activeMonthId);
    localStorage.setItem('houseman_lang', lang);
    localStorage.setItem('houseman_tmobile_rates', JSON.stringify(tmobileRates));
    localStorage.setItem('houseman_tmobile_dates', JSON.stringify(tmobileDates));
    localStorage.setItem('houseman_tmobile_nos', JSON.stringify(tmobileNos));
    localStorage.setItem('houseman_tmobile_invoiced', JSON.stringify(tmobileInvoiced));
    localStorage.setItem('houseman_tmobile_paid', JSON.stringify(tmobilePaid));
    localStorage.setItem('houseman_tmobile_paid_dates', JSON.stringify(tmobilePaidDates));
    localStorage.setItem('houseman_tmobile_notes', JSON.stringify(tmobileNotes));
    localStorage.setItem('houseman_announcements', JSON.stringify(announcements));
    localStorage.setItem('houseman_futurePlans', JSON.stringify(futurePlans));
    localStorage.setItem('houseman_emergencyContacts', JSON.stringify(emergencyContacts));
    localStorage.setItem('houseman_reportedIssues', JSON.stringify(reportedIssues));
    localStorage.setItem('houseman_polls', JSON.stringify(polls));
    localStorage.setItem('houseman_unitPins', JSON.stringify(unitPins));
    localStorage.setItem('houseman_adminPin', adminPin);

    // Debounced HTTP post to HDD file-system (server)
    const timer = setTimeout(async () => {
      try {
        await fetch('/api/data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            units,
            expenses,
            openingBalances,
            balanceOverrides,
            startingDebts,
            preJunePayments,
            records,
            config,
            activeMonthId,
            lang,
            tmobileRates,
            tmobileDates,
            tmobileNos,
            tmobileInvoiced,
            tmobilePaid,
            tmobilePaidDates,
            tmobileNotes,
            announcements,
            futurePlans,
            emergencyContacts,
            reportedIssues,
            polls,
            unitPins,
            adminPin
          })
        });
      } catch (err) {
        console.error("Could not persistence save to server:", err);
      }
    }, 1200);


    return () => clearTimeout(timer);
  }, [units, expenses, openingBalances, balanceOverrides, startingDebts, preJunePayments, records, config, activeMonthId, lang, tmobileRates, tmobileDates, tmobileNos, tmobileInvoiced, tmobilePaid, tmobilePaidDates, tmobileNotes, announcements, futurePlans, emergencyContacts, reportedIssues, polls, unitPins, adminPin, dataLoaded]);

  // Keep activeMonthId safe when startingMonthId or monthIds change
  useEffect(() => {
    if (dataLoaded && !monthIds.includes(activeMonthId)) {
      setActiveMonthId(startMonthId);
    }
  }, [startMonthId, monthIds, activeMonthId, dataLoaded]);

  // Stable sorting of units (applied on initialization and if user re-sorts)
  useEffect(() => {
    setUnits(prev => {
      const sorted = [...prev].sort((a, b) => {
        if (a.type !== b.type) return a.type === 'apartment' ? -1 : 1;
        return a.number.localeCompare(b.number, undefined, { numeric: true, sensitivity: 'base' });
      });
      // Only update if order changed to avoid loops
      const orderChanged = sorted.some((u, i) => u.id !== prev[i]?.id);
      return orderChanged ? sorted : prev;
    });
  }, []);

  // Handle updates from components
  const handleUpdateTenantName = (unitId: string, newName: string) => {
    setUnits(prev => prev.map(u => u.id === unitId ? { ...u, owner: newName } : u));
  };

  const handleUpdateTenantEmail = (unitId: string, email: string, optIn: boolean) => {
    setUnits(prev => prev.map(u => u.id === unitId ? { ...u, email, emailOptIn: optIn } : u));
  };

  const handleUpdateExpenses = (newExpenses: Expense[]) => {
    setExpenses(newExpenses);
  };

  const handleUpdateOpeningBalances = (balances: {bank: number, reserve: number}) => {
    setOpeningBalances(balances);
  };

  const handleResetOpeningBalancesToZero = () => {
    setOpeningBalances({ bank: 0, reserve: 0 });
    setBalanceOverrides({});
  };

  const handleResetCurrentBalancesToZero = () => {
    setBalanceOverrides(prev => ({
      ...prev,
      [activeMonthId]: { bank: 0, reserve: 0, operating: 0 }
    }));
  };

  const handleResetAllStartingDebtsToZero = () => {
    const zeroDebts: Record<string, number> = {};
    units.forEach(u => {
      zeroDebts[u.id] = 0;
    });
    setStartingDebts(zeroDebts);
    setPreJunePayments({});
  };

  const handleCompleteResetToZero = () => {
    setOpeningBalances({ bank: 0, reserve: 0 });
    setBalanceOverrides({});
    const zeroDebts: Record<string, number> = {};
    units.forEach(u => {
      zeroDebts[u.id] = 0;
    });
    setStartingDebts(zeroDebts);
    setPreJunePayments({});
    setExpenses([]);
    setRecords({});
  };

  const handleUpdateStartingDebt = (unitId: string, value: number) => {
    setStartingDebts(prev => ({
      ...prev,
      [unitId]: value
    }));
  };

  const handleUpdatePreJunePayment = (unitId: string, amount: number) => {
    setPreJunePayments(prev => ({
      ...prev,
      [unitId]: amount
    }));
  };

  const handleBulkUpdateStartingDebts = (updates: { unitId: string, debts: number }[]) => {
    setStartingDebts(prev => {
      const copy = { ...prev };
      updates.forEach(u => {
        copy[u.unitId] = u.debts;
      });
      return copy;
    });
  };

  const handleUpdateFixedRates = (aptRate: number, storeRate: number) => {
    setConfig(prev => ({
      ...prev,
      apartmentFixedRatePerM2: aptRate,
      storeFixedRatePerM2: storeRate
    }));

    setRecords(prev => ({
      ...prev,
      [activeMonthId]: {
        ...prev[activeMonthId],
        fixedRates: { apartment: aptRate, store: storeRate }
      }
    }));
  };

  const handleUpdateGoogleClientId = (clientId: string) => {
    setConfig(prev => ({
      ...prev,
      googleClientId: clientId
    }));
  };

  const handleUpdateVariables = (vars: MonthlyVariables) => {
    setRecords(prev => ({
      ...prev,
      [activeMonthId]: {
        ...prev[activeMonthId],
        variables: vars
      }
    }));
  };

  const handleUpdatePayment = (unitId: string, amount: number) => {
    setRecords(prev => {
      const recordsCopy = { ...prev };
      const currentMonthRecord = recordsCopy[activeMonthId] || {
        monthId: activeMonthId,
        variables: { electricity: 0, cleaning: 0, elevator: 0, accounting: 0, management: 0, bankFees: 0, investment: 0, misc: 0 },
        payments: {}
      };
      
      const paymentsCopy = { ...currentMonthRecord.payments };
      if (amount === 0) {
        delete paymentsCopy[unitId];
      } else {
        paymentsCopy[unitId] = amount;
      }
      
      recordsCopy[activeMonthId] = {
        ...currentMonthRecord,
        payments: paymentsCopy
      };
      
      return recordsCopy;
    });
  };

  const handleBulkUpdatePayments = (updates: { unitId: string, amount: number }[]) => {
    setRecords(prev => {
      const recordsCopy = { ...prev };
      const currentMonthRecord = recordsCopy[activeMonthId] || {
        monthId: activeMonthId,
        variables: { electricity: 0, cleaning: 0, elevator: 0, accounting: 0, management: 0, bankFees: 0, investment: 0, misc: 0 },
        payments: {}
      };
      
      const paymentsCopy = { ...currentMonthRecord.payments };
      updates.forEach(({ unitId, amount }) => {
        if (amount === 0) {
          delete paymentsCopy[unitId];
        } else {
          paymentsCopy[unitId] = amount;
        }
      });
      
      recordsCopy[activeMonthId] = {
        ...currentMonthRecord,
        payments: paymentsCopy
      };
      
      return recordsCopy;
    });
  };

  // Convert unit.debts (if any) or existing startingDebts to unified map
  const activeStartingDebts = { ...startingDebts };
  units.forEach(u => {
    if (u.debts !== undefined && activeStartingDebts[u.id] === undefined) {
      activeStartingDebts[u.id] = u.debts;
    }
  });

  // Recalculating everything chronologically in-memory whenever states change
  const calculatedInvoicesByMonth = calculateChronologicalInvoices({
    units,
    monthIds,
    records,
    startingDebts: activeStartingDebts,
    preJunePayments,
    apartmentFixedRatePerM2: config.apartmentFixedRatePerM2,
    storeFixedRatePerM2: config.storeFixedRatePerM2
  });

  // Active month invoices
  const activeInvoices = calculatedInvoicesByMonth[activeMonthId] || [];
  const activeRecord = records[activeMonthId] || {
    monthId: activeMonthId,
    variables: { electricity: 0, cleaning: 0, elevator: 0, accounting: 0, management: 0, bankFees: 0, investment: 0, misc: 0 },
    payments: {}
  };

  const currentVariables = activeRecord.variables;

  const t = {
    MK: {
      appName: 'Vich 28',
      appSubtitle: 'Месечно фактурирање, регистар и извештаи',
      apartmentsCount: '68 станови',
      storesCount: '8 дуќани',
      langLabel: 'EN',
      tabSummary: 'Евиденција на уплати и фактурирање',
      tabInputs: 'Влезни фактури',
      tabTenants: 'Регистар на сопственици',
      tabBalance: 'ОГЛАСНА ТАБЛА',
      tabSpending: 'Евиденција на трошоци',
      selectMonth: 'Изберете месец:',
      legalFooter: 'Панел за управители на колективни згради.',
      archiveBtn: 'АРХИВА И БЕКАП',
      archivePanelTitle: 'СЕФ ЗА ПОДАТОЦИ И АРХИВИРАЊЕ',
      archivePanelSubtitle: 'Архивирајте ја завршената календарска година и преземете ги или обновете ги зачуваните архиви.',
      archiveYearLabel: 'Избор на година за архивирање:',
      archiveClearLabel: 'Исчистете ги внесените податоци за избраната година од тековниот преглед (се препорачува при започнување нова календарска година)',
      archiveCreateBtn: 'Создади и преземи архива',
      archiveServerArchivesTitle: 'Архиви зачувани на серверот',
      archiveNoArchives: 'Нема зачувани архиви на серверот.',
      archiveBackupSectionTitle: 'Комплетен бекап (увоз и извоз)',
      archiveExportBtn: 'Преземи комплетен бекап (JSON)',
      archiveImportBtn: 'Вчитај бекап од компјутер',
      archiveSizeLabel: 'Големина',
      archiveDateLabel: 'Креирано на'
    },
    EN: {
      appName: 'Vich 28',
      appSubtitle: 'Monthly invoicing, registry & reports',
      apartmentsCount: '68 apartments',
      storesCount: '8 stores',
      langLabel: 'MK',
      tabSummary: 'Tenant Payments / Generate Invoices',
      tabInputs: 'Incoming Invoices',
      tabTenants: 'Tenant List',
      tabBalance: 'BULLETIN BOARD',
      tabSpending: 'Spendings',
      selectMonth: 'Select Billing Month:',
      legalFooter: 'Official houseman manager panel.',
      archiveBtn: 'DATA ARCHIVER',
      archivePanelTitle: 'DATA SAFE & ARCHIVING ENGINE',
      archivePanelSubtitle: 'Archive an entire calendar year and download JSON back-ups or restore snapshots directly from the server.',
      archiveYearLabel: 'Select year to archive:',
      archiveClearLabel: 'Clear archived year data from active workspace (recommended to start a clean new year)',
      archiveCreateBtn: 'Create & Download Archive',
      archiveServerArchivesTitle: 'Archives saved on server',
      archiveNoArchives: 'No server-side archives found.',
      archiveBackupSectionTitle: 'Complete Backup (Import / Export)',
      archiveExportBtn: 'Export Complete Backup (JSON)',
      archiveImportBtn: 'Import Backup File',
      archiveSizeLabel: 'Size',
      archiveDateLabel: 'Created'
    },
  }[lang];

  const handleOpenAdminModal = () => {
    setShowPinModal(true);
    setEnteredPin('');
    setPinError('');
  };

  const handleVotePoll = (pollId: string, apartmentNo: string, inputPin: string, optionIndex: number): { success: boolean; message: string } => {
    const cleanApt = apartmentNo.trim();
    const cleanPin = inputPin.trim().toUpperCase();

    if (!cleanApt) {
      return { 
        success: false, 
        message: lang === 'MK' ? 'Ве молиме внесете го бројот на станот.' : 'Please enter the apartment number.' 
      };
    }

    if (!cleanPin) {
      return { 
        success: false, 
        message: lang === 'MK' ? 'Задолжително внесете го ПИН кодот за вашиот стан!' : 'PIN code is required!' 
      };
    }

    const matchedUnit = units.find(u => u.number.toLowerCase() === cleanApt.toLowerCase());
    if (!matchedUnit) {
      return { 
        success: false, 
        message: lang === 'MK' ? `Станот/локалот со број "${cleanApt}" не е пронајден во зградата.` : `Apartment/unit "${cleanApt}" was not found.` 
      };
    }

    const targetPoll = polls.find(p => p.id === pollId);
    if (!targetPoll) {
      return { success: false, message: 'Анкетата не е пронајдена.' };
    }

    if (targetPoll.status !== 'active') {
      return { success: false, message: 'Оваа анкета е завршена и повеќе не прима гласови.' };
    }

    // Lookup poll-specific PIN map first!
    const pollPins = targetPoll.pins || unitPins;
    const expectedPin = pollPins[matchedUnit.number] || pollPins[matchedUnit.id] || unitPins[matchedUnit.number] || unitPins[matchedUnit.id];
    
    if (!expectedPin || expectedPin.trim().toUpperCase() !== cleanPin) {
      return { 
        success: false, 
        message: lang === 'MK' ? `Неточен ПИН код за стан бр. ${matchedUnit.number} за ова конкретно гласање! Секоја нова одлука има своја уникатна ПИН листа.` : `Incorrect PIN code for apartment #${matchedUnit.number} for this decision!` 
      };
    }

    const alreadyVoted = targetPoll.votes.some(v => v.apartmentNo.toLowerCase() === matchedUnit.number.toLowerCase());
    if (alreadyVoted) {
      return { 
        success: false, 
        message: lang === 'MK' ? `Стан бр. ${matchedUnit.number} веќе има гласано на оваа анкета! (1 Стан = 1 Глас)` : `Apartment #${matchedUnit.number} has already voted on this poll!` 
      };
    }

    const newVote = {
      apartmentNo: matchedUnit.number,
      optionIndex,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16)
    };

    setPolls(prev => prev.map(p => {
      if (p.id === pollId) {
        return {
          ...p,
          votes: [...p.votes, newVote]
        };
      }
      return p;
    }));

    return { 
      success: true, 
      message: lang === 'MK' ? `Гласот за стан бр. ${matchedUnit.number} (${matchedUnit.area || 76} m²) е успешно евидентиран!` : `Vote for apartment #${matchedUnit.number} successfully recorded!` 
    };
  };

  const handleRegenerateUnitPin = (unitNo: string) => {
    const newPin = Math.floor(1000 + Math.random() * 9000).toString();
    setUnitPins(prev => ({ ...prev, [unitNo]: newPin }));
  };

  const handleRegenerateAllUnitPins = () => {
    const newMap: Record<string, string> = {};
    const usedPins = new Set<string>();
    units.forEach(u => {
      let pin = Math.floor(1000 + Math.random() * 9000).toString();
      while (usedPins.has(pin)) {
        pin = Math.floor(1000 + Math.random() * 9000).toString();
      }
      usedPins.add(pin);
      newMap[u.number] = pin;
    });
    setUnitPins(newMap);
  };

  const handleVerifyPin = (e: FormEvent) => {
    e.preventDefault();
    if (enteredPin === adminPin) {
      setViewMode('admin');
      setShowPinModal(false);
      setEnteredPin('');
      setPinError('');
      sessionStorage.setItem('houseman_viewMode', 'admin');
      try { localStorage.removeItem('houseman_viewMode'); } catch (e) { /* ignore */ }
      showStatusMsg('success', lang === 'MK' ? 'Успешна најава во АДМИН контролен панел!' : 'Successfully logged in to ADMIN panel!');
    } else {
      setPinError(lang === 'MK' ? 'Погрешен АДМИН ПИН код!' : 'Incorrect ADMIN PIN code!');
    }
  };

  const handleSwitchToPublicView = () => {
    setViewMode('public');
    sessionStorage.setItem('houseman_viewMode', 'public');
    try { localStorage.removeItem('houseman_viewMode'); } catch (e) { /* ignore */ }
  };

  if (viewMode === 'public') {
    return (
      <>
        <PublicPortal
          lang={lang}
          announcements={announcements}
          futurePlans={futurePlans}
          emergencyContacts={emergencyContacts}
          reportedIssues={reportedIssues}
          polls={polls}
          unitPins={unitPins}
          onVotePoll={handleVotePoll}
          onReportIssue={(newIssue) => {
            const issue: ReportedIssue = {
              ...newIssue,
              id: `issue-${Date.now()}`,
              date: new Date().toISOString().split('T')[0],
              status: 'open'
            };
            setReportedIssues(prev => [issue, ...prev]);
            showStatusMsg('success', lang === 'MK' ? 'Пријавата за дефект е успешно испратена!' : 'Issue report submitted successfully!');
          }}
          units={units}
          expenses={expenses}
          openingBalances={openingBalances}
          balanceOverrides={balanceOverrides}
          activeMonthId={activeMonthId}
          startingMonthId={startMonthId}
          records={records}
          onOpenAdminModal={handleOpenAdminModal}
        />

        {showPinModal && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border-2 border-amber-500 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative text-white">
              <button 
                onClick={() => setShowPinModal(false)}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-2xl">
                  <Lock className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white">АДМИН Најава</h3>
                  <p className="text-xs text-slate-400">Заедница на сопственици Вич 28 Скопје</p>
                </div>
              </div>

              <p className="text-xs text-slate-300 mb-6 leading-relaxed">
                Внесете го вашиот АДМИН ПИН код за да отворите пристап до фактурите, сметката, уплатите и финансиските извештаи.
              </p>

              {pinError && (
                <div className="mb-4 p-3 bg-rose-500/20 border border-rose-500/40 rounded-xl text-rose-300 text-xs font-bold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{pinError}</span>
                </div>
              )}

              <form onSubmit={handleVerifyPin} className="space-y-4">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-1.5">
                    АДМИН ПИН Код
                  </label>
                  <input
                    type="password"
                    required
                    autoFocus
                    placeholder="****"
                    value={enteredPin}
                    onChange={(e) => setEnteredPin(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-800 border-2 border-slate-700 text-white rounded-xl text-center text-2xl font-mono tracking-widest outline-none focus:border-amber-400"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all cursor-pointer"
                >
                  🔑 Потврди и Отвори АДМИН Панел
                </button>
              </form>
            </div>
          </div>
        )}
      </>
    );
  }

  return (

    <div className="min-h-screen bg-slate-100 text-black font-sans antialiased pb-16 print:bg-white print:pb-0" id="applet-container">
      {/* Upper Navigation Banner (Hidden for print) */}
      <header className="bg-black text-white border-b-4 border-black py-6 px-6 md:px-8 print:hidden">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Logo & Headline */}
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-white text-black border-2 border-white flex items-center justify-center shadow-none">
              <Building className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tighter flex items-center leading-none">
                {t.appName}
                <span className="ml-3 px-2 py-0.5 bg-yellow-400 border border-black text-[9px] font-black tracking-widest text-black font-mono uppercase">
                  v1.2
                </span>
              </h1>
              <p className="text-xs font-bold tracking-widest text-slate-400 uppercase mt-1">{t.appSubtitle}</p>
            </div>
          </div>

          {/* Quick Stats & Controls */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Stats badges */}
            <div className="flex items-center space-x-2 bg-slate-900 px-3.5 py-2 border-2 border-slate-700 text-[10px] font-black text-slate-300 font-mono uppercase tracking-wide">
              <span className="w-2.5 h-2.5 bg-blue-500 inline-block border border-black"></span>
              <span>{t.apartmentsCount}</span>
              <span className="text-slate-600 font-normal">|</span>
              <span className="w-2.5 h-2.5 bg-amber-500 inline-block border border-black"></span>
              <span>{t.storesCount}</span>
            </div>

            {/* Public Portal / Logout Switcher */}
            <button
              onClick={handleSwitchToPublicView}
              className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 border-2 border-black transition-all text-xs font-black font-mono tracking-widest cursor-pointer flex items-center space-x-1.5 uppercase shadow-sm"
              title="Одјави се од АДМИН и премини на јавниот веб портал за станарите"
            >
              <Globe className="w-4 h-4 text-slate-950" />
              <span>Јавен Портал (Одјава)</span>
            </button>

            {/* Archive Manager Trigger */}
            <button
              id="archive-manager-toggle-btn"
              onClick={() => {
                setShowArchiveManager(!showArchiveManager);
                if (!showArchiveManager) fetchServerArchives();
              }}
              className="px-4 py-2 bg-yellow-400 text-black hover:bg-yellow-500 border-2 border-black transition-all text-xs font-black font-mono tracking-widest cursor-pointer flex items-center space-x-2 uppercase"
            >
              <Archive className="w-4 h-4 text-black" />
              <span>{t.archiveBtn}</span>
            </button>

            {/* Language Toggle */}
            <button
              id="lang-toggle-btn"
              onClick={() => setLang(prev => prev === 'MK' ? 'EN' : 'MK')}
              className="px-4 py-2 bg-white text-black hover:bg-yellow-400 border-2 border-white hover:border-black transition-all text-xs font-black font-mono tracking-widest cursor-pointer flex items-center space-x-2 uppercase"
            >
              <Languages className="w-4 h-4" />
              <span>{t.langLabel}</span>
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {showArchiveManager && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b-4 border-black bg-stone-100"
            id="archive-manager-drawer"
          >
            <div className="max-w-7xl mx-auto p-6 md:p-8 relative">
              <div className="flex flex-col md:flex-row justify-between items-start mb-6 pb-4 border-b border-stone-300">
                <div>
                  <h3 className="text-xl font-black text-black uppercase tracking-tight flex items-center gap-2">
                    <Archive className="w-5 h-5 text-yellow-500" />
                    {t.archivePanelTitle}
                  </h3>
                  <p className="text-xs text-stone-500 font-bold mt-1 uppercase tracking-wider">{t.archivePanelSubtitle}</p>
                </div>
                <button
                  onClick={() => setShowArchiveManager(false)}
                  className="px-3 py-1 text-xs font-black uppercase tracking-wider bg-black text-white hover:bg-stone-800 border border-black mt-2 md:mt-0"
                >
                  {lang === 'MK' ? 'Затвори' : 'Close'}
                </button>
              </div>

              {archiveStatus.text && (
                <div className={`p-4 mb-6 border-2 flex items-center gap-3 ${
                  archiveStatus.type === 'success' 
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-bold' 
                    : 'bg-rose-50 border-rose-500 text-rose-900 font-bold'
                }`}>
                  {archiveStatus.type === 'success' ? <Check className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                  <span className="text-xs uppercase tracking-wider">{archiveStatus.text}</span>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Section 1: Year Snapshot */}
                <div className="bg-white p-5 border-2 border-black flex flex-col justify-between">
                  <div>
                    <span className="px-2 py-0.5 bg-yellow-400 text-[10px] font-black uppercase tracking-wider border border-black inline-block mb-3">01</span>
                    <h4 className="text-sm font-black text-black uppercase tracking-wider mb-3">
                      {lang === 'MK' ? 'АРХИВИРАЈ ГОДИШНА СОСТОЈБА' : 'ARCHIVE CALENDAR YEAR'}
                    </h4>
                    <p className="text-xs text-stone-500 mb-4 font-medium leading-relaxed">
                      {lang === 'MK' 
                        ? 'Преземете ги сите тековни фактури, трошоци и состојба како архивен документ (SNAPSHOT).' 
                        : 'Snapshot the entire active registry, invoices, and ledgers into a download file.'}
                    </p>

                    <div className="space-y-4 mb-4">
                      <div>
                        <label className="block text-[10px] font-black text-stone-600 uppercase tracking-widest mb-1.5">{t.archiveYearLabel}</label>
                        <select
                          value={selectedArchiveYear}
                          onChange={(e) => setSelectedArchiveYear(e.target.value)}
                          className="w-full px-3 py-2 bg-stone-50 border-2 border-black text-xs font-bold font-mono text-black"
                        >
                          {['2026', '2027', '2028', '2029', '2030', '2031', '2032', '2033', '2034', '2035', '2036'].map(y => (
                            <option key={y} value={y}>{y}</option>
                          ))}
                        </select>
                      </div>

                      <label className="flex items-start space-x-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isClearingYearAfterArchive}
                          onChange={(e) => setIsClearingYearAfterArchive(e.target.checked)}
                          className="mt-0.5 border-2 border-black text-black focus:ring-0 cursor-pointer"
                        />
                        <span className="text-[10px] font-bold text-stone-700 leading-normal uppercase select-none">
                          {t.archiveClearLabel}
                        </span>
                      </label>
                    </div>
                  </div>

                  <button
                    onClick={() => handleArchiveYear(selectedArchiveYear, isClearingYearAfterArchive)}
                    className="w-full py-2.5 bg-black text-white hover:bg-stone-800 text-xs font-black tracking-wider uppercase flex items-center justify-center space-x-2 border-2 border-black"
                  >
                    <Download className="w-4 h-4" />
                    <span>{t.archiveCreateBtn}</span>
                  </button>
                </div>

                {/* Section 2: Manage Server Archives */}
                <div className="bg-white p-5 border-2 border-black flex flex-col justify-between">
                  <div>
                    <span className="px-2 py-0.5 bg-yellow-400 text-[10px] font-black uppercase tracking-wider border border-black inline-block mb-3">02</span>
                    <h4 className="text-sm font-black text-black uppercase tracking-wider mb-3">
                      {t.archiveServerArchivesTitle}
                    </h4>
                    <p className="text-xs text-stone-500 mb-4 font-medium leading-relaxed">
                      {lang === 'MK'
                        ? 'Прегледајте ги и брзо вратете ги претходно зачуваните архиви директно од дискот на серверот.'
                        : 'Restore previously recorded session databases directly from cloud-deployed host files.'}
                    </p>

                    <div className="max-h-[180px] overflow-y-auto space-y-2 mb-4 border border-stone-200 p-2 bg-stone-50">
                      {serverArchives.length === 0 ? (
                        <div className="text-center py-6">
                          <p className="text-stone-400 text-[10px] font-bold uppercase tracking-wider">{t.archiveNoArchives}</p>
                        </div>
                      ) : (
                        serverArchives.map((arch) => (
                          <div key={arch.filename} className="p-2 bg-white border border-stone-300 flex items-center justify-between text-[11px] font-mono leading-tight">
                            <div className="flex-1 min-w-0 pr-2">
                              <p className="font-bold text-black truncate uppercase">{arch.filename}</p>
                              <p className="text-[9px] text-stone-400 font-sans mt-0.5">
                                {t.archiveDateLabel}: {new Date(arch.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="flex items-center space-x-1.5 flex-shrink-0">
                              <button
                                onClick={() => handleLoadArchive(arch.filename)}
                                title={lang === 'MK' ? 'Вчитај архива' : 'Restore snapshot'}
                                className="p-1 px-1.5 bg-black hover:bg-stone-800 text-white border border-black text-[9px] font-black uppercase flex items-center gap-1 cursor-pointer"
                              >
                                <Upload className="w-3 h-3" />
                                <span>{lang === 'MK' ? 'ВЧИТАЈ' : 'LOAD'}</span>
                              </button>
                              <button
                                onClick={() => handleDeleteArchive(arch.filename)}
                                title={lang === 'MK' ? 'Избриши архива' : 'Delete archive on server'}
                                className="p-1 text-stone-500 hover:text-rose-600 hover:bg-stone-50 border border-transparent hover:border-stone-300 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <button
                    onClick={fetchServerArchives}
                    className="w-full py-1.5 bg-stone-100 hover:bg-stone-200 text-[10px] font-black tracking-widest text-black uppercase border border-stone-300 cursor-pointer"
                  >
                    {lang === 'MK' ? 'Освежи листа на серверот' : 'Refresh server list'}
                  </button>
                </div>

                {/* Section 3: Manual Backups (Full JSON System) */}
                <div className="bg-white p-5 border-2 border-black flex flex-col justify-between">
                  <div>
                    <span className="px-2 py-0.5 bg-yellow-400 text-[10px] font-black uppercase tracking-wider border border-black inline-block mb-3">03</span>
                    <h4 className="text-sm font-black text-black uppercase tracking-wider mb-3">
                      {t.archiveBackupSectionTitle}
                    </h4>
                    <p className="text-xs text-stone-500 mb-4 font-medium leading-relaxed">
                      {lang === 'MK'
                        ? 'Направете локална копија од комплетната база за заштита, или вчитајте зачувана датотека од вашиот уред.'
                        : 'Securely extract the entire raw session state into a JSON safe-file or load an external JSON file.'}
                    </p>

                    <div className="space-y-3 mb-4">
                      <button
                        onClick={handleDownloadFullBackup}
                        className="w-full py-2.5 bg-stone-900 text-white hover:bg-black font-black text-[11px] uppercase tracking-wider flex items-center justify-center space-x-2 border-2 border-black cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5 text-yellow-400" />
                        <span>{t.archiveExportBtn}</span>
                      </button>

                      <div className="relative">
                        <label htmlFor="manual-backup-upload-input" className="block border-2 border-dashed border-stone-300 hover:border-black bg-stone-50 hover:bg-white p-4 text-center cursor-pointer transition-all">
                          <Upload className="w-5 h-5 mx-auto text-stone-400 mb-1" />
                          <span className="text-[10px] font-black uppercase text-stone-700 tracking-wider block">{t.archiveImportBtn}</span>
                          <span className="text-[9px] text-stone-400 uppercase tracking-widest mt-0.5 block">(.json)</span>
                        </label>
                        <input
                          type="file"
                          id="manual-backup-upload-input"
                          accept=".json"
                          onChange={handleUploadBackupJson}
                          className="hidden"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="text-[9px] font-bold text-stone-400 uppercase text-center border-t border-stone-100 pt-3 flex items-center justify-center gap-1.5">
                    <ShieldCheck className="w-3 h-3 text-emerald-500" />
                    <span>{lang === 'MK' ? 'Криптографски верификуван формат' : 'Encrypted structured json format'}</span>
                  </div>
                </div>

              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 md:px-8 mt-6 print:m-0 print:p-0">
        
        {/* Month Selector Bar (Hidden for print) */}
        <div className="bg-white p-6 border-2 border-black flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 print:hidden">
          <div className="flex items-center space-x-3.5">
            <div className="p-2.5 bg-black text-white border-2 border-black">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{t.selectMonth}</p>
              <h2 className="text-xl font-black text-black uppercase tracking-tight mt-0.5">{formatMonthId(activeMonthId, lang)}</h2>
            </div>
          </div>

          <div className="flex items-center space-x-2" id="month-navigation-controls">
            <select
              id="month-picker"
              value={activeMonthId}
              onChange={(e) => setActiveMonthId(e.target.value)}
              className="px-4 py-2.5 bg-white border-2 border-black focus:outline-hidden focus:ring-0 text-xs font-black text-black tracking-wider uppercase cursor-pointer max-w-[200px] md:max-w-none"
            >
              {(() => {
                const groupedByYear: Record<string, string[]> = {};
                monthIds.forEach(mId => {
                  const year = mId.split('-')[0];
                  if (!groupedByYear[year]) {
                    groupedByYear[year] = [];
                  }
                  groupedByYear[year].push(mId);
                });
                const yearsList = Object.keys(groupedByYear).sort();
                return yearsList.map(year => (
                  <optgroup key={year} label={year} className="bg-slate-200 text-black font-black font-mono">
                    {groupedByYear[year].map(mId => (
                      <option key={mId} value={mId} className="font-sans font-bold normal-case">
                        {formatMonthId(mId, lang)}
                      </option>
                    ))}
                  </optgroup>
                ));
              })()}
            </select>
          </div>
        </div>

        {/* Workspace Tab Bar (Hidden for print) */}
        <div className="flex mb-6 gap-2 print:hidden overflow-x-auto pb-1" id="workbook-navigation-tabs">
          <button
            id="tab-summary-click"
            onClick={() => setActiveTab('summary')}
            className={`px-5 py-3 font-black text-xs tracking-widest uppercase text-center transition-all border-2 ${
              activeTab === 'summary'
                ? 'bg-black text-white border-black'
                : 'bg-white text-black border-slate-300 hover:border-black'
            }`}
          >
            {t.tabSummary}
          </button>
          <button
            id="tab-inputs-click"
            onClick={() => setActiveTab('inputs')}
            className={`px-5 py-3 font-black text-xs tracking-widest uppercase text-center transition-all border-2 ${
              activeTab === 'inputs'
                ? 'bg-black text-white border-black'
                : 'bg-white text-black border-slate-300 hover:border-black'
            }`}
          >
            {t.tabInputs}
          </button>
          <button
            id="tab-spending-click"
            onClick={() => setActiveTab('spending')}
            className={`px-5 py-3 font-black text-xs tracking-widest uppercase text-center transition-all border-2 ${
              activeTab === 'spending'
                ? 'bg-black text-white border-black'
                : 'bg-white text-black border-slate-300 hover:border-black'
            }`}
          >
            {t.tabSpending}
          </button>
          <button
            id="tab-tenants-click"
            onClick={() => setActiveTab('tenants')}
            className={`px-5 py-3 font-black text-xs tracking-widest uppercase text-center transition-all border-2 ${
              activeTab === 'tenants'
                ? 'bg-black text-white border-black'
                : 'bg-white text-black border-slate-300 hover:border-black'
            }`}
          >
            {t.tabTenants}
          </button>
          <button
            id="tab-reports-click"
            onClick={() => setActiveTab('reports')}
            className={`px-5 py-3 font-black text-xs tracking-widest uppercase text-center transition-all border-2 ${
              activeTab === 'reports'
                ? 'bg-black text-white border-black'
                : 'bg-white text-black border-slate-300 hover:border-black'
            }`}
          >
            {lang === 'MK' ? 'Извештаи' : 'Reports'}
          </button>
          <button
            id="tab-balance-click"
            onClick={() => setActiveTab('balance')}
            className={`px-5 py-3 font-black text-xs tracking-widest uppercase text-center transition-all border-2 ${
              activeTab === 'balance'
                ? 'bg-black text-white border-black'
                : 'bg-white text-black border-slate-300 hover:border-black'
            }`}
          >
            {t.tabBalance}
          </button>
          <button
            id="tab-debtors-click"
            onClick={() => setActiveTab('debtors')}
            className={`px-5 py-3 font-black text-xs tracking-widest uppercase text-center transition-all border-2 ${
              activeTab === 'debtors'
                ? 'bg-black text-white border-black'
                : 'bg-red-50 text-red-950 border-red-200 hover:border-red-500 hover:bg-red-100/50'
            }`}
          >
            {lang === 'MK' ? 'ДОЛЖНИЦИ (ИСТОРИЈА)' : 'DEBTORS HISTORY'}
          </button>
          <button
            id="tab-tmobile-click"
            onClick={() => setActiveTab('tmobile')}
            className={`px-5 py-3 font-black text-xs tracking-widest uppercase text-center transition-all border-2 ${
              activeTab === 'tmobile'
                ? 'bg-black text-white border-black'
                : 'bg-indigo-50 text-indigo-950 border-indigo-200 hover:border-indigo-500'
            }`}
          >
            {lang === 'MK' ? 'Т-Мобиле' : 'T-Mobile'}
          </button>
          <button
            id="tab-portal-click"
            onClick={() => setActiveTab('portal')}
            className={`px-5 py-3 font-black text-xs tracking-widest uppercase text-center transition-all border-2 ${
              activeTab === 'portal'
                ? 'bg-amber-500 text-slate-950 border-black font-extrabold shadow-md'
                : 'bg-amber-50 text-amber-950 border-amber-200 hover:border-amber-500'
            }`}
          >
            {lang === 'MK' ? '🌐 ЈАВЕН ПОРТАЛ (УРЕДУВАЊЕ)' : '🌐 PUBLIC PORTAL (EDIT)'}
          </button>
        </div>

        {/* Tab content frames */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab + activeMonthId}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.12 }}
            className="print:p-0 print:m-0"
          >
            {activeTab === 'summary' && (
              <MonthlySummary
                invoices={activeInvoices}
                onUpdatePayment={handleUpdatePayment}
                onBulkUpdatePayments={handleBulkUpdatePayments}
                onSelectUnitInvoice={setSelectedInvoice}
                onSelectBulkPrint={() => setShowBulkPrint(true)}
                lang={lang}
                onUpdatePreJunePayment={handleUpdatePreJunePayment}
                activeMonthId={activeMonthId}
                startingMonthId={startMonthId}
                units={units}
                monthlyVariables={currentVariables}
                apartmentFixedRatePerM2={config.apartmentFixedRatePerM2}
                storeFixedRatePerM2={config.storeFixedRatePerM2}
                calculatedInvoicesByMonth={calculatedInvoicesByMonth}
              />
            )}

            {activeTab === 'inputs' && (
              <InvoiceInputForm
                calculatedInvoicesByMonth={calculatedInvoicesByMonth}
                activeMonthId={activeMonthId}
                variables={currentVariables}
                onUpdateVariables={handleUpdateVariables}
                lang={lang}
                apartmentFixedRatePerM2={config.apartmentFixedRatePerM2}
                storeFixedRatePerM2={config.storeFixedRatePerM2}
                onUpdateFixedRates={handleUpdateFixedRates}
                openingBalances={openingBalances}
                onUpdateOpeningBalances={handleUpdateOpeningBalances}
                startingMonthId={startMonthId}
                googleClientId={config.googleClientId}
                onUpdateGoogleClientId={handleUpdateGoogleClientId}
              />
            )}

            {activeTab === 'tenants' && (
              <TenantList
                units={units}
                startingDebts={activeStartingDebts}
                onUpdateStartingDebt={handleUpdateStartingDebt}
                onBulkUpdateStartingDebts={handleBulkUpdateStartingDebts}
                onResetAllStartingDebtsToZero={handleResetAllStartingDebtsToZero}
                onUpdateTenantName={handleUpdateTenantName}
                onUpdateTenantEmail={handleUpdateTenantEmail}
                lang={lang}
                apartmentFixedRatePerM2={config.apartmentFixedRatePerM2}
                storeFixedRatePerM2={config.storeFixedRatePerM2}
                activeMonthId={activeMonthId}
                startingMonthId={startMonthId}
              />
            )}

            {activeTab === 'reports' && (
              <Reports
                calculatedInvoicesByMonth={calculatedInvoicesByMonth}
                records={records}
                monthIds={monthIds}
                lang={lang}
                activeYear={activeMonthId.split('-')[0]}
                activeMonthId={activeMonthId}
                apartmentFixedRatePerM2={config.apartmentFixedRatePerM2}
                storeFixedRatePerM2={config.storeFixedRatePerM2}
                openingBalances={openingBalances}
                expenses={expenses}
                balanceOverrides={balanceOverrides}
                onUpdateBalanceOverrides={setBalanceOverrides}
                onChangeMonth={setActiveMonthId}
                tmobilePaid={tmobilePaid}
                tmobileRates={tmobileRates}
              />
            )}

            {activeTab === 'balance' && (
              <AccountBalance
                calculatedInvoicesByMonth={calculatedInvoicesByMonth}
                records={records}
                monthIds={monthIds}
                expenses={expenses}
                openingBalances={openingBalances}
                onUpdateOpeningBalances={handleUpdateOpeningBalances}
                onResetOpeningBalancesToZero={handleResetOpeningBalancesToZero}
                onResetCurrentBalancesToZero={handleResetCurrentBalancesToZero}
                onResetAllStartingDebtsToZero={handleResetAllStartingDebtsToZero}
                onCompleteResetToZero={handleCompleteResetToZero}
                lang={lang}
                activeMonthId={activeMonthId}
                startingMonthId={startMonthId}
                balanceOverrides={balanceOverrides}
                onUpdateBalanceOverrides={setBalanceOverrides}
                onChangeMonth={setActiveMonthId}
                tmobilePaid={tmobilePaid}
                tmobileRates={tmobileRates}
              />
            )}

            {activeTab === 'spending' && (
              <ExpenseTracker
                expenses={expenses}
                onUpdateExpenses={handleUpdateExpenses}
                monthId={activeMonthId}
                lang={lang}
              />
            )}

            {activeTab === 'tmobile' && (
              <TMobileInvoices
                activeMonthId={activeMonthId}
                lang={lang}
                tmobileRates={tmobileRates}
                tmobileDates={tmobileDates}
                tmobileNos={tmobileNos}
                onUpdateRate={handleUpdateTmobileRate}
                onUpdateDate={handleUpdateTmobileDate}
                onUpdateNo={handleUpdateTmobileNo}
                monthIds={monthIds}
                tmobileInvoiced={tmobileInvoiced}
                tmobilePaid={tmobilePaid}
                tmobilePaidDates={tmobilePaidDates}
                tmobileNotes={tmobileNotes}
                onUpdateInvoiced={handleUpdateTmobileInvoiced}
                onUpdatePaid={handleUpdateTmobilePaid}
                onUpdatePaidDate={handleUpdateTmobilePaidDate}
                onUpdateNote={handleUpdateTmobileNote}
                onSelectMonth={setActiveMonthId}
              />
            )}

            {activeTab === 'debtors' && (
              <DebtorList
                calculatedInvoicesByMonth={calculatedInvoicesByMonth}
                monthIds={monthIds}
                activeMonthId={activeMonthId}
                units={units}
                lang={lang}
                onResetAllStartingDebtsToZero={handleResetAllStartingDebtsToZero}
                onPrintTenant={setPrintTenantItem}
                onPrintFullDebtorsReport={setFullDebtorsPrintList}
              />
            )}

            {activeTab === 'portal' && (
              <PortalAdmin
                lang={lang}
                announcements={announcements}
                onUpdateAnnouncements={setAnnouncements}
                futurePlans={futurePlans}
                onUpdateFuturePlans={setFuturePlans}
                emergencyContacts={emergencyContacts}
                onUpdateEmergencyContacts={setEmergencyContacts}
                reportedIssues={reportedIssues}
                onUpdateReportedIssues={setReportedIssues}
                polls={polls}
                onUpdatePolls={setPolls}
                unitPins={unitPins}
                units={units}
                onRegenerateUnitPin={handleRegenerateUnitPin}
                onRegenerateAllUnitPins={handleRegenerateAllUnitPins}
                adminPin={adminPin}
                onChangePin={setAdminPin}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Full Debtors Summary Report Printing Overlay Modal */}
      {fullDebtorsPrintList && (
        <FullDebtorsPrint
          unitHistoryList={fullDebtorsPrintList}
          units={units}
          activeMonthId={activeMonthId}
          lang={lang}
          onClose={() => setFullDebtorsPrintList(null)}
        />
      )}

      {/* Tenant Debt History Printing Overlay Modal */}
      {printTenantItem && (
        <TenantDebtPrint
          number={printTenantItem.number}
          owner={printTenantItem.owner}
          type={printTenantItem.type}
          history={printTenantItem.history}
          onClose={() => setPrintTenantItem(null)}
          lang={lang}
        />
      )}

      {/* Invoice Printing Overlay Modal */}
      {selectedInvoice && (
        <InvoiceDetail
          invoice={selectedInvoice}
          monthId={activeMonthId}
          monthlyVariables={currentVariables}
          onClose={() => setSelectedInvoice(null)}
          lang={lang}
          apartmentFixedRatePerM2={config.apartmentFixedRatePerM2}
          storeFixedRatePerM2={config.storeFixedRatePerM2}
          calculatedInvoicesByMonth={calculatedInvoicesByMonth}
          units={units}
          expenses={expenses}
          openingBalances={openingBalances}
          monthIds={monthIds}
          balanceOverrides={balanceOverrides}
          tmobilePaid={tmobilePaid}
          tmobileRates={tmobileRates}
        />
      )}

      {/* Bulk Print Overlay Modal */}
      {showBulkPrint && (
        <AllInvoicesPrint
          invoices={activeInvoices}
          monthId={activeMonthId}
          monthlyVariables={currentVariables}
          onClose={() => setShowBulkPrint(false)}
          lang={lang}
          apartmentFixedRatePerM2={config.apartmentFixedRatePerM2}
          storeFixedRatePerM2={config.storeFixedRatePerM2}
          calculatedInvoicesByMonth={calculatedInvoicesByMonth}
          units={units}
          expenses={expenses}
          openingBalances={openingBalances}
          monthIds={monthIds}
          balanceOverrides={balanceOverrides}
          tmobilePaid={tmobilePaid}
          tmobileRates={tmobileRates}
        />
      )}

      {/* Shared Footer info */}
      <footer className="max-w-7xl mx-auto px-8 mt-16 border-t-2 border-black pt-6 text-center text-black text-xs font-black tracking-widest flex justify-between items-center print:hidden uppercase">
        <p>{t.legalFooter}</p>
        <p className="font-mono">© 2026 Vich 28</p>
      </footer>
    </div>
  );
}
