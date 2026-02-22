export interface PaymentSchedule {
  depositAmount: number // not used in new flow (SetupIntent saves card)
  balanceAmount: number // full amount charged 7 days before check-in
  balanceDueDate: Date // 7 giorni prima del check-in
  totalAmount: number
}

export interface CancellationPolicy {
  canCancel: boolean
  penaltyPercent: number
  refundPercent: number
  penaltyAmount: number
  refundAmount: number
}

export interface ChangeDatesPolicy {
  canChange: boolean
  penaltyPercent: number
  penaltyAmount: number
}

/**
 * Calcola la data di addebito del saldo (7 giorni prima del check-in)
 */
export function calculateChargeDate(checkInDate: Date): Date {
  const chargeDate = new Date(checkInDate)
  chargeDate.setDate(chargeDate.getDate() - 7)
  return chargeDate
}

/**
 * Calcola i giorni rimanenti fino al check-in
 */
export function getDaysUntilCheckIn(
  checkInDate: Date | string,
  now: Date = new Date(),
): number {
  const checkIn = typeof checkInDate === "string" ? new Date(checkInDate) : checkInDate
  const diffMs = checkIn.getTime() - now.getTime()
  return Math.floor(diffMs / (1000 * 60 * 60 * 24))
}

/**
 * Calcola la penale per CANCELLAZIONE
 * - Oltre 7 giorni: 0% penale (rimborso 100%)
 * - Entro 7 giorni: 100% penale (rimborso 0%)
 */
export function getCancellationPenaltyPercent(
  checkInDate: Date | string,
  now: Date = new Date(),
): number {
  const days = getDaysUntilCheckIn(checkInDate, now)
  if (days <= 7) return 100
  return 0
}

/**
 * Calcola la penale per CAMBIO DATE
 * - Oltre 7 giorni: 0% penale
 * - Entro 7 giorni: 50% penale
 */
export function getChangeDatesPenaltyPercent(
  checkInDate: Date | string,
  now: Date = new Date(),
): number {
  const days = getDaysUntilCheckIn(checkInDate, now)
  if (days <= 7) return 50
  return 0
}

/**
 * Calcola la policy completa di cancellazione
 * @param totalAmountCents - importo totale in centesimi
 */
export function calculateCancellationPolicy(
  checkInDate: Date | string,
  totalAmountCents: number,
  now: Date = new Date(),
): CancellationPolicy {
  const penaltyPercent = getCancellationPenaltyPercent(checkInDate, now)
  const refundPercent = 100 - penaltyPercent
  const penaltyAmount = Math.round(totalAmountCents * (penaltyPercent / 100))
  const refundAmount = totalAmountCents - penaltyAmount

  return {
    canCancel: true,
    penaltyPercent,
    refundPercent,
    penaltyAmount,
    refundAmount,
  }
}

/**
 * Calcola la policy completa per cambio date
 * @param totalAmountCents - importo totale in centesimi
 */
export function calculateChangeDatesPolicy(
  checkInDate: Date | string,
  totalAmountCents: number,
  now: Date = new Date(),
): ChangeDatesPolicy {
  const penaltyPercent = getChangeDatesPenaltyPercent(checkInDate, now)
  const penaltyAmount = Math.round(totalAmountCents * (penaltyPercent / 100))

  return {
    canChange: true,
    penaltyPercent,
    penaltyAmount,
  }
}
