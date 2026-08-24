import { Unit } from './types';

export const INITIAL_UNITS: Unit[] = [
  // Apartments 1-56 (76 m2)
  { id: 'stan-1', type: 'apartment', number: '1', owner: 'ГЊАТОВИЌ СНЕЖАНА', area: 76 },
  { id: 'stan-2', type: 'apartment', number: '2', owner: 'ИЛИЕВСКИ АЦО', area: 76 },
  { id: 'stan-3', type: 'apartment', number: '3', owner: 'СЛАБЕВ БОЈАН', area: 76 },
  { id: 'stan-4', type: 'apartment', number: '4', owner: 'КИПРИЈАНОВСКИ МАРЈАН', area: 76 },
  { id: 'stan-5', type: 'apartment', number: '5', owner: 'ЈОТЕВСКИ ВЛАДО', area: 76 },
  { id: 'stan-6', type: 'apartment', number: '6', owner: 'ШИКОСКИ БОЈАН', area: 76 },
  { id: 'stan-7', type: 'apartment', number: '7', owner: 'ТРИФУНОВСКИ БЛАЖЕ', area: 76 },
  { id: 'stan-8', type: 'apartment', number: '8', owner: 'АРСОВСКИ ЛАЗАР', area: 76 },
  { id: 'stan-9', type: 'apartment', number: '9', owner: 'ВОЈНОВСКИ ВОЈНЕ', area: 76 },
  { id: 'stan-10', type: 'apartment', number: '10', owner: 'БУРАЃЕВ НИКОЛА', area: 76 },
  { id: 'stan-11', type: 'apartment', number: '11', owner: 'СТЕВЧЕСКИ ПЕТАР', area: 76 },
  { id: 'stan-12', type: 'apartment', number: '12', owner: 'НЕДЕЛКОВСКА ЈАСНА', area: 76 },
  { id: 'stan-13', type: 'apartment', number: '13', owner: 'БОГДАНСКИ ВОИН', area: 76 },
  { id: 'stan-14', type: 'apartment', number: '14', owner: 'РАКИЌ ЗОРАН', area: 76 },
  { id: 'stan-15', type: 'apartment', number: '15', owner: 'СТОЈАНОВ НИКОЛА', area: 76 },
  { id: 'stan-16', type: 'apartment', number: '16', owner: 'КИРОВСКИ ЛАЗАР', area: 76 },
  { id: 'stan-17', type: 'apartment', number: '17', owner: 'НИКОЛОВСКИ НИКОЛА', area: 76 },
  { id: 'stan-18', type: 'apartment', number: '18', owner: 'СРЧОКОВА СУЗАНА', area: 76 },
  { id: 'stan-19', type: 'apartment', number: '19', owner: 'АРСОВА НАТАША', area: 76 },
  { id: 'stan-20', type: 'apartment', number: '20', owner: 'ЈОШЕСКИ ДИМИТАР', area: 76 },
  { id: 'stan-21', type: 'apartment', number: '21', owner: 'МАНЧЕВСКИ МАРКО', area: 76 },
  { id: 'stan-22', type: 'apartment', number: '22', owner: 'ДЕЛОВСКИ ЖИВКО', area: 76 },
  { id: 'stan-23', type: 'apartment', number: '23', owner: 'МОЈСОВСКА МИЛЕВА', area: 76 },
  { id: 'stan-24', type: 'apartment', number: '24', owner: 'ИРИНА КОСТАДИНОВСКА', area: 76 },
  { id: 'stan-25', type: 'apartment', number: '25', owner: 'МИЦКОВСКА ИВА', area: 76 },
  { id: 'stan-26', type: 'apartment', number: '26', owner: 'КУЗМАНОВСКИ РАДОМИР', area: 76 },
  { id: 'stan-27', type: 'apartment', number: '27', owner: 'СМИЉКОВА ЛИДИЈА', area: 76 },
  { id: 'stan-28', type: 'apartment', number: '28', owner: 'НЕНАД БЛАЖЕСКИ', area: 76 },
  { id: 'stan-29', type: 'apartment', number: '29', owner: 'ЗАЈКОВА СЛОБОДАНКА', area: 76 },
  { id: 'stan-30', type: 'apartment', number: '30', owner: 'ДИМЕСКИ РОБЕРТ', area: 76 },
  { id: 'stan-31', type: 'apartment', number: '31', owner: 'БОЖИНОСКА ЕЛЕОНОРА', area: 76 },
  { id: 'stan-32', type: 'apartment', number: '32', owner: 'ГРУПЧЕ ДИМИТРИЈА', area: 76 },
  { id: 'stan-33', type: 'apartment', number: '33', owner: 'АЛИМАСКОСКА ТРАЈАНКА', area: 76 },
  { id: 'stan-34', type: 'apartment', number: '34', owner: 'ЗОРАН МАТОВСКИ', area: 76 },
  { id: 'stan-35', type: 'apartment', number: '35', owner: 'ВАНГЕЛОВСКА РУЖИЦА', area: 76 },
  { id: 'stan-36', type: 'apartment', number: '36', owner: 'ЈАНКОВСКА МИЛИЦА', area: 76 },
  { id: 'stan-37', type: 'apartment', number: '37', owner: 'БРДАРОСКА ЈАНА', area: 76 },
  { id: 'stan-38', type: 'apartment', number: '38', owner: 'ДАНИЛОВ ЗОРАН', area: 76 },
  { id: 'stan-39', type: 'apartment', number: '39', owner: 'МИЛУТИНОВИЌ СЛАЃАНА', area: 76 },
  { id: 'stan-40', type: 'apartment', number: '40', owner: 'СЕРАФИМОВСКИ ЗОРАН', area: 76 },
  { id: 'stan-41', type: 'apartment', number: '41', owner: 'КИРОВСКИ ДЕЈАН', area: 76 },
  { id: 'stan-42', type: 'apartment', number: '42', owner: 'ТОШЕВСКИ АЛЕКСАНДАР', area: 76 },
  { id: 'stan-43', type: 'apartment', number: '43', owner: 'МАНЧЕВСКИ МАРКО', area: 76 },
  { id: 'stan-44', type: 'apartment', number: '44', owner: 'ВАСИЛЕСКИ ЈОСИФ', area: 76 },
  { id: 'stan-45', type: 'apartment', number: '45', owner: 'БАКОВСКИ ПЕТАР', area: 76 },
  { id: 'stan-46', type: 'apartment', number: '46', owner: 'ЗДРАВЕСКА ЦВЕТА', area: 76 },
  { id: 'stan-47', type: 'apartment', number: '47', owner: 'ТРАЈКОВ ПЕТАР', area: 76 },
  { id: 'stan-48', type: 'apartment', number: '48', owner: 'ТРАЈКОВСКА ОЛГИЦА', area: 76 },
  { id: 'stan-49', type: 'apartment', number: '49', owner: 'ТРПКОВСКИ БОБАН', area: 76 },
  { id: 'stan-50', type: 'apartment', number: '50', owner: 'СОКОЛОВСКИ САША', area: 76 },
  { id: 'stan-51', type: 'apartment', number: '51', owner: 'БОЈАЏИЕВСКИ СПИРО', area: 76 },
  { id: 'stan-52', type: 'apartment', number: '52', owner: 'ЛАЗАРЕВСКА ДОБРИЛА', area: 76 },
  { id: 'stan-53', type: 'apartment', number: '53', owner: 'АНА И КРИСТИЈАН ЈОВАНОВСКИ', area: 76 },
  { id: 'stan-54', type: 'apartment', number: '54', owner: 'ПЕТКОВСКИ ГОНЕ', area: 76 },
  { id: 'stan-55', type: 'apartment', number: '55', owner: 'ЗАФИРОВСКИ ФИЛИП', area: 76 },
  { id: 'stan-56', type: 'apartment', number: '56', owner: 'ПЕТРОВСКИ НЕНАД', area: 76 },

  // Apartments 57-60 (61 m2)
  { id: 'stan-57', type: 'apartment', number: '57', owner: 'ПЕТРОСКА РУМЕНА', area: 61 },
  { id: 'stan-58', type: 'apartment', number: '58', owner: 'ВЕЛИЧКОВСКА СНЕЖАНА', area: 61 },
  { id: 'stan-59', type: 'apartment', number: '59', owner: 'ТОПАЛОВСКИ АЛЕКСАНДАР', area: 61 },
  { id: 'stan-60', type: 'apartment', number: '60', owner: 'СИМОНОВСКИ ГОРАН', area: 61 },

  // Apartments 61-68 (46 m2)
  { id: 'stan-61', type: 'apartment', number: '61', owner: 'АЛЕКСАНДАР ГАВРОВСКИ', area: 46 },
  { id: 'stan-62', type: 'apartment', number: '62', owner: 'БАКОВСКИ ПЕТАР', area: 46 },
  { id: 'stan-63', type: 'apartment', number: '63', owner: 'ВЕЛИЧКОВСКА МАРИНА', area: 46 },
  { id: 'stan-64', type: 'apartment', number: '64', owner: 'ИВА ИСАЈЛОВСКА', area: 46 },
  { id: 'stan-65', type: 'apartment', number: '65', owner: 'ГЛИГУРОСКА МАРГАРИТА', area: 46 },
  { id: 'stan-66', type: 'apartment', number: '66', owner: 'СВЕТЛА ЈАКИМОВСКА', area: 46 },
  { id: 'stan-67', type: 'apartment', number: '67', owner: 'ИВАНКА СЕЧКОВСКА', area: 46 },
  { id: 'stan-68', type: 'apartment', number: '68', owner: 'Е.НУРЕДИНИ-С. ХАЛИМИ', area: 46 },

  // Stores Д1-Д8
  { id: 'lokal-d1', type: 'store', number: 'Д1', owner: 'Ацевска Марија', area: 37 },
  { id: 'lokal-d2', type: 'store', number: 'Д2', owner: 'Шикоски Груп ДООЕЛ', area: 43 },
  { id: 'lokal-d3', type: 'store', number: 'Д3', owner: 'Ивана Шикоска', area: 43 },
  { id: 'lokal-d4', type: 'store', number: 'Д4', owner: 'Темелкова Вида', area: 37 },
  { id: 'lokal-d5', type: 'store', number: 'Д5', owner: 'Исмет Муминовиќ', area: 37 },
  { id: 'lokal-d6', type: 'store', number: 'Д6', owner: 'Исени Рефик Ацер', area: 44 },
  { id: 'lokal-d7', type: 'store', number: 'Д7', owner: 'УЛП Штип и други', area: 43 },
  { id: 'lokal-d8', type: 'store', number: 'Д8', owner: 'Јандријоски Зоран', area: 37 }
];

export const TOTAL_APARTMENT_AREA = 4868; // 56*76 + 4*61 + 8*46 = 4256 + 244 + 368 = 4868
export const TOTAL_STORE_AREA = 321;     // 4*37 + 3*43 + 1*44 = 148 + 129 + 44 = 321
export const TOTAL_BUILDING_AREA = 5189;  // 4868 + 321 = 5189

export const INITIAL_STARTING_DEBTS: Record<string, number> = {};
