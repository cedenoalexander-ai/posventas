import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import {
  Sale,
  CartItem,
  PaymentSplit,
  Abono,
  Proveedor,
  CuentaPorPagar,
  User,
  SyncQueueItem,
} from '../types';
import {
  formatearBS,
  formatearUSD,
  formatearFechaLatina,
  formatearFechaCorta,
} from '../utils/formatters';
import {
  X,
  Plus,
  Trash2,
  CheckCircle,
  AlertTriangle,
  Camera,
  Printer,
  DollarSign,
  Loader2,
  RefreshCw,
  Cloud,
  CloudOff,
  Wifi,
  WifiOff,
  Check,
} from 'lucide-react';

// =========================================================================
// 1. MODAL COBRO CONTADO (MULTI-PAGO)
// =========================================================================
interface ModalCobroProps {
  isOpen: boolean;
  onClose: () => void;
  carrito: CartItem[];
  tasaBCV: number;
  onConfirmarVenta: (pagos: PaymentSplit[]) => Promise<void>;
}

export const ModalCobro: React.FC<ModalCobroProps> = ({
  isOpen,
  onClose,
  carrito,
  tasaBCV,
  onConfirmarVenta,
}) => {
  const [pagos, setPagos] = useState<PaymentSplit[]>([]);
  const [metodo, setMetodo] = useState('Punto de Venta');
  const [montoInput, setMontoInput] = useState('');
  const [refInput, setRefInput] = useState('');
  const [procesando, setProcesando] = useState(false);

  const totalUSD = carrito.reduce(
    (acc, i) => acc + i.precio * i.cantidad,
    0
  );
  const totalBS = carrito.reduce(
    (acc, i) => acc + i.precioBs * i.cantidad,
    0
  );

  const totalAbonadoBs = pagos.reduce((acc, p) => acc + p.montoBs, 0);
  const totalAbonadoUSD = pagos.reduce((acc, p) => acc + p.montoUSD, 0);
  const diferenciaBs = Number((totalAbonadoBs - totalBS).toFixed(2));
  const restanteBs = Math.max(0, totalBS - totalAbonadoBs);

  useEffect(() => {
    if (isOpen) {
      setPagos([]);
      setMetodo('Punto de Venta');
      setRefInput('');
      setMontoInput(restanteBs > 0 ? restanteBs.toFixed(2) : '');
    }
  }, [isOpen, totalBS]);

  if (!isOpen) return null;

  const handleCambioMetodo = (nuevoMetodo: string) => {
    setMetodo(nuevoMetodo);
    if (nuevoMetodo === 'Efectivo USD') {
      setMontoInput(tasaBCV > 0 ? (restanteBs / tasaBCV).toFixed(2) : '');
    } else {
      setMontoInput(restanteBs > 0 ? restanteBs.toFixed(2) : '');
    }
  };

  const agregarPago = () => {
    const mIngresado = parseFloat(montoInput);
    if (isNaN(mIngresado) || mIngresado <= 0) {
      alert('Ingresa un monto válido mayor a cero.');
      return;
    }

    let montoBs = 0;
    let montoUSD = 0;

    if (metodo === 'Efectivo USD') {
      montoUSD = Number(mIngresado.toFixed(2));
      montoBs = Number((montoUSD * tasaBCV).toFixed(2));
    } else {
      montoBs = Number(mIngresado.toFixed(2));
      montoUSD = tasaBCV > 0 ? Number((montoBs / tasaBCV).toFixed(2)) : 0;
    }

    const nuevoPagos = [
      ...pagos,
      {
        metodo,
        montoBs,
        montoUSD,
        referencia: refInput.trim() || '-',
      },
    ];

    setPagos(nuevoPagos);
    setRefInput('');

    const nuevoAbonadoBs = nuevoPagos.reduce((acc, p) => acc + p.montoBs, 0);
    const nuevoRestanteBs = Math.max(0, totalBS - nuevoAbonadoBs);
    if (metodo === 'Efectivo USD') {
      setMontoInput(tasaBCV > 0 ? (nuevoRestanteBs / tasaBCV).toFixed(2) : '');
    } else {
      setMontoInput(nuevoRestanteBs > 0 ? nuevoRestanteBs.toFixed(2) : '');
    }
  };

  const atajoPagarRestante = (metodoAtajo: string) => {
    if (restanteBs <= 0.01) {
      alert('El total ya se encuentra cubierto.');
      return;
    }

    let montoBs = restanteBs;
    let montoUSD = tasaBCV > 0 ? Number((montoBs / tasaBCV).toFixed(2)) : 0;

    if (metodoAtajo === 'Efectivo USD') {
      montoUSD = tasaBCV > 0 ? Number((restanteBs / tasaBCV).toFixed(2)) : 0;
      montoBs = Number((montoUSD * tasaBCV).toFixed(2));
    }

    setPagos([
      ...pagos,
      {
        metodo: metodoAtajo,
        montoBs,
        montoUSD,
        referencia: 'Total restante',
      },
    ]);
  };

  const eliminarPago = (index: number) => {
    const p = [...pagos];
    p.splice(index, 1);
    setPagos(p);
  };

  const handleConfirmar = async () => {
    if (diferenciaBs < -0.05) return;
    setProcesando(true);
    try {
      await onConfirmarVenta(pagos);
    } finally {
      setProcesando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-950/80 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-4 sm:p-6 border border-gray-200 flex flex-col max-h-[95vh] overflow-y-auto">
        <div className="flex justify-between items-start border-b border-gray-200 pb-2 mb-3">
          <div>
            <h3 className="font-black text-lg text-gray-900 flex items-center gap-1.5">
              <DollarSign className="w-5 h-5 text-emerald-600" />
              <span>💵 Discriminar Pago (Contado)</span>
            </h3>
            <p className="text-[11px] text-gray-500">
              Agrega uno o varios métodos hasta cubrir el total
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 p-1 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Totales Resumen */}
        <div className="bg-slate-900 text-white rounded-xl p-3 mb-3 grid grid-cols-2 gap-2 shadow-inner">
          <div>
            <span className="text-[10px] font-bold uppercase text-slate-400">
              Total Bs:
            </span>
            <div className="text-xl font-black text-emerald-400">
              {formatearBS(totalBS)}
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-bold uppercase text-slate-400">
              Total USD:
            </span>
            <div className="text-xl font-black text-blue-400">
              {formatearUSD(totalUSD)}
            </div>
          </div>
        </div>

        {/* Formulario Agregar Pago */}
        <div className="bg-gray-50 rounded-xl p-3 border border-gray-200 mb-3 flex flex-col gap-2">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div>
              <label className="block text-[10px] font-bold text-gray-600 uppercase mb-0.5">
                Método:
              </label>
              <select
                value={metodo}
                onChange={(e) => handleCambioMetodo(e.target.value)}
                className="w-full border border-gray-300 p-2 rounded-lg text-xs font-semibold bg-white"
              >
                <option value="Punto de Venta">💳 Punto de Venta (Bs)</option>
                <option value="Pago Móvil">📱 Pago Móvil (Bs)</option>
                <option value="Transferencia Bancaria">🏦 Transferencia (Bs)</option>
                <option value="Efectivo Bs">💵 Efectivo (Bs)</option>
                <option value="Efectivo USD">💵 Efectivo ($ USD)</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-600 uppercase mb-0.5">
                {metodo === 'Efectivo USD' ? 'Monto ($ USD):' : 'Monto (Bs.):'}
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={montoInput}
                onChange={(e) => setMontoInput(e.target.value)}
                placeholder="0.00"
                className="w-full border border-gray-300 p-2 rounded-lg text-xs font-bold bg-white"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-600 uppercase mb-0.5">
                Referencia:
              </label>
              <input
                type="text"
                value={refInput}
                onChange={(e) => setRefInput(e.target.value)}
                placeholder="Ej: 1234"
                className="w-full border border-gray-300 p-2 rounded-lg text-xs bg-white"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-1 items-center justify-between pt-1">
            <div className="flex flex-wrap gap-1 text-[10px]">
              <button
                type="button"
                onClick={() => atajoPagarRestante('Punto de Venta')}
                className="bg-blue-100 text-blue-800 hover:bg-blue-200 px-2 py-1 rounded font-semibold cursor-pointer transition"
              >
                Todo Punto
              </button>
              <button
                type="button"
                onClick={() => atajoPagarRestante('Pago Móvil')}
                className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200 px-2 py-1 rounded font-semibold cursor-pointer transition"
              >
                Todo Pago Móvil
              </button>
              <button
                type="button"
                onClick={() => atajoPagarRestante('Efectivo Bs')}
                className="bg-amber-100 text-amber-800 hover:bg-amber-200 px-2 py-1 rounded font-semibold cursor-pointer transition"
              >
                Todo Efec. Bs
              </button>
              <button
                type="button"
                onClick={() => atajoPagarRestante('Efectivo USD')}
                className="bg-purple-100 text-purple-800 hover:bg-purple-200 px-2 py-1 rounded font-semibold cursor-pointer transition"
              >
                Todo Efec. $
              </button>
            </div>

            <button
              type="button"
              onClick={agregarPago}
              className="bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold px-3 py-1.5 rounded-lg text-xs shadow cursor-pointer transition flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Agregar</span>
            </button>
          </div>
        </div>

        {/* Tabla Métodos Registrados */}
        <div className="overflow-y-auto flex-1 border border-gray-200 rounded-xl mb-3 bg-white max-h-36">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-gray-100 text-gray-600 font-bold uppercase border-b border-gray-200">
                <th className="p-2">Método</th>
                <th className="p-2">Ref</th>
                <th className="p-2 text-right">Bs.</th>
                <th className="p-2 text-right">USD</th>
                <th className="p-2 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pagos.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-gray-400 text-xs">
                    Sin métodos agregados aún
                  </td>
                </tr>
              ) : (
                pagos.map((p, idx) => (
                  <tr key={idx}>
                    <td className="p-2 font-bold text-gray-800">{p.metodo}</td>
                    <td className="p-2 text-[10px] text-gray-500 font-mono">
                      {p.referencia}
                    </td>
                    <td className="p-2 text-right font-bold text-emerald-800">
                      {formatearBS(p.montoBs)}
                    </td>
                    <td className="p-2 text-right font-bold text-blue-700">
                      {formatearUSD(p.montoUSD)}
                    </td>
                    <td className="p-2 text-center">
                      <button
                        type="button"
                        onClick={() => eliminarPago(idx)}
                        className="text-red-500 hover:text-red-700 font-bold p-1 cursor-pointer"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Alerta de Estado del Pago */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-2.5 flex flex-col gap-1.5 mb-3">
          <div className="flex justify-between items-center text-xs font-semibold text-gray-700">
            <span>Total Abonado:</span>
            <span className="font-bold text-gray-900 text-xs">
              {formatearBS(totalAbonadoBs)} ({formatearUSD(totalAbonadoUSD)})
            </span>
          </div>

          {diferenciaBs < -0.05 ? (
            <div className="p-2 rounded-lg text-xs font-bold text-center border bg-red-50 border-red-200 text-red-700 flex items-center justify-center gap-1.5">
              <AlertTriangle className="w-4 h-4" />
              <span>
                Faltan por pagar:{' '}
                <strong>{formatearBS(Math.abs(diferenciaBs))}</strong> (
                {formatearUSD(Math.abs(diferenciaBs / tasaBCV))})
              </span>
            </div>
          ) : (
            <div className="p-2 rounded-lg text-xs font-bold text-center border bg-emerald-50 border-emerald-300 text-emerald-800 flex items-center justify-center gap-1.5">
              <CheckCircle className="w-4 h-4" />
              <span>✅ Pago completo y cuadrado.</span>
            </div>
          )}
        </div>

        {/* Acciones */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="w-1/3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-3 rounded-xl text-xs transition cursor-pointer"
          >
            Cancelar
          </button>

          <button
            type="button"
            disabled={diferenciaBs < -0.05 || procesando}
            onClick={handleConfirmar}
            className={`w-2/3 font-black py-3 rounded-xl text-xs shadow transition flex items-center justify-center gap-1.5 ${
              diferenciaBs < -0.05 || procesando
                ? 'bg-gray-400 text-white cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white active:scale-98 cursor-pointer'
            }`}
          >
            {procesando ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Guardando Venta...</span>
              </>
            ) : (
              <span>🔒 Completar Venta</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// =========================================================================
// 2. MODAL REGISTRAR ABONO (COBRANZA)
// =========================================================================
interface ModalAbonoProps {
  isOpen: boolean;
  onClose: () => void;
  idVenta: string;
  deudaUSD: number;
  tasaBCV: number;
  onGuardarAbono: (montoUSD: number, ref: string) => Promise<void>;
}

export const ModalAbono: React.FC<ModalAbonoProps> = ({
  isOpen,
  onClose,
  idVenta,
  deudaUSD,
  tasaBCV,
  onGuardarAbono,
}) => {
  const [moneda, setMoneda] = useState<'USD' | 'BS'>('USD');
  const [monto, setMonto] = useState('');
  const [ref, setRef] = useState('');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMoneda('USD');
      setMonto(deudaUSD.toFixed(2));
      setRef('');
    }
  }, [isOpen, deudaUSD]);

  if (!isOpen) return null;

  const deudaBS = deudaUSD * tasaBCV;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(monto);
    if (isNaN(val) || val <= 0) {
      alert('Ingresa un monto válido.');
      return;
    }

    const montoFinalUSD = moneda === 'BS' ? val / tasaBCV : val;
    if (montoFinalUSD > deudaUSD + 0.05) {
      alert('El monto ingresado excede la deuda pendiente.');
      return;
    }

    setGuardando(true);
    try {
      await onGuardarAbono(montoFinalUSD, ref.trim() || 'Abono');
      onClose();
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-950/80 backdrop-blur-xs flex items-center justify-center z-50 p-3">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-5 border border-gray-200">
        <div className="flex justify-between items-start border-b border-gray-200 pb-2 mb-3">
          <h3 className="font-black text-lg text-gray-900">
            💵 Registrar Abono
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 text-2xl font-bold leading-none cursor-pointer"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="bg-blue-50 p-2.5 rounded-xl border border-blue-200 text-center mb-1">
            <span className="text-[10px] text-blue-600 font-bold uppercase">
              Deuda Restante:
            </span>
            <div className="text-sm font-black text-blue-800">
              <span className="text-amber-600 font-black">
                {formatearUSD(deudaUSD)}
              </span>{' '}
              /{' '}
              <span className="text-emerald-700 font-black">
                {formatearBS(deudaBS)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">
                Moneda:
              </label>
              <select
                value={moneda}
                onChange={(e) => {
                  const m = e.target.value as 'USD' | 'BS';
                  setMoneda(m);
                  setMonto(
                    m === 'BS' ? deudaBS.toFixed(2) : deudaUSD.toFixed(2)
                  );
                }}
                className="w-full border border-gray-300 p-2.5 rounded-lg text-xs font-bold bg-white"
              >
                <option value="USD">Dólares ($)</option>
                <option value="BS">Bolívares (Bs)</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">
                {moneda === 'BS' ? 'Monto Bs (Bs):' : 'Monto USD ($):'}
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                required
                className="w-full border border-gray-300 p-2.5 rounded-lg text-xs font-bold"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase mb-1">
              Método y Referencia:
            </label>
            <input
              type="text"
              value={ref}
              onChange={(e) => setRef(e.target.value)}
              required
              placeholder="Ej: Pago Móvil - Ref 1234"
              className="w-full border border-gray-300 p-2.5 rounded-lg text-xs"
            />
          </div>

          <div className="flex gap-2 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-1/3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2.5 rounded-lg text-xs transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              className="w-2/3 bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 rounded-lg text-xs shadow transition cursor-pointer flex items-center justify-center gap-1.5"
            >
              {guardando ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <span>💾 Procesar Abono</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// =========================================================================
// 3. MODAL HISTORIAL DE ABONOS DE UNA VENTA
// =========================================================================
interface ModalHistorialAbonosProps {
  isOpen: boolean;
  onClose: () => void;
  venta: Sale | null;
  abonosVenta: Abono[];
  tasaBCV: number;
  onAbrirNuevoAbono: (idVenta: string, deudaRestanteUSD: number) => void;
}

export const ModalHistorialAbonos: React.FC<ModalHistorialAbonosProps> = ({
  isOpen,
  onClose,
  venta,
  abonosVenta,
  tasaBCV,
  onAbrirNuevoAbono,
}) => {
  if (!isOpen || !venta) return null;

  const totalUSD = Number(venta.totalUSD || 0);
  const totalAbonadoUSD = abonosVenta.reduce(
    (sum, a) => sum + Number(a.montoUSD || 0),
    0
  );
  const deudaRestanteUSD = Math.max(0, totalUSD - totalAbonadoUSD);
  const deudaRestanteBS = deudaRestanteUSD * tasaBCV;

  return (
    <div className="fixed inset-0 bg-gray-950/80 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-gray-200 overflow-hidden flex flex-col max-h-[90vh]">
        <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-xl">📋</span>
            <div>
              <h3 className="font-black text-sm sm:text-base leading-tight">
                Historial de Abonos Realizados
              </h3>
              <p className="text-[11px] text-slate-300 mt-0.5">
                Ticket {venta.idVenta} - {venta.clienteNombre || 'Cliente'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white text-2xl font-bold p-1 leading-none cursor-pointer"
          >
            &times;
          </button>
        </div>

        {/* Resumen 3 columnas */}
        <div className="p-3 bg-slate-50 border-b border-gray-200 grid grid-cols-3 gap-2 text-center text-xs">
          <div className="bg-white p-2 rounded-xl border border-gray-200">
            <span className="text-[10px] text-gray-500 font-bold uppercase block">
              Total Factura
            </span>
            <span className="font-black text-gray-900 text-sm">
              {formatearUSD(totalUSD)}
            </span>
          </div>

          <div className="bg-white p-2 rounded-xl border border-emerald-200">
            <span className="text-[10px] text-emerald-700 font-bold uppercase block">
              Total Abonado
            </span>
            <span className="font-black text-emerald-600 text-sm">
              {formatearUSD(totalAbonadoUSD)}
            </span>
          </div>

          <div className="bg-white p-2 rounded-xl border border-red-200">
            <span className="text-[10px] text-red-600 font-bold uppercase block">
              Resta por Pagar
            </span>
            <span className="font-black text-red-600 text-sm">
              {formatearUSD(deudaRestanteUSD)}
            </span>
          </div>
        </div>

        {/* Listado Abonos */}
        <div className="p-3 sm:p-4 overflow-y-auto flex-1">
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-gray-100 text-gray-700 uppercase font-bold text-[10px] border-b border-gray-200">
                  <th className="p-2.5">Fecha</th>
                  <th className="p-2.5">Referencia / Método</th>
                  <th className="p-2.5">Cajero</th>
                  <th className="p-2.5 text-right font-bold text-emerald-700">
                    Abono ($)
                  </th>
                  <th className="p-2.5 text-right font-bold text-emerald-800">
                    Abono (Bs.)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {abonosVenta.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="p-6 text-center text-gray-400 text-xs"
                    >
                      No se han registrado abonos aún para esta venta.
                    </td>
                  </tr>
                ) : (
                  abonosVenta.map((a) => {
                    const montoUSD = Number(a.montoUSD) || 0;
                    const tasa = Number(a.tasa) || tasaBCV;
                    const montoBs = Number(a.montoBs) || montoUSD * tasa;
                    return (
                      <tr key={a.idAbono} className="hover:bg-blue-50/50">
                        <td className="p-2.5 font-semibold text-gray-800 whitespace-nowrap">
                          {formatearFechaCorta(a.fecha)}
                        </td>
                        <td className="p-2.5 text-gray-700 font-medium">
                          {a.referencia || '-'}
                        </td>
                        <td className="p-2.5 text-gray-500 text-[11px]">
                          {a.usuario || 'Sistema'}
                        </td>
                        <td className="p-2.5 text-right font-black text-emerald-600">
                          {formatearUSD(montoUSD)}
                        </td>
                        <td className="p-2.5 text-right font-black text-emerald-800 whitespace-nowrap">
                          {formatearBS(montoBs)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
          <span className="text-xs font-bold text-gray-600">
            {deudaRestanteUSD <= 0.001 ? (
              <span className="text-emerald-600">
                ✅ Cuenta totalmente saldada
              </span>
            ) : (
              <span>
                Resta por pagar:{' '}
                <strong className="text-red-600">
                  {formatearUSD(deudaRestanteUSD)}
                </strong>{' '}
                ({formatearBS(deudaRestanteBS)})
              </span>
            )}
          </span>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold px-4 py-2 rounded-xl text-xs transition cursor-pointer"
            >
              Cerrar
            </button>

            {deudaRestanteUSD > 0.001 && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onAbrirNuevoAbono(venta.idVenta, deudaRestanteUSD);
                }}
                className="bg-green-600 hover:bg-green-700 text-white font-bold px-4 py-2 rounded-xl text-xs shadow transition cursor-pointer flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Registrar Nuevo Abono</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// =========================================================================
// 4. MODAL DETALLE DE VENTA
// =========================================================================
interface ModalDetalleVentaProps {
  isOpen: boolean;
  onClose: () => void;
  venta: Sale | null;
}

export const ModalDetalleVenta: React.FC<ModalDetalleVentaProps> = ({
  isOpen,
  onClose,
  venta,
}) => {
  if (!isOpen || !venta) return null;

  let items: any[] = [];
  if (Array.isArray(venta.items) && venta.items.length > 0) {
    items = venta.items;
  } else if (venta.detalle) {
    const partes = venta.detalle.split(',');
    partes.forEach((p) => {
      const m = p
        .trim()
        .match(/^(\d+(?:\.\d+)?)\s*x\s*(.+?)(?:\s*\(\s*\$([\d.]+)\s*\))?$/i);
      if (m) {
        items.push({
          cantidad: parseFloat(m[1]) || 1,
          nombre: m[2].trim(),
          precio: parseFloat(m[3]) || 0,
        });
      } else {
        items.push({ cantidad: 1, nombre: p.trim(), precio: 0 });
      }
    });
  }

  return (
    <div className="fixed inset-0 bg-gray-950/80 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-gray-200 overflow-hidden flex flex-col max-h-[90vh]">
        <div className="bg-blue-600 text-white p-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-xl">🧾</span>
            <div>
              <h3 className="font-black text-sm sm:text-base leading-tight">
                Detalle de Productos Vendidos
              </h3>
              <p className="text-[11px] text-blue-100 mt-0.5">
                Ticket {venta.idVenta} ({venta.tipo || 'Contado'})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-blue-200 hover:text-white text-2xl font-bold p-1 leading-none cursor-pointer"
          >
            &times;
          </button>
        </div>

        <div className="p-3 bg-gray-50 border-b border-gray-200 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
          <div>
            <span className="text-gray-500 block text-[10px] uppercase font-bold">
              Cliente:
            </span>
            <span className="font-bold text-gray-800">
              {venta.clienteNombre || 'Cliente General'}
            </span>
          </div>
          <div>
            <span className="text-gray-500 block text-[10px] uppercase font-bold">
              Vendedor:
            </span>
            <span className="font-semibold text-gray-700">
              {venta.vendedor || 'N/A'}
            </span>
          </div>
          <div>
            <span className="text-gray-500 block text-[10px] uppercase font-bold">
              Fecha:
            </span>
            <span className="font-semibold text-gray-700">
              {formatearFechaLatina(venta.fecha)}
            </span>
          </div>
        </div>

        <div className="p-4 overflow-y-auto flex-1">
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-gray-100 text-gray-700 uppercase font-bold text-[10px] border-b border-gray-200">
                  <th className="p-2.5">Producto</th>
                  <th className="p-2.5 text-center">Cant.</th>
                  <th className="p-2.5 text-right">Precio ($)</th>
                  <th className="p-2.5 text-right">Subtotal ($)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-4 text-center text-gray-400">
                      Sin detalle de artículos disponible
                    </td>
                  </tr>
                ) : (
                  items.map((item, i) => {
                    const cant = Number(item.cantidad) || 1;
                    const precio = Number(item.precio) || 0;
                    const subtotal = precio * cant;
                    return (
                      <tr key={i} className="hover:bg-blue-50/50">
                        <td className="p-2.5 font-bold text-gray-800">
                          {item.nombre || item.codigo || 'Producto'}
                        </td>
                        <td className="p-2.5 text-center font-bold text-blue-600">
                          {cant}
                        </td>
                        <td className="p-2.5 text-right text-gray-600">
                          {formatearUSD(precio)}
                        </td>
                        <td className="p-2.5 text-right font-black text-gray-900">
                          {formatearUSD(subtotal)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="p-3 bg-slate-900 text-white flex justify-between items-center text-xs">
          <div className="flex flex-col">
            <span className="text-slate-400 text-[10px] uppercase font-bold">
              Total Facturado:
            </span>
            <span className="text-emerald-400 font-black text-sm sm:text-base">
              {formatearBS(venta.totalBS)}
            </span>
          </div>
          <div className="text-right">
            <span className="text-blue-400 font-black text-base sm:text-lg">
              {formatearUSD(venta.totalUSD)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

// =========================================================================
// 5. MODAL PROVEEDOR
// =========================================================================
interface ModalProveedorProps {
  isOpen: boolean;
  onClose: () => void;
  onGuardar: (prov: Proveedor) => Promise<void>;
}

export const ModalProveedor: React.FC<ModalProveedorProps> = ({
  isOpen,
  onClose,
  onGuardar,
}) => {
  const [id, setId] = useState('');
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [direccion, setDireccion] = useState('');
  const [guardando, setGuardando] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id.trim() || !nombre.trim()) return alert('Completa RIF y Nombre');

    setGuardando(true);
    try {
      await onGuardar({
        id: id.trim(),
        nombre: nombre.trim(),
        telefono: telefono.trim(),
        direccion: direccion.trim(),
      });
      setId('');
      setNombre('');
      setTelefono('');
      setDireccion('');
      onClose();
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-950/80 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-md border border-gray-200">
        <h3 className="text-lg font-bold text-gray-800 mb-4">
          👥 Registrar Proveedor
        </h3>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase mb-1">
              RIF / Cédula:
            </label>
            <input
              type="text"
              value={id}
              onChange={(e) => setId(e.target.value)}
              required
              placeholder="Ej: J-12345678-9"
              className="w-full border border-gray-300 p-2 rounded-lg text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase mb-1">
              Nombre / Razón Social:
            </label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
              placeholder="Ej: Distribuidora Alimentos C.A."
              className="w-full border border-gray-300 p-2 rounded-lg text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase mb-1">
              Teléfono:
            </label>
            <input
              type="text"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              placeholder="Ej: 0414-1234567"
              className="w-full border border-gray-300 p-2 rounded-lg text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase mb-1">
              Dirección:
            </label>
            <input
              type="text"
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
              placeholder="Dirección del proveedor..."
              className="w-full border border-gray-300 p-2 rounded-lg text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 mt-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-xs font-bold rounded-lg cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow cursor-pointer flex items-center gap-1"
            >
              {guardando ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <span>Guardar</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// =========================================================================
// 6. MODAL NUEVA CUENTA POR PAGAR (CXP)
// =========================================================================
interface ModalNuevaCXPProps {
  isOpen: boolean;
  onClose: () => void;
  proveedores: Proveedor[];
  tasaBCV: number;
  onGuardar: (cxp: any) => Promise<void>;
}

export const ModalNuevaCXP: React.FC<ModalNuevaCXPProps> = ({
  isOpen,
  onClose,
  proveedores,
  tasaBCV,
  onGuardar,
}) => {
  const [idProveedor, setIdProveedor] = useState('');
  const [nroFactura, setNroFactura] = useState('');
  const [montoUSD, setMontoUSD] = useState('');
  const [concepto, setConcepto] = useState('');
  const [guardando, setGuardando] = useState(false);

  if (!isOpen) return null;

  const usdNum = parseFloat(montoUSD) || 0;
  const montoBsVal = usdNum * tasaBCV;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idProveedor) return alert('Selecciona un proveedor.');
    const prov = proveedores.find((p) => p.id === idProveedor);

    setGuardando(true);
    try {
      await onGuardar({
        idProveedor,
        proveedor: prov ? prov.nombre : 'Proveedor',
        nroFactura: nroFactura.trim(),
        montoTotalUSD: usdNum,
        montoTotalBs: montoBsVal,
        concepto: concepto.trim(),
      });
      setIdProveedor('');
      setNroFactura('');
      setMontoUSD('');
      setConcepto('');
      onClose();
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-950/80 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-lg border border-gray-200">
        <h3 className="text-lg font-bold text-gray-800 mb-4">
          ➕ Registrar Deuda / Compras a Crédito
        </h3>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase mb-1">
              Proveedor:
            </label>
            <select
              value={idProveedor}
              onChange={(e) => setIdProveedor(e.target.value)}
              required
              className="w-full border border-gray-300 p-2 rounded-lg text-xs bg-white font-bold"
            >
              <option value="">-- Selecciona un proveedor --</option>
              {proveedores.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre} ({p.id})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase mb-1">
                N° Factura / Control:
              </label>
              <input
                type="text"
                value={nroFactura}
                onChange={(e) => setNroFactura(e.target.value)}
                required
                placeholder="Ej: FAC-00123"
                className="w-full border border-gray-300 p-2 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase mb-1">
                Monto Total ($):
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={montoUSD}
                onChange={(e) => setMontoUSD(e.target.value)}
                required
                placeholder="100.00"
                className="w-full border border-gray-300 p-2 rounded-lg text-xs font-bold"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase mb-1">
              Monto Equiv. Bs (Tasa BCV):
            </label>
            <input
              type="text"
              readOnly
              value={formatearBS(montoBsVal)}
              className="w-full border border-gray-200 bg-gray-100 p-2 rounded-lg text-xs font-bold text-gray-700"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase mb-1">
              Concepto / Descripción:
            </label>
            <input
              type="text"
              value={concepto}
              onChange={(e) => setConcepto(e.target.value)}
              required
              placeholder="Ej: Compra de víveres al mayor"
              className="w-full border border-gray-300 p-2 rounded-lg text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 mt-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-xs font-bold rounded-lg cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow cursor-pointer flex items-center gap-1"
            >
              {guardando ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <span>Registrar Deuda</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// =========================================================================
// 7. MODAL ABONAR CXP (PAGO A PROVEEDOR)
// =========================================================================
interface ModalAbonarCXPProps {
  isOpen: boolean;
  onClose: () => void;
  cxp: CuentaPorPagar | null;
  tasaBCV: number;
  onGuardarAbono: (abono: any) => Promise<void>;
}

export const ModalAbonarCXP: React.FC<ModalAbonarCXPProps> = ({
  isOpen,
  onClose,
  cxp,
  tasaBCV,
  onGuardarAbono,
}) => {
  const [montoUSD, setMontoUSD] = useState('');
  const [metodo, setMetodo] = useState('Transferencia Bs');
  const [referencia, setReferencia] = useState('');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (isOpen && cxp) {
      setMontoUSD(cxp.saldoPendienteUSD.toString());
      setReferencia('');
    }
  }, [isOpen, cxp]);

  if (!isOpen || !cxp) return null;

  const usdNum = parseFloat(montoUSD) || 0;
  const montoBsVal = usdNum * tasaBCV;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (usdNum > cxp.saldoPendienteUSD + 0.05) {
      alert('El monto a abonar no puede ser mayor al saldo pendiente.');
      return;
    }

    setGuardando(true);
    try {
      await onGuardarAbono({
        idCXP: cxp.idCXP,
        montoUSD: usdNum,
        montoBs: montoBsVal,
        metodoPago: metodo,
        referencia: referencia.trim() || 'N/A',
      });
      onClose();
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-950/80 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-md border border-gray-200">
        <h3 className="text-lg font-bold text-gray-800 mb-2">
          💵 Registrar Pago a Proveedor
        </h3>
        <p className="text-xs text-blue-700 font-bold mb-4 bg-blue-50 p-2.5 rounded-lg border border-blue-200">
          Proveedor: {cxp.proveedor} | Saldo Pendiente:{' '}
          {formatearUSD(cxp.saldoPendienteUSD)}
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase mb-1">
              Monto Abono ($):
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={montoUSD}
              onChange={(e) => setMontoUSD(e.target.value)}
              required
              placeholder="50.00"
              className="w-full border border-gray-300 p-2 rounded-lg text-xs font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase mb-1">
              Monto Equiv. (Bs):
            </label>
            <input
              type="text"
              readOnly
              value={formatearBS(montoBsVal)}
              className="w-full border border-gray-200 bg-gray-100 p-2 rounded-lg text-xs font-bold text-gray-700"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase mb-1">
              Método de Pago:
            </label>
            <select
              value={metodo}
              onChange={(e) => setMetodo(e.target.value)}
              className="w-full border border-gray-300 p-2 rounded-lg text-xs bg-white font-semibold"
            >
              <option value="Transferencia Bs">Transferencia Bs</option>
              <option value="Pago Móvil">Pago Móvil</option>
              <option value="Efectivo $">Efectivo ($)</option>
              <option value="Efectivo Bs">Efectivo (Bs)</option>
              <option value="Zelle">Zelle</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase mb-1">
              N° Referencia / Comprobante:
            </label>
            <input
              type="text"
              value={referencia}
              onChange={(e) => setReferencia(e.target.value)}
              placeholder="Ej: 123456"
              className="w-full border border-gray-300 p-2 rounded-lg text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 mt-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-xs font-bold rounded-lg cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg shadow cursor-pointer flex items-center gap-1"
            >
              {guardando ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <span>Registrar Pago</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// =========================================================================
// 8. MODAL CÁMARA BARCODE / QR SCANNER
// =========================================================================
interface ModalCamaraProps {
  isOpen: boolean;
  onClose: () => void;
  onScanExitoso: (codigo: string) => void;
  destino: 'pos' | 'inventario';
}

export const ModalCamara: React.FC<ModalCamaraProps> = ({
  isOpen,
  onClose,
  onScanExitoso,
  destino,
}) => {
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    if (isOpen) {
      const qrRegionId = 'readerCamara';
      const scanner = new Html5Qrcode(qrRegionId);
      scannerRef.current = scanner;

      scanner
        .start(
          { facingMode: 'environment' },
          { fps: 15, qrbox: { width: 250, height: 160 } },
          (decodedText) => {
            const codigo = decodedText.trim();
            onScanExitoso(codigo);
            if (scannerRef.current) {
              scannerRef.current
                .stop()
                .then(() => scannerRef.current?.clear())
                .catch(() => {});
            }
            onClose();
          },
          () => {}
        )
        .catch((err) => {
          console.warn('Error al iniciar cámara:', err);
        });

      return () => {
        if (scannerRef.current) {
          scannerRef.current
            .stop()
            .then(() => scannerRef.current?.clear())
            .catch(() => {});
        }
      };
    }
  }, [isOpen, onScanExitoso, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/90 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col border border-slate-300">
        <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-blue-400" />
            <div>
              <h3 className="font-bold text-sm leading-tight">
                Escáner de Código de Barras
              </h3>
              <p className="text-[10px] text-slate-400">
                {destino === 'pos'
                  ? 'Apunta al producto para agregarlo al carrito'
                  : 'Apunta para capturar código de producto'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 font-bold text-xl cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="relative bg-black min-h-[260px] max-h-[320px] flex items-center justify-center overflow-hidden">
          <div id="readerCamara" style={{ width: '100%', height: '100%' }} />
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col gap-2.5">
          <div className="text-xs text-center text-slate-600 font-medium py-1">
            💡 Centra el código de barras o QR en la pantalla.
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold py-3 rounded-xl shadow cursor-pointer transition active:scale-98"
          >
            Cerrar Escáner
          </button>
        </div>
      </div>
    </div>
  );
};

// =========================================================================
// 9. MODAL COLA DE SINCRONIZACIÓN OFFLINE
// =========================================================================
interface ModalColaSincronizacionProps {
  isOpen: boolean;
  onClose: () => void;
  queue: SyncQueueItem[];
  isOnline: boolean;
  isSyncing: boolean;
  syncProgress?: { current: number; total: number; desc: string } | null;
  onSincronizarAhora: () => Promise<void>;
  onLimpiarCola: () => void;
  onEliminarItem: (id: string) => void;
}

export const ModalColaSincronizacion: React.FC<ModalColaSincronizacionProps> = ({
  isOpen,
  onClose,
  queue,
  isOnline,
  isSyncing,
  syncProgress,
  onSincronizarAhora,
  onLimpiarCola,
  onEliminarItem,
}) => {
  if (!isOpen) return null;

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'REGISTRAR_VENTA':
        return <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">Venta</span>;
      case 'ANULAR_VENTA':
        return <span className="bg-rose-100 text-rose-800 text-[10px] font-bold px-2 py-0.5 rounded-full">Anulación</span>;
      case 'REGISTRAR_ABONO':
        return <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full">Abono Cobranza</span>;
      case 'GUARDAR_TASA_BCV':
        return <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">Tasa BCV</span>;
      case 'REGISTRAR_CXP':
      case 'ABONAR_CXP':
        return <span className="bg-purple-100 text-purple-800 text-[10px] font-bold px-2 py-0.5 rounded-full">CXP</span>;
      default:
        return <span className="bg-slate-100 text-slate-800 text-[10px] font-bold px-2 py-0.5 rounded-full">{action}</span>;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col border border-slate-200 max-h-[90vh]">
        {/* Header */}
        <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600/30 rounded-xl text-blue-400 border border-blue-500/30">
              {isOnline ? <Cloud className="w-6 h-6" /> : <CloudOff className="w-6 h-6 text-amber-400" />}
            </div>
            <div>
              <h3 className="font-bold text-base flex items-center gap-2">
                Cola de Sincronización Offline
                <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 ${
                  isOnline ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/40' : 'bg-amber-950 text-amber-400 border border-amber-500/40'
                }`}>
                  {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                  {isOnline ? 'En línea' : 'Sin conexión'}
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                {queue.length} movimiento(s) guardado(s) localmente en este dispositivo
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sync in progress indicator */}
        {isSyncing && syncProgress && (
          <div className="bg-blue-50 border-b border-blue-200 p-3.5 flex flex-col gap-2">
            <div className="flex justify-between items-center text-xs font-bold text-blue-900">
              <span className="flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
                Sincronizando con Google Sheets ({syncProgress.current}/{syncProgress.total})...
              </span>
              <span>{Math.round((syncProgress.current / syncProgress.total) * 100)}%</span>
            </div>
            <div className="w-full bg-blue-200 h-2 rounded-full overflow-hidden">
              <div
                className="bg-blue-600 h-full transition-all duration-300 rounded-full"
                style={{ width: `${(syncProgress.current / syncProgress.total) * 100}%` }}
              />
            </div>
            <div className="text-[11px] text-blue-700 truncate">
              {syncProgress.desc}
            </div>
          </div>
        )}

        {/* Content list */}
        <div className="p-4 overflow-y-auto flex-1 divide-y divide-slate-100">
          {queue.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mb-3">
                <Check className="w-7 h-7" />
              </div>
              <h4 className="font-bold text-slate-800 text-base">¡Todo está al día!</h4>
              <p className="text-xs text-slate-500 max-w-sm mt-1">
                No hay movimientos pendientes de sincronización. Todos los datos están actualizados en Google Sheets.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="text-xs font-semibold text-slate-500 mb-1 flex justify-between">
                <span>Movimientos almacenados localmente:</span>
                <span>{queue.length} pendientes</span>
              </div>
              {queue.map((item) => (
                <div
                  key={item.id}
                  className="bg-slate-50 border border-slate-200 hover:border-blue-300 rounded-xl p-3 flex items-start justify-between gap-3 transition"
                >
                  <div className="flex flex-col gap-1 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {getActionBadge(item.action)}
                      <span className="text-[11px] text-slate-400 font-mono">
                        {item.timestamp}
                      </span>
                      {item.intentos > 0 && (
                        <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded">
                          {item.intentos} intento(s)
                        </span>
                      )}
                      {item.status === 'failed' && (
                        <span className="text-[10px] bg-rose-100 text-rose-700 font-bold px-1.5 py-0.2 rounded flex items-center gap-1">
                          <AlertTriangle className="w-2.5 h-2.5" /> Reintentar
                        </span>
                      )}
                    </div>
                    <div className="font-bold text-xs text-slate-800">
                      {item.descripcion}
                    </div>
                    {item.error && (
                      <div className="text-[11px] text-rose-600 bg-rose-50 p-1.5 rounded border border-rose-200 mt-1">
                        Motivo: {item.error}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      if (confirm(`¿Descartar "${item.descripcion}" de la cola?`)) {
                        onEliminarItem(item.id);
                      }
                    }}
                    className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-white transition cursor-pointer"
                    title="Descartar de la cola"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="text-xs text-slate-500">
            {isOnline
              ? '🟢 Al presionar "Sincronizar", se registrarán en Google Sheets.'
              : '🟠 No hay conexión a internet. Los datos se sincronizarán en cuanto vuelva la red.'}
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {queue.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  if (confirm('¿Estás seguro de vaciar toda la cola de sincronización?')) {
                    onLimpiarCola();
                  }
                }}
                disabled={isSyncing}
                className="px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
              >
                Vaciar Cola
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition cursor-pointer"
            >
              Cerrar
            </button>
            <button
              type="button"
              onClick={onSincronizarAhora}
              disabled={isSyncing || queue.length === 0 || !isOnline}
              className="flex-1 sm:flex-none px-4 py-2.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-xl shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar Ahora'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// =========================================================================
// 10. COMPONENTE TICKET TÉRMICO IMPRIMIBLE
// =========================================================================
interface TicketTermicoProps {
  venta: Sale | null;
}

export const TicketTermico: React.FC<TicketTermicoProps> = ({ venta }) => {
  if (!venta) return null;

  let itemsHtml: { nombre: string; cantidad: number; precioBs: number }[] = [];
  if (venta.items && Array.isArray(venta.items) && venta.items.length > 0) {
    itemsHtml = venta.items.map((i) => ({
      nombre: i.nombre || i.codigo || 'Item',
      cantidad: i.cantidad,
      precioBs: i.precioBs || 0,
    }));
  }

  return (
    <div id="ticketTermicoContainer" className="hidden">
      <div style={{ textAlign: 'center', marginBottom: '4px' }}>
        <h2 style={{ fontSize: '14px', fontWeight: 'bold', margin: '0' }}>
          iMtec POS
        </h2>
        <p style={{ fontSize: '9px', margin: '1px 0' }}>RIF: J-XXXXXXXX-X</p>
        <p style={{ fontSize: '9px', margin: '1px 0' }}>Venezuela</p>
      </div>

      <div style={{ borderBottom: '1px dashed #000', margin: '4px 0' }} />

      <div style={{ fontSize: '10px', marginBottom: '4px', lineHeight: 1.2 }}>
        <div>
          <strong>Ticket #:</strong> <span>{venta.idVenta}</span>
        </div>
        <div>
          <strong>Fecha:</strong>{' '}
          <span>{formatearFechaLatina(venta.fecha)}</span>
        </div>
        <div>
          <strong>Vendedor:</strong> <span>{venta.vendedor || 'Admin'}</span>
        </div>
        <div>
          <strong>Cliente:</strong>{' '}
          <span>{venta.clienteNombre || 'Cliente General'}</span>
        </div>
        <div>
          <strong>Tipo:</strong> <span>{venta.tipo || 'Contado'}</span>
        </div>
      </div>

      <div style={{ borderBottom: '1px dashed #000', margin: '4px 0' }} />

      <table
        style={{ width: '100%', fontSize: '10px', borderCollapse: 'collapse' }}
      >
        <thead>
          <tr style={{ borderBottom: '1px dashed #000' }}>
            <th style={{ textAlign: 'left', paddingBottom: '2px' }}>
              Descripción
            </th>
            <th style={{ textAlign: 'right', paddingBottom: '2px' }}>
              Total Bs
            </th>
          </tr>
        </thead>
        <tbody>
          {itemsHtml.length > 0 ? (
            itemsHtml.map((item, idx) => (
              <React.Fragment key={idx}>
                <tr>
                  <td
                    colSpan={2}
                    style={{ paddingTop: '2px', fontWeight: 'bold' }}
                  >
                    {item.nombre}
                  </td>
                </tr>
                <tr>
                  <td style={{ color: '#444' }}>
                    {item.cantidad} x {formatearBS(item.precioBs)}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {formatearBS(item.precioBs * item.cantidad)}
                  </td>
                </tr>
              </React.Fragment>
            ))
          ) : (
            <tr>
              <td colSpan={2}>{venta.detalle || 'Detalle de compra'}</td>
            </tr>
          )}
        </tbody>
      </table>

      <div style={{ borderBottom: '1px dashed #000', margin: '4px 0' }} />

      <div style={{ fontSize: '10px', lineHeight: 1.3 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>TOTAL USD:</span>
          <span>{formatearUSD(venta.totalUSD)}</span>
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontWeight: 'bold',
            fontSize: '11px',
          }}
        >
          <span>TOTAL BS:</span>
          <span>{formatearBS(venta.totalBS)}</span>
        </div>
      </div>

      <div style={{ borderBottom: '1px dashed #000', margin: '4px 0' }} />

      <div style={{ textAlign: 'center', fontSize: '9px', marginTop: '5px' }}>
        <p style={{ margin: '1px 0' }}>¡Gracias por su compra!</p>
        <p style={{ margin: '1px 0' }}>iMtec POS - Control de Ventas</p>
      </div>
    </div>
  );
};
