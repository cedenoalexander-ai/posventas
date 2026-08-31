import {
  SyncQueueItem,
  SyncActionType,
  OfflineCacheData,
  Product,
  Client,
  User,
  Sale,
  Abono,
  Proveedor,
  CuentaPorPagar,
} from '../types';
import {
  apiRegisterSale,
  apiAnularSale,
  apiRegisterAbono,
  apiDeleteAbono,
  apiSaveTasaBCV,
  apiSaveProduct,
  apiDeleteProduct,
  apiSaveClient,
  apiDeleteClient,
  apiSaveProveedor,
  apiSaveCXP,
  apiAbonarCXP,
} from './api';

const CACHE_KEY = 'imtec_offline_cache_v1';
const QUEUE_KEY = 'imtec_sync_queue_v1';

// 1. Guardar y Obtener Caché Local Completo
export function saveOfflineCache(data: Partial<OfflineCacheData>): void {
  try {
    const existing = getOfflineCache() || {
      productos: [],
      clientes: [],
      usuarios: [],
      ventas: [],
      abonos: [],
      proveedores: [],
      cxpList: [],
      tasaBCV: 50.0,
      ultimaActualizacion: new Date().toISOString(),
    };

    const updated: OfflineCacheData = {
      ...existing,
      ...data,
      ultimaActualizacion: new Date().toISOString(),
    };

    localStorage.setItem(CACHE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('Error guardando caché offline:', e);
  }
}

export function getOfflineCache(): OfflineCacheData | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.warn('Error leyendo caché offline:', e);
    return null;
  }
}

// 2. Gestión de la Cola de Sincronización (Sync Queue)
export function getSyncQueue(): SyncQueueItem[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.warn('Error leyendo cola de sincronización:', e);
    return [];
  }
}

export function saveSyncQueue(queue: SyncQueueItem[]): void {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch (e) {
    console.warn('Error guardando cola de sincronización:', e);
  }
}

export function addToSyncQueue(
  action: SyncActionType,
  payload: any,
  descripcion: string
): SyncQueueItem {
  const queue = getSyncQueue();
  const newItem: SyncQueueItem = {
    id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    action,
    payload,
    timestamp: new Date().toLocaleString('es-VE'),
    descripcion,
    status: 'pending',
    intentos: 0,
  };

  queue.push(newItem);
  saveSyncQueue(queue);
  return newItem;
}

export function removeSyncQueueItem(id: string): void {
  const queue = getSyncQueue().filter((item) => item.id !== id);
  saveSyncQueue(queue);
}

export function clearSyncQueue(): void {
  localStorage.removeItem(QUEUE_KEY);
}

// 3. Procesar un ítem individual de la cola con el Backend
async function processQueueItem(item: SyncQueueItem): Promise<boolean> {
  try {
    switch (item.action) {
      case 'REGISTRAR_VENTA':
        await apiRegisterSale(item.payload);
        return true;

      case 'ANULAR_VENTA':
        await apiAnularSale(item.payload);
        return true;

      case 'REGISTRAR_ABONO':
        await apiRegisterAbono(item.payload);
        return true;

      case 'ELIMINAR_ABONO':
        await apiDeleteAbono(item.payload.idAbono);
        return true;

      case 'GUARDAR_TASA_BCV':
        await apiSaveTasaBCV(item.payload.tasa);
        return true;

      case 'REGISTRAR_PRODUCTO':
        await apiSaveProduct(item.payload, false);
        return true;

      case 'ACTUALIZAR_PRODUCTO':
        await apiSaveProduct(item.payload, true);
        return true;

      case 'ELIMINAR_PRODUCTO':
        await apiDeleteProduct(item.payload.codigo);
        return true;

      case 'REGISTRAR_CLIENTE':
        await apiSaveClient(item.payload, false);
        return true;

      case 'ACTUALIZAR_CLIENTE':
        await apiSaveClient(item.payload, true);
        return true;

      case 'ELIMINAR_CLIENTE':
        await apiDeleteClient(item.payload.id);
        return true;

      case 'REGISTRAR_PROVEEDOR':
        await apiSaveProveedor(item.payload, false);
        return true;

      case 'REGISTRAR_CXP':
        await apiSaveCXP(item.payload);
        return true;

      case 'ABONAR_CXP':
        await apiAbonarCXP(item.payload);
        return true;

      default:
        console.warn('Acción de sincronización desconocida:', item.action);
        return true;
    }
  } catch (err: any) {
    console.error(`Fallo al sincronizar ${item.action}:`, err);
    throw err;
  }
}

// 4. Ejecución del Lote de Sincronización
export interface SyncResult {
  total: number;
  exitosos: number;
  fallidos: number;
  detalles: { id: string; descripcion: string; ok: boolean; error?: string }[];
}

export async function processSyncQueue(
  onProgress?: (current: number, total: number, currentDesc: string) => void
): Promise<SyncResult> {
  const queue = getSyncQueue();
  const result: SyncResult = {
    total: queue.length,
    exitosos: 0,
    fallidos: 0,
    detalles: [],
  };

  if (queue.length === 0) return result;

  const remainingQueue: SyncQueueItem[] = [];

  for (let i = 0; i < queue.length; i++) {
    const item = queue[i];
    if (onProgress) {
      onProgress(i + 1, queue.length, item.descripcion);
    }

    try {
      item.status = 'syncing';
      item.intentos += 1;
      await processQueueItem(item);

      result.exitosos++;
      result.detalles.push({
        id: item.id,
        descripcion: item.descripcion,
        ok: true,
      });
    } catch (error: any) {
      result.fallidos++;
      item.status = 'failed';
      item.error = error?.message || 'Error de conexión';
      remainingQueue.push(item);

      result.detalles.push({
        id: item.id,
        descripcion: item.descripcion,
        ok: false,
        error: item.error,
      });
    }
  }

  // Guardamos solo los que fallaron para reintentar más adelante
  saveSyncQueue(remainingQueue);
  return result;
}

// 5. Utilidad de Conectividad
export function checkIsOnline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine !== false;
}
