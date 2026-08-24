import React, { useState } from 'react';
import { 
  Building, Megaphone, Compass, Landmark, PhoneCall, Send, Lock, 
  CheckCircle2, AlertTriangle, Clock, ShieldCheck, FileText, ChevronRight,
  User, Mail, Phone, Wrench, Sparkles, AlertCircle, Info, Calendar, X, ZoomIn
} from 'lucide-react';
import { Announcement, FuturePlan, EmergencyContact, ReportedIssue, Unit, Expense, Language, Poll } from '../types';
import { Vote, Check, ShieldAlert, Award, BarChart3, HelpCircle } from 'lucide-react';
import { formatDenarExact } from '../utils';

interface PublicPortalProps {
  lang: Language;
  announcements: Announcement[];
  futurePlans: FuturePlan[];
  emergencyContacts: EmergencyContact[];
  reportedIssues: ReportedIssue[];
  polls?: Poll[];
  unitPins?: Record<string, string>;
  onVotePoll?: (pollId: string, apartmentNo: string, inputPin: string, optionIndex: number) => { success: boolean; message: string };
  onReportIssue: (issue: Omit<ReportedIssue, 'id' | 'date' | 'status'>) => void;
  units: Unit[];
  expenses: Expense[];
  openingBalances: { bank: number; reserve: number };
  balanceOverrides?: Record<string, { bank?: number; reserve?: number; operating?: number }> | null;
  activeMonthId: string;
  startingMonthId: string;
  records: Record<string, any>;
  onOpenAdminModal: () => void;
}

export default function PublicPortal({
  lang,
  announcements,
  futurePlans,
  emergencyContacts,
  reportedIssues,
  polls = [],
  unitPins = {},
  onVotePoll,
  onReportIssue,
  units,
  expenses,
  openingBalances,
  balanceOverrides,
  activeMonthId,
  records,
  onOpenAdminModal
}: PublicPortalProps) {
  const [activeTab, setActiveTab] = useState<'announcements' | 'polls' | 'plans' | 'contacts' | 'report'>('announcements');
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);

  // Voting Form State per Poll
  const [selectedOptions, setSelectedOptions] = useState<Record<string, number>>({});
  const [voteAptNos, setVoteAptNos] = useState<Record<string, string>>({});
  const [votePins, setVotePins] = useState<Record<string, string>>({});
  const [voteMsg, setVoteMsg] = useState<Record<string, { type: 'success' | 'error'; text: string }>>({});

  // Issue Form State
  const [apartmentNo, setApartmentNo] = useState('');
  const [residentName, setResidentName] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [issueType, setIssueType] = useState('Лифт');
  const [description, setDescription] = useState('');
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  const handleSubmitIssue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!apartmentNo || !description) {
      alert(lang === 'MK' ? 'Ве молиме пополнете број на стан и опис на проблемот.' : 'Please fill in apartment number and description.');
      return;
    }
    onReportIssue({
      apartmentNo,
      name: residentName || 'Анонимен',
      contact: contactInfo || 'Нема контакт',
      issueType,
      description
    });
    setSubmittedSuccess(true);
    setApartmentNo('');
    setResidentName('');
    setContactInfo('');
    setDescription('');
    setTimeout(() => setSubmittedSuccess(false), 5000);
  };

  // Calculate live financial summary for public view
  const currentMonthRecord = records[activeMonthId];
  const monthlyPaymentsObj = currentMonthRecord?.payments || {};
  const currentMonthIncome: number = Object.values(monthlyPaymentsObj).reduce<number>((sum, val) => sum + (Number(val) || 0), 0);

  // Current month expenses
  const currentMonthExpenses = expenses
    .filter(e => e.monthId === activeMonthId)
    .reduce((sum, e) => sum + e.amount, 0);

  // Calculated current balances
  const totalReserveExpense = expenses.filter(e => e.fundType === 'reserve').reduce((sum, e) => sum + e.amount, 0);
  const totalOperatingExpense = expenses.filter(e => e.fundType === 'current').reduce((sum, e) => sum + e.amount, 0);

  // Estimate total payments accumulated
  let totalPaymentsAccumulated = 0;
  Object.values(records).forEach((r: any) => {
    if (r && r.payments) {
      Object.values(r.payments).forEach((amt: any) => {
        totalPaymentsAccumulated += (Number(amt) || 0);
      });
    }
  });

  const overrideForMonth = balanceOverrides?.[activeMonthId];
  const calculatedBankBalance = (openingBalances.bank || 0) + totalPaymentsAccumulated - (totalReserveExpense + totalOperatingExpense);
  const finalBankBalance = overrideForMonth?.bank !== undefined ? overrideForMonth.bank : calculatedBankBalance;

  const calculatedReserveBalance = (openingBalances.reserve || 0) + (totalPaymentsAccumulated * 0.2) - totalReserveExpense;
  const finalReserveBalance = overrideForMonth?.reserve !== undefined ? overrideForMonth.reserve : calculatedReserveBalance;

  const finalOperatingBalance = overrideForMonth?.operating !== undefined 
    ? overrideForMonth.operating 
    : (finalBankBalance - finalReserveBalance);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 pb-20">
      {/* Top Banner & Public Header */}
      <header className="bg-slate-900 text-white border-b-4 border-amber-500 shadow-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            
            {/* Building Identity */}
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-400 p-0.5 shadow-lg shrink-0">
                <div className="w-full h-full bg-slate-900 rounded-[10px] flex items-center justify-center">
                  <Building className="w-6 h-6 text-amber-400" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-black uppercase tracking-wider rounded">
                    Јавен веб портал
                  </span>
                  <span className="text-xs text-slate-400 font-medium">ул. „Вич“ бр. 28</span>
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Заедница на сопственици Вич 28 Скопје
                </h1>
              </div>
            </div>

            {/* Quick Admin Access Button */}
            <div className="flex items-center gap-3">
              <button
                onClick={onOpenAdminModal}
                className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs uppercase tracking-wider rounded-lg border border-amber-400 shadow-md flex items-center gap-2 transition-all cursor-pointer hover:scale-105"
              >
                <Lock className="w-4 h-4" />
                <span>Управување / АДМИН</span>
              </button>
            </div>

          </div>

          {/* Navigation Bar */}
          <nav className="flex items-center gap-2 mt-6 overflow-x-auto pb-1 scrollbar-none border-t border-slate-800 pt-3">
            <button
              onClick={() => setActiveTab('announcements')}
              className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                activeTab === 'announcements'
                  ? 'bg-amber-500 text-slate-950 shadow-md font-extrabold'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Megaphone className="w-4 h-4" />
              <span>Соопштенија</span>
              {announcements.length > 0 && (
                <span className="ml-1 px-1.5 py-0.2 bg-slate-950/40 text-amber-200 text-[10px] rounded-full">
                  {announcements.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('polls')}
              className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                activeTab === 'polls'
                  ? 'bg-amber-500 text-slate-950 shadow-md font-extrabold'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Vote className="w-4 h-4 text-amber-300" />
              <span>Гласање и Анкети</span>
              {polls.filter(p => p.status === 'active').length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 bg-amber-400 text-slate-950 font-extrabold text-[10px] rounded-full animate-pulse">
                  {polls.filter(p => p.status === 'active').length} Активни
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('plans')}
              className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                activeTab === 'plans'
                  ? 'bg-amber-500 text-slate-950 shadow-md font-extrabold'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Compass className="w-4 h-4" />
              <span>Идни планови и проекти</span>
            </button>

            <button
              onClick={() => setActiveTab('contacts')}
              className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                activeTab === 'contacts'
                  ? 'bg-amber-500 text-slate-950 shadow-md font-extrabold'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <PhoneCall className="w-4 h-4" />
              <span>Итни контакти и куќен Ред</span>
            </button>

            <button
              onClick={() => setActiveTab('report')}
              className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                activeTab === 'report'
                  ? 'bg-rose-600 text-white shadow-md font-extrabold'
                  : 'text-rose-300 hover:bg-rose-950/50 hover:text-white border border-rose-800/50'
              }`}
            >
              <Send className="w-4 h-4" />
              <span>Пријави проблем</span>
            </button>
          </nav>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Quick Highlights Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <div className="bg-white border-2 border-slate-200 rounded-xl p-4 shadow-sm flex items-center gap-3">
            <div className="p-3 bg-amber-100 text-amber-700 rounded-lg">
              <Building className="w-6 h-6" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Вкупно станови и локали</div>
              <div className="text-xl font-black text-slate-900">76 Единици</div>
            </div>
          </div>

          <div className="bg-white border-2 border-slate-200 rounded-xl p-4 shadow-sm flex items-center gap-3">
            <div className="p-3 bg-rose-100 text-rose-700 rounded-lg">
              <Megaphone className="w-6 h-6" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Актуелни известувања</div>
              <div className="text-xl font-black text-slate-900">{announcements.length} Активни</div>
            </div>
          </div>
        </div>

        {/* TAB 1: ANNOUNCEMENTS */}
        {activeTab === 'announcements' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                  <Megaphone className="w-6 h-6 text-amber-500" />
                  Соопштенија и  aктуелности за станарите
                </h2>
                <p className="text-sm text-slate-600 mt-1">
                  Овде се објавуваат сите важни известувања за сервис, дефекти, заеднички состаноци и чистење.
                </p>
              </div>
            </div>

            {announcements.length === 0 ? (
              <div className="bg-white border-2 border-dashed border-slate-300 rounded-2xl p-12 text-center text-slate-500">
                <Info className="w-10 h-10 mx-auto text-slate-400 mb-3" />
                <p className="font-bold text-slate-700">Во моментот нема активни соопштенија.</p>
                <p className="text-xs text-slate-500 mt-1">Проверете повторно наскоро за нови известувања од куќниот совет.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {announcements.map(ann => (
                  <div 
                    key={ann.id} 
                    className={`bg-white border-2 rounded-2xl p-6 shadow-sm relative overflow-hidden transition-all hover:shadow-md ${
                      ann.priority === 'high' 
                        ? 'border-amber-400 bg-gradient-to-br from-amber-50/50 to-white' 
                        : 'border-slate-200'
                    }`}
                  >
                    {ann.priority === 'high' && (
                      <div className="absolute top-0 right-0 bg-amber-500 text-slate-950 font-black text-[10px] uppercase px-3 py-1 rounded-bl-xl shadow-sm flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Важно / Итно
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-400 mb-2">
                      <Calendar className="w-3.5 h-3.5 text-amber-500" />
                      <span>Објавено: {ann.date}</span>
                      <span className="text-slate-300">•</span>
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded font-semibold text-[11px]">
                        {ann.category}
                      </span>
                    </div>

                    <h3 className="text-lg font-black text-slate-900 mb-2 leading-snug">
                      {ann.title}
                    </h3>

                    <p className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">
                      {ann.content}
                    </p>

                    {ann.imageUrls && ann.imageUrls.length > 0 && (
                      <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-100">
                        {ann.imageUrls.map((img, idx) => (
                          <button 
                            key={idx} 
                            type="button"
                            onClick={() => setLightboxImg(img)}
                            className="group relative h-28 sm:h-36 rounded-xl overflow-hidden border border-slate-200 block bg-slate-900 cursor-pointer text-left w-full"
                          >
                            <img 
                              src={img} 
                              alt={`announcement-img-${idx}`} 
                              className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300 opacity-90 group-hover:opacity-100" 
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all flex items-end p-2.5 text-[11px] text-white font-bold gap-1">
                              <ZoomIn className="w-3.5 h-3.5 text-amber-400" />
                              <span>Зголеми слика</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: POLLS & VOTING */}
        {activeTab === 'polls' && (
          <div className="space-y-8">
            <div className="bg-gradient-to-r from-amber-500/10 via-amber-400/5 to-slate-900/5 p-6 rounded-3xl border-2 border-amber-400/40 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="flex items-start gap-4">
                <div className="p-3.5 bg-amber-500 text-slate-950 rounded-2xl shadow-md shrink-0">
                  <Vote className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                    Дигитално гласање на сопствениците (Закон за домување)
                  </h2>
                  <p className="text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
                    Гласачката моќ се пресметува според квадратурата (м²) на секој стан. Според Законот за домување, одлуката е **успешно донесена ако повеќе од 50%+1 m²** од вкупната површина на сите станови во зградата гласале „ЗА“.
                  </p>
                </div>
              </div>

              <div className="bg-white px-4 py-3 rounded-2xl border border-slate-200 text-xs font-bold text-slate-700 shadow-sm shrink-0 flex items-center gap-2">
                <Lock className="w-4 h-4 text-emerald-600" />
                <span>Гласање според м² (Заштитено со ПИН)</span>
              </div>
            </div>

            {polls.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-3xl border-2 border-dashed border-slate-200 p-8">
                <Vote className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-lg font-black text-slate-700">Моментално нема активни анкети</h3>
                <p className="text-xs text-slate-500 mt-1">Куќниот совет дополнително ќе ве извести кога ќе биде отворено ново гласање.</p>
              </div>
            ) : (
              <div className="space-y-8">
                {polls.map((poll) => {
                  const isActive = poll.status === 'active';
                  const totalVotes = poll.votes.length;
                  const totalUnitsCount = units.length || 76;
                  
                  // Total Building m2 Calculation
                  const totalBuildingM2 = units.reduce((acc, u) => acc + (u.area || 0), 0) || 5776;
                  const majorityM2Needed = Math.floor(totalBuildingM2 / 2) + 1; // 50% + 1 m2

                  // Calculate total m2 voted and per option
                  let totalVotedM2 = 0;
                  const optionM2s: number[] = poll.options.map(() => 0);

                  poll.votes.forEach((v) => {
                    const matchedUnit = units.find(u => u.number.toLowerCase() === v.apartmentNo.toLowerCase());
                    const unitArea = matchedUnit ? (matchedUnit.area || 76) : 76;
                    totalVotedM2 += unitArea;
                    if (optionM2s[v.optionIndex] !== undefined) {
                      optionM2s[v.optionIndex] += unitArea;
                    }
                  });

                  const totalVotedM2Pct = ((totalVotedM2 / totalBuildingM2) * 100).toFixed(1);
                  const yesM2 = optionM2s[0] || 0;
                  const noM2 = optionM2s[1] || 0;

                  const isYesSuccess = yesM2 >= majorityM2Needed;
                  const isNoSuccess = noM2 >= majorityM2Needed;

                  // User inputs for this poll
                  const currentSelectedOpt = selectedOptions[poll.id] ?? 0;
                  const currentApt = voteAptNos[poll.id] || '';
                  const currentPin = votePins[poll.id] || '';
                  const currentMsg = voteMsg[poll.id];

                  // Check if user's entered apartment has already voted on this poll
                  const userMatchedUnit = currentApt ? units.find(u => u.number.toLowerCase() === currentApt.trim().toLowerCase()) : null;
                  const hasAlreadyVoted = userMatchedUnit 
                    ? poll.votes.some(v => v.apartmentNo.toLowerCase() === userMatchedUnit.number.toLowerCase())
                    : false;

                  return (
                    <div 
                      key={poll.id}
                      className={`bg-white border-2 rounded-3xl p-6 sm:p-8 shadow-md relative transition-all ${
                        isActive ? 'border-amber-400 ring-4 ring-amber-400/10' : 'border-slate-200 opacity-90'
                      }`}
                    >
                      {/* Header */}
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4 mb-6">
                        <div className="flex items-center gap-2">
                          <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1.5 ${
                            isActive
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : 'bg-slate-100 text-slate-600 border border-slate-300'
                          }`}>
                            <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-amber-500 animate-ping' : 'bg-slate-400'}`} />
                            <span>{isActive ? 'Активирано гласање' : 'Завршено гласање'}</span>
                          </span>

                          <span className="px-2.5 py-1 bg-slate-100 text-slate-700 text-xs font-bold rounded-lg border border-slate-200">
                            {poll.category === 'capital' ? '🏛️ Капитална инвестиција' : poll.category === 'rules' ? '📜 Куќен ред' : '🔧 Редовно одржување'}
                          </span>
                        </div>

                        <div className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>Период: {poll.startDate} до {poll.endDate}</span>
                        </div>
                      </div>

                      {/* Title & Description */}
                      <h3 className="text-xl sm:text-2xl font-black text-slate-900 mb-2 leading-tight">
                        {poll.title}
                      </h3>
                      <p className="text-sm text-slate-600 mb-6 leading-relaxed">
                        {poll.description}
                      </p>

                      {/* DECISION STATUS BADGE */}
                      <div className={`p-4 rounded-2xl mb-6 border-2 font-black flex items-start gap-3.5 ${
                        isYesSuccess 
                          ? 'bg-emerald-50 border-emerald-400 text-emerald-950 shadow-sm' 
                          : isNoSuccess 
                          ? 'bg-rose-50 border-rose-400 text-rose-950 shadow-sm'
                          : !isActive 
                          ? 'bg-slate-100 border-slate-300 text-slate-800'
                          : 'bg-amber-50 border-amber-300 text-amber-950'
                      }`}>
                        <div className={`p-2 rounded-xl text-white shrink-0 ${
                          isYesSuccess ? 'bg-emerald-600' : isNoSuccess ? 'bg-rose-600' : !isActive ? 'bg-slate-600' : 'bg-amber-600'
                        }`}>
                          {isYesSuccess ? <CheckCircle2 className="w-6 h-6" /> : isNoSuccess ? <X className="w-6 h-6" /> : <Clock className="w-6 h-6" />}
                        </div>

                        <div>
                          <div className="text-base font-extrabold flex items-center gap-2">
                            {isYesSuccess && <span>🎉 ОДЛУКАТА Е УСПЕШНО ДОНЕСЕНА!</span>}
                            {isNoSuccess && <span>❌ ОДЛУКАТА Е ОДБИЕНА</span>}
                            {!isYesSuccess && !isNoSuccess && !isActive && <span>❌ ОДЛУКАТА НЕ ПОСТИГНА ПОВЕЌЕ ОД 50%+1 м²</span>}
                            {!isYesSuccess && !isNoSuccess && isActive && <span>⏳ ГЛАСАЊЕТО Е ВО ТЕК (Се чекаат 50%+1 м²)</span>}
                          </div>

                          <div className="text-xs font-semibold mt-1 leading-relaxed opacity-90">
                            {isYesSuccess && `За предлогот гласаа ${yesM2} m² (${((yesM2/totalBuildingM2)*100).toFixed(1)}% од зградата), што ја преминува законската граница од 50%+1 m² (${majorityM2Needed} m²).`}
                            {isNoSuccess && `Против предлогот гласаа ${noM2} m² (${((noM2/totalBuildingM2)*100).toFixed(1)}% од зградата).`}
                            {!isYesSuccess && !isNoSuccess && !isActive && `Гласањето заврши со ${yesM2} m² „ЗА“ од потребните ${majorityM2Needed} m².`}
                            {!isYesSuccess && !isNoSuccess && isActive && `За усвојување се потребни уште ${Math.max(0, majorityM2Needed - yesM2)} m² „ЗА“ (од вкупно ${totalBuildingM2} m² во зградата).`}
                          </div>
                        </div>
                      </div>

                      {/* Quorum & m2 Progress Bar */}
                      <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl mb-8 space-y-3">
                        <div className="flex flex-wrap items-center justify-between text-xs font-black text-slate-700 gap-2">
                          <span className="flex items-center gap-1.5">
                            <BarChart3 className="w-4 h-4 text-amber-600" />
                            <span>Искористеност на гласачки м²: {totalVotedM2} m² / {totalBuildingM2} m² ({totalVotedM2Pct}%) од {totalVotes} станови</span>
                          </span>

                          <span className="text-[11px] font-mono bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                            Законски праг: <strong>{majorityM2Needed} m²</strong> (&gt;50%+1 m²)
                          </span>
                        </div>

                        {/* Visual Bar showing m2 voted */}
                        <div className="relative w-full bg-slate-200 rounded-full h-4 overflow-hidden flex">
                          {/* Option 0 (ЗА) */}
                          <div 
                            className="bg-emerald-500 h-full transition-all duration-500" 
                            style={{ width: `${(yesM2 / totalBuildingM2) * 100}%` }}
                            title={`ЗА: ${yesM2} m²`}
                          />
                          {/* Option 1 (ПРОТИВ) */}
                          <div 
                            className="bg-rose-500 h-full transition-all duration-500" 
                            style={{ width: `${(noM2 / totalBuildingM2) * 100}%` }}
                            title={`ПРОТИВ: ${noM2} m²`}
                          />
                          {/* Other options */}
                          <div 
                            className="bg-amber-400 h-full transition-all duration-500" 
                            style={{ width: `${((totalVotedM2 - yesM2 - noM2) / totalBuildingM2) * 100}%` }}
                            title={`ВОЗДРЖАНИ: ${totalVotedM2 - yesM2 - noM2} m²`}
                          />
                        </div>

                        <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 pt-1">
                          <span>0 m²</span>
                          <span className="text-amber-700 font-extrabold">▲ Праг за победа: {majorityM2Needed} m² (50%+1)</span>
                          <span>{totalBuildingM2} m² (100%)</span>
                        </div>
                      </div>

                      {/* Voting Section vs Results */}
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        
                        {/* Interactive Voting Box (if poll is active) */}
                        {isActive && (
                          <div className="lg:col-span-6 bg-slate-900 text-white p-6 rounded-2xl border-2 border-slate-800 shadow-lg">
                            <h4 className="text-base font-black text-amber-400 mb-4 flex items-center gap-2">
                              <Vote className="w-5 h-5 text-amber-400" />
                              <span>Дадете го вашиот глас:</span>
                            </h4>

                            {currentMsg && (
                              <div className={`mb-4 p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
                                currentMsg.type === 'success' 
                                  ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-200' 
                                  : 'bg-rose-500/20 border border-rose-500/40 text-rose-200'
                              }`}>
                                {currentMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> : <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />}
                                <span>{currentMsg.text}</span>
                              </div>
                            )}

                            <form 
                              onSubmit={(e) => {
                                e.preventDefault();
                                const cleanApt = currentApt.trim();
                                const cleanPin = currentPin.trim();

                                if (!cleanApt) {
                                  setVoteMsg(prev => ({ ...prev, [poll.id]: { type: 'error', text: 'Ве молиме внесете го бројот на станот.' } }));
                                  return;
                                }

                                if (!cleanPin) {
                                  setVoteMsg(prev => ({ ...prev, [poll.id]: { type: 'error', text: 'Задолжително внесете го ПИН кодот за вашиот стан!' } }));
                                  return;
                                }

                                if (onVotePoll) {
                                  const res = onVotePoll(poll.id, cleanApt, cleanPin, currentSelectedOpt);
                                  if (res.success) {
                                    setVoteMsg(prev => ({ ...prev, [poll.id]: { type: 'success', text: res.message } }));
                                    setVotePins(prev => ({ ...prev, [poll.id]: '' }));
                                    setVoteAptNos(prev => ({ ...prev, [poll.id]: '' }));
                                  } else {
                                    setVoteMsg(prev => ({ ...prev, [poll.id]: { type: 'error', text: res.message } }));
                                  }
                                }
                              }}
                              className="space-y-4"
                            >
                              {/* Options Selection */}
                              <div className="space-y-2">
                                <label className="block text-[10px] font-black text-amber-400 uppercase tracking-wider">
                                  Изберете опција:
                                </label>
                                {poll.options.map((opt, idx) => (
                                  <label 
                                    key={idx}
                                    onClick={() => setSelectedOptions(prev => ({ ...prev, [poll.id]: idx }))}
                                    className={`p-3 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between text-xs font-black ${
                                      currentSelectedOpt === idx 
                                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md font-extrabold' 
                                        : 'bg-slate-800 text-slate-200 border-slate-700 hover:border-slate-600'
                                    }`}
                                  >
                                    <span>{opt}</span>
                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                      currentSelectedOpt === idx ? 'border-slate-950 bg-slate-950 text-amber-400' : 'border-slate-600'
                                    }`}>
                                      {currentSelectedOpt === idx && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                    </div>
                                  </label>
                                ))}
                              </div>

                              {/* Apartment & PIN verification inputs */}
                              <div className="pt-3 border-t border-slate-800 space-y-2">
                                <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-[10px] text-amber-300 font-bold flex items-center gap-1.5">
                                  <span>🔑</span>
                                  <span>Секое ново гласање има свој уникатен 4-цифрен ПИН доставен во вашето поштенско сандаче.</span>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                                      Број на стан *
                                    </label>
                                    <input
                                      type="text"
                                      required
                                      placeholder="пр. 12"
                                      value={currentApt}
                                      onChange={(e) => {
                                        setVoteAptNos(prev => ({ ...prev, [poll.id]: e.target.value }));
                                        if (currentMsg) setVoteMsg(prev => ({ ...prev, [poll.id]: undefined as any }));
                                      }}
                                      className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-extrabold text-xs focus:border-amber-400 outline-none"
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                                      ПИН код за оваа одлука *
                                    </label>
                                    <input
                                      type="text"
                                      required
                                      maxLength={4}
                                      inputMode="numeric"
                                      pattern="[0-9]*"
                                      placeholder="пр. 4819"
                                      value={currentPin}
                                      onChange={(e) => {
                                        const numericOnly = e.target.value.replace(/\D/g, '');
                                        setVotePins(prev => ({ ...prev, [poll.id]: numericOnly }));
                                        if (currentMsg) setVoteMsg(prev => ({ ...prev, [poll.id]: undefined as any }));
                                      }}
                                      className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-amber-300 font-mono font-black text-xs tracking-widest focus:border-amber-400 outline-none"
                                    />
                                  </div>
                                </div>
                              </div>

                              <button
                                type="submit"
                                className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 mt-2"
                              >
                                <Vote className="w-4 h-4" />
                                <span>Испрати го мојот глас</span>
                              </button>
                            </form>
                          </div>
                        )}

                        {/* Live Vote Breakdown Chart */}
                        <div className={`${isActive ? 'lg:col-span-6' : 'lg:col-span-12'} bg-slate-50 border-2 border-slate-200 p-6 rounded-2xl`}>
                          <h4 className="text-base font-black text-slate-900 mb-4 flex items-center justify-between">
                            <span className="flex items-center gap-2">
                              <BarChart3 className="w-5 h-5 text-indigo-600" />
                              <span>Резултати во квадратура (m²):</span>
                            </span>
                            <span className="text-xs font-bold text-slate-500">
                              {totalVotes} станови ({totalVotedM2} m²)
                            </span>
                          </h4>

                          <div className="space-y-4">
                            {poll.options.map((optionText, idx) => {
                              const optionM2 = optionM2s[idx] || 0;
                              const pctOfTotal = ((optionM2 / totalBuildingM2) * 100).toFixed(1);
                              const countStanovi = poll.votes.filter(v => v.optionIndex === idx).length;

                              return (
                                <div key={idx} className="space-y-1.5">
                                  <div className="flex justify-between items-center text-xs font-black text-slate-800">
                                    <span>{optionText} ({countStanovi} станови)</span>
                                    <span className="font-mono">{optionM2} m² ({pctOfTotal}% од зградата)</span>
                                  </div>

                                  <div className="w-full bg-slate-200 rounded-full h-3.5 overflow-hidden flex">
                                    <div 
                                      className={`h-full transition-all duration-500 ${
                                        idx === 0 
                                          ? 'bg-emerald-500' 
                                          : idx === 1 
                                          ? 'bg-rose-500' 
                                          : 'bg-amber-500'
                                      }`}
                                      style={{ width: `${pctOfTotal}%` }}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          <div className="mt-6 pt-4 border-t border-slate-200 flex items-center gap-2 text-[11px] font-bold text-slate-500">
                            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>Пресметката е во согласност со Законот за домување според сопственичката површина во m².</span>
                          </div>
                        </div>

                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: FUTURE PLANS */}
        {activeTab === 'plans' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                  <Compass className="w-6 h-6 text-indigo-600" />
                  Идни планови и инвеститорски проекти
                </h2>
                <p className="text-sm text-slate-600 mt-1">
                  Преглед на сите планирани и завршени инвестициски зафати за подобрување на зградата „Вич 28“.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {futurePlans.map(plan => {
                const isCompleted = plan.status === 'completed';
                const isInProgress = plan.status === 'in_progress';

                return (
                  <div 
                    key={plan.id}
                    className={`bg-white border-2 rounded-2xl p-6 shadow-sm transition-all relative ${
                      isCompleted 
                        ? 'border-emerald-300 bg-emerald-50/20' 
                        : isInProgress 
                        ? 'border-amber-400 bg-amber-50/20' 
                        : 'border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1.5 ${
                        isCompleted
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : isInProgress
                          ? 'bg-amber-100 text-amber-800 border border-amber-300 animate-pulse'
                          : 'bg-slate-100 text-slate-700 border border-slate-300'
                      }`}>
                        {isCompleted && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                        {isInProgress && <Clock className="w-3.5 h-3.5 text-amber-600" />}
                        <span>
                          {isCompleted ? 'Завршено' : isInProgress ? 'Во тек на реализација' : 'Во план'}
                        </span>
                      </span>

                      {plan.targetDate && (
                        <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {plan.targetDate}
                        </span>
                      )}
                    </div>

                    <h3 className="text-lg font-black text-slate-900 mb-2">
                      {plan.title}
                    </h3>

                    <p className="text-sm text-slate-700 mb-4 leading-relaxed">
                      {plan.description}
                    </p>

                    {plan.imageUrls && plan.imageUrls.length > 0 && (
                      <div className="grid grid-cols-2 gap-2 mb-4">
                        {plan.imageUrls.map((img, idx) => (
                          <button 
                            key={idx} 
                            type="button"
                            onClick={() => setLightboxImg(img)}
                            className="group relative h-28 sm:h-36 rounded-xl overflow-hidden border border-slate-200 block bg-slate-900 cursor-pointer text-left w-full"
                          >
                            <img 
                              src={img} 
                              alt={`plan-img-${idx}`} 
                              className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300 opacity-90 group-hover:opacity-100" 
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all flex items-end p-2.5 text-[11px] text-white font-bold gap-1">
                              <ZoomIn className="w-3.5 h-3.5 text-indigo-400" />
                              <span>Прегледај слика</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {plan.estimatedCost && (
                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold">
                        <span className="text-slate-500">Проценет буџет / Трошок:</span>
                        <span className="text-indigo-900 font-black text-sm">
                          {formatDenarExact(plan.estimatedCost)}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 4: CONTACTS & HOUSE RULES */}
        {activeTab === 'contacts' && (
          <div className="space-y-8">
            {/* Contacts Section */}
            <div>
              <div className="border-b pb-4 mb-6">
                <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                  <PhoneCall className="w-6 h-6 text-rose-600" />
                  Итни контакти и сервисни Служби
                </h2>
                <p className="text-sm text-slate-600 mt-1">
                  Зачувајте ги овие броеви за брза реакција во случај на дефект или итна потреба.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {emergencyContacts.map(cnt => (
                  <div key={cnt.id} className="bg-white border-2 border-slate-200 rounded-2xl p-5 shadow-sm hover:border-amber-400 transition-all">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                      {cnt.title}
                    </div>
                    <div className="text-base font-black text-slate-900 mb-1">
                      {cnt.name}
                    </div>
                    <a 
                      href={`tel:${cnt.phone.replace(/[^0-9+]/g, '')}`} 
                      className="inline-flex items-center gap-2 text-lg font-black text-rose-600 hover:text-rose-700 hover:underline my-1"
                    >
                      <Phone className="w-5 h-5 fill-rose-100" />
                      <span>{cnt.phone}</span>
                    </a>
                    {cnt.note && (
                      <p className="text-xs text-slate-500 border-t border-slate-100 pt-2 mt-2">
                        {cnt.note}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* House Rules */}
            <div className="bg-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-xl border-2 border-slate-800">
              <h3 className="text-xl font-black text-amber-400 mb-4 flex items-center gap-2">
                <ShieldCheck className="w-6 h-6" />
                Куќен ред на заедницата Вич 28 Скопје
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-slate-300">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-amber-500/20 border border-amber-500 text-amber-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">1</span>
                    <div>
                      <strong className="text-white block font-bold">Време за одмор и тишина:</strong>
                      Попладневен одмор од 15:00 до 17:00 часот, и ноќен одмор од 22:00 до 06:00 часот. Градежни работи и гласна музика се строго забранети во овие термини.
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-amber-500/20 border border-amber-500 text-amber-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">2</span>
                    <div>
                      <strong className="text-white block font-bold">Заедницки простории и скали:</strong>
                      Забрането е оставање на кабаст отпад, мебел, точаци и кутии во заедничкиот простори и скалите.
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-amber-500/20 border border-amber-500 text-amber-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">3</span>
                    <div>
                      <strong className="text-white block font-bold">Правилно користење на лифтот:</strong>
                      Забрането е пренесување на градежен шут или претовар над дозволената тежина означена во лифтот.
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-amber-500/20 border border-amber-500 text-amber-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">4</span>
                    <div>
                      <strong className="text-white block font-bold">Редовно подмирување на сметките:</strong>
                      Сите станари се должни благовремено да ги плаќаат месечните фактури за одржување до крајот на тековниот месец.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: REPORT AN ISSUE */}
        {activeTab === 'report' && (
          <div className="max-w-3xl mx-auto">
            <div className="bg-white border-2 border-slate-200 rounded-3xl p-6 sm:p-8 shadow-md">
              <div className="border-b pb-4 mb-6">
                <span className="px-3 py-1 bg-rose-100 text-rose-800 text-xs font-black uppercase tracking-wider rounded-md border border-rose-200 inline-block mb-2">
                  Директен контакт
                </span>
                <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                  <Wrench className="w-6 h-6 text-rose-600" />
                  Пријави проблем или дефект во зградата
                </h2>
                <p className="text-sm text-slate-600 mt-1">
                  Забележавте изгорена сијалица, дефект на лифтот или протекување? Пополнете ја форматирана за директно известување на управителот.
                </p>
              </div>

              {submittedSuccess && (
                <div className="mb-6 p-4 bg-emerald-50 border-2 border-emerald-300 rounded-2xl text-emerald-900 flex items-center gap-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                  <div>
                    <div className="font-black text-sm">Вашата пријава е успешно испратена!</div>
                    <div className="text-xs text-emerald-700">Куќниот совет е известен и ќе преземе мерки во најкраток рок.</div>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmitIssue} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                      Број на стан *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="напр. Стан 12 или Локал 1"
                      value={apartmentNo}
                      onChange={(e) => setApartmentNo(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-slate-900 text-sm focus:border-amber-500 focus:bg-white outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                      Тип на Дефект / Категорија
                    </label>
                    <select
                      value={issueType}
                      onChange={(e) => setIssueType(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-slate-900 text-sm focus:border-amber-500 focus:bg-white outline-none transition-all"
                    >
                      <option value="Лифт">🛗 Дефект на лифт</option>
                      <option value="Осветлување">💡 Осветлување / Сијалица</option>
                      <option value="Водовод">🚰 Водовод / Протекување</option>
                      <option value="Хигиена">🧹 Хигиена / Чистење</option>
                      <option value="Врата / Брава">🚪 Влезна врата / Интерфон</option>
                      <option value="Друго">❓ Друго / Предлог</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                      Име и презиме (Опционално)
                    </label>
                    <input
                      type="text"
                      placeholder="Вашето име"
                      value={residentName}
                      onChange={(e) => setResidentName(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-slate-900 text-sm focus:border-amber-500 focus:bg-white outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                      Телефон / Е-пошта за контакт
                    </label>
                    <input
                      type="text"
                      placeholder="07X / XXX - XXX"
                      value={contactInfo}
                      onChange={(e) => setContactInfo(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-slate-900 text-sm focus:border-amber-500 focus:bg-white outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                    Детален опис на проблемот *
                  </label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Опишете точно каде е лоциран проблемот и што е забележано..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-slate-900 text-sm focus:border-amber-500 focus:bg-white outline-none transition-all"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 bg-rose-600 hover:bg-rose-700 text-white font-black text-sm uppercase tracking-wider rounded-xl shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all border border-rose-500"
                >
                  <Send className="w-5 h-5" />
                  <span>Испрати пријава до куќниот совет</span>
                </button>
              </form>
            </div>
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-8 border-t border-slate-800 mt-12 text-center text-xs">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <strong>Заедница на сопственици Вич 28 Скопје</strong>
            <p className="text-slate-500 mt-0.5">Сите права се задржани © {new Date().getFullYear()}</p>
          </div>

          <button
            onClick={onOpenAdminModal}
            className="text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1.5 underline cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>АДМИН Најава за Управител</span>
          </button>
        </div>
      </footer>

      {/* Full-Screen Image Lightbox Modal */}
      {lightboxImg && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-8 select-none"
          onClick={() => setLightboxImg(null)}
        >
          <div className="relative max-w-5xl max-h-[90vh] w-full h-full flex items-center justify-center">
            <button
              onClick={() => setLightboxImg(null)}
              className="absolute -top-12 right-0 p-2 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-all cursor-pointer flex items-center gap-1.5 px-3.5 text-xs font-bold"
            >
              <X className="w-5 h-5" />
              <span>Затвори</span>
            </button>

            <img
              src={lightboxImg}
              alt="Full view"
              className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl border border-white/10"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
}
