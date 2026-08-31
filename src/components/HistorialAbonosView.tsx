import React, { useState, useMemo } from 'react';
import { Abono, Sale } from '../types';
import {
  formatearBS,
  formatearUSD,
  formatearFechaCorta,
  parsearFechaVenta,
  normalizarId,
} from '../utils/formatters';
import { apiDeleteAbono } from '../services/api';
import { BookOpen, Search, Calendar, Trash2, RefreshCw } from 'lucide-react';

interface HistorialAbonosViewProps {
  abonos: Abono[];
  ventas: Sale[];
  tasaBCV: number;
  onActualizarDatos: () => void;
}

export const HistorialAbonosView: React.FC<HistorialAbonosViewProps> = ({
  abonos,
  ventas,
  tasaBCV,
  onActualizarDatos,
}) => {
  const [filtroTexto, setFiltroTexto] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');

  const abonosFiltrados = useMemo(() => {
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

    return abonos.filter((a) => {
      const vNorm = normalizarId(a.idVenta);
      const venta =
        ventas.find((v) => normalizarId(v.idVenta) === vNorm) || ({} as any);

      const clienteNombre = (venta.clienteNombre || '').toLowerCase();
      const ticketId = (a.idVenta || '').toLowerCase();
      const ref = (a.referencia || '').toLowerCase();
      const q = filtroTexto.toLowerCase().trim();

      const cumpleTexto =
        !q ||
        ticketId.includes(q) ||
        clienteNombre.includes(q) ||
        ref.includes(q);

      let cumpleFecha = true;
      if (dIni || dFin) {
        const fechaCorta = (a.fecha || '').split(' ')[0];
        const fObj = parsearFechaVenta(fechaCorta);
        if (fObj) {
          if (dIni && fObj < dIni) cumpleFecha = false;
          if (dFin && fObj > dFin) cumpleFecha = false;
        }
      }

      return cumpleTexto && cumpleFecha;
    });
  }, [abonos, ventas, filtroTexto, fechaInicio, fechaFin]);

  const handleEliminarAbono = async (idAbono: string) => {
    if (
      !confirm(
        '⚠️ ¿Estás seguro de eliminar este abono?\n\nAl eliminarlo, la deuda del cliente volverá a subir automáticamente en la sección de cobranzas.'
      )
    )
      return;

    try {
      const res = await apiDeleteAbono(idAbono);
      if (res && res.status === 'error') {
        alert('Error: ' + res.message);
      } else {
        alert('✅ Abono eliminado con éxito.');
        onActualizarDatos();
      }
    } catch (err) {
      alert('Error al procesar la eliminación en el servidor.');
    }
  };

  const handleLimpiarFiltros = () => {
    setFiltroTexto('');
    setFechaInicio('');
    setFechaFin('');
  };

  return (
    <div className="flex-1 p-4 sm:p-6 overflow-y-auto flex flex-col gap-4 max-w-7xl mx-auto w-full">
      {/* Header & Filter Bar */}
      <div className="bg-white p-3.5 rounded-xl shadow-xs border border-gray-200 flex flex-col gap-2.5">
        <h2 className="text-lg font-black text-gray-800 border-b border-gray-100 pb-2 mb-1 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-blue-600" />
          <span>📚 Historial General de Abonos</span>
        </h2>

        <div className="flex flex-col lg:flex-row gap-2 items-center justify-between">
          <div className="w-full lg:w-1/3">
            <div className="relative flex items-center">
              <Search className="absolute left-2.5 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={filtroTexto}
                onChange={(e) => setFiltroTexto(e.target.value)}
                placeholder="🔍 Buscar por ticket o cliente..."
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
                <th className="p-3 font-bold">Fecha</th>
                <th className="p-3 font-bold">Ticket #</th>
                <th className="p-3 font-bold">Cliente</th>
                <th className="p-3 font-bold">Ref / Método</th>
                <th className="p-3 font-bold text-right">Abono ($)</th>
                <th className="p-3 font-bold text-right">Abono (Bs.)</th>
                <th className="p-3 font-bold text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {abonosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-400">
                    No se encontraron abonos para esta búsqueda.
                  </td>
                </tr>
              ) : (
                abonosFiltrados.map((a) => {
                  const vNorm = normalizarId(a.idVenta);
                  const venta =
                    ventas.find((v) => normalizarId(v.idVenta) === vNorm) ||
                    ({} as any);
                  const clienteStr = venta.clienteNombre || 'Cliente General';
                  const montoUSD = Number(a.montoUSD) || 0;
                  const montoBs =
                    Number(a.montoBs) ||
                    montoUSD * (Number(a.tasa) || tasaBCV);

                  return (
                    <tr
                      key={a.idAbono}
                      className="hover:bg-blue-50 border-b border-gray-100 transition"
                    >
                      <td className="p-3 text-gray-600 whitespace-nowrap">
                        {formatearFechaCorta(a.fecha)}
                      </td>
                      <td className="p-3 font-mono font-bold text-blue-700">
                        {a.idVenta}
                      </td>
                      <td className="p-3 font-bold text-gray-800">
                        {clienteStr}
                      </td>
                      <td className="p-3 text-gray-700">
                        {a.referencia || '-'}
                      </td>
                      <td className="p-3 text-right font-black text-emerald-600">
                        {formatearUSD(montoUSD)}
                      </td>
                      <td className="p-3 text-right font-black text-emerald-800 whitespace-nowrap">
                        {formatearBS(montoBs)}
                      </td>
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleEliminarAbono(a.idAbono)}
                          title="Eliminar este abono"
                          className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-2.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition flex items-center gap-1 mx-auto"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Eliminar</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
