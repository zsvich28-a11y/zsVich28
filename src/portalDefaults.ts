import { Announcement, FuturePlan, EmergencyContact, Poll } from './types';

export const DEFAULT_ANNOUNCEMENTS: Announcement[] = [
  {
    id: 'ann-1',
    date: '2026-08-20',
    title: 'Редовен сервис и дијагностика на лифтот',
    content: 'Ве известуваме дека на 26.08.2026 година (вторник) во периодот од 10:00 до 12:00 часот ќе се врши редовен сервис на лифтот. Лифтот привремено нема да биде во функција.',
    priority: 'high',
    category: 'Техничко одржување'
  },
  {
    id: 'ann-2',
    date: '2026-08-15',
    title: 'Состанок на сопствениците на станови - Август 2026',
    content: 'Се повикуваат сите сопственици на станови и деловни простории на состанок кој ќе се одржи во влезот на зградата на 30.08.2026 во 19:30 часот. Точки на дневен ред: 1. Годишен финансиски извештај, 2. Избор на изведувач за реновирање на покривот.',
    priority: 'high',
    category: 'Состанок'
  },
  {
    id: 'ann-3',
    date: '2026-08-01',
    title: 'Замолница за почитување на куќниот ред',
    content: 'Се замолуваат сите станари да го почитуваат куќниот ред, особено за време на одмор од 15:00 до 17:00 часот и од 22:00 до 06:00 часот. Исто така, ве молиме да не оставате приватни предмети во заедниките холови.',
    priority: 'normal',
    category: 'Куќен ред'
  }
];

export const DEFAULT_FUTURE_PLANS: FuturePlan[] = [
  {
    id: 'plan-1',
    title: 'Реномирање и хидроизолација на покривот',
    description: 'Целосна замена на старата хидроизолација на рамниот покрив со нови слоеви за заштита од протекување.',
    status: 'in_progress',
    estimatedCost: 180000,
    targetDate: 'Септември 2026'
  },
  {
    id: 'plan-2',
    title: 'Поставување видео надзор со HD камери',
    description: 'Инсталација на 6 дигитални HD камери во влезот, лифтот и задниот влез за зголемена безбедност на сите станари.',
    status: 'planned',
    estimatedCost: 45000,
    targetDate: 'Октомври 2026'
  },
  {
    id: 'plan-3',
    title: 'Замена на осветлувањето во влезот со сензорски LED светилки',
    description: 'Замена на сите стари светилки на сите катови со енергетски ефикасни LED панели со сензор за движење за намалување на сметките за струја.',
    status: 'completed',
    estimatedCost: 22000,
    targetDate: 'Јули 2026'
  },
  {
    id: 'plan-4',
    title: 'Бојадисување и освежување на внатрешните ѕидови на влезот',
    description: 'Варосување и бојадисување на влезот и скалишниот простор до најгорниот кат.',
    status: 'planned',
    estimatedCost: 85000,
    targetDate: 'Пролет 2027'
  }
];

export const DEFAULT_EMERGENCY_CONTACTS: EmergencyContact[] = [
  {
    id: 'cnt-1',
    title: 'Претседател на куќен совет (Управител)',
    name: 'Филип Зафировски',
    phone: '070 / 123 - 456',
    note: 'Достапен за сите итни зградински прашања'
  },
  {
    id: 'cnt-2',
    title: 'Дежурен сервис за лифт',
    name: '„Лифт Сервис Скопје“ ДООЕЛ',
    phone: '075 / 999 - 888',
    note: '24/7 Дежурна служба за заглавени патници или дефекти'
  },
  {
    id: 'cnt-3',
    title: 'Водовод и канализација (Итна дежурна служба)',
    name: 'ЈП Водовод Скопје',
    phone: '02 / 3070 - 000',
    note: 'Пријава на хаварии на главната водоводна мрежа'
  },
  {
    id: 'cnt-4',
    title: 'Дежурен Водоинсталатер (Зградински мајстор)',
    name: 'Марко (Итни интервенции)',
    phone: '078 / 555 - 444',
    note: 'За внатрешни пукнати цевки и вентили'
  },
  {
    id: 'cnt-5',
    title: 'ЕСМ Снабдување со топлина (Парно)',
    name: 'ЕСМ Диспечерски центар',
    phone: '02 / 3076 - 088',
    note: 'Пријава на дефекти на топловодната мрежа'
  },
  {
    id: 'cnt-6',
    title: 'Електродистрибуција (EVN Дежурен центар)',
    name: 'EVN Македонија',
    phone: '0800 - 11 - 100',
    note: 'Пријава на прекини во снабдувањето со електрична енергија'
  }
];

export function generateUnitPin(unitNumber: string): string {
  let hash = 0;
  const str = `VICH_28_APT_PIN_${unitNumber}_2026_NUMERIC`;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const pinNum = 1000 + (Math.abs(hash) % 9000);
  return pinNum.toString();
}

export function generatePollPinsForUnits(pollSeed: string, unitNumbers: string[]): Record<string, string> {
  const map: Record<string, string> = {};
  unitNumbers.forEach((no, idx) => {
    let hash = 0;
    const str = `VICH_28_POLL_${pollSeed}_UNIT_${no}_INDEX_${idx}_PIN_4DIGIT`;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    const pinNum = 1000 + (Math.abs(hash) % 9000);
    map[no] = pinNum.toString();
  });
  return map;
}

const ALL_UNIT_NUMS = [
  ...Array.from({ length: 68 }, (_, i) => (i + 1).toString()),
  'Д1', 'Д2', 'Д3', 'Д4', 'Д5', 'Д6', 'Д7', 'Д8'
];

export const DEFAULT_POLLS: Poll[] = [
  {
    id: 'poll-1',
    title: 'Инсталација на нов систем за видеонадзор со 6 HD камери',
    description: 'Гласање за одобрување на инвестиција за набавка и монтажа на 6 HD камери со снимач за влез, лифт и заден влез. Проценета вредност: 45,000 денари од резервниот фонд.',
    options: ['ЗА', 'ПРОТИВ'],
    startDate: '2026-08-20',
    endDate: '2026-09-15',
    status: 'active',
    category: 'capital',
    quorumRequired: 51,
    pins: generatePollPinsForUnits('poll-1', ALL_UNIT_NUMS),
    votes: [
      { apartmentNo: '1', optionIndex: 0, timestamp: '2026-08-21 10:15' },
      { apartmentNo: '3', optionIndex: 0, timestamp: '2026-08-21 11:30' },
      { apartmentNo: '5', optionIndex: 1, timestamp: '2026-08-22 09:12' },
      { apartmentNo: '12', optionIndex: 0, timestamp: '2026-08-22 14:05' },
      { apartmentNo: '14', optionIndex: 0, timestamp: '2026-08-22 18:22' },
      { apartmentNo: '28', optionIndex: 0, timestamp: '2026-08-23 08:00' },
    ]
  },
  {
    id: 'poll-2',
    title: 'Определување на термини за куќен ред во летен период',
    description: 'Гласање за промена на попладневниот одмор за време на летните месеци (Јуни-Август) од 15:00-17:00 на 14:30-17:30.',
    options: ['ЗА', 'ПРОТИВ'],
    startDate: '2026-08-01',
    endDate: '2026-08-20',
    status: 'closed',
    category: 'rules',
    quorumRequired: 51,
    pins: generatePollPinsForUnits('poll-2', ALL_UNIT_NUMS),
    votes: [
      { apartmentNo: '1', optionIndex: 0, timestamp: '2026-08-02 10:00' },
      { apartmentNo: '2', optionIndex: 0, timestamp: '2026-08-02 11:00' },
      { apartmentNo: '4', optionIndex: 1, timestamp: '2026-08-03 12:00' },
      { apartmentNo: '7', optionIndex: 0, timestamp: '2026-08-04 15:00' },
      { apartmentNo: '10', optionIndex: 0, timestamp: '2026-08-05 18:00' },
      { apartmentNo: '15', optionIndex: 0, timestamp: '2026-08-06 09:00' },
      { apartmentNo: '20', optionIndex: 1, timestamp: '2026-08-07 14:00' },
      { apartmentNo: '22', optionIndex: 0, timestamp: '2026-08-08 16:00' },
      { apartmentNo: '25', optionIndex: 0, timestamp: '2026-08-09 11:00' },
      { apartmentNo: '30', optionIndex: 0, timestamp: '2026-08-10 13:00' },
      { apartmentNo: '33', optionIndex: 0, timestamp: '2026-08-11 17:00' },
      { apartmentNo: '40', optionIndex: 0, timestamp: '2026-08-12 19:00' },
      { apartmentNo: '42', optionIndex: 0, timestamp: '2026-08-13 10:00' },
      { apartmentNo: '50', optionIndex: 0, timestamp: '2026-08-14 12:00' },
      { apartmentNo: '55', optionIndex: 0, timestamp: '2026-08-15 15:00' },
      { apartmentNo: '60', optionIndex: 0, timestamp: '2026-08-16 18:00' },
      { apartmentNo: '65', optionIndex: 0, timestamp: '2026-08-17 09:00' },
      { apartmentNo: '70', optionIndex: 1, timestamp: '2026-08-18 14:00' },
      { apartmentNo: '76', optionIndex: 0, timestamp: '2026-08-19 16:00' },
    ]
  }
];
