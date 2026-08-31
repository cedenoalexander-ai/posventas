import React from 'react';
import { User } from '../types';
import { formatearBS } from '../utils/formatters';
import {
  ShoppingCart,
  Receipt,
  DollarSign,
  BookOpen,
  TrendingDown,
  Users,
  Package,
  UserCheck,
  RefreshCw,
  LogOut,
  SlidersHorizontal,
  Wifi,
  WifiOff,
  Cloud,
  CloudOff,
} from 'lucide-react';

interface HeaderProps {
  vistaActual: string;
  onCambiarVista: (vista: string) => void;
  usuario: User | null;
  tasaBCV: number;
  onCambiarTasaBCV: () => void;
  onSincronizar: () => void;
  onCerrarSesion: () => void;
  deudaTotalPendienteUSD: number;
  loading: boolean;
  isOnline: boolean;
  pendingSyncCount: number;
  onAbrirColaSync: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  vistaActual,
  onCambiarVista,
  usuario,
  tasaBCV,
  onCambiarTasaBCV,
  onSincronizar,
  onCerrarSesion,
  deudaTotalPendienteUSD,
  loading,
  isOnline,
  pendingSyncCount,
  onAbrirColaSync,
}) => {
  const esAdmin =
    usuario &&
    ((usuario.role || usuario.roll || '').toLowerCase().trim() === 'admin');

  return (
    <header className="bg-blue-600 text-white p-3 sm:p-4 font-bold flex flex-col md:flex-row justify-between items-center shadow-md gap-2.5 sticky top-0 z-30">
      <div className="flex items-center justify-between w-full md:w-auto">
        <div className="flex items-center gap-2.5">
          <div
            className="flex items-center gap-2 cursor-pointer select-none"
            onClick={() => onCambiarVista('vender')}
          >
            <span className="tracking-wide text-2xl font-black">iMtec</span>
            <span className="bg-blue-800 text-[10px] uppercase font-bold px-2 py-0.5 rounded text-blue-200">
              POS
            </span>
          </div>

          {/* Connection Status Badge (Online / Offline / Pending) */}
          <button
            type="button"
            onClick={onAbrirColaSync}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition shadow-xs cursor-pointer border active:scale-95 ${
              !isOnline
                ? 'bg-amber-500 text-amber-950 border-amber-300 animate-pulse'
                : pendingSyncCount > 0
                ? 'bg-amber-400 text-slate-900 border-amber-300'
                : 'bg-emerald-500/20 text-emerald-100 border-emerald-400/40 hover:bg-emerald-500/30'
            }`}
            title={
              !isOnline
                ? `Sin conexión a internet. (${pendingSyncCount} pendientes por sincronizar)`
                : pendingSyncCount > 0
                ? `${pendingSyncCount} movimiento(s) pendiente(s) por subir a Google Sheets`
                : 'En línea y sincronizado con Google Sheets'
            }
          >
            {!isOnline ? (
              <>
                <WifiOff className="w-3 h-3 text-amber-950" />
                <span>Offline</span>
                {pendingSyncCount > 0 && (
                  <span className="bg-amber-950 text-amber-200 text-[10px] px-1.5 py-0.2 rounded-full font-black ml-0.5">
                    {pendingSyncCount}
                  </span>
                )}
              </>
            ) : pendingSyncCount > 0 ? (
              <>
                <CloudOff className="w-3 h-3 text-slate-900" />
                <span>Pendientes</span>
                <span className="bg-slate-900 text-amber-300 text-[10px] px-1.5 py-0.2 rounded-full font-black ml-0.5">
                  {pendingSyncCount}
                </span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
                <span>Online</span>
              </>
            )}
          </button>
        </div>

        <div className="flex md:hidden items-center gap-2">
          <button
            onClick={onCambiarTasaBCV}
            className="bg-blue-900 border border-blue-400/60 px-2.5 py-1 rounded-lg text-xs flex items-center gap-1 cursor-pointer active:scale-95 transition"
            title="Cambiar Tasa BCV"
          >
            <span className="text-blue-200">BCV:</span>
            <span className="font-bold text-amber-300">
              {formatearBS(tasaBCV)}
            </span>
          </button>
          <button
            onClick={onCerrarSesion}
            className="bg-red-600 hover:bg-red-700 active:scale-95 text-xs px-2.5 py-1.5 rounded-lg font-bold shadow"
            title="Cerrar Sesión"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Navigation Buttons */}
      <nav className="flex gap-1.5 overflow-x-auto max-w-full pb-1 md:pb-0 text-xs font-normal w-full md:w-auto scrollbar-thin">
        <button
          onClick={() => onCambiarVista('vender')}
          className={`px-3 py-2 rounded-lg flex items-center gap-1.5 whitespace-nowrap transition cursor-pointer ${
            vistaActual === 'vender'
              ? 'bg-blue-900 font-bold shadow'
              : 'bg-blue-700 font-semibold hover:bg-blue-800'
          }`}
        >
          <ShoppingCart className="w-3.5 h-3.5" />
          <span>Vender</span>
        </button>

        <button
          onClick={() => onCambiarVista('ventas')}
          className={`px-3 py-2 rounded-lg flex items-center gap-1.5 whitespace-nowrap transition cursor-pointer ${
            vistaActual === 'ventas'
              ? 'bg-blue-900 font-bold shadow'
              : 'bg-blue-700 font-semibold hover:bg-blue-800'
          }`}
        >
          <Receipt className="w-3.5 h-3.5" />
          <span>Ventas</span>
        </button>

        <button
          onClick={() => onCambiarVista('cobranza')}
          className={`px-3 py-2 rounded-lg flex items-center gap-1.5 whitespace-nowrap transition cursor-pointer ${
            vistaActual === 'cobranza'
              ? 'bg-blue-900 font-bold shadow'
              : 'bg-blue-700 font-semibold hover:bg-blue-800'
          }`}
        >
          <DollarSign className="w-3.5 h-3.5" />
          <span>Cobranza</span>
          {deudaTotalPendienteUSD > 0 && (
            <span className="bg-amber-400 text-slate-900 text-[9px] px-1.5 py-0.2 rounded-full font-black ml-0.5">
              ${deudaTotalPendienteUSD.toFixed(2)}
            </span>
          )}
        </button>

        <button
          onClick={() => onCambiarVista('historialAbonos')}
          className={`px-3 py-2 rounded-lg flex items-center gap-1.5 whitespace-nowrap transition cursor-pointer ${
            vistaActual === 'historialAbonos'
              ? 'bg-blue-900 font-bold shadow'
              : 'bg-blue-700 font-semibold hover:bg-blue-800'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Abonos</span>
        </button>

        <button
          onClick={() => onCambiarVista('cxp')}
          className={`px-3 py-2 rounded-lg flex items-center gap-1.5 whitespace-nowrap transition cursor-pointer ${
            vistaActual === 'cxp'
              ? 'bg-blue-900 font-bold shadow'
              : 'bg-blue-700 font-semibold hover:bg-blue-800'
          }`}
        >
          <TrendingDown className="w-3.5 h-3.5" />
          <span>Cuentas por Pagar</span>
        </button>

        <button
          onClick={() => onCambiarVista('clientes')}
          className={`px-3 py-2 rounded-lg flex items-center gap-1.5 whitespace-nowrap transition cursor-pointer ${
            vistaActual === 'clientes'
              ? 'bg-blue-900 font-bold shadow'
              : 'bg-blue-700 font-semibold hover:bg-blue-800'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Clientes</span>
        </button>

        {esAdmin && (
          <>
            <button
              onClick={() => onCambiarVista('productos')}
              className={`px-3 py-2 rounded-lg flex items-center gap-1.5 whitespace-nowrap transition cursor-pointer ${
                vistaActual === 'productos'
                  ? 'bg-blue-900 font-bold shadow'
                  : 'bg-blue-700 font-semibold hover:bg-blue-800'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>Productos</span>
            </button>

            <button
              onClick={() => onCambiarVista('usuarios')}
              className={`px-3 py-2 rounded-lg flex items-center gap-1.5 whitespace-nowrap transition cursor-pointer ${
                vistaActual === 'usuarios'
                  ? 'bg-blue-900 font-bold shadow'
                  : 'bg-blue-700 font-semibold hover:bg-blue-800'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Usuarios</span>
            </button>
          </>
        )}
      </nav>

      {/* Desktop Info & Actions */}
      <div className="hidden md:flex items-center gap-3">
        <button
          onClick={onCambiarTasaBCV}
          className="bg-blue-900 border border-blue-400/60 hover:border-amber-400/80 px-3 py-1 rounded-lg text-xs flex items-center gap-1.5 cursor-pointer shadow-inner transition active:scale-95"
          title="Modificar Tasa BCV"
        >
          <span className="text-blue-200 font-semibold">Tasa BCV:</span>
          <span className="font-bold text-amber-300">
            {formatearBS(tasaBCV)}
          </span>
          <SlidersHorizontal className="w-3 h-3 text-blue-300 ml-0.5" />
        </button>

        {usuario && (
          <div className="text-xs text-right">
            <div className="font-bold text-sm leading-tight text-white">
              {usuario.nombre}
            </div>
            <div className="text-blue-200 uppercase font-semibold text-[10px]">
              Rol: {usuario.role || usuario.roll || 'Vendedor'}
            </div>
          </div>
        )}

        <button
          onClick={pendingSyncCount > 0 ? onAbrirColaSync : onSincronizar}
          disabled={loading}
          className={`text-xs px-3 py-2 rounded-lg transition font-semibold cursor-pointer flex items-center gap-1.5 shadow active:scale-95 ${
            pendingSyncCount > 0
              ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold'
              : 'bg-blue-800 hover:bg-blue-700 text-white'
          }`}
          title="Sincronizar con Google Sheets"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>
            {loading
              ? 'Sincronizando...'
              : pendingSyncCount > 0
              ? `Subir (${pendingSyncCount})`
              : 'Sincronizar'}
          </span>
        </button>

        <button
          onClick={onCerrarSesion}
          className="bg-red-600 hover:bg-red-700 active:scale-95 text-xs px-3 py-2 rounded-lg transition font-semibold cursor-pointer flex items-center gap-1 shadow"
          title="Salir"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Salir</span>
        </button>
      </div>
    </header>
  );
};

