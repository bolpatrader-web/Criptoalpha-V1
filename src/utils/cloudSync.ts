import { doc, onSnapshot, setDoc, getDoc, disableNetwork, enableNetwork } from 'firebase/firestore';
import { db } from '../lib/firebase';

// Identificador único por pestaña/dispositivo para evitar bucles de actualización (echo loops)
export const CLIENT_ID = typeof window !== 'undefined' 
  ? (sessionStorage.getItem('crypto_alpha_client_id') || (() => {
      const id = 'dev_' + Math.random().toString(36).substring(2, 9);
      sessionStorage.setItem('crypto_alpha_client_id', id);
      return id;
    })())
  : 'server_env';

export interface SyncEnvelope<T> {
  payload: T;
  updatedAt: number;
  updatedBy: string;
  deviceName?: string;
}

// Registro en memoria de timestamps y hashes/strings de la última escritura de cada canal
const lastPublishedTimestamp: Record<string, number> = {};
const lastPublishedPayloadString: Record<string, string> = {};

// Tiempo de debounce para evitar inundar Firestore en cambios rápidos
const debounceTimers: Record<string, any> = {};

// Circuit breaker para cuota de Firestore persistido por fecha
const STORAGE_KEY_QUOTA = 'crypto_alpha_firestore_quota_exceeded_date';
const KNOWN_EXHAUSTED_DATE = '2026-09-06';
const getTodayStr = () => new Date().toISOString().slice(0, 10);

let isQuotaExceeded: boolean = typeof window !== 'undefined' 
  ? (localStorage.getItem(STORAGE_KEY_QUOTA) === getTodayStr() || getTodayStr() === KNOWN_EXHAUSTED_DATE)
  : false;

const activeSubscriptions = new Set<() => void>();

// Si la cuota ya está agotada hoy, desactivar el canal de red de Firestore de inmediato
// para evitar reintentos de conexión, loops de backoff y consumo innecesario de recursos
if (isQuotaExceeded) {
  try {
    disableNetwork(db).catch(() => {});
  } catch {}
}

// Capturar errores no controlados a nivel de ventana que puedan provenir del worker interno de Firestore
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const reasonStr = String(event?.reason?.message || event?.reason || '');
    if (
      reasonStr.includes('Quota limit exceeded') || 
      reasonStr.includes('Quota exceeded') ||
      reasonStr.includes('resource-exhausted')
    ) {
      event.preventDefault(); // Prevenir spam en consola
      notifyFirestoreQuotaError();
    }
  });
}

export function getIsCloudQuotaExceeded(): boolean {
  return isQuotaExceeded;
}

export function resetCloudQuotaFlag() {
  isQuotaExceeded = false;
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY_QUOTA);
    try {
      enableNetwork(db).catch(() => {});
    } catch {}
  }
}

export function notifyFirestoreQuotaError() {
  if (!isQuotaExceeded) {
    isQuotaExceeded = true;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY_QUOTA, getTodayStr());
        window.dispatchEvent(new CustomEvent('firestore_quota_exceeded', {
          detail: {
            reason: 'Free daily write units per project quota exceeded',
            date: getTodayStr(),
          }
        }));
      } catch (e) {
        console.error(e);
      }
    }
    console.warn('[CloudSync] ⚠️ Cuota diaria gratuita de escritura de Firestore alcanzada. Desconectando listeners y pasando a modo local 100% offline.');
    
    // Desconectar todos los listeners activos
    activeSubscriptions.forEach((unsub) => {
      try {
        unsub();
      } catch {}
    });
    activeSubscriptions.clear();

    // Desconectar el canal de red del SDK de Firestore para detener bucles de reintentos
    try {
      disableNetwork(db).catch(() => {});
    } catch {}
  }
}

/**
 * Suscribirse a un canal de sincronización en tiempo real desde Firestore.
 * Cuando otro dispositivo guarda cambios, este listener se activa de inmediato.
 */
export function subscribeToSyncChannel<T>(
  channel: string,
  onRemoteData: (data: T, envelope: SyncEnvelope<T>) => void,
  onError?: (err: any) => void
): () => void {
  // Si la cuota ya está agotada hoy, no conectar listener para evitar bucles de reconexión
  if (isQuotaExceeded) {
    return () => {};
  }

  try {
    const docRef = doc(db, 'app_shared_sync', channel);
    let unsubscribed = false;
    
    const unsubscribe = onSnapshot(
      docRef,
      (snapshot) => {
        if (!snapshot.exists()) return;
        const envelope = snapshot.data() as SyncEnvelope<T>;
        
        if (!envelope || !('payload' in envelope)) return;

        // Si fue originado por este mismo cliente hace menos de 2.5 segundos, ignoramos el eco
        if (envelope.updatedBy === CLIENT_ID && Date.now() - (envelope.updatedAt || 0) < 2500) {
          return;
        }

        // Si la marca temporal es anterior a la que nosotros acabamos de emitir localmente, ignoramos
        if (lastPublishedTimestamp[channel] && envelope.updatedAt < lastPublishedTimestamp[channel]) {
          return;
        }

        // Guardar payload para no reenviar idéntico contenido
        try {
          lastPublishedPayloadString[channel] = JSON.stringify(envelope.payload);
        } catch {}

        onRemoteData(envelope.payload, envelope);
      },
      (err: any) => {
        const isQuotaErr = err?.code === 'resource-exhausted' || 
          err?.message?.includes('Quota limit exceeded') || 
          err?.message?.includes('Quota exceeded') ||
          err?.message?.includes('resource-exhausted');

        if (isQuotaErr) {
          notifyFirestoreQuotaError();
          // Cerrar inmediatamente este listener específico para detener el backoff loop de Firestore
          if (!unsubscribed) {
            unsubscribed = true;
            try { unsubscribe(); } catch {}
          }
        } else {
          console.warn(`[CloudSync] Error en listener para ${channel}:`, err?.message || err);
        }
        if (onError) onError(err);
      }
    );

    const safeUnsub = () => {
      if (!unsubscribed) {
        unsubscribed = true;
        activeSubscriptions.delete(safeUnsub);
        try { unsubscribe(); } catch {}
      }
    };

    activeSubscriptions.add(safeUnsub);
    return safeUnsub;
  } catch (error: any) {
    const isQuotaErr = error?.code === 'resource-exhausted' || 
      error?.message?.includes('Quota limit exceeded') ||
      error?.message?.includes('Quota exceeded');

    if (isQuotaErr) {
      notifyFirestoreQuotaError();
    }
    console.warn(`[CloudSync] No se pudo inicializar listener para ${channel}:`, error?.message || error);
    return () => {};
  }
}

/**
 * Publicar actualización en un canal de Firestore para que todos los dispositivos lo reciban.
 */
export async function publishToSyncChannel<T>(
  channel: string,
  payload: T,
  debounceMs: number = 2000
): Promise<void> {
  // Si la cuota ya se agotó hoy, operar localmente sin disparar errores
  if (isQuotaExceeded) {
    return;
  }

  // Prevenir escrituras innecesarias si los datos no cambiaron
  let payloadStr = '';
  try {
    payloadStr = JSON.stringify(payload);
    if (lastPublishedPayloadString[channel] === payloadStr) {
      return;
    }
  } catch {
    // Si no se puede serializar, proceder normalmente
  }

  return new Promise((resolve) => {
    if (debounceTimers[channel]) {
      clearTimeout(debounceTimers[channel]);
    }

    debounceTimers[channel] = setTimeout(async () => {
      // Revalidar cuota antes de ejecutar
      if (isQuotaExceeded) {
        resolve();
        return;
      }

      try {
        const now = Date.now();
        lastPublishedTimestamp[channel] = now;
        if (payloadStr) {
          lastPublishedPayloadString[channel] = payloadStr;
        }

        const envelope: SyncEnvelope<T> = {
          payload,
          updatedAt: now,
          updatedBy: CLIENT_ID,
          deviceName: typeof navigator !== 'undefined' ? `${navigator.platform || 'Web'}` : 'Applet',
        };

        const docRef = doc(db, 'app_shared_sync', channel);
        await setDoc(docRef, envelope, { merge: true });
        resolve();
      } catch (err: any) {
        const isQuotaErr = err?.code === 'resource-exhausted' || 
          err?.message?.includes('Quota limit exceeded') || 
          err?.message?.includes('Quota exceeded');

        if (isQuotaErr) {
          notifyFirestoreQuotaError();
        } else {
          console.warn(`[CloudSync] Error al publicar en canal ${channel}:`, err?.message || err);
        }
        resolve();
      }
    }, debounceMs);
  });
}

/**
 * Cargar estado inicial desde Firestore si existe previamente
 */
export async function fetchInitialSyncChannel<T>(channel: string): Promise<T | null> {
  if (isQuotaExceeded) {
    return null;
  }

  try {
    const docRef = doc(db, 'app_shared_sync', channel);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const env = snap.data() as SyncEnvelope<T>;
      return env.payload;
    }
  } catch (e: any) {
    if (e?.code === 'resource-exhausted' || e?.message?.includes('Quota limit exceeded')) {
      notifyFirestoreQuotaError();
    }
    console.warn(`[CloudSync] No se pudo obtener snapshot inicial de ${channel}:`, e);
  }
  return null;
}
