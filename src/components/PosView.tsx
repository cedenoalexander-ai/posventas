import React, { useState } from 'react';
import { Product, Client, CartItem } from '../types';
import { formatearBS, formatearUSD } from '../utils/formatters';
import {
  Search,
  Camera,
  ShoppingCart,
  Trash2,
  Lock,
  DollarSign,
  FileText,
  User,
  X,
} from 'lucide-react';

interface PosViewProps {
  productos: Product[];
  clientes: Client[];
  carrito: CartItem[];
  clienteSeleccionado: Client | null;
  onSelectCliente: (c: Client | null) => void;
  onAddToCart: (codigo: string) => void;
  onUpdateCartQty: (index: number, qty: number) => void;
  onRemoveFromCart: (index: number) => void;
  onAbrirModalCobro: () => void;
  onProcesarCredito: () => void;
  onAbrirCamara: (destino: 'pos' | 'inventario') => void;
  proximoTicket: string;
  tasaBCV: number;
}

export const PosView: React.FC<PosViewProps> = ({
  productos,
  clientes,
  carrito,
  clienteSeleccionado,
  onSelectCliente,
  onAddToCart,
  onUpdateCartQty,
  onRemoveFromCart,
  onAbrirModalCobro,
  onProcesarCredito,
  onAbrirCamara,
  proximoTicket,
  tasaBCV,
}) => {
  const [busquedaProd, setBusquedaProd] = useState('');
  const [busquedaCli, setBusquedaCli] = useState('');
  const [mostrarDropClientes, setMostrarDropClientes] = useState(false);

  // Filtrado de productos
  const productosFiltrados = productos.filter((p) => {
    const q = busquedaProd.toLowerCase().trim();
    if (!q) return true;
    return (
      (p.Nombre || '').toLowerCase().includes(q) ||
      (p.Codigo || '').toString().toLowerCase().includes(q)
    );
  });

  // Filtrado de clientes para dropdown
  const clientesFiltrados = clientes.filter((c) => {
    const q = busquedaCli.toLowerCase().trim();
    if (!q) return true;
    return (
      (c.Nombre || '').toLowerCase().includes(q) ||
      (c.ID || '').toLowerCase().includes(q)
    );
  });

  const totalUSD = carrito.reduce(
    (acc, item) => acc + item.precio * item.cantidad,
    0
  );
  const totalBS = carrito.reduce(
    (acc, item) => acc + item.precioBs * item.cantidad,
    0
  );

  const handleKeyDownBusqueda = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const code = busquedaProd.trim();
      if (!code) return;
      const found = productos.find(
        (p) => p.Codigo.toString().toLowerCase() === code.toLowerCase()
      );
      if (found) {
        onAddToCart(found.Codigo);
        setBusquedaProd('');
      } else {
        alert('Producto no encontrado con ese código exacto.');
      }
    }
  };

  return (
    <div className="flex flex-col lg:flex-row flex-1 overflow-y-auto lg:overflow-hidden p-3 sm:p-4 gap-4 max-w-7xl mx-auto w-full">
      {/* Left Column: Product Search & Catalog */}
      <div className="w-full lg:w-3/5 flex flex-col gap-3">
        {/* Search Bar */}
        <div className="bg-white p-3 sm:p-4 rounded-xl shadow-xs border border-gray-200 flex flex-col gap-1.5">
          <label className="text-[11px] font-bold text-gray-500 uppercase flex justify-between items-center">
            <span>Escanear o Buscar Producto:</span>
            <span className="text-blue-600 font-semibold lowercase">
              {productosFiltrados.length} disponibles
            </span>
          </label>
          <div className="relative flex items-center">
            <input
              type="text"
              value={busquedaProd}
              onChange={(e) => setBusquedaProd(e.target.value)}
              onKeyDown={handleKeyDownBusqueda}
              placeholder="🔍 Escribe nombre o código de barra..."
              className="border border-gray-300 p-2.5 pl-3 pr-24 rounded-lg w-full text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            />
            <button
              type="button"
              onClick={() => onAbrirCamara('pos')}
              className="absolute right-1.5 top-1.5 bottom-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 rounded-md text-xs font-bold flex items-center gap-1.5 shadow cursor-pointer transition active:scale-95"
            >
              <Camera className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Cámara</span>
            </button>
          </div>
        </div>

        {/* Product Cards Grid */}
        <div className="bg-white p-3 sm:p-4 rounded-xl shadow-xs border border-gray-200 flex-1 overflow-y-auto max-h-[50vh] lg:max-h-[calc(100vh-210px)]">
          {productosFiltrados.length === 0 ? (
            <div className="text-center text-gray-400 py-12 text-xs flex flex-col items-center justify-center gap-2">
              <Search className="w-8 h-8 text-gray-300" />
              <span>No se encontraron productos coincidentes</span>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3">
              {productosFiltrados.map((p) => {
                const precioUSD = Number(p.PrecioVtaRealDivisas || p.Precio) || 0;
                const precioBs =
                  p.incluir_Costo_en_Bs_o_Divisas === 'Precio Fijo'
                    ? Number(p.PrecioBs) || 0
                    : Number(p.PrecioBs) || precioUSD * tasaBCV;
                const stock = Number(p.Stock) || 0;
                const sinStock = stock <= 0;

                return (
                  <div
                    key={p.Codigo}
                    onClick={() => onAddToCart(p.Codigo)}
                    className={`border border-gray-200 p-2.5 rounded-xl cursor-pointer hover:border-blue-500 hover:shadow-md bg-white transition flex flex-col justify-between active:scale-98 shadow-xs ${
                      sinStock ? 'opacity-60 bg-gray-50' : ''
                    }`}
                  >
                    <div>
                      <div className="font-bold text-gray-800 text-xs leading-tight mb-1 flex items-start justify-between gap-1">
                        <span className="line-clamp-2">{p.Nombre}</span>
                        {p.incluir_Costo_en_Bs_o_Divisas === 'Precio Fijo' && (
                          <span className="text-[8px] bg-amber-100 text-amber-900 border border-amber-300 font-bold px-1 py-0.5 rounded whitespace-nowrap flex items-center gap-0.5">
                            <Lock className="w-2.5 h-2.5" /> Fijo
                          </span>
                        )}
                      </div>
                      <div className="text-[9px] text-gray-400 font-mono">
                        Cód: {p.Codigo}
                      </div>
                    </div>

                    <div className="mt-2 border-t border-gray-100 pt-1.5 flex flex-col gap-1">
                      <div className="flex justify-between items-center">
                        <span className="text-blue-600 font-black text-xs sm:text-sm">
                          {formatearUSD(precioUSD)}
                        </span>
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                            stock > 0
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          Stock: {stock}
                        </span>
                      </div>
                      <div className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded text-center">
                        {formatearBS(precioBs)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Right Column: Shopping Cart & Checkout */}
      <div className="w-full lg:w-2/5 bg-white p-4 rounded-xl shadow-xs border border-gray-200 flex flex-col justify-between">
        <div>
          <div className="font-bold text-gray-700 border-b border-gray-200 pb-2 mb-3 text-sm flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <ShoppingCart className="w-4 h-4 text-blue-600" />
              <span>Carrito de Compras ({carrito.length})</span>
            </span>
            <span className="text-xs font-mono font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded border border-amber-300">
              Ticket: {proximoTicket}
            </span>
          </div>

          {/* Client Selector */}
          <div className="mb-3 relative">
            <label className="text-xs font-bold text-gray-600 flex items-center justify-between">
              <span>Cliente:</span>
              <span className="text-[10px] text-gray-400 font-normal">
                {clienteSeleccionado ? 'Seleccionado' : 'Opcional para contado / Obligatorio crédito'}
              </span>
            </label>

            {clienteSeleccionado ? (
              <div className="flex justify-between items-center bg-blue-50 border border-blue-300 rounded-lg p-2 mt-1">
                <span className="text-xs font-bold text-blue-900 flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-blue-600" />
                  {clienteSeleccionado.Nombre} ({clienteSeleccionado.ID})
                </span>
                <button
                  type="button"
                  onClick={() => onSelectCliente(null)}
                  className="text-red-500 hover:text-red-700 font-bold text-xs p-1 rounded hover:bg-red-50 cursor-pointer"
                  title="Quitar cliente"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="mt-1 relative">
                <input
                  type="text"
                  value={busquedaCli}
                  onChange={(e) => {
                    setBusquedaCli(e.target.value);
                    setMostrarDropClientes(true);
                  }}
                  onFocus={() => setMostrarDropClientes(true)}
                  placeholder="🔍 Buscar por nombre o Cédula/RIF..."
                  className="w-full border border-gray-300 p-2 rounded-lg text-xs bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                />

                {mostrarDropClientes && (
                  <div className="absolute left-0 right-0 bg-white border border-gray-200 rounded-b-lg shadow-xl max-h-44 overflow-y-auto z-20 mt-1">
                    {clientesFiltrados.length === 0 ? (
                      <div className="p-2.5 text-xs text-gray-400 text-center">
                        Sin resultados coincidentes
                      </div>
                    ) : (
                      clientesFiltrados.map((c) => (
                        <div
                          key={c.ID}
                          onClick={() => {
                            onSelectCliente(c);
                            setBusquedaCli('');
                            setMostrarDropClientes(false);
                          }}
                          className="p-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100 text-xs flex justify-between items-center"
                        >
                          <span className="font-bold text-gray-800">
                            {c.Nombre}
                          </span>
                          <span className="text-gray-400 font-mono text-[10px]">
                            {c.ID}
                          </span>
                        </div>
                      ))
                    )}
                    <div
                      onClick={() => setMostrarDropClientes(false)}
                      className="p-1.5 text-center text-[10px] text-gray-400 hover:text-gray-600 bg-gray-50 cursor-pointer border-t"
                    >
                      Cerrar lista
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Cart Table */}
          <div className="overflow-y-auto border border-gray-200 rounded-lg max-h-[30vh] lg:max-h-[35vh]">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-gray-100 text-gray-600 border-b border-gray-200">
                  <th className="p-2">Item</th>
                  <th className="p-2 text-center">Cant.</th>
                  <th className="p-2 text-right">Subt. (Bs)</th>
                  <th className="p-2 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {carrito.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-gray-400">
                      El carrito está vacío. Haz clic en un producto para agregarlo.
                    </td>
                  </tr>
                ) : (
                  carrito.map((item, idx) => (
                    <tr key={item.codigo + idx} className="hover:bg-gray-50">
                      <td className="py-2 px-2">
                        <div className="font-bold text-gray-800 leading-tight">
                          {item.nombre}
                        </div>
                        <div className="text-[10px] text-emerald-700">
                          {formatearBS(item.precioBs)} c/u ({formatearUSD(item.precio)})
                        </div>
                      </td>
                      <td className="py-2 text-center">
                        <input
                          type="number"
                          min="1"
                          max={item.stockMax}
                          value={item.cantidad}
                          onChange={(e) =>
                            onUpdateCartQty(idx, parseFloat(e.target.value) || 1)
                          }
                          className="w-12 text-center border border-gray-300 rounded p-1 text-xs font-bold"
                        />
                      </td>
                      <td className="py-2 text-right font-bold text-emerald-800">
                        {formatearBS(item.precioBs * item.cantidad)}
                      </td>
                      <td className="py-2 text-center">
                        <button
                          type="button"
                          onClick={() => onRemoveFromCart(idx)}
                          className="text-red-500 hover:text-red-700 font-bold p-1 cursor-pointer"
                          title="Eliminar del carrito"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Totals & Payment Buttons */}
        <div className="border-t border-gray-200 pt-3 mt-3">
          <div className="bg-slate-900 text-white p-3 rounded-xl mb-3 flex flex-col gap-1 shadow-inner">
            <div className="flex justify-between items-center text-xs text-slate-300">
              <span>Total USD:</span>
              <span className="text-base font-bold text-blue-400">
                {formatearUSD(totalUSD)}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm font-bold border-t border-slate-800 pt-1 text-emerald-400">
              <span>Total Bs:</span>
              <span className="text-xl font-black">{formatearBS(totalBS)}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onAbrirModalCobro}
              disabled={carrito.length === 0}
              className="bg-green-600 hover:bg-green-700 active:scale-95 text-white font-bold py-3.5 rounded-xl shadow transition flex items-center justify-center gap-1.5 text-xs sm:text-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <DollarSign className="w-4 h-4" />
              <span>Contado</span>
            </button>

            <button
              type="button"
              onClick={onProcesarCredito}
              disabled={carrito.length === 0}
              className="bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-bold py-3.5 rounded-xl shadow transition flex items-center justify-center gap-1.5 text-xs sm:text-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FileText className="w-4 h-4" />
              <span>Crédito</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
