import { useState, useEffect, useMemo } from 'react';
import { Unit, Language } from '../types';
import { Search, Edit2, Check, X, ShieldAlert, Coins } from 'lucide-react';
import { motion } from 'motion/react';
import { formatDenarExact } from '../utils';
import { INITIAL_STARTING_DEBTS } from '../data';

interface TenantListProps {
  units: Unit[];
  startingDebts: Record<string, number>;
  onUpdateStartingDebt: (unitId: string, value: number) => void;
  onBulkUpdateStartingDebts: (updates: { unitId: string, debts: number }[]) => void;
  onResetAllStartingDebtsToZero?: () => void;
  onUpdateTenantName: (unitId: string, newName: string) => void;
  onUpdateTenantEmail?: (unitId: string, email: string, optIn: boolean) => void;
  lang: Language;
  apartmentFixedRatePerM2: number;
  storeFixedRatePerM2: number;
  activeMonthId: string;
  startingMonthId?: string;
}

export default function TenantList({
  units,
  startingDebts,
  onUpdateStartingDebt,
  onBulkUpdateStartingDebts,
  onResetAllStartingDebtsToZero,
  onUpdateTenantName,
  onUpdateTenantEmail,
  lang,
  apartmentFixedRatePerM2,
  storeFixedRatePerM2,
  activeMonthId,
  startingMonthId
}: TenantListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'apartment' | 'store'>('all');
  const [editingUnitId, setEditingUnitId] = useState<string | null>(null);
  const [editingNameId, setEditingNameId] = useState<string | null>(null);
  const [editingEmailId, setEditingEmailId] = useState<string | null>(null);
  const [tempDebtValue, setTempDebtValue] = useState<string>('');
  const [tempNameValue, setTempNameValue] = useState<string>('');
  const [tempEmailValue, setTempEmailValue] = useState<string>('');
  const [tempOptInValue, setTempOptInValue] = useState<boolean>(false);
  const [importText, setImportText] = useState('');
  const [showImport, setShowImport] = useState(false);

  const handleImport = () => {
    if (!importText.trim()) return;
    const lines = importText.split('\n');
    const updates: { unitId: string, debts: number }[] = [];
    const usedUnitIds = new Set<string>();

    lines.forEach(line => {
      if (!line.trim()) return;
      // Split by tab, semicolon, or comma
      const parts = line.split(/[\t,;]+/);
      if (parts.length >= 2) {
        const identifier = parts[0].trim();
        const debtStr = parts[1].trim();
        const debt = parseFloat(debtStr);

        if (!isNaN(debt)) {
          // Try to match by Unit Number first:
          // 1. Try to find an unmatched unit matching unit number
          let unit = units.find(u => u.number.trim().toLowerCase() === identifier.toLowerCase() && !usedUnitIds.has(u.id));
          if (!unit) {
            // Fallback: search by number even if already matched
            unit = units.find(u => u.number.trim().toLowerCase() === identifier.toLowerCase());
          }
          
          if (!unit) {
            // 2. Try to find an unmatched unit matching owner name
            unit = units.find(u => u.owner.trim().toLowerCase() === identifier.toLowerCase() && !usedUnitIds.has(u.id));
          }
          if (!unit) {
            // Fallback: search by owner name even if already matched
            unit = units.find(u => u.owner.trim().toLowerCase() === identifier.toLowerCase());
          }

          if (unit) {
            updates.push({ unitId: unit.id, debts: debt });
            usedUnitIds.add(unit.id);
          }
        }
      }
    });

    if (updates.length > 0) {
      onBulkUpdateStartingDebts(updates);
    }

    setImportText('');
    setShowImport(false);
  };

  const handleResetToDefaultDebts = () => {
    const isConfirmed = window.confirm(
      lang === 'MK' 
        ? 'Дали сте сигурни дека сакате да ги вчитате почетните долгови (од пред Јуни)? Ова ќе ги пребрише тековните почетни долгови.' 
        : 'Are you sure you want to load the starting debts (pre-June)? This will overwrite current starting debts.'
    );
    if (isConfirmed) {
      const updates = units.map(u => ({
        unitId: u.id,
        debts: INITIAL_STARTING_DEBTS[u.id] !== undefined ? INITIAL_STARTING_DEBTS[u.id] : 0
      }));
      onBulkUpdateStartingDebts(updates);
    }
  };

  const handleResetAllDebtsToZero = () => {
    const isConfirmed = window.confirm(
      lang === 'MK' 
        ? 'Дали сте сигурни дека сакате да ги поставите сите почетни долгови за сите сопственици на 0?' 
        : 'Are you sure you want to set all starting debts for all owners to 0?'
    );
    if (isConfirmed) {
      if (onResetAllStartingDebtsToZero) {
        onResetAllStartingDebtsToZero();
      } else {
        const updates = units.map(u => ({ unitId: u.id, debts: 0 }));
        onBulkUpdateStartingDebts(updates);
      }
    }
  };

  const t = {
    MK: {
      title: 'Список на сопственици',
      subtitle: 'Пребарувајте ги сопствениците, уредувајте ги имињата и внесете ги почетните долгови.',
      searchPlaceholder: 'Пребарај по име или број на стан/локал...',
      filterAll: 'Сите објекти',
      filterApartments: 'Станови (1-68)',
      filterStores: 'Дуќани (Д1-Д8)',
      colUnit: 'Број',
      colOwner: 'Сопственик',
      colEmail: 'Е-пошта / Известувања',
      colArea: 'Квадратура',
      colFixedRate: 'Фиксна стапка',
      colShareAll: 'Учество (%)',
      colShareElec: 'Учество со струја (%)',
      colStartingDebt: 'Почетен долг (пред јуни 2026 г.)',
      editDebt: 'Уреди долг',
      editName: 'Уреди име',
      editEmail: 'Уреди е-пошта',
      optInLabel: 'Праќај по е-пошта',
      noEmail: 'Нема внесено е-пошта',
      optedInBadge: 'ОПТИРАН',
      optedOutBadge: 'ИСКЛУЧЕН',
      save: 'Зачувај',
      cancel: 'Откажи',
      totalStartingDebts: 'Вкупен почетен долг',
      apartmentsCount: 'Станови',
      storesCount: 'Дуќани',
      empty: 'Не се пронајдени сопственици за внесеното пребарување.',
      apartmentLabel: 'Стан',
      storeLabel: 'Дуќан',
      importBtn: 'Увези долгови (Ексел)',
      resetBtn: 'Вчитај стандардни долгови',
      importTitle: 'Масовен увоз на почетните долгови за јуни 2026 г. (копирајте од Excel / Google Sheets)',
      importPlaceholder: 'Внесете редови во формат: [Број на Стан] [Долг]\nПример:\n1\t1500\nД1\t-500',
      importSubmit: 'Процесирај увоз'
    },
    EN: {
      title: 'Tenant List',
      subtitle: 'Search owners, edit names, and input starting debts.',
      searchPlaceholder: 'Search by owner name or unit number...',
      filterAll: 'All Units',
      filterApartments: 'Apartments (1-68)',
      filterStores: 'Stores (Д1-Д8)',
      colUnit: 'No.',
      colOwner: 'Owner',
      colEmail: 'Email & Notifications',
      colArea: 'Area',
      colFixedRate: 'Fixed Rate',
      colShareAll: 'Share (%)',
      colShareElec: 'Share w/ Elec (%)',
      colStartingDebt: 'Starting Debt (Pre-June)',
      editDebt: 'Edit Debt',
      editName: 'Edit Name',
      editEmail: 'Edit Email',
      optInLabel: 'Opt-in for email',
      noEmail: 'No email specified',
      optedInBadge: 'OPTED-IN',
      optedOutBadge: 'OFF',
      save: 'Save',
      cancel: 'Cancel',
      totalStartingDebts: 'Total Starting Debt',
      apartmentsCount: 'Apartments',
      storesCount: 'Stores',
      empty: 'No tenants matching your search query found.',
      apartmentLabel: 'Apartment',
      storeLabel: 'Store',
      importBtn: 'Import Debts (Excel)',
      resetBtn: 'Reset to Standard Debts',
      importTitle: 'Bulk Import Starting Debts for June 2026 (paste from Excel / Google Sheets)',
      importPlaceholder: 'Enter lines in format: [Unit Number] [Debt]\nExample:\n1\t1500\nД1\t-500',
      importSubmit: 'Process Import'
    }
  }[lang];

  const filteredUnits = useMemo(() => {
    return (units || []).filter((unit) => {
      const matchesSearch =
        unit.owner.toLowerCase().includes(searchQuery.toLowerCase()) ||
        unit.number.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = filterType === 'all' || unit.type === filterType;
      return matchesSearch && matchesType;
    }).sort((a, b) => {
      if (a.type !== b.type) return a.type === 'apartment' ? -1 : 1;
      return a.number.localeCompare(b.number, undefined, { numeric: true, sensitivity: 'base' });
    });
  }, [units, searchQuery, filterType]);

  const handleStartEdit = (unit: Unit) => {
    setEditingUnitId(unit.id);
    setTempDebtValue((startingDebts[unit.id] || 0).toString());
  };

  const handleStartNameEdit = (unit: Unit) => {
    setEditingNameId(unit.id);
    setTempNameValue(unit.owner);
  };

  const handleSave = (unitId: string) => {
    const numericValue = parseFloat(tempDebtValue);
    onUpdateStartingDebt(unitId, isNaN(numericValue) ? 0 : numericValue);
    setEditingUnitId(null);
  };

  const handleSaveName = (unitId: string) => {
    onUpdateTenantName(unitId, tempNameValue.trim());
    setEditingNameId(null);
  };

  const handleStartEmailEdit = (unit: Unit) => {
    setEditingEmailId(unit.id);
    setTempEmailValue(unit.email || '');
    setTempOptInValue(!!unit.emailOptIn);
  };

  const handleSaveEmail = (unitId: string) => {
    if (onUpdateTenantEmail) {
      onUpdateTenantEmail(unitId, tempEmailValue.trim(), tempOptInValue);
    }
    setEditingEmailId(null);
  };

  const totalStartingDebtSum = units.reduce((acc, unit) => acc + (startingDebts[unit.id] || 0), 0);
  const apartmentsTotal = units.filter(u => u.type === 'apartment').length;
  const storesTotal = units.filter(u => u.type === 'store').length;

  const isStartingMonth = activeMonthId === (startingMonthId || '2026-06');

  return (
    <div className="space-y-6" id="tenant-list-section">
      {/* Overview Analytics Banner */}
      <div className={`grid grid-cols-1 ${isStartingMonth ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-5`}>
        {isStartingMonth && (
          <div className="bg-black text-white p-6 border-b-8 border-yellow-500 flex items-center space-x-4">
            <div className="p-3 bg-white/10 text-white">
              <Coins className="w-6 h-6 shrink-0" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t.totalStartingDebts}</p>
              <p className="text-2xl md:text-3xl font-black font-mono tracking-tight mt-0.5">{formatDenarExact(totalStartingDebtSum, lang)}</p>
            </div>
          </div>
        )}

        <div className="bg-black text-white p-6 border-b-8 border-blue-600 flex items-center space-x-4">
          <div className="p-3 bg-white/10 text-white">
            <span className="font-mono font-black text-2xl leading-none">68</span>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t.apartmentsCount}</p>
            <p className="text-[10px] font-black uppercase tracking-wide text-slate-350 mt-1">4,868 m² total area</p>
          </div>
        </div>

        <div className="bg-black text-white p-6 border-b-8 border-emerald-500 flex items-center space-x-4">
          <div className="p-3 bg-white/10 text-white">
            <span className="font-mono font-black text-2xl leading-none">8</span>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t.storesCount}</p>
            <p className="text-[10px] font-black uppercase tracking-wide text-slate-355 mt-1">321 m² total area</p>
          </div>
        </div>
      </div>

      {isStartingMonth && (
        <div className="bg-slate-100 border-2 border-black p-4 flex flex-col gap-3 font-sans" id="starting-balances-import-container">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-black uppercase text-black">
                {lang === 'MK' ? '⚙️ АЛАТКИ ЗА ПОЧЕТЕН БИЛАНС (ЈУНИ 2026):' : '⚙️ INITIAL BALANCE TOOLS (JUNE 2026):'}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                id="toggle-import-btn"
                onClick={() => setShowImport(!showImport)}
                className="px-3 py-1.5 bg-yellow-400 hover:bg-yellow-500 border-2 border-black font-black text-xs uppercase text-black flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <span>📥</span>
                {t.importBtn}
              </button>
              <button
                id="reset-zero-debts-btn"
                onClick={handleResetAllDebtsToZero}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 border-2 border-black font-black text-xs uppercase text-white flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <span>🧹</span>
                {lang === 'MK' ? 'Постави ги сите долгови на 0' : 'Reset All Debts to 0'}
              </button>
              <button
                id="reset-default-debts-btn"
                onClick={handleResetToDefaultDebts}
                className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 border-2 border-black font-black text-xs uppercase text-slate-800 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <span>🔄</span>
                {t.resetBtn}
              </button>
            </div>
          </div>

          {showImport && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-4 border-2 border-black space-y-3 mt-1"
              id="import-debts-panel"
            >
              <h4 className="text-xs font-black uppercase tracking-wider text-black">{t.importTitle}</h4>
              <textarea
                id="import-debts-textarea"
                rows={4}
                className="w-full p-2 border-2 border-black font-mono text-xs focus:outline-hidden"
                placeholder={t.importPlaceholder}
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
              />
              <div className="flex justify-end gap-2">
                <button
                  id="cancel-import-action"
                  onClick={() => setShowImport(false)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border-2 border-black font-black text-[11px] uppercase text-slate-700 cursor-pointer"
                >
                  {t.cancel}
                </button>
                <button
                  id="confirm-import-action"
                  onClick={handleImport}
                  className="px-4 py-1.5 bg-emerald-400 hover:bg-emerald-500 border-2 border-black font-black text-[11px] uppercase text-black cursor-pointer"
                >
                  {t.importSubmit}
                </button>
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* Inputs and Filters */}
      <div className="bg-white p-6 border-2 border-black flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-black w-5 h-5 animate-pulse" />
          <input
            id="tenant-search"
            type="text"
            placeholder={t.searchPlaceholder}
            className="w-full pl-11 pr-4 py-3 border-2 border-black bg-white focus:outline-hidden focus:ring-0 text-xs font-bold font-mono uppercase text-black placeholder-slate-400"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Filter Buttons */}
        <div className="flex bg-slate-200 p-1 border-2 border-black self-start md:self-auto">
          <button
            id="filter-all-btn"
            onClick={() => setFilterType('all')}
            className={`px-4 py-2 font-black uppercase text-xs tracking-widest transition-all ${
              filterType === 'all'
                ? 'bg-black text-white shadow-none'
                : 'text-black hover:bg-slate-300'
            }`}
          >
            {t.filterAll}
          </button>
          <button
            id="filter-ap-btn"
            onClick={() => setFilterType('apartment')}
            className={`px-4 py-2 font-black uppercase text-xs tracking-widest transition-all ${
              filterType === 'apartment'
                ? 'bg-black text-white shadow-none'
                : 'text-black hover:bg-slate-300'
            }`}
          >
            {t.filterApartments}
          </button>
          <button
            id="filter-store-btn"
            onClick={() => setFilterType('store')}
            className={`px-4 py-2 font-black uppercase text-xs tracking-widest transition-all ${
              filterType === 'store'
                ? 'bg-black text-white shadow-none'
                : 'text-black hover:bg-slate-300'
            }`}
          >
            {t.filterStores}
          </button>
        </div>
      </div>

      {/* Tenant Table */}
      <div className="bg-white border-2 border-black overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse" id="tenant-table">
            <thead>
              <tr className="bg-slate-100 border-b-2 border-black text-black font-black text-xs uppercase tracking-widest">
                <th className="py-4 px-6 text-center w-20">{t.colUnit}</th>
                <th className="py-4 px-6 min-w-[180px]">{t.colOwner}</th>
                <th className="py-4 px-6 min-w-[250px]">{t.colEmail}</th>
                <th className="py-4 px-6">{t.colArea}</th>
                <th className="py-4 px-6">{t.colFixedRate}</th>
                <th className="py-4 px-6 text-center">{t.colShareAll}</th>
                <th className="py-4 px-6 text-center">{t.colShareElec}</th>
                {isStartingMonth && <th className="py-4 px-6 text-right pr-10">{t.colStartingDebt}</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs text-black">
              {filteredUnits.length === 0 ? (
                <tr>
                  <td colSpan={isStartingMonth ? 8 : 7} className="py-10 text-center text-slate-500 font-bold uppercase tracking-wider">
                    <div className="flex flex-col items-center justify-center space-y-2 animate-pulse">
                      <ShieldAlert className="w-8 h-8 text-black" />
                      <p>{t.empty}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredUnits.map((unit) => {
                  const isApartment = unit.type === 'apartment';
                  // Calculate exact share % (per data.ts formulas)
                  const shareAll = ((unit.area / 5189) * 100).toFixed(2);
                  const shareElec = isApartment ? ((unit.area / 4868) * 100).toFixed(2) : '0.00';
                  const isEditing = editingUnitId === unit.id;
                  const currentDebt = startingDebts[unit.id] || 0;

                  return (
                    <tr key={unit.id} className="hover:bg-slate-100 transition-all font-mono">
                      {/* Unit No. */}
                      <td className="py-3 px-6 text-center font-bold">
                        <span className={`inline-block px-2.5 py-1 text-[11px] font-black border border-black ${
                          isApartment 
                            ? 'bg-blue-200 text-black' 
                            : 'bg-amber-300 text-black font-mono italic'
                        }`}>
                          {unit.number}
                        </span>
                      </td>

                      {/* Owner */}
                      <td className="py-3 px-6 font-sans text-black">
                        {editingNameId === unit.id ? (
                          <div className="flex items-center space-x-2">
                            <input
                              type="text"
                              className="w-full px-2 py-1 border-2 border-black bg-white focus:outline-hidden text-xs font-black"
                              value={tempNameValue}
                              onChange={(e) => setTempNameValue(e.target.value)}
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveName(unit.id);
                                if (e.key === 'Escape') setEditingNameId(null);
                              }}
                            />
                            <button
                              onClick={() => handleSaveName(unit.id)}
                              className="p-1 border-2 border-black bg-emerald-400 text-black hover:bg-emerald-500 transition-all font-black text-[10px]"
                            >
                              <Check className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => setEditingNameId(null)}
                              className="p-1 border-2 border-black bg-rose-400 text-black hover:bg-rose-500 transition-all font-black text-[10px]"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between group">
                            <span className="font-black">{unit.owner}</span>
                            <button
                              onClick={() => handleStartNameEdit(unit)}
                              className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-black transition-all bg-slate-50 hover:bg-yellow-400 border border-transparent hover:border-black"
                              title={t.editName}
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                        <span className="md:hidden block text-[10px] font-mono text-slate-400 mt-0.5 uppercase tracking-wide font-bold">
                          {isApartment ? t.apartmentLabel : t.storeLabel} • {unit.area} m²
                        </span>
                      </td>

                      {/* Email & Notifications */}
                      <td className="py-3 px-6 font-sans text-black min-w-[250px]">
                        {editingEmailId === unit.id ? (
                          <div className="flex flex-col space-y-2 max-w-[280px]">
                            <input
                              type="email"
                              className="w-full px-2 py-1 border-2 border-black bg-white focus:outline-hidden text-xs font-mono font-bold"
                              placeholder="name@example.com"
                              value={tempEmailValue}
                              onChange={(e) => setTempEmailValue(e.target.value)}
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveEmail(unit.id);
                                if (e.key === 'Escape') setEditingEmailId(null);
                              }}
                            />
                            <div className="flex items-center justify-between gap-2">
                              <label className="flex items-center space-x-1.5 cursor-pointer text-[11px] font-black uppercase text-slate-700 select-none">
                                <input
                                  type="checkbox"
                                  className="w-3.5 h-3.5 border-2 border-black text-black accent-black cursor-pointer"
                                  checked={tempOptInValue}
                                  onChange={(e) => setTempOptInValue(e.target.checked)}
                                />
                                <span>{t.optInLabel}</span>
                              </label>
                              <div className="flex items-center space-x-1">
                                <button
                                  onClick={() => handleSaveEmail(unit.id)}
                                  className="p-1 px-1.5 border-2 border-black bg-emerald-400 text-black hover:bg-emerald-500 transition-all font-black"
                                >
                                  <Check className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => setEditingEmailId(null)}
                                  className="p-1 px-1.5 border-2 border-black bg-rose-400 text-black hover:bg-rose-500 transition-all font-black"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between group max-w-[280px]">
                            <div className="flex flex-col space-y-1">
                              {unit.email ? (
                                <span className="font-mono font-bold text-slate-800 break-words select-text">{unit.email}</span>
                              ) : (
                                <span className="font-sans italic text-slate-400 text-[11px]">{t.noEmail}</span>
                              )}
                              {unit.email && (
                                <span className={`inline-block self-start px-1.5 py-0.5 text-[9px] font-black border border-black leading-none ${
                                  unit.emailOptIn 
                                    ? 'bg-emerald-200 text-black' 
                                    : 'bg-slate-100 text-slate-500'
                                }`}>
                                  {unit.emailOptIn ? t.optedInBadge : t.optedOutBadge}
                                </span>
                              )}
                            </div>
                            <button
                              onClick={() => handleStartEmailEdit(unit)}
                              className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-black transition-all bg-slate-50 hover:bg-yellow-400 border border-transparent hover:border-black cursor-pointer"
                              title={t.editEmail}
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </td>

                      {/* Area */}
                      <td className="py-3 px-6 text-slate-700 font-bold">
                        {unit.area} m²
                      </td>

                      {/* Fixed Charge */}
                      <td className="py-3 px-6 text-slate-700 font-bold">
                        {isApartment 
                          ? `${unit.area} x ${apartmentFixedRatePerM2} = ${Math.round(unit.area * apartmentFixedRatePerM2)} ДЕН`
                          : `${unit.area} x ${storeFixedRatePerM2} = ${Math.round(unit.area * storeFixedRatePerM2)} ДЕН`}
                      </td>

                      {/* General Share % */}
                      <td className="py-3 px-6 text-center text-slate-600 font-bold text-xs">
                        {shareAll}%
                      </td>

                      {/* Electricity/Elevator Share % */}
                      <td className="py-3 px-6 text-center text-slate-600 font-bold text-xs">
                        {isApartment ? `${shareElec}%` : '—'}
                      </td>

                      {/* Starting Debt Edit */}
                      {isStartingMonth && (
                        <td className="py-2 px-6 text-right pr-6">
                          {isEditing ? (
                            <div className="flex items-center justify-end space-x-1.5" id={`edit-starting-debt-${unit.id}`}>
                              <input
                                type="number"
                                className="w-24 px-2 py-1.5 border-2 border-black bg-white focus:outline-hidden text-right text-xs font-mono font-black"
                                value={tempDebtValue}
                                onChange={(e) => setTempDebtValue(e.target.value)}
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSave(unit.id);
                                  if (e.key === 'Escape') setEditingUnitId(null);
                                }}
                              />
                              <button
                                id={`save-debt-${unit.id}`}
                                onClick={() => handleSave(unit.id)}
                                className="p-1 px-2 border-2 border-black text-black bg-emerald-400 hover:bg-emerald-500 transition-all font-black uppercase text-xs cursor-pointer"
                                title={t.save}
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                id={`cancel-debt-${unit.id}`}
                                onClick={() => setEditingUnitId(null)}
                                className="p-1 px-2 border-2 border-black text-black bg-rose-400 hover:bg-rose-500 transition-all font-black uppercase text-xs cursor-pointer"
                                title={t.cancel}
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end space-x-4 group">
                              <span className={`font-mono font-black ${
                                currentDebt > 0 
                                  ? 'text-rose-600 font-black' 
                                  : currentDebt < 0 
                                    ? 'text-emerald-700 font-black' 
                                    : 'text-slate-400 font-normal'
                              }`}>
                                {formatDenarExact(currentDebt, lang)}
                              </span>
                              <button
                                id={`edit-debt-btn-${unit.id}`}
                                onClick={() => handleStartEdit(unit)}
                                className="px-2 py-1 text-[11px] font-black text-black bg-slate-100 hover:bg-yellow-400 border border-black transition-all cursor-pointer inline-flex items-center space-x-1"
                                title={t.editDebt}
                              >
                                <Edit2 className="w-3 h-3" />
                                <span className="text-[10px] uppercase tracking-wider font-extrabold">{t.save}</span>
                              </button>
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
