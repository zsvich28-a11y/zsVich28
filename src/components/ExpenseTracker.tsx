import React, { useState, useRef } from 'react';
import { Expense, Language } from '../types';
import { formatDenarExact } from '../utils';
import { 
  Plus, 
  Trash2, 
  Calendar, 
  Receipt, 
  CreditCard, 
  ShieldCheck, 
  Upload, 
  X, 
  Image as ImageIcon, 
  Eye, 
  FileImage, 
  Maximize2 
} from 'lucide-react';

interface ExpenseTrackerProps {
  expenses: Expense[];
  onUpdateExpenses: (expenses: Expense[]) => void;
  monthId: string;
  lang: Language;
}

export default function ExpenseTracker({ expenses, onUpdateExpenses, monthId, lang }: ExpenseTrackerProps) {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [fundType, setFundType] = useState<'current' | 'reserve'>('current');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [tempImage, setTempImage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<{ url: string; title: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const rowFileInputRef = useRef<HTMLInputElement>(null);
  const [activeRowUploadId, setActiveRowUploadId] = useState<string | null>(null);

  const t = {
    MK: {
      title: 'Евиденција на трошоците',
      subtitle: 'Внесете ги рачните исплати за тековниот месец.',
      add: 'Додај трошок',
      descPlaceholder: 'Опис на трошокот (напр. Струја за заедничките делови)',
      amountPlaceholder: 'Износ (ден.)',
      fundType: 'Фонд',
      currentFund: 'Тековен фонд',
      reserveFund: 'Резервен фонд',
      date: 'Датум',
      listTitle: 'Листа на трошоците за',
      empty: 'Нема внесени трошоци за овој месец.',
      delete: 'Избриши',
      totalThisMonth: 'Вкупни трошоци за овој месец',
      attachment: 'Доказ / Сметка',
      uploadPrompt: 'Повлечете ја сметката тука или кликнете за избор',
      uploadPromptSub: 'Максимално соодветна големина (JPG, PNG)',
      previewText: 'Преглед на сметката',
      removeImage: 'Отстрани ја сметката',
      closeLightbox: 'Затвори',
      attachNow: '+ Слика',
      reAttach: 'Промени ја сметката',
      noReceiptYet: 'Нема слика'
    },
    EN: {
      title: 'Expense Tracking',
      subtitle: 'Input manual payments for the active month.',
      add: 'Add Expense',
      descPlaceholder: 'Expense description (e.g., Common area electricity)',
      amountPlaceholder: 'Amount (den)',
      fundType: 'Fund',
      currentFund: 'Current Fund',
      reserveFund: 'Reserve Fund',
      date: 'Date',
      listTitle: 'Expenses for',
      empty: 'No expenses recorded for this month.',
      delete: 'Delete',
      totalThisMonth: 'Total monthly expenses',
      attachment: 'Attachment / Receipt',
      uploadPrompt: 'Drag receipt here or click to browse',
      uploadPromptSub: 'Optimized automatically (JPG, PNG)',
      previewText: 'Receipt Preview',
      removeImage: 'Remove receipt',
      closeLightbox: 'Close',
      attachNow: '+ Image',
      reAttach: 'Change receipt',
      noReceiptYet: 'No image'
    }
  }[lang];

  React.useEffect(() => {
    if (monthId) {
      const today = new Date().toISOString().split('T')[0];
      if (today.startsWith(monthId)) {
        setDate(today);
      } else {
        setDate(`${monthId}-01`);
      }
    }
  }, [monthId]);

  const processImageFile = (file: File, callback: (base64: string) => void) => {
    if (!file.type.startsWith('image/')) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const MAX_WIDTH = 1200;
        const MAX_HEIGHT = 1200;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.75); // high efficiency JPEG
          callback(dataUrl);
        } else {
          callback(e.target?.result as string);
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file, (base64) => {
        setTempImage(base64);
      });
    }
  };

  const handleRowFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && activeRowUploadId) {
      processImageFile(file, (base64) => {
        // Update that specific expense with the new attachment
        const updated = expenses.map(item => {
          if (item.id === activeRowUploadId) {
            return { ...item, imageUrl: base64 };
          }
          return item;
        });
        onUpdateExpenses(updated);
        setActiveRowUploadId(null);
      });
    }
  };

  const triggerRowUpload = (expenseId: string) => {
    setActiveRowUploadId(expenseId);
    if (rowFileInputRef.current) {
      rowFileInputRef.current.value = '';
      rowFileInputRef.current.click();
    }
  };

  const handleRemoveExistingImage = (expenseId: string) => {
    const updated = expenses.map(item => {
      if (item.id === expenseId) {
        const { imageUrl, ...rest } = item;
        return rest;
      }
      return item;
    });
    onUpdateExpenses(updated);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processImageFile(file, (base64) => {
        setTempImage(base64);
      });
    }
  };

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || !amount) return;

    const expenseMonthId = (date && date.length >= 7) ? date.substring(0, 7) : monthId;

    const newExpense: Expense = {
      id: `exp-${Date.now()}`,
      monthId: expenseMonthId,
      date,
      description: description.trim(),
      amount: parseFloat(amount) || 0,
      fundType,
      ...(tempImage ? { imageUrl: tempImage } : {})
    };

    onUpdateExpenses([...expenses, newExpense]);
    setDescription('');
    setAmount('');
    setTempImage(null);
  };

  const handleDeleteExpense = (id: string) => {
    onUpdateExpenses(expenses.filter(e => e.id !== id));
  };

  const monthExpenses = expenses.filter(e => e.monthId === monthId || (e.date && e.date.startsWith(monthId)));
  const totalMonthExpenses = monthExpenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="space-y-6">
      {/* Creation form with attachment option */}
      <div className="bg-white border-2 border-black p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-2 bg-black text-white">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-black uppercase tracking-tight">{t.title}</h2>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t.subtitle}</p>
          </div>
        </div>

        <form onSubmit={handleAddExpense} className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Inputs Section */}
          <div className="md:col-span-2 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black uppercase mb-1">{t.descPlaceholder}</label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-2 border-2 border-black focus:outline-hidden font-bold text-sm"
                  placeholder="..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase mb-1">{t.amountPlaceholder}</label>
                <input
                  type="number"
                  required
                  className="w-full px-4 py-2 border-2 border-black focus:outline-hidden font-mono font-black text-sm"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase mb-1">{t.date}</label>
                <input
                  type="date"
                  required
                  className="w-full px-4 py-2 border-2 border-black focus:outline-hidden font-mono text-xs font-bold"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase mb-1">{t.fundType}</label>
                <select
                  className="w-full px-4 py-2 border-2 border-black focus:outline-hidden font-bold text-xs uppercase"
                  value={fundType}
                  onChange={(e) => setFundType(e.target.value as 'current' | 'reserve')}
                >
                  <option value="current">{t.currentFund}</option>
                  <option value="reserve">{t.reserveFund}</option>
                </select>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full h-[42px] bg-black text-white hover:bg-slate-800 transition-all font-black uppercase text-xs tracking-widest flex items-center justify-center space-x-2 cursor-pointer border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 active:shadow-none"
              >
                <Plus className="w-4 h-4" />
                <span>{t.add}</span>
              </button>
            </div>
          </div>

          {/* Styled Drag & Drop Image Uploader Zone */}
          <div className="relative">
            <label className="block text-[10px] font-black uppercase mb-1">{t.attachment}</label>
            
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />

            {!tempImage ? (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`h-[155px] border-2 border-dashed rounded-none flex flex-col items-center justify-center p-4 text-center cursor-pointer transition-all ${
                  isDragging 
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-900 scale-[0.98]' 
                    : 'border-slate-400 bg-slate-50 hover:bg-slate-100 hover:border-black text-slate-500'
                }`}
              >
                <Upload className="w-6 h-6 mb-2 text-slate-400 animate-pulse" />
                <span className="text-[11px] font-black uppercase tracking-wider block">{t.uploadPrompt}</span>
                <span className="text-[9px] text-slate-400 font-bold mt-1 block">{t.uploadPromptSub}</span>
              </div>
            ) : (
              <div className="h-[155px] border-2 border-black relative overflow-hidden bg-slate-900 group">
                <img
                  src={tempImage}
                  alt="Receipt Preview"
                  className="w-full h-full object-cover opacity-90 transition-transform group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setLightboxImage({ url: tempImage, title: description || t.previewText })}
                    className="p-2 bg-white text-black hover:bg-yellow-400 transition-all cursor-pointer rounded-lg"
                    title={t.previewText}
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setTempImage(null)}
                    className="p-2 bg-red-600 text-white hover:bg-red-700 transition-all cursor-pointer rounded-lg"
                    title={t.removeImage}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="absolute bottom-2 left-2 bg-black/80 px-2 py-0.5 text-[8px] font-black text-white uppercase tracking-widest border border-slate-700">
                  {t.previewText}
                </div>
              </div>
            )}
          </div>
        </form>
      </div>

      {/* Table list */}
      <div className="bg-white border-2 border-black">
        <div className="p-4 border-b-2 border-black bg-slate-50 flex items-center justify-between">
          <h3 className="text-xs font-black uppercase tracking-widest">
            {t.listTitle} {monthId}
          </h3>
          <div className="text-right">
            <p className="text-[10px] font-bold text-slate-500 uppercase">{t.totalThisMonth}</p>
            <p className="text-sm font-black font-mono text-rose-600">{formatDenarExact(totalMonthExpenses, lang)}</p>
          </div>
        </div>

        {/* Hidden input for row-level edits */}
        <input 
          type="file" 
          ref={rowFileInputRef}
          accept="image/*"
          className="hidden"
          onChange={handleRowFileChange}
        />

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b-2 border-black text-[10px] font-black uppercase tracking-widest bg-slate-50">
                <th className="p-4 w-28">{t.date}</th>
                <th className="p-4">{t.descPlaceholder}</th>
                <th className="p-4 w-32">{t.fundType}</th>
                <th className="p-4 w-40 text-center">{t.attachment}</th>
                <th className="p-4 text-right w-36">{t.amountPlaceholder}</th>
                <th className="p-4 text-center w-20"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {monthExpenses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-slate-400 font-bold uppercase text-xs tracking-widest">
                    {t.empty}
                  </td>
                </tr>
              ) : (
                [...monthExpenses].reverse().map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-mono text-xs whitespace-nowrap">
                      {exp.date}
                    </td>
                    <td className="p-4 font-bold text-sm">
                      {exp.description}
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter border ${
                        exp.fundType === 'reserve' 
                          ? 'bg-yellow-100 text-yellow-800 border-yellow-200' 
                          : 'bg-blue-100 text-blue-800 border-blue-200'
                      }`}>
                        {exp.fundType === 'reserve' ? (
                          <ShieldCheck className="w-2.5 h-2.5 mr-1" />
                        ) : (
                          <CreditCard className="w-2.5 h-2.5 mr-1" />
                        )}
                        {exp.fundType === 'reserve' ? t.reserveFund : t.currentFund}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      {exp.imageUrl ? (
                        <div className="flex items-center justify-center space-x-2">
                          <button
                            type="button"
                            onClick={() => setLightboxImage({ url: exp.imageUrl!, title: exp.description })}
                            className="group relative w-10 h-10 border border-black bg-slate-100 cursor-pointer overflow-hidden flex items-center justify-center"
                          >
                            <img 
                              src={exp.imageUrl} 
                              alt="Receipt" 
                              className="w-full h-full object-cover" 
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                              <Eye className="w-3.5 h-3.5 text-white" />
                            </div>
                          </button>
                          
                          <div className="flex flex-col text-left text-[9px] font-bold">
                            <button
                              onClick={() => triggerRowUpload(exp.id)}
                              className="text-indigo-600 hover:underline hover:text-indigo-800 cursor-pointer"
                            >
                              {lang === 'MK' ? 'мени' : 'change'}
                            </button>
                            <button
                              onClick={() => handleRemoveExistingImage(exp.id)}
                              className="text-red-500 hover:underline hover:text-red-700 cursor-pointer"
                            >
                              {lang === 'MK' ? 'бриши' : 'remove'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => triggerRowUpload(exp.id)}
                          className="mx-auto px-2 py-1 text-[10px] font-black uppercase tracking-wider bg-slate-100 border border-dashed border-slate-400 hover:border-black hover:bg-slate-200 text-slate-500 flex items-center justify-center space-x-1 rounded-none cursor-pointer"
                        >
                          <Upload className="w-3 h-3" />
                          <span>{t.attachNow}</span>
                        </button>
                      )}
                    </td>
                    <td className="p-4 text-right font-black font-mono text-sm text-rose-600 whitespace-nowrap">
                      -{formatDenarExact(exp.amount, lang)}
                    </td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => handleDeleteExpense(exp.id)}
                        className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                        title={t.delete}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Lightbox Modal */}
      {lightboxImage && (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4 animate-fade-in print:hidden">
          <div className="max-w-4xl w-full bg-stone-900 border-4 border-black text-white p-4 relative flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between pb-3 border-b border-stone-800">
              <div className="flex items-center space-x-2">
                <FileImage className="w-5 h-5 text-yellow-400" />
                <h3 className="font-sans font-black uppercase text-xs tracking-wider">{lightboxImage.title}</h3>
              </div>
              <button
                onClick={() => setLightboxImage(null)}
                className="p-2 bg-yellow-400 text-black hover:bg-white transition-all cursor-pointer font-black uppercase text-xs flex items-center space-x-1"
              >
                <X className="w-4 h-4" />
                <span>{t.closeLightbox}</span>
              </button>
            </div>
            
            <div className="flex-1 overflow-auto flex items-center justify-center py-4 bg-black">
              <img
                src={lightboxImage.url}
                alt={lightboxImage.title}
                className="max-h-[60vh] max-w-full object-contain border border-stone-800"
              />
            </div>

            <div className="pt-2 border-t border-stone-800 flex justify-between items-center text-[10px] text-stone-400 font-mono">
              <span>HOUSEMAN RECEIPT VIEWER v1.2</span>
              <button
                onClick={() => {
                  const printWin = window.open();
                  if (printWin) {
                    printWin.document.write(`
                      <html>
                        <head>
                          <title>${lightboxImage.title}</title>
                          <style>
                            body { margin: 0; display: flex; justify-content: center; align-items: center; height: 100vh; background: #fff; }
                            img { max-width: 100%; max-height: 100%; object-contain: fit; }
                          </style>
                        </head>
                        <body onload="window.print();window.close();">
                          <img src="${lightboxImage.url}" />
                        </body>
                      </html>
                    `);
                    printWin.document.close();
                  }
                }}
                className="px-3 py-1 bg-white text-black hover:bg-slate-200 transition-all uppercase font-bold whitespace-nowrap cursor-pointer"
              >
                {lang === 'MK' ? 'Печати сметка' : 'Print Receipt'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

