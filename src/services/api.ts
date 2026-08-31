import {
  User,
  Product,
  Client,
  Sale,
  Abono,
  Proveedor,
  CuentaPorPagar,
  TasaBCVInfo,
} from '../types';

export const SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbxnH28SCCUyIpvNAlOuK3PkAfVXEsJbmdN5u_y0RDEaZ3LG7ugni22E8nSLW0jVaeqn/exec';

export interface FullDataResponse {
  productos: Product[];
  clientes: Client[];
  usuarios: User[];
  ventas: Sale[];
  abonos: Abono[];
  tasaBCV: TasaBCVInfo;
}

export async function fetchFullData(): Promise<FullDataResponse> {
  const res = await fetch(`${SCRIPT_URL}?action=getDatos`, { method: 'GET' });
  const data = await res.json();
  return data;
}

export async function apiLogin(usuario: string, password: string): Promise<{
  status: 'success' | 'error';
  usuario?: User;
  message?: string;
}> {
  const res = await fetch(SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action: 'login', usuario, password }),
  });
  return await res.json();
}

export async function apiLogout(idusuario: string): Promise<any> {
  const res = await fetch(SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action: 'cerrarSesion', idusuario }),
  });
  return await res.json();
}

export async function apiSaveTasaBCV(tasa: number): Promise<any> {
  const res = await fetch(SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action: 'guardarTasaBCV', tasa }),
  });
  return await res.json();
}

export async function apiRegisterSale(venta: Partial<Sale>): Promise<any> {
  const res = await fetch(SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action: 'registrarVenta', venta }),
  });
  return await res.json();
}

export async function apiAnularSale(payload: {
  idVenta: string;
  motivo: string;
  usuario: string;
  items: any[];
}): Promise<any> {
  const res = await fetch(SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action: 'anularVenta', ...payload }),
  });
  return await res.json();
}

export async function apiRegisterAbono(abono: {
  idVenta: string;
  montoUSD: number;
  referencia: string;
  usuario: string;
}): Promise<any> {
  const res = await fetch(SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action: 'registrarAbono', abono }),
  });
  return await res.json();
}

export async function apiDeleteAbono(idAbono: string): Promise<any> {
  const res = await fetch(SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action: 'eliminarAbono', idAbono }),
  });
  return await res.json();
}

// Productos
export async function apiSaveProduct(
  producto: {
    codigo: string;
    nombre: string;
    incluir_Costo_en_Bs_o_Divisas?: string;
    costo: number;
    unidadesxEmpaque: number;
    impuesto: number;
    porcentajeGanar: number;
    precioVtaRealDivisas: number;
    precio?: number;
    precioBs?: number;
    stock: number;
  },
  isEdit: boolean
): Promise<any> {
  const res = await fetch(SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({
      action: isEdit ? 'actualizarProducto' : 'registrarProducto',
      producto,
    }),
  });
  return await res.json();
}

export async function apiDeleteProduct(codigo: string): Promise<any> {
  const res = await fetch(SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action: 'eliminarProducto', codigo }),
  });
  return await res.json();
}

// Clientes
export async function apiSaveClient(
  cliente: { id: string; nombre: string; telefono?: string },
  isEdit: boolean
): Promise<any> {
  const res = await fetch(SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({
      action: isEdit ? 'actualizarCliente' : 'registrarCliente',
      cliente,
    }),
  });
  return await res.json();
}

export async function apiDeleteClient(id: string): Promise<any> {
  const res = await fetch(SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action: 'eliminarCliente', id }),
  });
  return await res.json();
}

// Usuarios
export async function apiSaveUser(
  usuario: { idusuario: string; nombre: string; password?: string; roll: string },
  isEdit: boolean
): Promise<any> {
  const res = await fetch(SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({
      action: isEdit ? 'actualizarUsuario' : 'registrarUsuario',
      usuario,
    }),
  });
  return await res.json();
}

export async function apiDeleteUser(idusuario: string): Promise<any> {
  const res = await fetch(SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action: 'eliminarUsuario', idusuario }),
  });
  return await res.json();
}

// Proveedores & CXP
export async function apiGetProveedores(): Promise<Proveedor[]> {
  const res = await fetch(`${SCRIPT_URL}?action=getProveedores`);
  const data = await res.json();
  return data.proveedores || [];
}

export async function apiGetCXP(): Promise<CuentaPorPagar[]> {
  const res = await fetch(`${SCRIPT_URL}?action=getCuentasPorPagar`);
  const data = await res.json();
  return data.cxp || [];
}

export async function apiSaveProveedor(
  proveedor: Proveedor,
  isEdit: boolean = false
): Promise<any> {
  const res = await fetch(SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({
      action: isEdit ? 'actualizarProveedor' : 'registrarProveedor',
      proveedor,
    }),
  });
  return await res.json();
}

export async function apiSaveCXP(cxp: {
  idProveedor: string;
  proveedor: string;
  nroFactura: string;
  montoTotalUSD: number;
  montoTotalBs: number;
  concepto: string;
  usuario: string;
}): Promise<any> {
  const res = await fetch(SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action: 'registrarCuentaPorPagar', cxp }),
  });
  return await res.json();
}

export async function apiAbonarCXP(abono: {
  idCXP: string;
  montoUSD: number;
  montoBs: number;
  metodoPago: string;
  referencia: string;
  usuario: string;
}): Promise<any> {
  const res = await fetch(SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action: 'registrarAbonoProveedor', abono }),
  });
  return await res.json();
}
