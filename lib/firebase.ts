// lib/firebase.ts
// Centralizza init Firebase + helper sicuri per: Auth, Booking CRUD, Pagamenti (via Cloud Functions)

import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  signInWithPopup,
  onIdTokenChanged,
  type User,
} from "firebase/auth";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  getDoc,
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
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
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

// ---------- AUTH HELPERS ----------
const googleProvider = new GoogleAuthProvider();

export async function registerWithEmail(email: string, password: string) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  // opzionale: crea doc utente
  await ensureUserDoc(cred.user);
  return cred.user;
}

export async function loginWithEmail(email: string, password: string) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
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

async function ensureUserDoc(user: User) {
  const usersCol = collection(db, "users");
  // potresti voler usare doc(user.uid) invece di addDoc.
  const userDoc = doc(db, "users", user.uid);
  const snap = await getDoc(userDoc);
  if (!snap.exists()) {
    await updateDocOrCreate(userDoc, {
      uid: user.uid,
      email: user.email ?? "",
      displayName: user.displayName ?? "",
      photoURL: user.photoURL ?? "",
      provider: user.providerData?.[0]?.providerId ?? "password",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      role: "customer",
    });
  } else {
    await updateDoc(userDoc, { updatedAt: serverTimestamp() });
  }
}

async function updateDocOrCreate(ref: ReturnType<typeof doc>, data: Record<string, any>) {
  try {
    await updateDoc(ref, data);
  } catch {
    // se non esiste, crealo
    await import("firebase/firestore").then(async ({ setDoc }) => setDoc(ref, data));
  }
}

// ---------- BOOKINGS (prenotazioni del sito) ----------
export type BookingPayload = {
  checkIn: string;   // ISO yyyy-mm-dd
  checkOut: string;  // ISO yyyy-mm-dd
  guests: number;
  name: string;
  email: string;
  phone?: string;
  notes?: string;
  totalAmount?: number;        // opzionale, calcolato server-side
  currency?: string;           // "EUR"
  status?: "pending" | "paid" | "confirmed" | "cancelled";
  source?: "site" | "booking" | "airbnb" | "manual";
};

const BOOKINGS_COL = "bookings";

/** Crea una prenotazione lato Firestore (quelle fatte dal sito). */
export async function createBooking(payload: BookingPayload) {
  const col = collection(db, BOOKINGS_COL);
  const docRef = await addDoc(col, {
    ...payload,
    userId: auth.currentUser?.uid ?? null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function getBookingById(id: string) {
  const snap = await getDoc(doc(db, BOOKINGS_COL, id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function listMyBookings(limitN = 20) {
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
// Qui chiami una tua API Route server-side che integra i partner e restituisce prenotazioni normalizzate.
// Vedi /app/api/partners/booking/reservations (da implementare) che usa le chiavi segrete lato server.
export async function fetchPartnerReservations(params?: Record<string, string>) {
  const qs = params ? "?" + new URLSearchParams(params).toString() : "";
  const res = await fetch(`/api/partners/booking/reservations${qs}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Partner reservations fetch failed");
  return res.json(); // { items: [...] }
}

// ---------- PAGAMENTI (Stripe / PayPal / Satispay) via Cloud Functions ----------
// Le chiavi segrete vivono nelle Functions. Qui facciamo solo callable.
// Implementa lato server le funzioni:
//  - payments-createStripeCheckout
//  - payments-createPayPalOrder
//  - payments-capturePayPalOrder
//  - payments-createSatispayPayment
//  - payments-checkPaymentStatus

type CreateCheckoutArgs = {
  bookingId: string;
  amount: number;     // cents
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
