import type { Business, SubscriptionStatus } from './types';

export interface SubscriptionState {
  status: SubscriptionStatus;
  daysRemaining: number;
  isBlocked: boolean;
  isWarning: boolean;
  isGrace: boolean;
  label: string;
  bannerColor: string;
  bannerBg: string;
  borderColor: string;
}

const GRACE_DAYS = 3;

export function getSubscriptionState(business: Business): SubscriptionState {
  const now = new Date();
  const billingDate = business.next_billing_date ? new Date(business.next_billing_date) : null;

  if (!billingDate) {
    return {
      status: 'active',
      daysRemaining: 0,
      isBlocked: false,
      isWarning: false,
      isGrace: false,
      label: 'Sin fecha de facturación',
      bannerColor: 'text-slate-300',
      bannerBg: 'bg-slate-500/10',
      borderColor: 'border-slate-500/20',
    };
  }

  const diffMs = billingDate.getTime() - now.getTime();
  const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffMs > 0) {
    if (daysRemaining <= 3) {
      return {
        status: 'active',
        daysRemaining,
        isBlocked: false,
        isWarning: true,
        isGrace: false,
        label: `Suscripción por vencer en ${daysRemaining} día${daysRemaining !== 1 ? 's' : ''}`,
        bannerColor: 'text-amber-300',
        bannerBg: 'bg-amber-500/10',
        borderColor: 'border-amber-500/30',
      };
    }
    return {
      status: 'active',
      daysRemaining,
      isBlocked: false,
      isWarning: false,
      isGrace: false,
      label: 'Suscripción activa',
      bannerColor: 'text-emerald-300',
      bannerBg: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/20',
    };
  }

  const graceEndDate = business.grace_end_date
    ? new Date(business.grace_end_date)
    : new Date(billingDate.getTime() + GRACE_DAYS * 24 * 60 * 60 * 1000);

  const graceDiffMs = graceEndDate.getTime() - now.getTime();

  if (graceDiffMs > 0) {
    const graceDaysLeft = Math.ceil(graceDiffMs / (1000 * 60 * 60 * 24));
    return {
      status: 'grace',
      daysRemaining: -daysRemaining,
      isBlocked: false,
      isWarning: false,
      isGrace: true,
      label: `Periodo de gracia: ${graceDaysLeft} día${graceDaysLeft !== 1 ? 's' : ''} restante${graceDaysLeft !== 1 ? 's' : ''}`,
      bannerColor: 'text-orange-300',
      bannerBg: 'bg-orange-500/10',
      borderColor: 'border-orange-500/30',
    };
  }

  return {
    status: 'suspended',
    daysRemaining: -daysRemaining,
    isBlocked: true,
    isWarning: false,
    isGrace: false,
    label: 'Suscripción suspendida por pago pendiente',
    bannerColor: 'text-red-300',
    bannerBg: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
  };
}

export function planLabel(plan: string): string {
  switch (plan) {
    case 'trial': return 'Prueba';
    case 'monthly': return 'Mensual';
    case 'annual': return 'Anual';
    default: return plan;
  }
}

export function statusLabel(status: string): string {
  switch (status) {
    case 'active': return 'Activa';
    case 'grace': return 'Periodo de gracia';
    case 'suspended': return 'Suspendida';
    default: return status;
  }
}
