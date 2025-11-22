export interface PaymentSchedule {
  depositAmount: number // 30%
  balanceAmount: number // 70%
  depositDueDate: Date
  balanceDueDate: Date // 7 giorni prima del check-in
  totalAmount: number
}

export interface CancellationPolicy {
  canCancel: boolean
  refundPercentage: number
  penaltyPercentage: number
  refundAmount: number
  penaltyAmount: number
}

/**
 * Calcola lo schedule di pagamento per una prenotazione
 * 30% alla prenotazione, 70% 7 giorni prima del check-in
 */
export function calculatePaymentSchedule(
  totalAmount: number,
  checkInDate: Date,
  bookingDate: Date = new Date(),
): PaymentSchedule {
  const depositPercentage = 0.3
  const balancePercentage = 0.7

  const depositAmount = Math.round(totalAmount * depositPercentage)
  const balanceAmount = totalAmount - depositAmount

  // Balance due 7 days before check-in
  const balanceDueDate = new Date(checkInDate)
  balanceDueDate.setDate(balanceDueDate.getDate() - 7)

  return {
    depositAmount,
    balanceAmount,
    depositDueDate: bookingDate,
    balanceDueDate,
    totalAmount,
  }
}

/**
 * Calcola la policy di cancellazione basata sulla data di check-in
 * - Più di 7 giorni prima: 100% rimborso
 * - Meno di 7 giorni prima: 50% rimborso (penalità 50%)
 * - Meno di 48 ore prima: 0% rimborso (penalità 100%)
 */
export function calculateCancellationPolicy(
  checkInDate: Date,
  amountPaid: number,
  cancellationDate: Date = new Date(),
): CancellationPolicy {
  const daysUntilCheckIn = Math.floor((checkInDate.getTime() - cancellationDate.getTime()) / (1000 * 60 * 60 * 24))

  let refundPercentage = 0
  let penaltyPercentage = 100

  if (daysUntilCheckIn >= 7) {
    // Più di 7 giorni: rimborso totale
    refundPercentage = 100
    penaltyPercentage = 0
  } else if (daysUntilCheckIn >= 2) {
    // Tra 2 e 7 giorni: rimborso 50%
    refundPercentage = 50
    penaltyPercentage = 50
  } else {
    // Meno di 48 ore: nessun rimborso
    refundPercentage = 0
    penaltyPercentage = 100
  }

  const refundAmount = Math.round((amountPaid * refundPercentage) / 100)
  const penaltyAmount = amountPaid - refundAmount

  return {
    canCancel: true,
    refundPercentage,
    penaltyPercentage,
    refundAmount,
    penaltyAmount,
  }
}

/**
 * Calcola la penalità per cambio date
 * - Più di 7 giorni prima: gratis
 * - Meno di 7 giorni prima: €50 di penalità
 */
export function calculateChangeDatesPenalty(
  checkInDate: Date,
  changeDate: Date = new Date(),
): { penalty: number; canChange: boolean } {
  const daysUntilCheckIn = Math.floor((checkInDate.getTime() - changeDate.getTime()) / (1000 * 60 * 60 * 24))

  if (daysUntilCheckIn >= 7) {
    return { penalty: 0, canChange: true }
  } else if (daysUntilCheckIn >= 2) {
    return { penalty: 5000, canChange: true } // €50 in centesimi
  } else {
    return { penalty: 0, canChange: false } // Non si può cambiare
  }
}
