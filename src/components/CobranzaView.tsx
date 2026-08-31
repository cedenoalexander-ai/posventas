import React, { useState, useMemo } from 'react';
import { Sale, Abono } from '../types';
import {
  formatearBS,
  formatearUSD,
  formatearFechaLatina,
  parsearFechaVenta,
  normalizarId,
} from '../utils/formatters';
import {
  DollarSign,
  Search,
  Calendar,
  Eye,
  PlusCircle,
  RefreshCw,
  Clock,
} from 'lucide-react';

interface CobranzaViewProps {
  ventas: Sale[];
  abonos: Abono[];
  tasaBCV: number;
  onActualizarDatos: () => void;
  onAbrirModalAbono: (idVenta: string, deudaRestanteUSD: number) => void;
  onAbrirHistorialAbonos: (venta: Sale) => void;
}

export const CobranzaView: React.FC<CobranzaViewProps> = ({
  ventas,
  abonos,
  tasaBCV,
  onActualizarDatos,
  onAbrirModalAbono,
  onAbrirHistorialAbonos,
}) => {
  const [filtroTexto, setFiltroTexto] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');

  // Créditos activos
  const creditosConDeuda = useMemo(() => {
    const todosCreditos = ventas.filter(
      (v) => v.tipo === 'Crédito' && v.estado !== 'Anulada'
    );

    return todosCreditos.map((venta) => {
      const vIdNorm = normalizarId(venta.idVenta);
      const abonosVenta = abonos.filter((a) => {
        const aNorm = normalizarId(a.idVenta);
        return (
          aNorm === vIdNorm ||
          (a.idVenta || '').toString().trim().toLowerCase() ===
            (venta.idVenta || '').toString().trim().toLowerCase()
        );
      });

      const totalAbonadoUSD = abonosVenta.reduce(
        (sum, a) => sum + (Number(a.montoUSD) || 0),
        0
      );
      const totalUSD = Number(venta.totalUSD) || 0;
      const deudaRestanteUSD = Math.max(0, totalUSD - totalAbonadoUSD);
      const deudaRestanteBS = deudaRestanteUSD * tasaBCV;

      return {
        ...venta,
        totalAbonadoUSD,
        deudaRestanteUSD,
        deudaRestanteBS,
        tieneAbonos: abonosVenta.length > 0,
      };
    });
  }, [ventas, abonos, tasaBCV]);

  // Filtrado
  const creditosFiltrados = useMemo(() => {
    let dIni = fechaInicio
      ? new Date(
          parseInt(fechaInicio.split('-')[0], 10),
          parseInt(fechaInicio.split('-')[1], 10) - 1,
          parseInt(fechaInicio.split('-')[2], 10),
          0,
          0,
          0
        )
      : null;
    let dFin = fechaFin
      ? new Date(
          parseInt(fechaFin.split('-')[0], 10),
          parseInt(fechaFin.split('-')[1], 10) - 1,
          parseInt(fechaFin.split('-')[2], 10),
          23,
          59,
          59
        )
      : null;

    return creditosConDeuda.filter((c) => {
      if (c.deudaRestanteUSD <= 0.001) return false;

      const query = filtroTexto.toLowerCase().trim();
      const coincideTexto =
        !query ||
        (c.idVenta || '').toLowerCase().includes(query) ||
        (c.clienteNombre || '').toLowerCase().includes(query) ||
        (c.clienteId || '').toLowerCase().includes(query);

      let coincideFecha = true;
      if (dIni || dFin) {
        const fObj = parsearFechaVenta(c.fecha);
        if (fObj) {
          if (dIni && fObj < dIni) coincideFecha = false;
          if (dFin && fObj > dFin) coincideFecha = false;
        }
      }

      return coincideTexto && coincideFecha;
    });
  }, [creditosConDeuda, filtroTexto, fechaInicio, fechaFin]);

  // Totales
  const deudaGeneralUSD = useMemo(
    () =>
      creditosConDeuda.reduce(
        (acc, c) => (c.deudaRestanteUSD > 0.001 ? acc + c.deudaRestanteUSD : acc),
        0
      ),
    [creditosConDeuda]
  );
  const deudaGeneralBS = deudaGeneralUSD * tasaBCV;

  const totalFiltradoUSD = useMemo(
    () => creditosFiltrados.reduce((acc, c) => acc + c.deudaRestanteUSD, 0),
    [creditosFiltrados]
  );
  const totalFiltradoBS = totalFiltradoUSD * tasaBCV;

  const hayFiltroActivo = Boolean(filtroTexto || fechaInicio || fechaFin);

  const handleLimpiarFiltros = () => {
    setFiltroTexto('');
    setFechaInicio('');
    setFechaFin('');
  };

  return (
    <div className="flex-1 p-4 sm:p-6 overflow-y-auto flex flex-col gap-4 max-w-7xl mx-auto w-full">
      {/* Banner Resumen Cobranza */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-4 sm:p-6 rounded-2xl shadow-xl border border-blue-800/40">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span
                className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                  hayFiltroActivo
                    ? 'bg-amber-400 text-slate-950'
                    : 'bg-emerald-400 text-slate-950'
                }`}
              >
                {hayFiltroActivo
                  ? 'FILTRO ACTIVO'
                  : 'SALDO PENDIENTE GENERAL'}
              </span>
              <span className="text-xs text-blue-200 font-medium">
                {creditosFiltrados.length} ticket(s) pendiente(s)
              </span>
            </div>
            <h2 className="text-lg sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
              <DollarSign className="w-6 h-6 text-amber-400" />
              <span>Cuentas por Cobrar (Créditos)</span>
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-xl">
              Suma total pendiente de todos los clientes a crédito calculada a
              tasa oficial BCV ({formatearBS(tasaBCV)}).
            </p>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-baseline gap-4 bg-slate-800/80 border border-blue-400/20 p-3 sm:p-4 rounded-xl">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                {hayFiltroActivo ? 'Filtrado en Divisas ($)' : 'Total en Divisas ($)'}
              </span>
              <span className="text-2xl sm:text-3xl font-black text-amber-400 tracking-tight">
                {formatearUSD(hayFiltroActivo ? totalFiltradoUSD : deudaGeneralUSD)}
              </span>
            </div>
            <div className="h-8 w-px bg-slate-700 hidden sm:block"></div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                {hayFiltroActivo ? 'Filtrado en Bolívares (Bs.)' : 'Total en Bolívares (Bs.)'}
              </span>
              <span className="text-2xl sm:text-3xl font-black text-emerald-400 tracking-tight">
                {formatearBS(hayFiltroActivo ? totalFiltradoBS : deudaGeneralBS)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-3.5 rounded-xl shadow-xs border border-gray-200 flex flex-col gap-2.5">
        <div className="flex flex-col lg:flex-row gap-2 items-center justify-between">
          <div className="w-full lg:w-1/3">
            <div className="relative flex items-center">
              <Search className="absolute left-2.5 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={filtroTexto}
                onChange={(e) => setFiltroTexto(e.target.value)}
                placeholder="🔍 Buscar por cliente (nombre, cédula) o ticket #..."
                className="w-full border border-gray-300 p-2 pl-8 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full lg:w-auto">
            <div className="flex items-center gap-1 bg-gray-50 border border-gray-300 px-2 py-1 rounded-lg">
              <label className="text-[10px] font-bold text-gray-500 uppercase">
                Desde:
              </label>
              <input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="text-xs bg-transparent outline-none font-semibold text-gray-700 cursor-pointer"
              />
            </div>

            <div className="flex items-center gap-1 bg-gray-50 border border-gray-300 px-2 py-1 rounded-lg">
              <label className="text-[10px] font-bold text-gray-500 uppercase">
                Hasta:
              </label>
              <input
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                className="text-xs bg-transparent outline-none font-semibold text-gray-700 cursor-pointer"
              />
            </div>

            <button
              type="button"
              onClick={handleLimpiarFiltros}
              title="Limpiar filtros"
              className="bg-gray-100 hover:bg-gray-200 text-gray-600 border border-gray-300 px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer"
            >
              🧹 Limpiar
            </button>

            <button
              type="button"
              onClick={onActualizarDatos}
              className="bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Actualizar</span>
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-xs border border-gray-200 overflow-hidden flex-1">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gray-100 text-gray-600 uppercase border-b border-gray-200 text-[11px]">
                <th className="p-3 font-bold">Ticket #</th>
                <th className="p-3 font-bold">Fecha</th>
                <th className="p-3 font-bold">Cliente</th>
                <th className="p-3 font-bold text-right">Total Factura</th>
                <th className="p-3 font-bold text-right">Abonado ($)</th>
                <th className="p-3 font-bold text-right text-red-600">Deuda ($)</th>
                <th className="p-3 font-bold text-right text-emerald-700">Deuda (Bs.)</th>
                <th className="p-3 font-bold text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {creditosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-gray-400">
                    No hay deudas pendientes para esta búsqueda o rango de fecha.
                  </td>
                </tr>
              ) : (
                creditosFiltrados.map((v) => (
                  <tr
                    key={v.idVenta}
                    className="hover:bg-blue-50 border-b border-gray-100 transition"
                  >
                    <td className="p-3 font-mono font-bold text-blue-700">
                      {v.idVenta}
                    </td>
                    <td className="p-3 text-gray-600 whitespace-nowrap">
                      {formatearFechaLatina(v.fecha)}
                    </td>
                    <td className="p-3">
                      <div className="font-bold text-gray-800">
                        {v.clienteNombre || 'Cliente General'}
                      </div>
                      <div className="text-[10px] text-gray-400 font-mono">
                        {v.clienteId || ''}
                      </div>
                    </td>
                    <td className="p-3 text-right font-medium text-gray-700">
                      {formatearUSD(v.totalUSD)}
                    </td>
                    <td className="p-3 text-right font-medium text-emerald-700">
                      {formatearUSD(v.totalAbonadoUSD)}
                    </td>
                    <td className="p-3 text-right font-black text-red-600 bg-red-50/40 text-sm">
                      {formatearUSD(v.deudaRestanteUSD)}
                    </td>
                    <td className="p-3 text-right font-black text-emerald-700 bg-emerald-50/40 whitespace-nowrap text-sm">
                      {formatearBS(v.deudaRestanteBS)}
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onAbrirHistorialAbonos(v)}
                          title={
                            v.tieneAbonos
                              ? 'Ver historial de abonos'
                              : 'Ver abonos del ticket'
                          }
                          className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-2.5 py-1.5 rounded-lg shadow-xs font-bold text-xs transition flex items-center gap-1 cursor-pointer active:scale-95"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Abonos</span>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            onAbrirModalAbono(v.idVenta, v.deudaRestanteUSD)
                          }
                          title="Registrar nuevo abono"
                          className="bg-green-600 hover:bg-green-700 active:scale-95 text-white px-2.5 py-1.5 rounded-lg shadow font-bold text-xs cursor-pointer transition flex items-center gap-1"
                        >
                          <PlusCircle className="w-3 h-3" />
                          <span>Abonar</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
