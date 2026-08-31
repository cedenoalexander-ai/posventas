import React, { useState } from 'react';
import { Proveedor, CuentaPorPagar } from '../types';
import {
  formatearBS,
  formatearUSD,
  formatearFechaCorta,
} from '../utils/formatters';
import { TrendingDown, Users, PlusCircle, DollarSign, CheckCircle } from 'lucide-react';

interface CxpViewProps {
  proveedores: Proveedor[];
  cxpList: CuentaPorPagar[];
  tasaBCV: number;
  onAbrirModalProveedor: () => void;
  onAbrirModalNuevaCXP: () => void;
  onAbrirModalAbonarCXP: (cxp: CuentaPorPagar) => void;
}

export const CxpView: React.FC<CxpViewProps> = ({
  proveedores,
  cxpList,
  tasaBCV,
  onAbrirModalProveedor,
  onAbrirModalNuevaCXP,
  onAbrirModalAbonarCXP,
}) => {
  const totalDeudaUSD = cxpList.reduce((acc, c) => {
    if (c.estado === 'PENDIENTE') {
      return acc + (Number(c.saldoPendienteUSD) || 0);
    }
    return acc;
  }, 0);

  const totalDeudaBS = totalDeudaUSD * tasaBCV;

  return (
    <div className="flex-1 p-4 sm:p-6 overflow-y-auto max-w-7xl mx-auto w-full flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-2xl shadow-xs border border-gray-200">
        <div>
          <h2 className="text-xl font-black text-gray-800 flex items-center gap-2">
            <TrendingDown className="w-6 h-6 text-blue-600" />
            <span>📉 Cuentas por Pagar a Proveedores</span>
          </h2>
          <p className="text-xs text-gray-500">
            Gestión de facturas a crédito, compras pendientes y pagos a proveedores.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onAbrirModalProveedor}
            className="bg-gray-800 hover:bg-gray-900 active:scale-95 text-white text-xs font-bold px-3.5 py-2.5 rounded-xl shadow cursor-pointer transition flex items-center gap-1.5"
          >
            <Users className="w-3.5 h-3.5" />
            <span>Nuevo Proveedor</span>
          </button>

          <button
            type="button"
            onClick={onAbrirModalNuevaCXP}
            className="bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold px-3.5 py-2.5 rounded-xl shadow cursor-pointer transition flex items-center gap-1.5"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Nueva Deuda / Factura</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex justify-between items-center shadow-xs">
          <div>
            <p className="text-xs font-bold text-amber-800 uppercase">
              Total Por Pagar (USD)
            </p>
            <p className="text-2xl font-black text-amber-900">
              {formatearUSD(totalDeudaUSD)}
            </p>
          </div>
          <span className="text-3xl">💵</span>
        </div>

        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex justify-between items-center shadow-xs">
          <div>
            <p className="text-xs font-bold text-emerald-800 uppercase">
              Total Por Pagar (Bs - BCV)
            </p>
            <p className="text-2xl font-black text-emerald-900">
              {formatearBS(totalDeudaBS)}
            </p>
          </div>
          <span className="text-3xl">🇻🇪</span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white p-4 rounded-2xl shadow-xs border border-gray-200">
        <h3 className="font-bold text-gray-700 mb-3 text-sm flex items-center justify-between">
          <span>Facturas y Deudas Pendientes</span>
          <span className="text-xs text-gray-400 font-normal">
            {cxpList.length} registro(s)
          </span>
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gray-100 text-gray-700 border-b border-gray-200">
                <th className="p-2.5">Fecha</th>
                <th className="p-2.5">Proveedor</th>
                <th className="p-2.5">N° Factura</th>
                <th className="p-2.5">Concepto</th>
                <th className="p-2.5 text-right">Total ($)</th>
                <th className="p-2.5 text-right">Saldo ($)</th>
                <th className="p-2.5 text-right">Saldo (Bs)</th>
                <th className="p-2.5 text-center">Estado</th>
                <th className="p-2.5 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {cxpList.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center p-8 text-gray-400">
                    No hay cuentas por pagar registradas.
                  </td>
                </tr>
              ) : (
                cxpList.map((c) => {
                  const saldoUSD = Number(c.saldoPendienteUSD || 0);
                  const montoTotalUSD = Number(c.montoTotalUSD || 0);
                  const saldoBs = saldoUSD * tasaBCV;
                  const esPendiente = c.estado === 'PENDIENTE';

                  return (
                    <tr
                      key={c.idCXP}
                      className="border-b border-gray-100 hover:bg-blue-50/50 transition"
                    >
                      <td className="p-2.5 text-gray-600 whitespace-nowrap">
                        {formatearFechaCorta(c.fecha)}
                      </td>
                      <td className="p-2.5 font-bold text-gray-800">
                        {c.proveedor || 'General'}
                      </td>
                      <td className="p-2.5 font-mono text-blue-700 font-bold">
                        {c.nroFactura || '-'}
                      </td>
                      <td className="p-2.5 text-gray-700">{c.concepto || '-'}</td>
                      <td className="p-2.5 text-right font-semibold text-gray-700">
                        {formatearUSD(montoTotalUSD)}
                      </td>
                      <td className="p-2.5 text-right font-black text-red-600">
                        {formatearUSD(saldoUSD)}
                      </td>
                      <td className="p-2.5 text-right font-black text-slate-800 whitespace-nowrap">
                        {formatearBS(saldoBs)}
                      </td>
                      <td className="p-2.5 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            esPendiente
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : 'bg-green-100 text-green-800 border border-green-300'
                          }`}
                        >
                          {c.estado}
                        </span>
                      </td>
                      <td className="p-2.5 text-center">
                        {esPendiente ? (
                          <button
                            type="button"
                            onClick={() => onAbrirModalAbonarCXP(c)}
                            className="bg-green-600 hover:bg-green-700 text-white font-bold px-2.5 py-1 rounded-lg text-xs shadow cursor-pointer transition active:scale-95"
                          >
                            💵 Pagar
                          </button>
                        ) : (
                          <span className="text-xs font-bold text-emerald-600 flex items-center justify-center gap-0.5">
                            <CheckCircle className="w-3 h-3" /> Saldado
                          </span>
                        )}
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
