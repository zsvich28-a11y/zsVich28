import { CalculatedInvoice, Language, MonthlyVariables, EmailAttachment } from './types';
import { formatMonthId, formatDenarExact } from './utils';

// Helper to base64url-encode strings
function base64urlEncode(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// Build a beautiful email HTML body that matches the print design aesthetic (clean, modern, Swiss style)
export function generateInvoiceHtml(
  invoice: CalculatedInvoice,
  monthId: string,
  lang: Language,
  monthlyVariables?: MonthlyVariables,
  apartmentFixedRatePerM2?: number,
  storeFixedRatePerM2?: number,
  calculatedInvoicesByMonth?: Record<string, CalculatedInvoice[]>
): string {
  const monthName = formatMonthId(monthId, lang);
  const isApartment = invoice.type === 'apartment';
  
  const [yearStr, monthStr] = monthId.split('-');
  const yearNum = parseInt(yearStr, 10);
  const monthNum = parseInt(monthStr, 10);
  const lastDayNum = new Date(yearNum, monthNum, 0).getDate();
  const isJune = monthNum === 6;
  
  const issuedDate = isJune ? `01.07.${yearStr}` : `01.${monthStr}.${yearStr}`;
  const dueDate = isJune ? `31.07.${yearStr}` : `${lastDayNum}.${monthStr}.${yearStr}`;

  const currentFixedRate = isApartment 
    ? (apartmentFixedRatePerM2 || (invoice.area > 0 ? invoice.fixedCharge / invoice.area : 2))
    : (storeFixedRatePerM2 || (invoice.area > 0 ? invoice.fixedCharge / invoice.area : 5));

  const finalFixedRate = Math.round(currentFixedRate) || (isApartment ? 2 : 5);

  const variables = monthlyVariables || {
    electricity: isApartment ? (invoice.electricityCharge > 0 ? Math.round((invoice.electricityCharge / (invoice.area / 4868))) : 0) : 0,
    cleaning: invoice.cleaningCharge > 0 ? Math.round((invoice.cleaningCharge / (invoice.area / 5189))) : 0,
    elevator: isApartment ? (invoice.elevatorCharge > 0 ? Math.round((invoice.elevatorCharge / (invoice.area / 4868))) : 0) : 0,
    accounting: invoice.accountingCharge > 0 ? Math.round((invoice.accountingCharge / (invoice.area / 5189))) : 0,
    management: invoice.managementCharge > 0 ? Math.round((invoice.managementCharge / (invoice.area / 5189))) : 0,
    bankFees: invoice.bankFeesCharge > 0 ? Math.round((invoice.bankFeesCharge / (invoice.area / 5189))) : 0,
    investment: invoice.investmentCharge > 0 ? Math.round((invoice.investmentCharge / (invoice.area / 5189))) : 0,
    misc: invoice.miscCharge > 0 ? Math.round((invoice.miscCharge / (invoice.area / 5189))) : 0,
  };

  const shareAllNum = (invoice.area / 5189) * 100;
  const shareAllStr = shareAllNum.toFixed(2);
  const shareElecStr = isApartment ? ((invoice.area / 4868) * 100).toFixed(2) : '0.00';

  const totalMonthly = invoice.totalMonthlyCharge;
  const oldDebt = Math.max(0, invoice.beginningDebt - (invoice.preJunePayment || 0));
  const ledgerTotal = Math.round(invoice.endingDebt);

  let statusText = '';
  let statusBg = '#f1f5f9';
  let statusColor = '#000000';

  if (lang === 'MK') {
    if (ledgerTotal > totalMonthly) {
      statusText = '!!! ВЕ МОЛИМЕ ДА СЕ СЕРВИСИРА ДОЛГОТ КОН ЗАЕДНИЦАТА НА СОПСТВЕНИЦИ !!!';
      statusBg = '#fef2f2';
      statusColor = '#991b1b';
    } else {
      statusText = 'РЕДОВНА УПЛАТА, ВИ БЛАГОДАРИМЕ';
      statusBg = '#f0fdf4';
      statusColor = '#166534';
    }
  } else {
    if (ledgerTotal > totalMonthly) {
      statusText = '!!! PLEASE SETTLE THE OUTSTANDING DEBT TO THE COMMUNITY OF OWNERS !!!';
      statusBg = '#fef2f2';
      statusColor = '#991b1b';
    } else {
      statusText = 'REGULAR PAYMENT, THANK YOU';
      statusBg = '#f0fdf4';
      statusColor = '#166534';
    }
  }

  let formulaDetail = '';
  if (lang === 'MK') {
    if (ledgerTotal < 0) {
      formulaDetail = `НЕМА ЗА УПЛАТА ТЕКОВЕН МЕСЕЦ. СМЕТКАТА Е ПОКРИЕНА ОД АВАНС. ПРЕОСТАНАТ КРЕДИТ: ${Math.abs(ledgerTotal)} ДЕН.`;
    } else if (ledgerTotal === 0 && totalMonthly > 0) {
      formulaDetail = 'ТЕКОВНАТА СМЕТКА Е ЦЕЛОСНО ПОКРИЕНА ОД АВАНС. ----- ЗА УПЛАТА: 0.00 ДЕН.';
    } else if (ledgerTotal === 0) {
      formulaDetail = 'НЕМА ЗАОСТАНАТ ДОЛГ. ----- ЗА УПЛАТА ТЕКОВЕН МЕСЕЦ: ' + totalMonthly + ' ДЕН.';
    } else if (ledgerTotal < totalMonthly) {
      formulaDetail = `ТЕКОВНА СМЕТКА НАМАЛЕНА ЗА АВАНС. ----- ЗА УПЛАТА: ${ledgerTotal} ДЕН.`;
    } else {
      formulaDetail = `ВКУПЕН ДОЛГ ЗА УПЛАТА (СО ЗАОСТАНАТ ДОЛГ): ${ledgerTotal} ДЕН.`;
    }
  } else {
    if (ledgerTotal < 0) {
      formulaDetail = `NO PAYMENT DUE CURRENT MONTH. OVERPAID BY ADVANCE. REMAINING CREDIT: ${Math.abs(ledgerTotal)} DEN.`;
    } else if (ledgerTotal === 0 && totalMonthly > 0) {
      formulaDetail = 'CURRENT BILL IS FULLY COVERED BY PREPAYMENT. ----- TO PAY: 0.00 DEN.';
    } else if (ledgerTotal === 0) {
      formulaDetail = 'NO OUTSTANDING DEBT. ----- TO PAY CURRENT MONTH: ' + totalMonthly + ' DEN.';
    } else if (ledgerTotal < totalMonthly) {
      formulaDetail = `CURRENT BILL DECREASED BY ADVANCE. ----- TO PAY: ${ledgerTotal} DEN.`;
    } else {
      formulaDetail = `TOTAL AMOUNT TO PAY (INCLUDING PREVIOUS ARREARS): ${ledgerTotal} DEN.`;
    }
  }

  const getMonthlyDebt = (uId: string, yr: number, mo: number): string => {
    if (!calculatedInvoicesByMonth) return '0';
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
      const queryMonthId = `${yr}-${mo.toString().padStart(2, '0')}`;
      if (queryMonthId === targetMonthId) {
        if (invoice.isD7Split && invoice.d7SplitRatio !== undefined) {
          return Math.round(remainingDebt * invoice.d7SplitRatio).toString();
        }
        return Math.round(remainingDebt).toString();
      }
      return '0';
    }

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

    if (remainingDebt > 0 && sortedMonthIds.length > 0) {
      const firstMonthId = sortedMonthIds[0];
      distributed[firstMonthId] = (distributed[firstMonthId] || 0) + remainingDebt;
    }

    const queryMonthId = `${yr}-${mo.toString().padStart(2, '0')}`;
    const rawVal = distributed[queryMonthId] || 0;
    if (invoice.isD7Split && invoice.d7SplitRatio !== undefined) {
      return Math.round(rawVal * invoice.d7SplitRatio).toString();
    }
    return Math.round(rawVal).toString();
  };

  const getYearTotal = (uId: string, yr: number): number => {
    let sum = 0;
    for (let m = 1; m <= 12; m++) {
      sum += Number(getMonthlyDebt(uId, yr, m));
    }
    return sum;
  };

  const customAnnouncement = localStorage.getItem('invoice_announcement') || 
    (lang === 'MK' 
      ? 'Адресата за е-пошта на заедницата е променета во zsvich28@gmail.com, претходниот претставник на заедницата одби да го предаде пристапот до неа.'
      : 'The email address of the community has been changed to zsvich28@gmail.com, the previous representative refused to hand over access.');


  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${lang === 'MK' ? 'ВИЧ 28 Сметка' : 'VICH 28 Invoice'}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1a1a1a; margin: 0; padding: 0;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f8fafc; padding: 20px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
    <tr>
      <td align="center">
        <!-- Container Table -->
        <table cellpadding="0" cellspacing="0" border="0" width="750" style="background-color: #ffffff; border: 2px solid #000000; font-size: 11px; line-height: 1.2; color: #000000; border-collapse: collapse;">
          <!-- Header Row -->
          <tr>
            <td style="padding: 12px 16px; border-bottom: 2px solid #000000;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td>
                    <h1 style="font-size: 20px; font-weight: 900; text-transform: uppercase; letter-spacing: -0.03em; margin: 0; color: #000000;">${lang === 'MK' ? 'ВИЧ 28' : 'VICH 28'}</h1>
                    <p style="font-size: 9px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #64748b; margin: 2px 0 0 0;">
                      ${lang === 'MK' ? 'ЗАЕДНИЦА НА СОПСТВЕНИЦИ - СКОПЈЕ' : 'BUILDING OWNERS COUNCIL - SKOPJE'}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Split Row: 2 columns -->
          <tr>
            <td>
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse: collapse;">
                <tr>
                  <!-- Left Column (65% width => 487px) -->
                  <td width="487" style="width: 487px; border-right: 2px solid #000000; vertical-align: top;">
                    
                    <!-- Left Top Row: Subtitle -->
                    <div style="border-bottom: 2px solid #000000; padding: 4px; text-align: center; font-weight: bold; text-transform: uppercase; font-size: 8px; background-color: #ffffff; color: #000000;">
                      ${lang === 'MK'
                        ? 'Заедница на сопственици на станбено-деловната зграда со адреса на ул.Вич 28 Скопје'
                        : 'Community of Owners of the Residential-Commercial Building at Address: Vich St. 28, Skopje'}
                    </div>

                    <!-- Left Row 2: Metadata Grid -->
                    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border-bottom: 2px solid #000000; border-collapse: collapse; font-family: monospace; font-size: 8px; text-align: center;">
                      <tr>
                        <td style="padding: 4px; border-right: 1px solid #000000; font-weight: 900; width: 40%; text-transform: uppercase;">
                          ${lang === 'MK' ? 'ФАКТУРА ЗА' : 'BILL FOR'} ${monthName}г.
                        </td>
                        <td style="padding: 4px; border-right: 1px solid #000000; font-weight: bold; width: 10%;">
                          ${lang === 'MK' ? 'бр.' : 'No.'}
                        </td>
                        <td style="padding: 4px; border-right: 1px solid #000000; font-weight: bold; width: 25%;">
                          ${invoice.isD7Split ? (
                            `${invoice.number} - ${monthNum.toString().padStart(2, '0')}-${yearNum}`
                          ) : (
                            `${isApartment ? (lang === 'MK' ? 'стан' : 'apt') : (lang === 'MK' ? 'деловен' : 'store')} ${invoice.number} - ${monthNum} - ${yearNum}`
                          )}
                        </td>
                        <td style="padding: 3px; border-right: 1px solid #000000; width: 12.5%; line-height: 1.1;">
                          <span style="font-size: 6.5px; color: #64748b; font-family: sans-serif;">${lang === 'MK' ? 'Промет на' : 'Issued'}</span><br>
                          <b>${issuedDate}</b>
                        </td>
                        <td style="padding: 3px; width: 12.5%; line-height: 1.1;">
                          <span style="font-size: 6.5px; color: #64748b; font-family: sans-serif;">${lang === 'MK' ? 'Платете до' : 'Due'}</span><br>
                          <b>${dueDate}</b>
                        </td>
                      </tr>
                    </table>

                    <!-- Left Row 3: Owner info -->
                    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border-bottom: 2px solid #000000; padding: 4px 10px; background-color: #ffffff;">
                      <tr>
                        <td style="font-size: ${invoice.owner.length > 35 ? '8.5px' : '11px'}; font-weight: 900; line-height: 1.1; text-transform: uppercase; letter-spacing: -0.02em; color: #000000;">
                          ${invoice.owner}
                        </td>
                        <td align="right" style="font-size: 8px; font-weight: bold; color: #64748b; font-family: monospace; text-transform: uppercase;">
                          ${invoice.customAddress ? (
                            invoice.customAddress
                          ) : (
                            lang === 'MK'
                              ? `ул. Вич 28/${invoice.number} Скопје`
                              : `Vich St. 28/${invoice.number} Skopje`
                          )}
                        </td>
                      </tr>
                    </table>

                    <!-- Left Row 4: Charges Table -->
                    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse: collapse; font-family: monospace; font-size: 8px;">
                      <thead>
                        <tr style="border-bottom: 1px solid #000000; text-transform: uppercase; font-size: 7px; background-color: #f8fafc; font-weight: 900;">
                          <th align="left" style="padding: 4px 6px; border-right: 1px solid #000000; width: 50%;">${lang === 'MK' ? 'Месечни трошоци' : 'Monthly expenses'}</th>
                          <th align="right" style="padding: 4px 6px; border-right: 1px solid #000000; width: 16%;">${lang === 'MK' ? 'Износ на фактура' : 'Invoice Amount'}</th>
                          <th align="right" style="padding: 4px 6px; border-right: 1px solid #000000; width: 14%;">${lang === 'MK' ? '.% од фак.' : '.% of Inv.'}</th>
                          <th align="right" style="padding: 4px 6px; width: 20%;">${lang === 'MK' ? 'Ваш дел од трошокот' : 'Your share'}</th>
                        </tr>
                      </thead>
                      <tbody>
                        <!-- Row 1: Reserve Fund -->
                        <tr style="border-bottom: 1px solid #e2e8f0;">
                          <td style="padding: 4px 6px; border-right: 1px solid #000000; font-family: sans-serif; font-weight: bold; font-size: 7.5px;">
                            ${lang === 'MK' ? `Резервен фонд( ${finalFixedRate} денари x м2)` : `Reserve fund (${finalFixedRate} denars x m2)`}
                          </td>
                          <td align="right" style="padding: 4px 6px; border-right: 1px solid #000000;">${Math.round(finalFixedRate)}</td>
                          <td align="right" style="padding: 4px 6px; border-right: 1px solid #000000;">${invoice.area}</td>
                          <td align="right" style="padding: 4px 6px; font-weight: bold;">${Math.round(invoice.fixedCharge)}</td>
                        </tr>

                        <!-- Row 2: Electricity -->
                        <tr style="border-bottom: 1px solid #e2e8f0;">
                          <td style="padding: 4px 6px; border-right: 1px solid #000000; font-family: sans-serif; font-weight: bold; font-size: 7.5px;">
                            ${lang === 'MK' ? 'Заедничка струја - ЕД' : 'Shared electricity - ED'}
                          </td>
                          <td align="right" style="padding: 4px 6px; border-right: 1px solid #000000;">
                            ${isApartment ? Math.round(variables.electricity) : 0}
                          </td>
                          <td align="right" style="padding: 4px 6px; border-right: 1px solid #000000;">
                            ${isApartment ? shareElecStr : '—'}
                          </td>
                          <td align="right" style="padding: 4px 6px; font-weight: bold;">
                            ${Math.round(invoice.electricityCharge)}
                          </td>
                        </tr>

                        <!-- Row 3: Elevator -->
                        <tr style="border-bottom: 1px solid #e2e8f0;">
                          <td style="padding: 4px 6px; border-right: 1px solid #000000; font-family: sans-serif; font-weight: bold; font-size: 7.5px;">
                            ${lang === 'MK' ? 'Месечно одржување лифтови' : 'Monthly lift maintenance'}
                          </td>
                          <td align="right" style="padding: 4px 6px; border-right: 1px solid #000000;">
                            ${isApartment ? Math.round(variables.elevator) : 0}
                          </td>
                          <td align="right" style="padding: 4px 6px; border-right: 1px solid #000000;">
                            ${isApartment ? shareElecStr : '—'}
                          </td>
                          <td align="right" style="padding: 4px 6px; font-weight: bold;">
                            ${Math.round(invoice.elevatorCharge)}
                          </td>
                        </tr>

                        <!-- Row 4: Investment -->
                        <tr style="border-bottom: 1px solid #e2e8f0;">
                          <td style="padding: 4px 6px; border-right: 1px solid #000000; font-family: sans-serif; font-weight: bold; font-size: 7.5px;">
                            ${lang === 'MK' ? 'Инвестиционо одржување' : 'Investment maintenance'}
                          </td>
                          <td align="right" style="padding: 4px 6px; border-right: 1px solid #000000;">
                            ${Math.round(variables.investment || 0)}
                          </td>
                          <td align="right" style="padding: 4px 6px; border-right: 1px solid #000000;">
                            ${shareAllStr}
                          </td>
                          <td align="right" style="padding: 4px 6px; font-weight: bold;">
                            ${Math.round(invoice.investmentCharge || 0)}
                          </td>
                        </tr>

                        <!-- Row 5: Cleaning -->
                        <tr style="border-bottom: 1px solid #e2e8f0;">
                          <td style="padding: 4px 6px; border-right: 1px solid #000000; font-family: sans-serif; font-weight: bold; font-size: 7.5px;">
                            ${lang === 'MK' ? 'Хигиена' : 'Cleaning & hygiene'}
                          </td>
                          <td align="right" style="padding: 4px 6px; border-right: 1px solid #000000;">
                            ${Math.round(variables.cleaning)}
                          </td>
                          <td align="right" style="padding: 4px 6px; border-right: 1px solid #000000;">
                            ${shareAllStr}
                          </td>
                          <td align="right" style="padding: 4px 6px; font-weight: bold;">
                            ${Math.round(invoice.cleaningCharge)}
                          </td>
                        </tr>

                        <!-- Row 6: Accounting -->
                        <tr style="border-bottom: 1px solid #e2e8f0;">
                          <td style="padding: 4px 6px; border-right: 1px solid #000000; font-family: sans-serif; font-weight: bold; font-size: 7.5px;">
                            ${lang === 'MK' ? 'Сметководство' : 'Accounting'}
                          </td>
                          <td align="right" style="padding: 4px 6px; border-right: 1px solid #000000;">
                            ${Math.round(variables.accounting)}
                          </td>
                          <td align="right" style="padding: 4px 6px; border-right: 1px solid #000000;">
                            ${shareAllStr}
                          </td>
                          <td align="right" style="padding: 4px 6px; font-weight: bold;">
                            ${Math.round(invoice.accountingCharge)}
                          </td>
                        </tr>

                        <!-- Row 7: Management -->
                        <tr style="border-bottom: 1px solid #e2e8f0;">
                          <td style="padding: 4px 6px; border-right: 1px solid #000000; font-family: sans-serif; font-weight: bold; font-size: 7.5px;">
                            ${lang === 'MK' ? 'Управување(бруто со ПДД)' : 'Management (gross)'}
                          </td>
                          <td align="right" style="padding: 4px 6px; border-right: 1px solid #000000;">
                            ${Math.round(variables.management)}
                          </td>
                          <td align="right" style="padding: 4px 6px; border-right: 1px solid #000000;">
                            ${shareAllStr}
                          </td>
                          <td align="right" style="padding: 4px 6px; font-weight: bold;">
                            ${Math.round(invoice.managementCharge)}
                          </td>
                        </tr>

                        <!-- Row 8: Bank Fees -->
                        <tr style="border-bottom: 1px solid #e2e8f0;">
                          <td style="padding: 4px 6px; border-right: 1px solid #000000; font-family: sans-serif; font-weight: bold; font-size: 7.5px;">
                            ${lang === 'MK' ? 'Банкарска провизија' : 'Bank commission'}
                          </td>
                          <td align="right" style="padding: 4px 6px; border-right: 1px solid #000000;">
                            ${Math.round(variables.bankFees)}
                          </td>
                          <td align="right" style="padding: 4px 6px; border-right: 1px solid #000000;">
                            ${shareAllStr}
                          </td>
                          <td align="right" style="padding: 4px 6px; font-weight: bold;">
                            ${Math.round(invoice.bankFeesCharge)}
                          </td>
                        </tr>

                        <!-- Row 9: Misc -->
                        <tr style="border-bottom: 1px solid #000000;">
                          <td style="padding: 4px 6px; border-right: 1px solid #000000; font-family: sans-serif; font-weight: bold; font-size: 7.5px;">
                            ${lang === 'MK' ? 'Разно' : 'Misc'}
                          </td>
                          <td align="right" style="padding: 4px 6px; border-right: 1px solid #000000;">
                            ${Math.round(variables.misc || 0)}
                          </td>
                          <td align="right" style="padding: 4px 6px; border-right: 1px solid #000000;">
                            ${shareAllStr}
                          </td>
                          <td align="right" style="padding: 4px 6px; font-weight: bold;">
                            ${Math.round(invoice.miscCharge || 0)}
                          </td>
                        </tr>
                      </tbody>
                    </table>

                    <!-- Left Row 5: Footer details -->
                    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse: collapse; font-family: monospace; font-size: 7.5px; line-height: 1.15;">
                      <tr>
                        <!-- Bank Details Column -->
                        <td width="40%" style="padding: 6px; border-right: 1px solid #000000; vertical-align: middle;">
                          <p style="font-weight: 900; margin: 0; font-size: 6.5px; color: #64748b; text-transform: uppercase;">
                            ${lang === 'MK' ? 'Комерцијална Банка АД Скопје' : 'Komercijalna Banka AD Skopje'}
                          </p>
                          <p style="font-weight: 900; margin: 2px 0 0 0; font-size: 8px;">300000004672235</p>
                          <p style="margin: 1px 0 0 0; font-size: 7.5px;">ЕДБ 4057010504720</p>
                        </td>

                        <!-- President Column -->
                        <td width="30%" align="center" style="padding: 6px; border-right: 1px solid #000000; vertical-align: middle;">
                          <p style="font-size: 6.5px; text-transform: uppercase; font-weight: 900; color: #64748b; margin: 0;">
                            ${lang === 'MK' ? 'Претседател на заедница на сопственици' : 'Owners President'}
                          </p>
                          <p style="font-family: serif; font-style: italic; border-bottom: 1px dotted #000000; display: inline-block; width: 85%; margin: 4px 0 0 0; font-weight: 900; font-size: 8px; color: #0f172a; padding-bottom: 1px;">
                            Ф.Зафировски
                          </p>
                        </td>

                        <!-- Totals Column -->
                        <td width="30%" style="vertical-align: top;">
                          <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse: collapse; font-size: 7px;">
                            <tr>
                              <td style="padding: 4px 6px; border-bottom: 1px solid #000000; font-weight: bold;">
                                <span style="font-size: 5.5px; text-transform: uppercase; color: #64748b;">${lang === 'MK' ? 'Вкупно тековен' : 'Current'}:</span>
                              </td>
                              <td align="right" style="padding: 4px 6px; border-bottom: 1px solid #000000; font-weight: 900; font-size: 8px;">
                                ${invoice.totalMonthlyCharge}
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 4px 6px; font-weight: bold;">
                                <span style="font-size: 5.5px; text-transform: uppercase; color: #64748b;">${lang === 'MK' ? 'Заостанат долг' : 'Arrears'}:</span>
                              </td>
                              <td align="right" style="padding: 4px 6px; font-weight: 900; font-size: 8px;">
                                ${oldDebt}
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                  </td>

                  <!-- Right Column (35% width => 263px) -->
                  <td width="263" style="width: 263px; vertical-align: top; background-color: #ffffff;">
                    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse: collapse;">
                      <!-- Announcements Banner -->
                      <tr>
                        <td style="background-color: #e2e8f0; border-bottom: 2px solid #000000; padding: 6px; text-align: center; font-weight: 900; text-transform: uppercase; font-size: 7.5px; line-height: 1.1;">
                          ${lang === 'MK'
                            ? 'ИЗВЕСТУВАЊЕ ЗА АКТИВНОСТИ НА ЗАЕДНИЦАТА НА СОПСТВЕНИЦИ'
                            : 'COMMUNITY ACTIVITIES ANNOUNCEMENTS'}
                        </td>
                      </tr>

                      <!-- Announcement Body -->
                      <tr>
                        <td style="padding: 8px; border-bottom: 2px solid #000000; font-size: 7.5px; line-height: 1.35; color: #000000; vertical-align: top; font-family: sans-serif; white-space: pre-wrap;">
                          ${customAnnouncement}
                        </td>
                      </tr>

                      <!-- Status Title Box -->
                      <tr>
                        <td style="padding: 6px; border-bottom: 2px solid #000000; text-align: center; font-weight: 900; text-transform: uppercase; font-size: 7.5px; line-height: 1.25;">
                          ${statusText}
                        </td>
                      </tr>

                      <!-- Shaded bottom status detail block -->
                      <tr>
                        <td style="background-color: #e2e8f0; padding: 8px; vertical-align: middle;">
                          <div style="background-color: #ffffff; border: 1px dashed #000000; padding: 4px; text-align: center; font-weight: 800; font-family: monospace; font-size: 6.5px; line-height: 1.25; text-transform: uppercase;">
                            ${formulaDetail}
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>

                </tr>
              </table>
            </td>
          </tr>
          <!-- Bottom History Table Row (Unpaid Monthly Debts History Table) -->
          ${calculatedInvoicesByMonth ? `
          <tr>
            <td style="padding: 12px 16px; border-top: 2px solid #000000;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border: 2px solid #000000; border-collapse: collapse; font-family: monospace; font-size: 8px; text-align: center; color: #000000;">
                <thead>
                  <tr style="background-color: #f1f5f9; border-bottom: 2px solid #000000; font-weight: 900; height: 18px; text-transform: uppercase; font-size: 7.5px;">
                    <th align="left" style="padding-left: 6px; border-right: 2px solid #000000; width: 22%; font-family: sans-serif; font-weight: 900; background-color: #f8fafc;">
                      ${invoice.owner}
                    </th>
                    ${Array.from({ length: 12 }).map((_, idx) => {
                      const isCurrentMonth = (idx + 1) === monthNum;
                      return `
                        <th style="padding: 2px 0; border-right: 2px solid #000000; width: 6%; text-align: center; font-weight: 900; ${
                          isCurrentMonth 
                            ? 'background-color: #facc15; font-size: 8.5px;' 
                            : 'background-color: #f8fafc;'
                        }">
                          ${idx + 1}
                        </th>
                      `;
                    }).join('')}
                    <th style="padding: 2px 0; width: 6%; text-align: center; font-family: sans-serif; font-weight: 900; background-color: #e2e8f0;">
                      ${lang === 'MK' ? 'ВКУПНО' : 'TOTAL'}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr style="border-bottom: 2px solid #000000; height: 18px;">
                    <td align="left" style="padding-left: 6px; border-right: 2px solid #000000; font-weight: bold; width: 22%; background-color: #f8fafc;">
                      ${yearNum - 1}
                    </td>
                    ${Array.from({ length: 12 }).map((_, idx) => {
                      const debtStr = getMonthlyDebt(invoice.unitId, yearNum - 1, idx + 1);
                      const debtNum = Number(debtStr);
                      return `
                        <td style="padding: 2px 0; border-right: 2px solid #000000; width: 6%; text-align: center; font-weight: bold; ${
                          debtNum > 0 
                            ? 'background-color: #ffe4e6; color: #9f1239; font-weight: 900;' 
                            : 'color: #cbd5e1; font-weight: normal;'
                        }">
                          ${debtNum > 0 ? Math.round(debtNum) : '—'}
                        </td>
                      `;
                    }).join('')}
                    <td rowspan="2" style="padding: 2px 0; font-weight: 900; text-align: center; width: 6%; background-color: #f1f5f9; font-size: 9px; vertical-align: middle; border-left: 2px solid #000000;">
                      ${getYearTotal(invoice.unitId, yearNum - 1) + getYearTotal(invoice.unitId, yearNum)}
                    </td>
                  </tr>
                  <tr style="height: 18px;">
                    <td align="left" style="padding-left: 6px; border-right: 2px solid #000000; font-weight: bold; width: 22%; background-color: #fffbeb;">
                      ${yearNum}
                    </td>
                    ${Array.from({ length: 12 }).map((_, idx) => {
                      const debtStr = getMonthlyDebt(invoice.unitId, yearNum, idx + 1);
                      const debtNum = Number(debtStr);
                      const isCurrentMonth = (idx + 1) === monthNum;
                      return `
                        <td style="padding: 2px 0; border-right: 2px solid #000000; width: 6%; text-align: center; ${
                          isCurrentMonth
                            ? 'background-color: #fef08a; font-weight: 900; border-left: 2px solid #000000; border-right: 2px solid #000000;'
                            : debtNum > 0 
                              ? 'background-color: #ffe4e6; color: #9f1239; font-weight: 900;' 
                              : 'color: #cbd5e1; font-weight: normal;'
                        }">
                          ${debtNum > 0 ? Math.round(debtNum) : '—'}
                        </td>
                      `;
                    }).join('')}
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
          ` : ''}
        </table>

        <!-- Bottom footer text -->
        <table cellpadding="0" cellspacing="0" border="0" width="750" style="margin-top: 16px;">
          <tr>
            <td align="center" style="font-size: 10px; color: #94a3b8; font-family: sans-serif; line-height: 1.4;">
              ${lang === 'MK' ? 'Оваа е-пошта е автоматски испратена од софтверот за фактурирање Vich 28.' : 'This email is automatically generated by the Vich 28 billing software.'}
            </td>
          </tr>
        </table>

      </td>
    </tr>
  </table>
</body>
</html>`;
}

// Perform Gmail Send API request
export async function sendInvoiceEmail({
  accessToken,
  toEmail,
  invoice,
  monthId,
  lang,
  subjectOverride,
  monthlyVariables,
  apartmentFixedRatePerM2,
  storeFixedRatePerM2,
  calculatedInvoicesByMonth,
  attachment
}: {
  accessToken: string;
  toEmail: string;
  invoice: CalculatedInvoice;
  monthId: string;
  lang: Language;
  subjectOverride?: string;
  monthlyVariables?: MonthlyVariables;
  apartmentFixedRatePerM2?: number;
  storeFixedRatePerM2?: number;
  calculatedInvoicesByMonth?: Record<string, CalculatedInvoice[]>;
  attachment?: EmailAttachment;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const monthName = formatMonthId(monthId, lang);
    const isApartment = invoice.type === 'apartment';
    const unitNo = invoice.number;
    
    const subject = subjectOverride || (lang === 'MK' 
      ? `Vich 28 - фактура - ${monthName} - ${isApartment ? 'стан' : 'деловен'} ${unitNo} (${invoice.owner})`
      : `Vich 28 - Invoice - ${monthName} - ${isApartment ? 'Apartment' : 'Store'} ${unitNo} (${invoice.owner})`);

    // Calculate details for plain text portion
    const totalMonthly = invoice.totalMonthlyCharge;
    const oldDebt = Math.max(0, invoice.beginningDebt - (invoice.preJunePayment || 0));
    const ledgerTotal = Math.round(invoice.endingDebt);

    let statusText = '';
    if (lang === 'MK') {
      if (ledgerTotal > totalMonthly) {
        statusText = 'ВЕ МОЛИМЕ ДА СЕ СЕРВИСИРА ДОЛГОТ КОН ЗАЕДНИЦАТА НА СОПСТВЕНИЦИ';
      } else {
        statusText = 'РЕДОВНА УПЛАТА, ВИ БЛАГОДАРИМЕ';
      }
    } else {
      if (ledgerTotal > totalMonthly) {
        statusText = 'PLEASE SETTLE THE OUTSTANDING DEBT TO THE COMMUNITY OF OWNERS';
      } else {
        statusText = 'REGULAR PAYMENT, THANK YOU';
      }
    }

    let htmlContent = '';
    let plainTextContent = '';

    const isD7 = invoice.unitId === 'lokal-d7' || invoice.isD7Split;
    const [yearPart, monthPart] = monthId.split('-');
    const formattedMonthYear = `${monthPart}-${yearPart}`;

    if (isD7) {
      plainTextContent = `Почитувани, во прилог фактура за заедница на сопственици на станбено деловна зграда на ул.Вич 28 Скопје за месец ${formattedMonthYear}`;
      htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
</head>
<body style="font-family: sans-serif; font-size: 14px; color: #333333; line-height: 1.5; padding: 20px;">
  <p>Почитувани, во прилог фактура за заедница на сопственици на станбено деловна зграда на ул.Вич 28 Скопје за месец ${formattedMonthYear}</p>
</body>
</html>`;
    } else {
      htmlContent = generateInvoiceHtml(
        invoice,
        monthId,
        lang,
        monthlyVariables,
        apartmentFixedRatePerM2,
        storeFixedRatePerM2,
        calculatedInvoicesByMonth
      );

      plainTextContent = lang === 'MK'
        ? `Почитувани,\n\nВо прилог ви ја испраќаме пресметката на трошоци (фактура) за месец ${monthName} за објект ${invoice.number} (сопственик: ${invoice.owner}).\n\n- Вкупен износ за тековниот месец: ${totalMonthly} ДЕН.\n- Заостанат долг: ${oldDebt} ДЕН.\n- Вкупно уплатено во тековниот месец: ${invoice.payment} ДЕН.\n- КРАЈНО САЛДО ЗА УПЛАТА: ${ledgerTotal} ДЕН.\n\nСтатус: ${statusText}\n\nПовеќе детали можете да погледнете во прегледот на веб апликацијата или во HTML верзијата на оваа е-пошта.\n\nСо почит,\nЗаедница на сопственици ул. Вич бр. 28, Скопје\nПретседател Ф.Зафировски`
        : `Dear Resident,\n\nHere is your monthly invoice for ${monthName} for unit ${invoice.number} (Owner: ${invoice.owner}).\n\n- Total monthly charge: ${totalMonthly} DEN.\n- Outstanding debt: ${oldDebt} DEN.\n- Total payment received: ${invoice.payment} DEN.\n- ENDING BALANCE (AMOUNT DUE): ${ledgerTotal} DEN.\n\nStatus: ${statusText}\n\nFor full details, please refer to the web application or view the HTML version of this email.\n\nBest regards,\nCommunity of Owners Vich 28, Skopje\nPresident F.Zafirovski`;
    }

    const altBoundary = '----=_NextPart_Alt_' + Math.random().toString(36).substring(2);
    const mixedBoundary = '----=_NextPart_Mixed_' + Math.random().toString(36).substring(2);
    
    // Friendly UTF-8 Sender Display Name
    const senderName = lang === 'MK' ? 'Заедница на сопственици ул. Вич 28' : 'Owners Association Vich 28';
    const b64SenderName = btoa(String.fromCharCode(...new TextEncoder().encode(senderName)));
    const utf8From = `=?utf-8?B?${b64SenderName}?= <me>`;

    // MIME - Send multipart/alternative directly
    const utf8Subject = `=?utf-8?B?${btoa(String.fromCharCode(...new TextEncoder().encode(subject)))}?=`;
    
    const formattedTo = toEmail.split(',')
      .map(email => {
        const trimmed = email.trim();
        return trimmed.includes('<') ? trimmed : `<${trimmed}>`;
      })
      .join(', ');

    let emailLines: string[] = [];

    if (attachment) {
      // Multipart/Mixed containing multipart/alternative and the attachment
      emailLines = [
        `From: ${utf8From}`,
        `To: ${formattedTo}`,
        `Subject: ${utf8Subject}`,
        `Date: ${new Date().toUTCString()}`,
        `Message-ID: <${Date.now()}-${Math.random().toString(36).substring(2)}@gmail.com>`,
        `MIME-Version: 1.0`,
        `Content-Type: multipart/mixed; boundary="${mixedBoundary}"`,
        ``,
        `--${mixedBoundary}`,
        `Content-Type: multipart/alternative; boundary="${altBoundary}"`,
        ``,
        `--${altBoundary}`,
        `Content-Type: text/plain; charset=utf-8`,
        `Content-Transfer-Encoding: 8bit`,
        ``,
        plainTextContent,
        ``,
        `--${altBoundary}`,
        `Content-Type: text/html; charset=utf-8`,
        `Content-Transfer-Encoding: 8bit`,
        ``,
        htmlContent,
        ``,
        `--${altBoundary}--`,
        ``,
        `--${mixedBoundary}`,
        `Content-Type: ${attachment.mimeType}`,
        `Content-Transfer-Encoding: base64`,
        `Content-Disposition: attachment; filename="${attachment.filename}"`,
        ``,
        attachment.base64Data,
        ``,
        `--${mixedBoundary}--`
      ];
    } else {
      // Standard multipart/alternative only
      emailLines = [
        `From: ${utf8From}`,
        `To: ${formattedTo}`,
        `Subject: ${utf8Subject}`,
        `Date: ${new Date().toUTCString()}`,
        `Message-ID: <${Date.now()}-${Math.random().toString(36).substring(2)}@gmail.com>`,
        `MIME-Version: 1.0`,
        `Content-Type: multipart/alternative; boundary="${altBoundary}"`,
        ``,
        `--${altBoundary}`,
        `Content-Type: text/plain; charset=utf-8`,
        `Content-Transfer-Encoding: 8bit`,
        ``,
        plainTextContent,
        ``,
        `--${altBoundary}`,
        `Content-Type: text/html; charset=utf-8`,
        `Content-Transfer-Encoding: 8bit`,
        ``,
        htmlContent,
        ``,
        `--${altBoundary}--`
      ];
    }
    
    const rawMessage = emailLines.join('\r\n');
    
    // Robust UTF-8 to Base64Url conversion
    const utf8Encoded = new TextEncoder().encode(rawMessage);
    const binaryString = Array.from(utf8Encoded).map(byte => String.fromCharCode(byte)).join('');
    const encodedRaw = btoa(binaryString)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, ''); // safe base64url encode

    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        raw: encodedRaw
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData?.error?.message || `Gmail API returned HTTP ${response.status}`);
    }

    const data = await response.json();
    return { success: true, messageId: data.id };
  } catch (error: any) {
    console.error('Failed to send email:', error);
    return { success: false, error: error.message || 'Unknown error' };
  }
}

