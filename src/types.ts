export interface User {
  idusuario: string;
  nombre: string;
  password?: string;
  role?: string;
  roll?: string;
  sesionActiva?: boolean;
}

export interface Product {
  Codigo: string;
  Nombre: string;
  incluir_Costo_en_Bs_o_Divisas?: string; // "Divisas" | "Bs" | "Precio Fijo"
  Costo: number;
  unidadesxEmpaque: number;
  Impuesto: number;
  Porcentaje_a_Ganar: number;
  PrecioVtaSugeridoDivisa?: number;
  PrecioVtaRealDivisas: number;
  Precio: number;
  PrecioBs: number;
  Stock: number;
}

export interface Client {
  ID: string;
  Nombre: string;
  Telefono?: string;
}

export interface CartItem {
  codigo: string;
  nombre: string;
  precio: number;
  precioBs: number;
  cantidad: number;
  stockMax: number;
}

export interface PaymentSplit {
  metodo: string;
  montoBs: number;
  montoUSD: number;
  referencia: string;
}

export interface SaleItem {
  codigo?: string;
  nombre: string;
  cantidad: number;
  precio: number;
  precioBs?: number;
}

export interface Sale {
  idVenta: string;
  fecha: string;
  clienteId?: string;
  clienteNombre: string;
  tipo: 'Contado' | 'Crédito';
  totalUSD: number;
  totalBS: number;
  vendedor: string;
  detalle?: string;
  desglosePago?: string;
  estado?: 'Activa' | 'Anulada' | string;
  motivoAnulacion?: string;
  usuarioAnulacion?: string;
  fechaAnulacion?: string;
  items?: SaleItem[];
  metodosPago?: PaymentSplit[];
  isOfflinePending?: boolean;
}

export interface Abono {
  idAbono: string;
  fecha: string;
  idVenta: string;
  montoUSD: number;
  montoBs: number;
  tasa?: number;
  referencia?: string;
  usuario?: string;
  isOfflinePending?: boolean;
}

export interface Proveedor {
  id: string;
  nombre: string;
  telefono: string;
  direccion?: string;
  isOfflinePending?: boolean;
}

export interface CuentaPorPagar {
  idCXP: string;
  fecha: string;
  idProveedor: string;
  proveedor: string;
  nroFactura: string;
  concepto: string;
  montoTotalUSD: number;
  montoTotalBs: number;
  saldoPendienteUSD: number;
  estado: 'PENDIENTE' | 'PAGADO' | string;
  usuario?: string;
  isOfflinePending?: boolean;
}

export interface TasaBCVInfo {
  fecha: string;
  tasa: number;
  coincideHoy?: boolean;
}

export type SyncActionType =
  | 'REGISTRAR_VENTA'
  | 'ANULAR_VENTA'
  | 'REGISTRAR_ABONO'
  | 'ELIMINAR_ABONO'
  | 'GUARDAR_TASA_BCV'
  | 'REGISTRAR_PRODUCTO'
  | 'ACTUALIZAR_PRODUCTO'
  | 'ELIMINAR_PRODUCTO'
  | 'REGISTRAR_CLIENTE'
  | 'ACTUALIZAR_CLIENTE'
  | 'ELIMINAR_CLIENTE'
  | 'REGISTRAR_PROVEEDOR'
  | 'REGISTRAR_CXP'
  | 'ABONAR_CXP';

export interface SyncQueueItem {
  id: string;
  action: SyncActionType;
  payload: any;
  timestamp: string;
  descripcion: string;
  status: 'pending' | 'syncing' | 'failed' | 'success';
  error?: string;
  intentos: number;
}

export interface OfflineCacheData {
  productos: Product[];
  clientes: Client[];
  usuarios: User[];
  ventas: Sale[];
  abonos: Abono[];
  proveedores: Proveedor[];
  cxpList: CuentaPorPagar[];
  tasaBCV: number;
  ultimaActualizacion: string;
}
