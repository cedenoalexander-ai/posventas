import React, { useState, useMemo } from 'react';
import { Sale, User } from '../types';
import {
  formatearBS,
  formatearUSD,
  formatearFechaLatina,
  parsearFechaVenta,
  esFechaDeHoy,
} from '../utils/formatters';
import { apiAnularSale } from '../services/api';
import {
  Receipt,
  Search,
  Calendar,
  Eye,
  Printer,
  XCircle,
  RefreshCw,
  Trash2,
} from 'lucide-react';

interface SalesViewProps {
  ventas: Sale[];
  usuario: User | null;
  onActualizarDatos: () => void;
  onVerDetalle: (venta: Sale) => void;
  onImprimirTicket: (venta: Sale) => void;
}

export const SalesView: React.FC<SalesViewProps> = ({
  ventas,
  usuario,
  onActualizarDatos,
  onVerDetalle,
  onImprimirTicket,
}) => {
  const [filtroTexto, setFiltroTexto] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'Contado' | 'Crédito'>('todos');
  const [filtroEstado, setFiltroEstado] = useState<'activas' | 'anuladas' | 'todas'>('activas');

  const esAdmin =
    usuario &&
    ((usuario.role || usuario.roll || '').toLowerCase().trim() === 'admin');

  // Filtrado de ventas
  const ventasFiltradas = useMemo(() => {
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

    return ventas.filter((v) => {
      const cTipo =
        filtroTipo === 'todos' ||
        (v.tipo || '').toLowerCase() === filtroTipo.toLowerCase();

      const texto = filtroTexto.toLowerCase().trim();
      const cTexto =
        !texto ||
        (v.idVenta || '').toLowerCase().includes(texto) ||
        (v.clienteNombre || '').toLowerCase().includes(texto) ||
        (v.vendedor || '').toLowerCase().includes(texto) ||
        (v.desglosePago || '').toLowerCase().includes(texto);

      let cEstado = true;
      if (filtroEstado === 'activas') cEstado = v.estado !== 'Anulada';
      else if (filtroEstado === 'anuladas') cEstado = v.estado === 'Anulada';

      let cFecha = true;
      if (dIni || dFin) {
        const fObj = parsearFechaVenta(v.fecha);
        if (fObj) {
          if (dIni && fObj < dIni) cFecha = false;
          if (dFin && fObj > dFin) cFecha = false;
        }
      }

      return cTipo && cTexto && cEstado && cFecha;
    });
  }, [ventas, filtroTexto, fechaInicio, fechaFin, filtroTipo, filtroEstado]);

  // Totales
  const ventasActivas = useMemo(
    () => ventasFiltradas.filter((v) => v.estado !== 'Anulada'),
    [ventasFiltradas]
  );
  const totalUSD = useMemo(
    () => ventasActivas.reduce((acc, v) => acc + (Number(v.totalUSD) || 0), 0),
    [ventasActivas]
  );
  const totalBS = useMemo(
    () => ventasActivas.reduce((acc, v) => acc + (Number(v.totalBS) || 0), 0),
    [ventasActivas]
  );
  const cantContado = useMemo(
    () => ventasActivas.filter((v) => v.tipo === 'Contado').length,
    [ventasActivas]
  );
  const cantCredito = useMemo(
    () => ventasActivas.filter((v) => v.tipo === 'Crédito').length,
    [ventasActivas]
  );

  const handleLimpiarFiltros = () => {
    setFiltroTexto('');
    setFechaInicio('');
    setFechaFin('');
    setFiltroTipo('todos');
    setFiltroEstado('activas');
  };

  const handleAnularVenta = async (venta: Sale) => {
    if (!esAdmin) {
      alert('⚠️ Solo los administradores pueden anular ventas.');
      return;
    }
    if (venta.estado === 'Anulada') {
      alert('Esta venta ya se encuentra anulada.');
      return;
    }
    if (!esFechaDeHoy(venta.fecha)) {
      alert(
        '⚠️ Acción denegada: Solo se pueden anular ventas realizadas el día de hoy (fecha de sistema en curso).'
      );
      return;
    }

    const motivo = prompt(
      `¿Está seguro de anular la venta ${venta.idVenta}?\n\nAl anularse se devolverá el stock vendido al inventario.\n\nIngrese el motivo de la anulación:`,
      'Error en cobro / Devolución'
    );
    if (motivo === null) return;

    const motivoFinal = motivo.trim() || 'Anulada por administrador';

    let itemsDevolver: any[] = [];
    if (Array.isArray(venta.items) && venta.items.length > 0) {
      itemsDevolver = venta.items;
    } else if (venta.detalle) {
      const partes = venta.detalle.split(',');
      partes.forEach((p) => {
        const m = p
          .trim()
          .match(/^(\d+(?:\.\d+)?)\s*x\s*(.+?)(?:\s*\(\s*\$[\d.]+\s*\))?$/i);
        if (m) {
          itemsDevolver.push({
            cantidad: parseFloat(m[1]) || 0,
            nombre: m[2].trim(),
          });
        }
      });
    }

    try {
      const res = await apiAnularSale({
        idVenta: venta.idVenta,
        motivo: motivoFinal,
        usuario: usuario?.nombre || 'Admin',
        items: itemsDevolver,
      });

      alert(
        `✅ Venta ${venta.idVenta} ANULADA con éxito.\nEl stock fue reincorporado al inventario.`
      );
      onActualizarDatos();
    } catch (err) {
      alert('Error al comunicarse con el servidor para anular.');
    }
  };

  return (
    <div className="flex-1 p-4 sm:p-6 overflow-y-auto flex flex-col gap-4 max-w-7xl mx-auto w-full">
      {/* Resumen Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-xl shadow-xs border border-gray-200">
          <span className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase">
            Total Ventas
          </span>
          <span className="text-xl sm:text-2xl font-black text-blue-600 block mt-0.5">
            {ventasActivas.length}
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-xl shadow-xs border border-gray-200">
          <span className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase">
            Total Facturado (USD)
          </span>
          <span className="text-xl sm:text-2xl font-black text-emerald-600 block mt-0.5">
            {formatearUSD(totalUSD)}
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-xl shadow-xs border border-gray-200 col-span-2 sm:col-span-1">
          <span className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase">
            Total Facturado (Bs.)
          </span>
          <span className="text-xl sm:text-2xl font-black text-emerald-700 block mt-0.5">
            {formatearBS(totalBS)}
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-xl shadow-xs border border-gray-200 col-span-2 sm:col-span-1 flex items-center justify-between">
          <div>
            <span className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase block">
              Modalidad
            </span>
            <div className="flex gap-1.5 mt-1 text-[10px] font-bold">
              <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded">
                Contado: {cantContado}
              </span>
              <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded">
                Crédito: {cantCredito}
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
                placeholder="🔍 Buscar por ticket #, cliente, vendedor, ref..."
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

            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value as any)}
              className="border border-gray-300 p-1.5 rounded-lg text-xs bg-white font-medium cursor-pointer"
            >
              <option value="todos">Todos los pagos</option>
              <option value="Contado">Solo Contado</option>
              <option value="Crédito">Solo Crédito</option>
            </select>

            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value as any)}
              className="border border-gray-300 p-1.5 rounded-lg text-xs bg-white font-medium cursor-pointer"
            >
              <option value="todas">Todas (Activas y Anuladas)</option>
              <option value="activas">Solo Activas</option>
              <option value="anuladas">Solo Anuladas</option>
            </select>

            <button
              type="button"
              onClick={handleLimpiarFiltros}
              title="Limpiar filtros"
              className="bg-gray-100 hover:bg-gray-200 text-gray-600 border border-gray-300 px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer"
            >
              🧹
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

      {/* Sales Table */}
      <div className="bg-white rounded-xl shadow-xs border border-gray-200 overflow-hidden flex-1">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gray-100 text-gray-600 uppercase border-b border-gray-200 text-[11px]">
                <th className="p-3 font-bold">Ticket #</th>
                <th className="p-3 font-bold">Fecha</th>
                <th className="p-3 font-bold">Cliente</th>
                <th className="p-3 font-bold">Vendedor</th>
                <th className="p-3 font-bold text-center">Tipo</th>
                <th className="p-3 font-bold">Desglose de Pago</th>
                <th className="p-3 font-bold text-right">USD</th>
                <th className="p-3 font-bold text-right">Bs.</th>
                <th className="p-3 font-bold text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {ventasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-gray-400">
                    No se encontraron ventas registradas para este filtro
                  </td>
                </tr>
              ) : (
                ventasFiltradas.map((v) => {
                  const esAnulada = v.estado === 'Anulada';
                  const esDeHoy = esFechaDeHoy(v.fecha);
                  const puedeAnular = !esAnulada && esAdmin && esDeHoy;

                  let tituloAnular = 'Anular Venta y Devolver Stock';
                  if (!esAdmin) tituloAnular = 'Solo Administrador puede anular ventas';
                  else if (!esDeHoy)
                    tituloAnular =
                      'Solo se pueden anular ventas del día en curso';

                  return (
                    <tr
                      key={v.idVenta}
                      className={`hover:bg-blue-50 border-b border-gray-100 transition ${
                        esAnulada ? 'bg-red-50/50 opacity-75' : ''
                      }`}
                    >
                      <td
                        className={`p-2.5 font-mono font-bold ${
                          esAnulada ? 'text-red-700 line-through' : 'text-blue-700'
                        }`}
                      >
                        {v.idVenta}
                        {v.isOfflinePending && (
                          <span className="ml-1 text-[9px] bg-amber-100 text-amber-900 border border-amber-300 px-1.5 py-0.2 rounded-full font-bold uppercase">
                            Offline
                          </span>
                        )}
                        {esAnulada && (
                          <span className="ml-1 text-[9px] bg-red-100 text-red-700 px-1 rounded font-bold uppercase">
                            Anulada
                          </span>
                        )}
                      </td>
                      <td className="p-2.5 text-gray-600 text-[11px] whitespace-nowrap">
                        {formatearFechaLatina(v.fecha)}
                      </td>
                      <td className="p-2.5 font-bold text-gray-800">
                        {v.clienteNombre || 'Cliente General'}
                      </td>
                      <td className="p-2.5 text-gray-700">
                        {v.vendedor || 'N/A'}
                      </td>
                      <td className="p-2.5 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                            v.tipo === 'Contado'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {v.tipo}
                        </span>
                      </td>
                      <td className="p-2.5 text-[11px] text-gray-600">
                        {v.desglosePago ||
                          (v.tipo === 'Crédito'
                            ? 'Pendiente por cobrar'
                            : 'Contado')}
                        {esAnulada && v.motivoAnulacion && (
                          <div className="text-[10px] text-red-600 font-semibold mt-0.5">
                            Motivo: {v.motivoAnulacion}
                          </div>
                        )}
                      </td>
                      <td
                        className={`p-2.5 text-right font-bold ${
                          esAnulada
                            ? 'text-gray-400 line-through'
                            : 'text-gray-900'
                        }`}
                      >
                        {formatearUSD(v.totalUSD)}
                      </td>
                      <td
                        className={`p-2.5 text-right font-bold ${
                          esAnulada
                            ? 'text-gray-400 line-through'
                            : 'text-emerald-700'
                        } whitespace-nowrap`}
                      >
                        {formatearBS(v.totalBS)}
                      </td>
                      <td className="p-2.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => onVerDetalle(v)}
                            title="Ver detalle de productos"
                            className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-2 py-1 rounded text-xs font-bold cursor-pointer transition flex items-center gap-0.5"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Ver</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => onImprimirTicket(v)}
                            title="Reimprimir Ticket"
                            className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs cursor-pointer shadow transition"
                          >
                            <Printer className="w-3 h-3" />
                          </button>

                          {!esAnulada && (
                            <button
                              type="button"
                              onClick={() => handleAnularVenta(v)}
                              disabled={!puedeAnular}
                              title={tituloAnular}
                              className={`px-2 py-1 rounded text-xs font-bold transition flex items-center gap-0.5 ${
                                puedeAnular
                                  ? 'bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 cursor-pointer'
                                  : 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed opacity-50'
                              }`}
                            >
                              <XCircle className="w-3 h-3" />
                              <span>Anular</span>
                            </button>
                          )}
                        </div>
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
