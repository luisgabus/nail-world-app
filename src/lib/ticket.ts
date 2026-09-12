import type { Wash, Business } from './types';
import { washPaymentMethodLabel } from './types';

/** Amount normalizer: never negative, never NaN. */
function amount(value: number | null | undefined): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** Tip is strictly optional: absent / null / 0 / invalid all mean $0. */
export function ticketTip(wash: Wash): number {
  return amount(wash.tip);
}

/** Base service + extra services (no tip). */
export function ticketSubtotal(wash: Wash): number {
  const stored = amount(wash.total_price);
  if (stored > 0) return stored;
  return amount(wash.price) + amount(wash.additional_total);
}

/** TOTAL = base service + extra services + tip (tip only when entered). */
export function computeTicketTotal(wash: Wash): number {
  return ticketSubtotal(wash) + ticketTip(wash);
}

function computeTotal(wash: Wash): number {
  return computeTicketTotal(wash);
}

export function generateTicketText(wash: Wash, business: Business): string {
  const date = new Date(wash.created_at).toLocaleString('es-CO', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
  const duration = wash.duration_seconds
    ? `${Math.floor(wash.duration_seconds / 60)}m ${wash.duration_seconds % 60}s`
    : 'N/A';
  const detail = wash.additionals_detail ?? [];
  const total = computeTotal(wash);
  const paymentMethod = washPaymentMethodLabel(wash.payment_method);

  const extraLines = detail.length > 0
    ? detail.map((d) => `  + ${d.name}: $${d.amount.toLocaleString('es-CO')}`).join('\n') + '\n'
    : '';

  return `
================================
        ${business.name}
================================
  Ticket #: ${wash.ticket_number}
  Fecha:   ${date}

  cliente:  ${wash.category_name}
  identificación:     ${wash.plate || 'N/A'}
  Especialista:  ${wash.operator_name || 'N/A'}
  Estado:    ${wash.status === 'completado' ? 'COMPLETADO' : wash.status === 'desistido' ? 'DESISTIDO' : wash.status === 'en_espera' ? 'EN ESPERA' : wash.status === 'en_servicio' ? 'EN servicio' : 'LISTO'}

  servicio:    $${amount(wash.price).toLocaleString('es-CO')}
${extraLines}${ticketTip(wash) > 0 ? `  Propina:   $${ticketTip(wash).toLocaleString('es-CO')}\n` : ''}
  -------------------------------
  TOTAL:     ${total.toLocaleString('es-CO')}
  -------------------------------
  Medio de Pago: ${paymentMethod}

${wash.status === 'desistido' && wash.cancellation_reason ? `  Motivo: ${wash.cancellation_reason}
  Pérdida: ${wash.potential_loss.toLocaleString('es-CO')}
` : ''}
  Duración: ${duration}

  ¡Gracias por su preferencia!
================================
`.trim();
}

export function generateTicketHTML(wash: Wash, business: Business): string {
  const date = new Date(wash.created_at).toLocaleString('es-CO', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
  const total = computeTotal(wash);
  const paymentMethod = washPaymentMethodLabel(wash.payment_method);
  const duration = wash.duration_seconds
    ? `${Math.floor(wash.duration_seconds / 60)}m ${wash.duration_seconds % 60}s`
    : 'N/A';
  const detail = wash.additionals_detail ?? [];

  const extraRows = detail.length > 0
    ? detail.map((d) =>
        `<div style="display: flex; justify-content: space-between; color: #555;"><span>+ ${d.name}:</span><span>$${d.amount.toLocaleString('es-CO')}</span></div>`
      ).join('')
    : '';

  return `
<div style="font-family: 'Courier New', monospace; max-width: 300px; margin: 0 auto; padding: 20px; background: #fff; color: #000;">
  <div style="text-align: center; font-size: 18px; font-weight: bold; margin-bottom: 10px;">${business.name}</div>
  <div style="border-top: 1px dashed #000; margin: 10px 0;"></div>
  <div style="font-size: 12px;">
    <div>Ticket #: <strong>${wash.ticket_number}</strong></div>
    <div>Fecha: ${date}</div>
  </div>
  <div style="border-top: 1px dashed #000; margin: 10px 0;"></div>
  <div style="font-size: 13px;">
    <div>cliente: <strong>${wash.category_name}</strong></div>
    <div>identificación: <strong>${wash.plate || 'N/A'}</strong></div>
    <div>Especialista: ${wash.operator_name || 'N/A'}</div>
    <div>Estado: ${wash.status === 'completado' ? 'COMPLETADO' : wash.status === 'desistido' ? 'DESISTIDO' : wash.status === 'en_espera' ? 'EN ESPERA' : wash.status === 'en_servicio' ? 'EN servicio' : 'LISTO'}</div>
  </div>
  <div style="border-top: 1px dashed #000; margin: 10px 0;"></div>
  <div style="font-size: 13px;">
    <div style="display: flex; justify-content: space-between;"><span>servicio:</span><span>$${amount(wash.price).toLocaleString('es-CO')}</span></div>
    ${extraRows}
    ${ticketTip(wash) > 0 ? `<div style="display: flex; justify-content: space-between;"><span>Propina:</span><span>$${ticketTip(wash).toLocaleString('es-CO')}</span></div>` : ''}
    <div style="border-top: 1px solid #000; margin: 5px 0;"></div>
    <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 15px;"><span>TOTAL:</span><span>$${total.toLocaleString('es-CO')}</span></div>
    <div style="display: flex; justify-content: space-between; margin-top: 4px;"><span>Medio de Pago:</span><span>${paymentMethod}</span></div>
  </div>
  ${wash.status === 'desistido' && wash.cancellation_reason ? `
  <div style="border-top: 1px dashed #000; margin: 10px 0;"></div>
  <div style="font-size: 12px;">
    <div>Motivo: ${wash.cancellation_reason}</div>
    <div>Pérdida: $${wash.potential_loss.toLocaleString('es-CO')}</div>
  </div>` : ''}
  <div style="border-top: 1px dashed #000; margin: 10px 0;"></div>
  <div style="font-size: 12px;">Duración: ${duration}</div>
  <div style="text-align: center; font-size: 12px; margin-top: 15px;">¡Gracias por su preferencia!</div>
</div>
`;
}

export function downloadTicketPDF(wash: Wash, business: Business): void {
  const html = generateTicketHTML(wash, business);
  const fullHTML = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Ticket #${wash.ticket_number}</title></head><body>${html}</body></html>`;
  const blob = new Blob([fullHTML], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const w = window.open(url, '_blank');
  if (w) {
    w.onload = () => {
      w.print();
    };
  }
}

export function printTicket(wash: Wash, business: Business): void {
  const text = generateTicketText(wash, business);
  const html = generateTicketHTML(wash, business);
  const fullHTML = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Ticket #${wash.ticket_number}</title><style>@media print { body { margin: 0; } }</style></head><body>${html}<script>window.onload = () => window.print();</script></body></html>`;
  const blob = new Blob([fullHTML], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
  void text;
}
