// lib/firebase.ts
// Inizializza Firebase + helpers sicuri per: Auth, Profili/Ruoli, Prenotazioni, Pagamenti (via Cloud Functions)

import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  signInWithPopup,
  onIdTokenChanged,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
  type User,
} from "firebase/auth";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  getDoc,
  setDoc,
  doc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  updateDoc,
  deleteDoc,
  Timestamp,
} from "firebase/firestore";
import { getFunctions, httpsCallable, connectFunctionsEmulator } from "firebase/functions";
import { getStorage } from "firebase/storage";

// ---------- INIT ----------
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,                    // ⬅️ DA METTERE
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,            // ⬅️ DA METTERE
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,              // ⬅️ DA METTERE
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,      // ⬅️ DA METTERE
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!, // ⬅️ DA METTERE
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,                      // ⬅️ DA METTERE
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);

// In dev puoi usare l’emulatore delle funzioni
if (process.env.NEXT_PUBLIC_USE_FUNCTIONS_EMULATOR === "true") {
  connectFunctionsEmulator(functions, "127.0.0.1", 5001);
}

// ---------- UTILS ----------
export type UserDoc = {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  provider: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
  role: "customer" | "admin";
  firstName?: string;
  lastName?: string;
  phone?: string;
  notifications?: {
    bookingConfirmations?: boolean;
    promos?: boolean;
    checkinReminders?: boolean;
  };
};

export async function getUserDoc(uid: string): Promise<UserDoc | null> {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  return snap.exists() ? (snap.data() as UserDoc) : null;
}

async function ensureUserDoc(user: User) {
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);

  const base = {
    uid: user.uid,
    email: user.email ?? "",
    displayName: user.displayName ?? "",
    photoURL: user.photoURL ?? "",
    provider: user.providerData?.[0]?.providerId ?? "password",
    updatedAt: serverTimestamp(),
  };

  if (!snap.exists()) {
    await setDoc(ref, {
      ...base,
      role: "user", // ⬅️ PRIMA era "customer"
      createdAt: serverTimestamp(),
      // allineati a quelli usati in User page
      notifications: {
        confirmEmails: true,
        promos: false,
        checkinReminders: true,
      },
    });
  } else {
    await updateDoc(ref, base);
  }
}

// ---------- AUTH ----------
const googleProvider = new GoogleAuthProvider();

export async function registerWithEmail(email: string, password: string, displayName?: string) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  if (displayName) {
    // opzionale: salviamo nome/cognome su Firestore (non servono API aggiuntive)
    await ensureUserDoc({ ...cred.user, displayName } as User);
    await updateDoc(doc(db, "users", cred.user.uid), { displayName });
  } else {
    await ensureUserDoc(cred.user);
  }
  return cred.user;
}

export async function loginWithEmail(email: string, password: string) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  await ensureUserDoc(cred.user);
  return cred.user;
}

export async function loginWithGoogle() {
  const cred = await signInWithPopup(auth, googleProvider);
  await ensureUserDoc(cred.user);
  return cred.user;
}

export async function logout() {
  await signOut(auth);
}

export function onToken(cb: (token: string | null, user: User | null) => void) {
  return onIdTokenChanged(auth, async (user) => {
    if (!user) return cb(null, null);
    const token = await user.getIdToken(/* forceRefresh */ true);
    cb(token, user);
  });
}

export async function getCurrentIdToken(forceRefresh = false) {
  const user = auth.currentUser;
  if (!user) return null;
  return user.getIdToken(forceRefresh);
}

// Cambio password con re-autenticazione (richiede email + password corrente, e verifiche lato UI)
export async function secureChangePassword(email: string, currentPassword: string, newPassword: string) {
  const user = auth.currentUser;
  if (!user || !user.email) throw new Error("Nessun utente autenticato");
  if (user.email !== email) throw new Error("Email non corrispondente all'utente attuale");
  const cred = EmailAuthProvider.credential(email, currentPassword);
  await reauthenticateWithCredential(user, cred);
  await updatePassword(user, newPassword);
}

// Eliminazione account (ri-autenticazione)
export async function secureDeleteAccount(email: string, currentPassword: string) {
  const user = auth.currentUser;
  if (!user || !user.email) throw new Error("Nessun utente autenticato");
  if (user.email !== email) throw new Error("Email non corrispondente all'utente attuale");
  const cred = EmailAuthProvider.credential(email, currentPassword);
  await reauthenticateWithCredential(user, cred);
  // pulizia dati principali lato Firestore
  await deleteDoc(doc(db, "users", user.uid)).catch(() => {});
  await user.delete();
}

// Helper opzionale per SEED admin (da fare via Cloud Function per non mettere password nel client!)
export async function seedInitialAdmin(email: string) {
  // IMPLEMENTAZIONE SERVER-SIDE: "admin-seedInitialAdmin"
  //  - crea utente con password iniziale
  //  - setta ruolo "admin" su Firestore
  const callable = httpsCallable(functions, "admin-seedInitialAdmin");
  const res = await callable({ email });
  // @ts-ignore
  return res.data as { ok: boolean };
}

// ---------- BOOKINGS (prenotazioni del sito) ----------
export type BookingPayload = {
  checkIn: string;    // ISO (yyyy-mm-dd)
  checkOut: string;   // ISO (yyyy-mm-dd)
  guests: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  notes?: string;

  roomId: string;
  roomName: string;
  pricePerNight: number;   // in EUR
  currency?: "EUR";

  // opzionali: saranno settati lato client o server
  totalAmount?: number;     // EUR (non centesimi per leggibilità in Firestore; per i pagamenti usa centesimi)
  nights?: number;

  status?: "pending" | "paid" | "confirmed" | "cancelled";
  origin?: "site" | "booking" | "airbnb" | "manual";
};

const BOOKINGS_COL = "bookings";

export function computeNights(checkInISO: string, checkOutISO: string) {
  const inD = new Date(checkInISO + "T00:00:00");
  const outD = new Date(checkOutISO + "T00:00:00");
  const ms = outD.getTime() - inD.getTime();
  const nights = Math.max(0, Math.round(ms / (1000 * 60 * 60 * 24)));
  return nights;
}

export function computeTotalEUR(pricePerNight: number, nights: number, taxes = 0, serviceFee = 0) {
  const subtotal = pricePerNight * nights;
  return Math.max(0, Math.round((subtotal + taxes + serviceFee) * 100) / 100);
}

/** Crea una prenotazione lato Firestore (quelle fatte dal sito). */
export async function createBooking(payload: BookingPayload) {
  if (!payload.checkIn || !payload.checkOut) throw new Error("Date mancanti");
  const nights = computeNights(payload.checkIn, payload.checkOut);
  if (nights <= 0) throw new Error("Intervallo date non valido");

  const total = payload.totalAmount ?? computeTotalEUR(payload.pricePerNight, nights);

  const colRef = collection(db, BOOKINGS_COL);
  const docRef = await addDoc(colRef, {
    ...payload,
    nights,
    totalAmount: total,
    currency: payload.currency ?? "EUR",
    status: payload.status ?? "pending",
    origin: payload.origin ?? "site",
    userId: auth.currentUser?.uid ?? null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function updateBooking(id: string, patch: Partial<BookingPayload> & { status?: BookingPayload["status"] }) {
  await updateDoc(doc(db, BOOKINGS_COL, id), {
    ...patch,
    updatedAt: serverTimestamp(),
  });
}

export async function getBookingById(id: string) {
  const snap = await getDoc(doc(db, BOOKINGS_COL, id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function listMyBookings(limitN = 50) {
  const uid = auth.currentUser?.uid;
  if (!uid) return [];
  const q = query(
    collection(db, BOOKINGS_COL),
    where("userId", "==", uid),
    orderBy("createdAt", "desc"),
    limit(limitN)
  );
  const s = await getDocs(q);
  return s.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// Admin: lista tutte (site + booking) con origine
export async function listAllBookingsForAdmin(limitN = 100) {
  const qy = query(collection(db, BOOKINGS_COL), orderBy("createdAt", "desc"), limit(limitN));
  const s = await getDocs(qy);
  return s.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function cancelBooking(id: string) {
  await updateDoc(doc(db, BOOKINGS_COL, id), {
    status: "cancelled",
    updatedAt: serverTimestamp(),
  });
}

export async function confirmBooking(id: string) {
  await updateDoc(doc(db, BOOKINGS_COL, id), {
    status: "confirmed",
    updatedAt: serverTimestamp(),
  });
}

// ---------- RECUPERO PRENOTAZIONI DA PARTNER (Booking.com, ecc.) ----------
// API Route server-side che integra i partner e restituisce prenotazioni normalizzate.
// (vedi /app/api/partners/booking/reservations – lato server con chiavi segrete)
export async function fetchPartnerReservations(params?: Record<string, string>) {
  const qs = params ? "?" + new URLSearchParams(params).toString() : "";
  const res = await fetch(`/api/partners/booking/reservations${qs}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Partner reservations fetch failed");
  return res.json(); // { items: [...] }
}

// ---------- PAGAMENTI (Stripe / PayPal / Satispay) via Cloud Functions ----------
type CreateCheckoutArgs = {
  bookingId: string;
  amount: number;     // in cents (es. 120.50€ => 12050)
  currency: string;   // "EUR"
  successUrl: string;
  cancelUrl: string;
  customerEmail?: string;
  metadata?: Record<string, string>;
};

export async function createStripeCheckout(args: CreateCheckoutArgs): Promise<{ url: string }> {
  const callable = httpsCallable(functions, "payments-createStripeCheckout");
  const res = await callable(args);
  // @ts-ignore
  return res.data as { url: string };
}

export async function createPayPalOrder(args: CreateCheckoutArgs): Promise<{ id: string; approveUrl: string }> {
  const callable = httpsCallable(functions, "payments-createPayPalOrder");
  const res = await callable(args);
  // @ts-ignore
  return res.data as { id: string; approveUrl: string };
}

export async function capturePayPalOrder(orderId: string): Promise<{ status: string }> {
  const callable = httpsCallable(functions, "payments-capturePayPalOrder");
  const res = await callable({ orderId });
  // @ts-ignore
  return res.data as { status: string };
}

export async function createSatispayPayment(args: CreateCheckoutArgs): Promise<{ redirectUrl: string; id: string }> {
  const callable = httpsCallable(functions, "payments-createSatispayPayment");
  const res = await callable(args);
  // @ts-ignore
  return res.data as { redirectUrl: string; id: string };
}

export async function checkPaymentStatus(provider: "stripe" | "paypal" | "satispay", paymentId: string) {
  const callable = httpsCallable(functions, "payments-checkPaymentStatus");
  const res = await callable({ provider, paymentId });
  // @ts-ignore
  return res.data as { status: "pending" | "succeeded" | "failed" | "canceled" | "requires_action" };
}
