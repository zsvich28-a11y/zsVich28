import React, { useState } from 'react';
import { 
  Megaphone, Compass, PhoneCall, AlertCircle, Plus, Trash2, Edit3, 
  CheckCircle2, Clock, Shield, Key, Save, X, Wrench, MessageSquare, AlertTriangle, Image as ImageIcon, Upload,
  Vote, RefreshCw, Printer, Search, Copy, Check, BarChart3, UserCheck, FileText, FileCheck
} from 'lucide-react';
import { Announcement, FuturePlan, EmergencyContact, ReportedIssue, Language, Poll, Unit } from '../types';
import { generatePollPinsForUnits } from '../portalDefaults';

interface PortalAdminProps {
  lang: Language;
  announcements: Announcement[];
  onUpdateAnnouncements: (announcements: Announcement[]) => void;
  futurePlans: FuturePlan[];
  onUpdateFuturePlans: (plans: FuturePlan[]) => void;
  emergencyContacts: EmergencyContact[];
  onUpdateEmergencyContacts: (contacts: EmergencyContact[]) => void;
  reportedIssues: ReportedIssue[];
  onUpdateReportedIssues: (issues: ReportedIssue[]) => void;
  polls?: Poll[];
  onUpdatePolls?: (polls: Poll[]) => void;
  unitPins?: Record<string, string>;
  units?: Unit[];
  onRegenerateUnitPin?: (unitNo: string) => void;
  onRegenerateAllUnitPins?: () => void;
  adminPin: string;
  onChangePin: (newPin: string) => void;
}

export default function PortalAdmin({
  lang,
  announcements,
  onUpdateAnnouncements,
  futurePlans,
  onUpdateFuturePlans,
  emergencyContacts,
  onUpdateEmergencyContacts,
  reportedIssues,
  onUpdateReportedIssues,
  polls = [],
  onUpdatePolls,
  unitPins = {},
  units = [],
  onRegenerateUnitPin,
  onRegenerateAllUnitPins,
  adminPin,
  onChangePin
}: PortalAdminProps) {
  const [activeSubTab, setActiveSubTab] = useState<'announcements' | 'polls' | 'plans' | 'contacts' | 'issues' | 'security'>('announcements');
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);

  // Poll Form State
  const [pollTitle, setPollTitle] = useState('');
  const [pollDesc, setPollDesc] = useState('');
  const [pollCategory, setPollCategory] = useState<'capital' | 'maintenance' | 'rules' | 'general'>('capital');
  const [pollOptions, setPollOptions] = useState<string[]>(['ЗА (Одобрувам)', 'ПРОТИВ (Не одобрувам)', 'ВОЗДРЖАН']);
  const [pollEndDate, setPollEndDate] = useState('');
  const [pollQuorum, setPollQuorum] = useState(51);

  // Search & Print PINs State
  const [pinSearch, setPinSearch] = useState('');
  const [selectedPollIdForPinsView, setSelectedPollIdForPinsView] = useState<string>('all');
  const [copiedUnit, setCopiedUnit] = useState<string | null>(null);
  const [showPrintablePinsModal, setShowPrintablePinsModal] = useState(false);
  const [printMode, setPrintMode] = useState<'slips' | 'archive'>('slips');
  const [activePollForPins, setActivePollForPins] = useState<Poll | null>(null);
  const [selectedPollForProtocol, setSelectedPollForProtocol] = useState<Poll | null>(null);
  const [createdPollNotice, setCreatedPollNotice] = useState<Poll | null>(null);

  // Announcement Form State
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [annPriority, setAnnPriority] = useState<'high' | 'normal' | 'low'>('high');
  const [annCategory, setAnnCategory] = useState('Техничко одржување');
  const [annImages, setAnnImages] = useState<string[]>([]);

  // Future Plan Form State
  const [planTitle, setPlanTitle] = useState('');
  const [planDesc, setPlanDesc] = useState('');
  const [planStatus, setPlanStatus] = useState<'planned' | 'in_progress' | 'completed'>('planned');
  const [planCost, setPlanCost] = useState('');
  const [planTarget, setPlanTarget] = useState('');
  const [planImages, setPlanImages] = useState<string[]>([]);

  // Image Helper
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, setImages: React.Dispatch<React.SetStateAction<string[]>>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          const res = reader.result;
          setImages(prev => [...prev, res]);
        }
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  // Contact Form State
  const [cntTitle, setCntTitle] = useState('');
  const [cntName, setCntName] = useState('');
  const [cntPhone, setCntPhone] = useState('');
  const [cntNote, setCntNote] = useState('');

  // Security Form State
  const [newPin, setNewPin] = useState('');

  // Add Announcement
  const handleAddAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!annTitle || !annContent) return;
    const newAnn: Announcement = {
      id: `ann-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      title: annTitle,
      content: annContent,
      priority: annPriority,
      category: annCategory,
      imageUrls: annImages.length > 0 ? annImages : undefined
    };
    onUpdateAnnouncements([newAnn, ...announcements]);
    setAnnTitle('');
    setAnnContent('');
    setAnnImages([]);
  };

  const handleDeleteAnnouncement = (id: string) => {
    if (window.confirm('Дали сте сигурни дека сакате да го избришете ова соопштение?')) {
      onUpdateAnnouncements(announcements.filter(a => a.id !== id));
    }
  };

  // Add Future Plan
  const handleAddFuturePlan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!planTitle || !planDesc) return;
    const newPlan: FuturePlan = {
      id: `plan-${Date.now()}`,
      title: planTitle,
      description: planDesc,
      status: planStatus,
      estimatedCost: planCost ? Number(planCost) : undefined,
      targetDate: planTarget || undefined,
      imageUrls: planImages.length > 0 ? planImages : undefined
    };
    onUpdateFuturePlans([...futurePlans, newPlan]);
    setPlanTitle('');
    setPlanDesc('');
    setPlanCost('');
    setPlanTarget('');
    setPlanImages([]);
  };

  const handleDeleteFuturePlan = (id: string) => {
    if (window.confirm('Дали сте сигурни дека сакате да го избришете овој план?')) {
      onUpdateFuturePlans(futurePlans.filter(p => p.id !== id));
    }
  };

  // Add Emergency Contact
  const handleAddContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cntTitle || !cntPhone) return;
    const newCnt: EmergencyContact = {
      id: `cnt-${Date.now()}`,
      title: cntTitle,
      name: cntName || 'Служба',
      phone: cntPhone,
      note: cntNote || undefined
    };
    onUpdateEmergencyContacts([...emergencyContacts, newCnt]);
    setCntTitle('');
    setCntName('');
    setCntPhone('');
    setCntNote('');
  };

  const handleDeleteContact = (id: string) => {
    if (window.confirm('Дали сте сигурни дека сакате да го избришете овој контакт?')) {
      onUpdateEmergencyContacts(emergencyContacts.filter(c => c.id !== id));
    }
  };

  // Toggle Issue Status
  const handleToggleIssueStatus = (id: string, newStatus: 'open' | 'in_progress' | 'resolved') => {
    onUpdateReportedIssues(reportedIssues.map(i => i.id === id ? { ...i, status: newStatus } : i));
  };

  const handleDeleteIssue = (id: string) => {
    if (window.confirm('Избриши ја оваа пријава?')) {
      onUpdateReportedIssues(reportedIssues.filter(i => i.id !== id));
    }
  };

  // Add Poll
  const handleAddPoll = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pollTitle || !pollDesc) return;
    const newPollId = `poll-${Date.now()}`;
    const allUnitNumbers = units.length > 0 ? units.map(u => u.number) : [
      ...Array.from({ length: 68 }, (_, i) => (i + 1).toString()),
      'Д1', 'Д2', 'Д3', 'Д4', 'Д5', 'Д6', 'Д7', 'Д8'
    ];
    const generatedPollPins = generatePollPinsForUnits(newPollId, allUnitNumbers);

    const newPoll: Poll = {
      id: newPollId,
      title: pollTitle,
      description: pollDesc,
      category: pollCategory,
      options: pollOptions.filter(o => o.trim().length > 0),
      startDate: new Date().toISOString().split('T')[0],
      endDate: pollEndDate || new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
      status: 'active',
      quorumRequired: pollQuorum || 51,
      votes: [],
      pins: generatedPollPins
    };
    if (onUpdatePolls) {
      onUpdatePolls([newPoll, ...polls]);
    }
    setCreatedPollNotice(newPoll);
    setSelectedPollIdForPinsView(newPoll.id);
    setPollTitle('');
    setPollDesc('');
    setPollEndDate('');
  };

  const handleRegeneratePollPins = (pollId: string) => {
    const targetPoll = polls.find(p => p.id === pollId);
    if (!targetPoll) return;
    if (window.confirm(`Дали сакате да генерирате НОВА 4-цифрена ПИН листа за гласањето: "${targetPoll.title}"? Претходните кодови за ова гласање ќе бидат заменети.`)) {
      const allUnitNumbers = units.length > 0 ? units.map(u => u.number) : [
        ...Array.from({ length: 68 }, (_, i) => (i + 1).toString()),
        'Д1', 'Д2', 'Д3', 'Д4', 'Д5', 'Д6', 'Д7', 'Д8'
      ];
      const newPins = generatePollPinsForUnits(pollId + '-' + Date.now(), allUnitNumbers);
      const updatedPolls = polls.map(p => p.id === pollId ? { ...p, pins: newPins } : p);
      if (onUpdatePolls) {
        onUpdatePolls(updatedPolls);
      }
      if (activePollForPins && activePollForPins.id === pollId) {
        setActivePollForPins({ ...activePollForPins, pins: newPins });
      }
      alert('Успешно е генерирана нова уникатна ПИН листа за оваа одлука!');
    }
  };

  const handleTogglePollStatus = (id: string) => {
    if (onUpdatePolls) {
      onUpdatePolls(polls.map(p => p.id === id ? { ...p, status: p.status === 'active' ? 'closed' : 'active' } : p));
    }
  };

  const handleDeletePoll = (id: string) => {
    if (window.confirm('Дали сте сигурни дека сакате да ја избришете оваа анкета?')) {
      if (onUpdatePolls) {
        onUpdatePolls(polls.filter(p => p.id !== id));
      }
    }
  };

  // Change PIN
  const handleSavePin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPin || newPin.length < 4) {
      alert('PIN кодот мора да биде најмалку 4 цифри!');
      return;
    }
    onChangePin(newPin);
    setNewPin('');
    alert('PIN кодот е успешно променет!');
  };

  return (
    <div className="bg-white border-2 border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm print:p-0 print:border-none print:shadow-none print:bg-transparent">
      <div className="space-y-6 print:hidden">
        <div className="border-b pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="px-2.5 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 text-[11px] font-black uppercase tracking-wider rounded">
            АДМИН Контролен Панел
          </span>
          <h2 className="text-2xl font-black text-slate-900 mt-1 flex items-center gap-2">
            <Shield className="w-6 h-6 text-amber-500" />
            Уредување содржини — Заедница на сопственици Вич 28 Скопје
          </h2>
        </div>

        {/* Sub Navigation */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveSubTab('announcements')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
              activeSubTab === 'announcements' ? 'bg-amber-500 text-slate-950 shadow' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Соопштенија ({announcements.length})
          </button>
          <button
            onClick={() => setActiveSubTab('polls')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'polls' ? 'bg-amber-500 text-slate-950 shadow' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Vote className="w-3.5 h-3.5" />
            <span>Гласања ({polls.length})</span>
          </button>
          <button
            onClick={() => setActiveSubTab('plans')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
              activeSubTab === 'plans' ? 'bg-amber-500 text-slate-950 shadow' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Планови ({futurePlans.length})
          </button>
          <button
            onClick={() => setActiveSubTab('contacts')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
              activeSubTab === 'contacts' ? 'bg-amber-500 text-slate-950 shadow' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Контакти ({emergencyContacts.length})
          </button>
          <button
            onClick={() => setActiveSubTab('issues')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer relative ${
              activeSubTab === 'issues' ? 'bg-rose-600 text-white shadow' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Пријави од станари ({reportedIssues.length})
          </button>
          <button
            onClick={() => setActiveSubTab('security')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
              activeSubTab === 'security' ? 'bg-slate-900 text-amber-400 shadow' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            🔑 ПИН Код
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: ANNOUNCEMENTS EDITOR */}
      {activeSubTab === 'announcements' && (
        <div className="space-y-8">
          <form onSubmit={handleAddAnnouncement} className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-6">
            <h3 className="text-base font-black text-slate-900 mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5 text-amber-500" />
              Ново Соопштение до Станарите
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
                  Наслов на соопштението *
                </label>
                <input
                  type="text"
                  required
                  placeholder="напр. Редовен сервис на лифтот"
                  value={annTitle}
                  onChange={(e) => setAnnTitle(e.target.value)}
                  className="w-full px-4 py-2 bg-white border-2 border-slate-200 rounded-xl font-bold text-sm text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
                  Приоритет
                </label>
                <select
                  value={annPriority}
                  onChange={(e) => setAnnPriority(e.target.value as any)}
                  className="w-full px-4 py-2 bg-white border-2 border-slate-200 rounded-xl font-bold text-sm text-slate-900"
                >
                  <option value="high">🚨 Важно / Итно</option>
                  <option value="normal">ℹ️ Нормално</option>
                  <option value="low">📌 Ниско</option>
                </select>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
                Текст на соопштението *
              </label>
              <textarea
                required
                rows={3}
                placeholder="Внесете ги деталите за станарите..."
                value={annContent}
                onChange={(e) => setAnnContent(e.target.value)}
                className="w-full px-4 py-2 bg-white border-2 border-slate-200 rounded-xl font-bold text-sm text-slate-900"
              />
            </div>

            {/* Image Attachments */}
            <div className="mb-4">
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-amber-500" />
                Прикачи Слики / Фотографии (Опционално)
              </label>
              <div className="flex flex-wrap items-center gap-3">
                <label className="px-4 py-2 bg-white border-2 border-dashed border-slate-300 hover:border-amber-500 rounded-xl text-slate-700 text-xs font-bold flex items-center gap-2 cursor-pointer transition-all">
                  <Upload className="w-4 h-4 text-amber-500" />
                  <span>Избери слики од уред</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => handleImageUpload(e, setAnnImages)}
                    className="hidden"
                  />
                </label>

                {annImages.map((img, idx) => (
                  <div key={idx} className="relative w-16 h-16 rounded-xl overflow-hidden border-2 border-amber-400 group shrink-0">
                    <img src={img} alt="preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setAnnImages(annImages.filter((_, i) => i !== idx))}
                      className="absolute inset-0 bg-slate-900/80 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow cursor-pointer transition-all"
            >
               Објави Соопштение
            </button>
          </form>

          {/* List of existing announcements */}
          <div className="space-y-4">
            <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider">
              Објавени Соопштенија ({announcements.length})
            </h4>

            {announcements.map(ann => (
              <div key={ann.id} className="p-4 bg-white border-2 border-slate-200 rounded-2xl flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-500 mb-1">
                    <span>{ann.date}</span>
                    <span>•</span>
                    <span className="uppercase text-amber-700 font-extrabold">{ann.category}</span>
                  </div>
                  <h5 className="font-black text-slate-900 text-base">{ann.title}</h5>
                  <p className="text-sm text-slate-700 mt-1 whitespace-pre-line">{ann.content}</p>

                  {ann.imageUrls && ann.imageUrls.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {ann.imageUrls.map((img, i) => (
                        <button 
                          key={i} 
                          type="button" 
                          onClick={() => setLightboxImg(img)} 
                          className="block w-20 h-20 rounded-lg overflow-hidden border border-slate-200 cursor-pointer text-left shrink-0 hover:border-amber-500 transition-all"
                        >
                          <img src={img} alt="attachment" className="w-full h-full object-cover hover:scale-110 transition-all" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => handleDeleteAnnouncement(ann.id)}
                  className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                  title="Избриши соопштение"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-TAB 2: FUTURE PLANS EDITOR */}
      {activeSubTab === 'polls' && (
        <div className="space-y-10">
          
          {/* SECTION 1: CREATE NEW POLL */}
          <form onSubmit={handleAddPoll} className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-base font-black text-slate-900 mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5 text-amber-600" />
              Креирај Нова Анкета / Дигитално Гласање
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
                  Наслов на анкетата / прашањето *
                </label>
                <input
                  type="text"
                  required
                  placeholder="пр. Одобрување за избор на изведувач за покрив"
                  value={pollTitle}
                  onChange={(e) => setPollTitle(e.target.value)}
                  className="w-full px-3.5 py-2 bg-white border-2 border-slate-200 rounded-xl text-sm font-bold focus:border-amber-400 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
                  Категорија *
                </label>
                <select
                  value={pollCategory}
                  onChange={(e: any) => setPollCategory(e.target.value)}
                  className="w-full px-3.5 py-2 bg-white border-2 border-slate-200 rounded-xl text-sm font-bold focus:border-amber-400 outline-none"
                >
                  <option value="capital">🏛️ Капитална инвестиција</option>
                  <option value="rules">📜 Куќен ред</option>
                  <option value="maintenance">🔧 Редовно одржување</option>
                  <option value="general">💬 Општо изјаснување</option>
                </select>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
                Детален опис и услови за одлучување *
              </label>
              <textarea
                rows={3}
                required
                placeholder="Објаснете ја понудата, проценката на трошоците, изворот на финансирање и рок..."
                value={pollDesc}
                onChange={(e) => setPollDesc(e.target.value)}
                className="w-full px-3.5 py-2 bg-white border-2 border-slate-200 rounded-xl text-sm focus:border-amber-400 outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
                  Краен рок за гласање
                </label>
                <input
                  type="date"
                  value={pollEndDate}
                  onChange={(e) => setPollEndDate(e.target.value)}
                  className="w-full px-3.5 py-2 bg-white border-2 border-slate-200 rounded-xl text-sm font-bold focus:border-amber-400 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
                  Потребен кворум на станови (%)
                </label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={pollQuorum}
                  onChange={(e) => setPollQuorum(Number(e.target.value))}
                  className="w-full px-3.5 py-2 bg-white border-2 border-slate-200 rounded-xl text-sm font-bold focus:border-amber-400 outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow cursor-pointer transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Отвори Ново Гласање</span>
            </button>
          </form>

          {/* CREATED POLL PRINTING BANNER */}
          {createdPollNotice && (
            <div className="p-5 bg-gradient-to-r from-amber-50 to-amber-100/80 border-2 border-amber-300 rounded-2xl shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-black text-amber-900 uppercase tracking-wider">
                  <Check className="w-4 h-4 text-amber-600" />
                  <span>Успешно креирано ново гласање:</span>
                </div>
                <h4 className="text-base font-black text-slate-900 mt-0.5">{createdPollNotice.title}</h4>
                <p className="text-xs text-slate-600 mt-1">
                  Подгответе ги ливчињата за достава до сите 76 поштенски сандачиња или отпечатете го збирниот регистар за во архива.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  onClick={() => {
                    setActivePollForPins(createdPollNotice);
                    setPrintMode('slips');
                    setShowPrintablePinsModal(true);
                  }}
                  className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow cursor-pointer flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4" />
                  <span>📬 Ливчиња со ПИН за достава</span>
                </button>

                <button
                  onClick={() => {
                    setActivePollForPins(createdPollNotice);
                    setPrintMode('archive');
                    setShowPrintablePinsModal(true);
                  }}
                  className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-amber-300 font-bold text-xs uppercase tracking-wider rounded-xl cursor-pointer flex items-center gap-1.5"
                >
                  <FileText className="w-4 h-4 text-amber-400" />
                  <span>📋 Збирен Архивски Регистар</span>
                </button>

                <button
                  onClick={() => setCreatedPollNotice(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}


          {/* SECTION 2: EXISTING POLLS LIST & DETAILED VOTING LOG */}
          <div className="space-y-6">
            <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Vote className="w-4 h-4 text-amber-600" />
              <span>Сите Активни и Завршени Гласања ({polls.length})</span>
            </h4>

            {polls.map((poll) => {
              const isActive = poll.status === 'active';
              const totalVotes = poll.votes.length;

              const totalBuildingM2 = units.reduce((acc, u) => acc + (u.area || 0), 0) || 5776;
              const majorityM2Needed = Math.floor(totalBuildingM2 / 2) + 1; // 50% + 1 m2

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

              const yesM2 = optionM2s[0] || 0;
              const noM2 = optionM2s[1] || 0;
              const isYesSuccess = yesM2 >= majorityM2Needed;
              const isNoSuccess = noM2 >= majorityM2Needed;

              return (
                <div key={poll.id} className="p-6 bg-white border-2 border-slate-200 rounded-2xl shadow-sm space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        isActive ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {isActive ? '● Активна' : 'О Завршена'}
                      </span>
                      <h5 className="font-black text-slate-900 text-base">{poll.title}</h5>

                      {isYesSuccess && (
                        <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-md text-[10px] font-black uppercase">
                          🎉 Усвоено (&gt;50%+1 m²)
                        </span>
                      )}
                      {isNoSuccess && (
                        <span className="px-2.5 py-0.5 bg-rose-100 text-rose-800 border border-rose-300 rounded-md text-[10px] font-black uppercase">
                          ❌ Одбиено (&gt;50%+1 m²)
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => {
                          const targetWithPins = poll.pins ? poll : {
                            ...poll,
                            pins: generatePollPinsForUnits(poll.id, units.map(u => u.number))
                          };
                          setActivePollForPins(targetWithPins);
                          setPrintMode('slips');
                          setShowPrintablePinsModal(true);
                        }}
                        className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider cursor-pointer flex items-center gap-1.5 shadow-sm transition-all"
                        title="Печати ливчиња со ПИН (4 по А4 листа за поштенски сандачиња)"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Ливчиња со ПИН</span>
                      </button>

                      <button
                        onClick={() => {
                          const targetWithPins = poll.pins ? poll : {
                            ...poll,
                            pins: generatePollPinsForUnits(poll.id, units.map(u => u.number))
                          };
                          setActivePollForPins(targetWithPins);
                          setPrintMode('archive');
                          setShowPrintablePinsModal(true);
                        }}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer flex items-center gap-1.5"
                        title="Печати збирен архивски регистар за оваа одлука"
                      >
                        <FileText className="w-3.5 h-3.5 text-amber-600" />
                        <span>Архивски Регистар</span>
                      </button>

                      <button
                        onClick={() => setSelectedPollForProtocol(poll)}
                        className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-950 border border-amber-300 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer flex items-center gap-1.5"
                        title="Печати Официјален Записник за донесена одлука"
                      >
                        <FileCheck className="w-3.5 h-3.5 text-amber-600" />
                        <span>Записник</span>
                      </button>

                      <button
                        onClick={() => handleRegeneratePollPins(poll.id)}
                        className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer flex items-center gap-1"
                        title="Регенерирај нова ПИН листа исклучиво за ова гласање"
                      >
                        <RefreshCw className="w-3.5 h-3.5 text-rose-600" />
                        <span>Нов ПИН</span>
                      </button>

                      <button
                        onClick={() => handleTogglePollStatus(poll.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider border cursor-pointer ${
                          isActive ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300' : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border-emerald-300'
                        }`}
                      >
                        {isActive ? 'Затвори' : 'Отвори повторно'}
                      </button>

                      <button
                        onClick={() => handleDeletePoll(poll.id)}
                        className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl cursor-pointer"
                        title="Избриши анкета"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 font-medium">{poll.description}</p>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-slate-700 bg-slate-100 p-2.5 rounded-xl border border-slate-200">
                    <span>Искористени: <strong>{totalVotedM2} m²</strong> од {totalBuildingM2} m² ({((totalVotedM2/totalBuildingM2)*100).toFixed(1)}%) — {totalVotes} станови</span>
                    <span className="text-amber-800 font-extrabold font-mono">Законски праг: {majorityM2Needed} m² (50%+1 m²)</span>
                  </div>

                  {/* Summary results bar */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs font-bold">
                    {poll.options.map((opt, idx) => {
                      const count = poll.votes.filter(v => v.optionIndex === idx).length;
                      const m2 = optionM2s[idx] || 0;
                      const pctTotal = ((m2 / totalBuildingM2) * 100).toFixed(1);
                      return (
                        <div key={idx} className="flex flex-col bg-white p-2.5 rounded-lg border border-slate-200">
                          <span className="text-slate-700 truncate font-black">{opt}:</span>
                          <span className="font-mono text-amber-800 font-extrabold text-sm mt-0.5">{m2} m² ({pctTotal}% од зградата)</span>
                          <span className="text-[10px] text-slate-500 font-semibold">{count} станови</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Dedicated PINs for this decision */}
                  <details className="mt-3 border-t border-slate-200 pt-3">
                    <summary className="text-xs font-black text-slate-800 cursor-pointer hover:text-amber-600 flex items-center justify-between uppercase tracking-wider py-1 select-none">
                      <span className="flex items-center gap-1.5">
                        <Key className="w-4 h-4 text-amber-600" />
                        <span>ПИН Листа за оваа одлука ({units.length} станови)</span>
                      </span>
                      <span className="text-[10px] text-amber-700 font-bold bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md lowercase font-normal">
                        кликни за преглед на кодови
                      </span>
                    </summary>

                    <div className="mt-3 bg-slate-900 text-white p-4 rounded-2xl border border-slate-800 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                        <div className="text-xs font-bold text-slate-300">
                          🔑 Единствени 4-цифрени кодови за секој стан генерирани исклучиво за: <strong className="text-amber-400">"{poll.title}"</strong>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              const targetWithPins = poll.pins ? poll : {
                                ...poll,
                                pins: generatePollPinsForUnits(poll.id, units.map(u => u.number))
                              };
                              setActivePollForPins(targetWithPins);
                              setPrintMode('slips');
                              setShowPrintablePinsModal(true);
                            }}
                            className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[11px] uppercase rounded-lg cursor-pointer flex items-center gap-1"
                          >
                            <Printer className="w-3 h-3" />
                            <span>Печати ливчиња</span>
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 max-h-64 overflow-y-auto pr-1">
                        {units.map((unit) => {
                          const thisPollPins = poll.pins || unitPins;
                          const currentPin = thisPollPins[unit.number] || 'N/A';
                          const isCopied = copiedUnit === `${poll.id}-${unit.number}`;

                          return (
                            <div 
                              key={unit.id}
                              className="p-2 bg-slate-800/90 border border-slate-700/80 rounded-xl flex items-center justify-between gap-1 hover:border-amber-500/50"
                            >
                              <div className="min-w-0">
                                <div className="text-[10px] font-black text-amber-400 truncate">
                                  Стан {unit.number}
                                </div>
                                <div className="font-mono text-xs font-black text-white bg-slate-950 px-1.5 py-0.5 rounded mt-0.5 inline-block">
                                  {currentPin}
                                </div>
                              </div>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(`Стан ${unit.number} (Одлука: ${poll.title}): ПИН ${currentPin}`);
                                  setCopiedUnit(`${poll.id}-${unit.number}`);
                                  setTimeout(() => setCopiedUnit(null), 2000);
                                }}
                                className="p-1 text-slate-400 hover:text-amber-400 rounded cursor-pointer shrink-0"
                                title="Копирај ПИН"
                              >
                                {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </details>

                  {/* Expandable Voted Apartments Log */}
                  {poll.votes.length > 0 && (
                    <details className="mt-2 border-t border-slate-200 pt-3">
                      <summary className="text-xs font-black text-slate-700 cursor-pointer hover:text-amber-600 flex items-center gap-1.5 uppercase tracking-wider select-none py-1">
                        <span>📜 Детален преглед на гласани станови ({poll.votes.length} станови = {totalVotedM2} m²)</span>
                      </summary>
                      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-60 overflow-y-auto p-1">
                        {poll.votes.map((vote, vIdx) => {
                          const optText = poll.options[vote.optionIndex] || 'Опција';
                          const pollPins = poll.pins || unitPins;
                          const unitObj = units.find(u => u.number.toLowerCase() === vote.apartmentNo.toLowerCase());
                          const unitArea = unitObj ? (unitObj.area || 76) : 76;
                          const assignedPin = pollPins[vote.apartmentNo] || pollPins[unitObj?.id || ''] || 'N/A';

                          return (
                            <div key={vIdx} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-bold space-y-1">
                              <div className="flex justify-between items-center">
                                <div>
                                  <span className="font-black text-slate-900">Стан {vote.apartmentNo}</span>
                                  <span className="ml-1 text-[10px] text-slate-500 font-mono">({unitArea} m²)</span>
                                </div>
                                <span className="px-1.5 py-0.5 bg-amber-200 text-amber-900 rounded text-[10px] font-black uppercase">
                                  {optText}
                                </span>
                              </div>

                              <div className="flex justify-between items-center text-[10px]">
                                <span className="text-slate-600 truncate max-w-[120px]">{unitObj?.owner || 'Сопственик'}</span>
                                <span className="font-mono font-black text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-200">
                                  ПИН: {assignedPin}
                                </span>
                              </div>

                              <div className="text-[9px] text-slate-400 font-mono text-right pt-0.5 border-t border-slate-200">
                                {vote.timestamp}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </details>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUB-TAB 2: FUTURE PLANS EDITOR */}
      {activeSubTab === 'plans' && (
        <div className="space-y-8">
          <form onSubmit={handleAddFuturePlan} className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-6">
            <h3 className="text-base font-black text-slate-900 mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5 text-indigo-600" />
              Додади Нов Иден План / Инвеститорски Проект
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
                  Име на проектот *
                </label>
                <input
                  type="text"
                  required
                  placeholder="напр. Хидроизолација на покривот"
                  value={planTitle}
                  onChange={(e) => setPlanTitle(e.target.value)}
                  className="w-full px-4 py-2 bg-white border-2 border-slate-200 rounded-xl font-bold text-sm text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
                  Статус
                </label>
                <select
                  value={planStatus}
                  onChange={(e) => setPlanStatus(e.target.value as any)}
                  className="w-full px-4 py-2 bg-white border-2 border-slate-200 rounded-xl font-bold text-sm text-slate-900"
                >
                  <option value="planned">⏳ Во план</option>
                  <option value="in_progress">🔨 Во тек на реализација</option>
                  <option value="completed">✅ Завршено</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
                  Проценет трошок (денари)
                </label>
                <input
                  type="number"
                  placeholder="напр. 180000"
                  value={planCost}
                  onChange={(e) => setPlanCost(e.target.value)}
                  className="w-full px-4 py-2 bg-white border-2 border-slate-200 rounded-xl font-bold text-sm text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
                  Планиран термин / рок
                </label>
                <input
                  type="text"
                  placeholder="напр. Октомври 2026"
                  value={planTarget}
                  onChange={(e) => setPlanTarget(e.target.value)}
                  className="w-full px-4 py-2 bg-white border-2 border-slate-200 rounded-xl font-bold text-sm text-slate-900"
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
                Опис на зафатот *
              </label>
              <textarea
                required
                rows={3}
                placeholder="Детален опис за станарите..."
                value={planDesc}
                onChange={(e) => setPlanDesc(e.target.value)}
                className="w-full px-4 py-2 bg-white border-2 border-slate-200 rounded-xl font-bold text-sm text-slate-900"
              />
            </div>

            {/* Image Attachments */}
            <div className="mb-4">
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-indigo-600" />
                Прикачи Слики / Проекти / Спецификации (Опционално)
              </label>
              <div className="flex flex-wrap items-center gap-3">
                <label className="px-4 py-2 bg-white border-2 border-dashed border-slate-300 hover:border-indigo-500 rounded-xl text-slate-700 text-xs font-bold flex items-center gap-2 cursor-pointer transition-all">
                  <Upload className="w-4 h-4 text-indigo-600" />
                  <span>Избери слики од уред</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => handleImageUpload(e, setPlanImages)}
                    className="hidden"
                  />
                </label>

                {planImages.map((img, idx) => (
                  <div key={idx} className="relative w-16 h-16 rounded-xl overflow-hidden border-2 border-indigo-400 group shrink-0">
                    <img src={img} alt="preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setPlanImages(planImages.filter((_, i) => i !== idx))}
                      className="absolute inset-0 bg-slate-900/80 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow cursor-pointer transition-all"
            >
               Додади Инвестиција
            </button>
          </form>

          {/* List of plans */}
          <div className="space-y-4">
            {futurePlans.map(plan => (
              <div key={plan.id} className="p-4 bg-white border-2 border-slate-200 rounded-2xl flex items-start justify-between gap-4">
                <div>
                  <h5 className="font-black text-slate-900 text-base">{plan.title}</h5>
                  <p className="text-sm text-slate-700 mt-1">{plan.description}</p>

                  {plan.imageUrls && plan.imageUrls.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {plan.imageUrls.map((img, i) => (
                        <button 
                          key={i} 
                          type="button" 
                          onClick={() => setLightboxImg(img)} 
                          className="block w-20 h-20 rounded-lg overflow-hidden border border-slate-200 cursor-pointer text-left shrink-0 hover:border-indigo-500 transition-all"
                        >
                          <img src={img} alt="attachment" className="w-full h-full object-cover hover:scale-110 transition-all" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => handleDeleteFuturePlan(plan.id)}
                  className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                  title="Избриши план"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-TAB 3: CONTACTS EDITOR */}
      {activeSubTab === 'contacts' && (
        <div className="space-y-8">
          <form onSubmit={handleAddContact} className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-6">
            <h3 className="text-base font-black text-slate-900 mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5 text-rose-600" />
              Додади Нов Итен Контакт / Служба
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
                  Наслов на службата *
                </label>
                <input
                  type="text"
                  required
                  placeholder="напр. Водоинсталатер"
                  value={cntTitle}
                  onChange={(e) => setCntTitle(e.target.value)}
                  className="w-full px-4 py-2 bg-white border-2 border-slate-200 rounded-xl font-bold text-sm text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
                  Име / Компанија
                </label>
                <input
                  type="text"
                  placeholder="напр. Итни интервенции Марко"
                  value={cntName}
                  onChange={(e) => setCntName(e.target.value)}
                  className="w-full px-4 py-2 bg-white border-2 border-slate-200 rounded-xl font-bold text-sm text-slate-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
                  Телефон за контакт *
                </label>
                <input
                  type="text"
                  required
                  placeholder="напр. 078 / 123 - 456"
                  value={cntPhone}
                  onChange={(e) => setCntPhone(e.target.value)}
                  className="w-full px-4 py-2 bg-white border-2 border-slate-200 rounded-xl font-bold text-sm text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
                  Забелешка
                </label>
                <input
                  type="text"
                  placeholder="напр. Дежурен 24/7"
                  value={cntNote}
                  onChange={(e) => setCntNote(e.target.value)}
                  className="w-full px-4 py-2 bg-white border-2 border-slate-200 rounded-xl font-bold text-sm text-slate-900"
                />
              </div>
            </div>

            <button
              type="submit"
              className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow cursor-pointer transition-all"
            >
               Додади Контакт
            </button>
          </form>

          {/* List of contacts */}
          <div className="space-y-3">
            {emergencyContacts.map(cnt => (
              <div key={cnt.id} className="p-4 bg-white border-2 border-slate-200 rounded-2xl flex items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-bold text-slate-400 uppercase">{cnt.title}</div>
                  <div className="font-black text-slate-900">{cnt.name} - <span className="text-rose-600">{cnt.phone}</span></div>
                </div>

                <button
                  onClick={() => handleDeleteContact(cnt.id)}
                  className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-TAB 4: REPORTED ISSUES BY RESIDENTS */}
      {activeSubTab === 'issues' && (
        <div className="space-y-6">
          <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
            <Wrench className="w-5 h-5 text-rose-600" />
            Пријавени Дефекти и Проблеми од Станарите ({reportedIssues.length})
          </h3>

          {reportedIssues.length === 0 ? (
            <div className="p-8 bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl text-center text-slate-500 font-bold text-sm">
              Нема сѐ уште пријавени проблеми од станарите.
            </div>
          ) : (
            <div className="space-y-4">
              {reportedIssues.map(issue => (
                <div 
                  key={issue.id} 
                  className={`p-5 bg-white border-2 rounded-2xl shadow-sm transition-all ${
                    issue.status === 'resolved' 
                      ? 'border-emerald-300 bg-emerald-50/20' 
                      : 'border-amber-300 bg-amber-50/20'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                      <span className="px-2 py-0.5 bg-slate-900 text-white rounded font-black">
                        {issue.apartmentNo}
                      </span>
                      <span>•</span>
                      <span>Пријавено: {issue.date}</span>
                      <span>•</span>
                      <span className="text-rose-700 font-extrabold">{issue.issueType}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        value={issue.status}
                        onChange={(e) => handleToggleIssueStatus(issue.id, e.target.value as any)}
                        className="px-2.5 py-1 text-xs font-black rounded-lg border-2 border-slate-300 outline-none cursor-pointer"
                      >
                        <option value="open">⚠️ Отворено</option>
                        <option value="in_progress">🔨 Во тек</option>
                        <option value="resolved">✅ Решено</option>
                      </select>

                      <button
                        onClick={() => handleDeleteIssue(issue.id)}
                        className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <p className="text-sm font-bold text-slate-900 mt-1 whitespace-pre-line">
                    {issue.description}
                  </p>

                  <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <span>Поднел: <strong>{issue.name}</strong> ({issue.contact})</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 5: PIN SECURITY */}
      {activeSubTab === 'security' && (
        <div className="max-w-md mx-auto space-y-6">
          <form onSubmit={handleSavePin} className="bg-slate-900 text-white p-6 rounded-2xl shadow-lg border-2 border-slate-800">
            <h3 className="text-base font-black text-amber-400 mb-4 flex items-center gap-2">
              <Key className="w-5 h-5" />
              Промена на АДМИН ПИН Код
            </h3>

            <p className="text-xs text-slate-300 mb-4">
              Овој PIN код ве штити вас како управител за пристап до комплетниот систем за фактури, уплати и финансиски извештаи.
            </p>

            <div className="mb-4">
              <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-1">
                Моментален ПИН код: <strong className="text-amber-300">{adminPin}</strong>
              </label>
              <input
                type="password"
                required
                placeholder="Внесете нов 4-цифрен ПИН"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-800 border-2 border-slate-700 text-white rounded-xl font-bold text-base outline-none focus:border-amber-400"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer transition-all"
            >
              Зачувај Нов ПИН Код
            </button>
          </form>
        </div>
      )}
      </div>

      {/* PRINTABLE PINS OVERLAY MODAL */}
      {showPrintablePinsModal && (
        <div id="printable-pins-modal" className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white text-slate-900 rounded-3xl p-6 sm:p-8 max-w-5xl w-full max-h-[90vh] overflow-y-auto shadow-2xl relative">
            
            {/* Modal Header & Controls (Hidden when printing) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b mb-6 print:hidden">
              <div>
                <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                  <Printer className="w-5 h-5 text-amber-500" />
                  Печатење на Уникатни ПИН Кодови за 76 Станови
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Заедница на сопственици ул. Вич бр. 28 Скопје {activePollForPins ? `• Одлука: "${activePollForPins.title}"` : ''}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer flex items-center gap-1.5 shadow"
                >
                  <Printer className="w-4 h-4" />
                  <span>Отпечати ({printMode === 'slips' ? 'Ливчиња' : 'Регистар'})</span>
                </button>

                <button
                  onClick={() => {
                    setShowPrintablePinsModal(false);
                    setActivePollForPins(null);
                  }}
                  className="p-2 text-slate-400 hover:text-slate-700 rounded-full cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Print Mode Selector Tabs (Hidden when printing) */}
            <div className="flex items-center gap-2 mb-6 bg-slate-100 p-1.5 rounded-2xl print:hidden">
              <button
                onClick={() => setPrintMode('slips')}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  printMode === 'slips' ? 'bg-white text-slate-900 shadow-sm border border-slate-200' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>📬 Ливчиња за Достава во Поштенски Сандачиња</span>
              </button>

              <button
                onClick={() => setPrintMode('archive')}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  printMode === 'archive' ? 'bg-white text-slate-900 shadow-sm border border-slate-200' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>📋 Збирен Архивски Регистар на ПИН Кодови</span>
              </button>
            </div>

            {/* MODE 1: DELIVERY SLIPS FOR MAILBOXES */}
            {printMode === 'slips' && (
              <div>
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl mb-6 text-xs text-amber-900 print:hidden flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
                  <div className="space-y-0.5">
                    <div className="font-black flex items-center gap-1.5 text-amber-950">
                      <span>✂️</span>
                      <span>Печатење: Точно 4 ливчиња по А4 страница (голем и максимално читлив формат)</span>
                    </div>
                    <p className="text-amber-800 text-[11px]">
                      Исечете ги по испрекинатата линија и доставете ги во поштенските сандачиња на секој стан.
                    </p>
                  </div>
                  {activePollForPins && (
                    <span className="text-xs font-black bg-amber-200/90 text-amber-950 px-3 py-1.5 rounded-xl border border-amber-300 inline-flex items-center gap-1 self-start sm:self-auto">
                      <span>🗳️</span>
                      <span>Одлука: {activePollForPins.title}</span>
                    </span>
                  )}
                </div>

                <div className="space-y-6 print:space-y-0">
                  {(() => {
                    const currentPinsMap = (activePollForPins?.pins) || unitPins;
                    const unitPages: Unit[][] = [];
                    for (let i = 0; i < units.length; i += 4) {
                      unitPages.push(units.slice(i, i + 4));
                    }

                    return unitPages.map((pageUnits, pageIdx) => (
                      <div 
                        key={pageIdx} 
                        className="grid grid-cols-1 sm:grid-cols-2 gap-4 pin-slips-page print:grid-cols-2"
                      >
                        {pageUnits.map((u) => {
                          const pin = currentPinsMap[u.number] || 'N/A';
                          return (
                            <div 
                              key={u.id} 
                              className="pin-slip-card p-5 sm:p-6 border-2 border-dashed border-slate-400 print:border-slate-900 rounded-3xl bg-white flex flex-col justify-between text-center relative break-inside-avoid shadow-xs hover:border-amber-500 transition-all"
                            >
                              <div>
                                <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-3">
                                  <div className="text-left">
                                    <div className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                                      Заедница на сопственици
                                    </div>
                                    <div className="text-xs font-bold text-slate-800">
                                      ул. Вич бр. 28 Скопје
                                    </div>
                                  </div>
                                  <div className="text-right text-[10px] font-bold text-slate-400 font-mono">
                                    {u.type === 'apartment' ? 'СТАН' : 'ДЕЛОВЕН'}
                                  </div>
                                </div>

                                <div className="py-2.5 px-3 bg-amber-500/10 border-2 border-amber-500/30 rounded-2xl mb-3">
                                  <div className="text-xl sm:text-2xl font-black text-slate-950 tracking-tight">
                                    {u.type === 'apartment' ? `СТАН бр. ${u.number}` : `ЛОКАЛ бр. ${u.number}`}
                                  </div>
                                  <div className="text-xs font-bold text-slate-700 mt-0.5 truncate max-w-[220px] mx-auto">
                                    {u.owner || 'Сопственик'} ({u.area || 76} m²)
                                  </div>
                                </div>

                                {activePollForPins && (
                                  <div className="p-2.5 bg-slate-100 border border-slate-200 rounded-xl mb-3 text-left">
                                    <div className="text-[9px] font-black uppercase text-slate-500 tracking-wider">
                                      📌 Гласање за одлука:
                                    </div>
                                    <div className="text-xs font-black text-slate-900 line-clamp-2 mt-0.5">
                                      {activePollForPins.title}
                                    </div>
                                  </div>
                                )}

                                <div className="my-2">
                                  <div className="text-[10px] uppercase font-black text-slate-500 tracking-wider mb-1">
                                    Вашиот таен ПИН код за гласање:
                                  </div>
                                  <div className="py-2.5 px-6 bg-slate-950 text-amber-300 font-mono text-2xl sm:text-3xl font-black rounded-2xl border-2 border-slate-800 tracking-[0.25em] inline-block shadow-md">
                                    {pin}
                                  </div>
                                </div>
                              </div>

                              <div className="mt-3 pt-2.5 border-t border-slate-200 text-[10px] text-slate-600 font-medium leading-tight">
                                🌐 Гласајте дигитално на веб-порталот за <strong>Вич 28</strong> со внесување на вашиот стан и овој ПИН код. (1 стан = 1 глас)
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ));
                  })()}
                </div>
              </div>
            )}

            {/* MODE 2: MASTER ARCHIVE REGISTRY TABLE */}
            {printMode === 'archive' && (
              <div className="space-y-4">
                <div className="text-center pb-4 border-b">
                  <h2 className="text-lg font-black text-slate-900 uppercase tracking-wide">
                    Заедница на Сопственици на Посебни Делови
                  </h2>
                  <p className="text-xs font-bold text-slate-600">
                    ул. Вич бр. 28, Скопје • {activePollForPins ? `РЕГИСТАР НА ПИН КОДОВИ ЗА ГЛАСАЊЕ: "${activePollForPins.title.toUpperCase()}"` : 'ЗБИРЕН РЕГИСТАР НА ПИН КОДОВИ ЗА ГЛАСАЊЕ'}
                  </p>
                  <p className="text-[10px] text-slate-400 font-mono mt-1">
                    Датум на генерирање: {new Date().toLocaleDateString('mk-MK')} • Вкупно регистрирани објекти: 76 (68 станови / 8 локали) {activePollForPins ? `• Кворум: ${activePollForPins.quorumRequired || 51}%` : ''}
                  </p>
                </div>

                <table className="w-full text-left text-xs border-collapse border border-slate-300">
                  <thead>
                    <tr className="bg-slate-100 text-slate-900 font-black uppercase text-[10px] tracking-wider">
                      <th className="p-2 border border-slate-300 w-12 text-center">#</th>
                      <th className="p-2 border border-slate-300">Објект / Бр.</th>
                      <th className="p-2 border border-slate-300">Сопственик / Станар</th>
                      <th className="p-2 border border-slate-300 w-20 text-center">Квадратура</th>
                      <th className="p-2 border border-slate-300 w-32 text-center">Генериран ПИН Код</th>
                      <th className="p-2 border border-slate-300 text-center">Потпис / Забелешка за достава</th>
                    </tr>
                  </thead>
                  <tbody>
                    {units.map((u, idx) => {
                      const currentPinsMap = (activePollForPins?.pins) || unitPins;
                      const pin = currentPinsMap[u.number] || 'N/A';
                      return (
                        <tr key={u.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                          <td className="p-1.5 border border-slate-300 text-center font-mono text-[10px] text-slate-500">{idx + 1}</td>
                          <td className="p-1.5 border border-slate-300 font-black">
                            {u.type === 'apartment' ? `Стан ${u.number}` : `Локал ${u.number}`}
                          </td>
                          <td className="p-1.5 border border-slate-300 font-medium truncate max-w-[200px]">{u.owner || '—'}</td>
                          <td className="p-1.5 border border-slate-300 text-center font-mono font-bold">{u.area || 76} m²</td>
                          <td className="p-1.5 border border-slate-300 text-center font-mono font-black text-amber-900 bg-amber-50">{pin}</td>
                          <td className="p-1.5 border border-slate-300 text-slate-300 text-[10px]">_________________________</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                <div className="pt-6 border-t border-slate-300 grid grid-cols-2 gap-8 text-xs font-bold text-slate-700">
                  <div>
                    <p>Овластен Управител / Претседател:</p>
                    <p className="mt-8 border-b border-slate-400 w-48"></p>
                    <p className="text-[10px] text-slate-500 mt-1">Потпис и Печат</p>
                  </div>
                  <div className="text-right">
                    <p>Заедница на сопственици Вич 28:</p>
                    <p className="mt-8 border-b border-slate-400 w-48 ml-auto"></p>
                    <p className="text-[10px] text-slate-500 mt-1">Архива / Депозит</p>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      )}


      {/* OFFICIAL DECISION PROTOCOL / MINUTES MODAL */}
      {selectedPollForProtocol && (
        <div id="official-protocol-modal" className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white text-slate-900 rounded-3xl p-6 sm:p-10 max-w-4xl w-full max-h-[92vh] overflow-y-auto shadow-2xl relative">
            
            {/* Modal Controls (Hidden when printing) */}
            <div className="flex items-center justify-between pb-4 border-b mb-6 print:hidden">
              <div>
                <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-amber-600" />
                  Официјален Записник од Гласање
                </h3>
                <p className="text-xs text-slate-500 font-medium">Официјален документ за архива на зградата</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer flex items-center gap-1.5 shadow"
                >
                  <Printer className="w-4 h-4" />
                  <span>Отпечати Записник</span>
                </button>

                <button
                  onClick={() => setSelectedPollForProtocol(null)}
                  className="p-2 text-slate-400 hover:text-slate-700 rounded-full cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* PROTOCOL DOCUMENT CONTENT */}
            {(() => {
              const poll = selectedPollForProtocol;
              const totalBuildingM2 = units.reduce((acc, u) => acc + (u.area || 0), 0) || 5776;
              const majorityM2Needed = Math.floor(totalBuildingM2 / 2) + 1; // 50% + 1 m2

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

              const yesM2 = optionM2s[0] || 0;
              const noM2 = optionM2s[1] || 0;
              const isApproved = yesM2 >= majorityM2Needed;

              return (
                <div className="space-y-6 text-slate-900">
                  {/* Header */}
                  <div className="text-center border-b pb-4">
                    <h1 className="text-xl font-black uppercase tracking-wider">ЗАЕДНИЦА НА СОПСТВЕНИЦИ НА ПОСЕБНИ ДЕЛОВИ</h1>
                    <p className="text-xs font-bold text-slate-700">ул. „Вич“ бр. 28, Скопје • Општина Карпош</p>
                    <div className="mt-3 inline-block px-4 py-1.5 bg-slate-100 border-2 border-slate-300 rounded-xl font-black text-xs uppercase tracking-widest text-slate-900">
                      ОФИЦИЈАЛЕН ЗАПИСНИК И ИЗВЕШТАЈ ОД ДИГИТАЛНО ГЛАСАЊЕ
                    </div>
                  </div>

                  {/* Poll Info Box */}
                  <div className="p-4 bg-slate-50 border border-slate-300 rounded-2xl space-y-2 text-xs">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-slate-500 uppercase font-black text-[10px]">Наслов на одлуката:</span>
                        <p className="font-black text-sm text-slate-900">{poll.title}</p>
                      </div>
                      <div>
                        <span className="text-slate-500 uppercase font-black text-[10px]">Категорија & Статус:</span>
                        <p className="font-bold text-slate-800 uppercase">{poll.category} • {poll.status === 'active' ? '● Активно' : 'О Завршено'}</p>
                      </div>
                    </div>

                    <div>
                      <span className="text-slate-500 uppercase font-black text-[10px]">Опис и услови:</span>
                      <p className="font-medium text-slate-700">{poll.description}</p>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200 text-[11px] font-bold">
                      <div>Почеток: <strong>{poll.startDate}</strong></div>
                      <div>Краен рок: <strong>{poll.endDate}</strong></div>
                      <div>Кворум: <strong>{poll.quorumRequired || 51}%</strong></div>
                    </div>
                  </div>

                  {/* Results Summary Box */}
                  <div className="p-4 bg-amber-50/80 border-2 border-amber-300 rounded-2xl text-xs font-bold space-y-3">
                    <div className="flex justify-between items-center border-b border-amber-200 pb-2">
                      <span className="text-amber-950 font-black text-sm">ЗБИРНИ РЕЗУЛТАТИ ОД ГЛАСАЊЕТО:</span>
                      <span className={`px-3 py-1 rounded-lg font-black uppercase text-xs ${
                        isApproved ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                      }`}>
                        {isApproved ? '🎉 ОДЛУКАТА Е УСВОЕНА' : '❌ ОДЛУКАТА НЕ Е УСВОЕНА'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                      <div className="bg-white p-2 rounded-xl border border-amber-200">
                        <span className="text-[10px] text-slate-500 uppercase">Вкупно зграда:</span>
                        <div className="font-mono text-sm font-black">{totalBuildingM2} m²</div>
                      </div>

                      <div className="bg-white p-2 rounded-xl border border-amber-200">
                        <span className="text-[10px] text-slate-500 uppercase">Законски праг (50%+1m²):</span>
                        <div className="font-mono text-sm font-black text-amber-900">{majorityM2Needed} m²</div>
                      </div>

                      <div className="bg-white p-2 rounded-xl border border-amber-200">
                        <span className="text-[10px] text-slate-500 uppercase">Вкупно излезеност:</span>
                        <div className="font-mono text-sm font-black text-indigo-900">{totalVotedM2} m² ({poll.votes.length} ст.)</div>
                      </div>

                      <div className="bg-white p-2 rounded-xl border border-amber-200">
                        <span className="text-[10px] text-slate-500 uppercase">Гласале ЗА:</span>
                        <div className="font-mono text-sm font-black text-emerald-700">{yesM2} m²</div>
                      </div>
                    </div>
                  </div>

                  {/* Detailed Voting Breakdown Table */}
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider mb-2 text-slate-800">
                      📜 Детален Регистар на Автентицирани Гласови со ПИН Кодови ({poll.votes.length} станови):
                    </h4>

                    {poll.votes.length === 0 ? (
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-slate-500 text-xs font-bold">
                        Сѐ уште нема забележано гласови за оваа одлука.
                      </div>
                    ) : (
                      <table className="w-full text-left text-xs border-collapse border border-slate-300">
                        <thead>
                          <tr className="bg-slate-100 text-slate-900 font-black uppercase text-[10px] tracking-wider">
                            <th className="p-2 border border-slate-300 w-10 text-center">#</th>
                            <th className="p-2 border border-slate-300">Бр. Стан</th>
                            <th className="p-2 border border-slate-300">Сопственик</th>
                            <th className="p-2 border border-slate-300 text-center">Површина (m²)</th>
                            <th className="p-2 border border-slate-300 text-center">ПИН Код</th>
                            <th className="p-2 border border-slate-300 text-center">Избран Глас</th>
                            <th className="p-2 border border-slate-300 text-center">Време</th>
                          </tr>
                        </thead>
                        <tbody>
                          {poll.votes.map((v, idx) => {
                            const pollPins = poll.pins || unitPins;
                            const matchedUnit = units.find(u => u.number.toLowerCase() === v.apartmentNo.toLowerCase());
                            const unitArea = matchedUnit ? (matchedUnit.area || 76) : 76;
                            const assignedPin = pollPins[v.apartmentNo] || pollPins[matchedUnit?.id || ''] || 'N/A';
                            const optText = poll.options[v.optionIndex] || 'Опција';

                            return (
                              <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                                <td className="p-2 border border-slate-300 text-center font-mono text-[10px] text-slate-500">{idx + 1}</td>
                                <td className="p-2 border border-slate-300 font-black">Стан {v.apartmentNo}</td>
                                <td className="p-2 border border-slate-300 font-medium">{matchedUnit?.owner || '—'}</td>
                                <td className="p-2 border border-slate-300 text-center font-mono font-bold">{unitArea} m²</td>
                                <td className="p-2 border border-slate-300 text-center font-mono font-black text-amber-900 bg-amber-50">{assignedPin}</td>
                                <td className="p-2 border border-slate-300 text-center font-black">{optText}</td>
                                <td className="p-2 border border-slate-300 text-center font-mono text-[10px] text-slate-500">{v.timestamp}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>

                  {/* Footer Signatures */}
                  <div className="pt-8 border-t border-slate-300 grid grid-cols-2 gap-8 text-xs font-bold text-slate-700">
                    <div>
                      <p>Заедница на сопственици ул. Вич бр. 28:</p>
                      <p className="mt-8 border-b border-slate-400 w-48"></p>
                      <p className="text-[10px] text-slate-500 mt-1">Овластен Управител / Претседател</p>
                    </div>
                    <div className="text-right">
                      <p>Заверка во Архива:</p>
                      <p className="mt-8 border-b border-slate-400 w-48 ml-auto"></p>
                      <p className="text-[10px] text-slate-500 mt-1">Датум: ________________</p>
                    </div>
                  </div>

                </div>
              );
            })()}

          </div>
        </div>
      )}

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
