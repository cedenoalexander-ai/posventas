import React, { useState, useEffect } from 'react';
import { Product } from '../types';
import { formatearBS, formatearUSD } from '../utils/formatters';
import { apiSaveProduct, apiDeleteProduct } from '../services/api';
import {
  Package,
  Camera,
  Search,
  Edit2,
  Trash2,
  Lock,
  TrendingUp,
  Loader2,
} from 'lucide-react';

interface ProductsViewProps {
  productos: Product[];
  tasaBCV: number;
  onActualizarDatos: () => void;
  onAbrirCamara: (destino: 'pos' | 'inventario') => void;
}

export const ProductsView: React.FC<ProductsViewProps> = ({
  productos,
  tasaBCV,
  onActualizarDatos,
  onAbrirCamara,
}) => {
  const [modoEdicion, setModoEdicion] = useState(false);
  const [codigo, setCodigo] = useState('');
  const [nombre, setNombre] = useState('');
  const [monedaCosto, setMonedaCosto] = useState<'Divisas' | 'Bs' | 'Precio Fijo'>('Divisas');
  const [costo, setCosto] = useState<string>('10.00');
  const [unidadesEmpaque, setUnidadesEmpaque] = useState<string>('1');
  const [impuesto, setImpuesto] = useState<string>('0.00');
  const [porcentajeGanar, setPorcentajeGanar] = useState<string>('30.00');
  const [precioSugerido, setPrecioSugerido] = useState<string>('0.00');
  const [precioRealDivisas, setPrecioRealDivisas] = useState<string>('1.50');
  const [precioBs, setPrecioBs] = useState<string>('75.00');
  const [stock, setStock] = useState<string>('20');
  const [busqueda, setBusqueda] = useState('');
  const [guardando, setGuardando] = useState(false);

  // Proyecciones calculadas
  const [proyecciones, setProyecciones] = useState({
    gananciaUnidadUSD: 0,
    gananciaUnidadBs: 0,
    gananciaEmpaqueUSD: 0,
    gananciaEmpaqueBs: 0,
    costoUnitarioUSD: 0,
    costoUnitarioBs: 0,
    precioVentaUSD: 0,
    precioVentaBs: 0,
  });

  // Recalcular fórmulas
  useEffect(() => {
    const c = Math.max(0, parseFloat(costo) || 0);
    const u = Math.max(1, parseFloat(unidadesEmpaque) || 1);
    const imp = Math.max(0, parseFloat(impuesto) || 0);
    const gan = parseFloat(porcentajeGanar) || 0;
    const tasa = tasaBCV > 0 ? tasaBCV : 1;

    const CostoxEmp_Impuesto = c * (1 + imp / 100);

    let sugDivisa = 0;
    let sugBs = 0;
    let costoUnitarioUSD = 0;
    let costoUnitarioBs = 0;

    if (monedaCosto === 'Precio Fijo') {
      const costoBsxUnid = CostoxEmp_Impuesto / u;
      sugBs =
        gan < 100 && gan >= 0
          ? costoBsxUnid / (1 - gan / 100)
          : costoBsxUnid * (1 + gan / 100);
      sugDivisa = tasa > 0 ? sugBs / tasa : sugBs;

      costoUnitarioBs = costoBsxUnid;
      costoUnitarioUSD = tasa > 0 ? costoUnitarioBs / tasa : costoUnitarioBs;
      setPrecioSugerido(sugDivisa.toFixed(2));
    } else {
      costoUnitarioUSD =
        monedaCosto === 'Divisas'
          ? CostoxEmp_Impuesto / u
          : CostoxEmp_Impuesto / u / tasa;
      costoUnitarioBs = costoUnitarioUSD * tasa;

      sugDivisa =
        gan < 100 && gan >= 0
          ? costoUnitarioUSD / (1 - gan / 100)
          : costoUnitarioUSD * (1 + gan / 100);
      sugBs = sugDivisa * tasa;
      setPrecioSugerido(sugDivisa.toFixed(2));
    }

    // Precio Real efectivo
    let pRealUSD = parseFloat(precioRealDivisas) || sugDivisa || 0;
    let pBsFinal = parseFloat(precioBs) || pRealUSD * tasa;

    if (monedaCosto === 'Precio Fijo') {
      pBsFinal = parseFloat(precioBs) || sugBs;
      pRealUSD = tasa > 0 ? pBsFinal / tasa : pRealUSD;
    }

    const gUnidadUSD = pRealUSD - costoUnitarioUSD;
    const gUnidadBs = pBsFinal - costoUnitarioBs;

    setProyecciones({
      gananciaUnidadUSD: gUnidadUSD,
      gananciaUnidadBs: gUnidadBs,
      gananciaEmpaqueUSD: gUnidadUSD * u,
      gananciaEmpaqueBs: gUnidadBs * u,
      costoUnitarioUSD,
      costoUnitarioBs,
      precioVentaUSD: pRealUSD,
      precioVentaBs: pBsFinal,
    });
  }, [
    costo,
    unidadesEmpaque,
    impuesto,
    porcentajeGanar,
    precioRealDivisas,
    precioBs,
    monedaCosto,
    tasaBCV,
  ]);

  const handleCambioPrecioRealDivisas = (val: string) => {
    setPrecioRealDivisas(val);
    if (monedaCosto !== 'Precio Fijo') {
      const pUSD = parseFloat(val) || 0;
      setPrecioBs((pUSD * tasaBCV).toFixed(2));
    }
  };

  const handleCambioPrecioBs = (val: string) => {
    setPrecioBs(val);
    if (monedaCosto === 'Precio Fijo') {
      const pBs = parseFloat(val) || 0;
      const tasa = tasaBCV > 0 ? tasaBCV : 1;
      setPrecioRealDivisas((pBs / tasa).toFixed(2));
    }
  };

  const prepararEdicion = (p: Product) => {
    setModoEdicion(true);
    setCodigo(p.Codigo);
    setNombre(p.Nombre);
    const mon = (p.incluir_Costo_en_Bs_o_Divisas as any) || 'Divisas';
    setMonedaCosto(mon);
    setCosto(p.Costo?.toString() || '0');
    setUnidadesEmpaque((p.unidadesxEmpaque || 1).toString());
    setImpuesto((p.Impuesto || 0).toString());
    setPorcentajeGanar((p.Porcentaje_a_Ganar || 30).toString());
    setStock((p.Stock || 0).toString());

    if (mon === 'Precio Fijo') {
      setPrecioBs((p.PrecioBs || 0).toString());
      const usdCalc =
        tasaBCV > 0
          ? ((Number(p.PrecioBs) || 0) / tasaBCV).toFixed(2)
          : (p.Precio || 0).toString();
      setPrecioRealDivisas(usdCalc);
    } else {
      const pUSD = (p.PrecioVtaRealDivisas || p.Precio || 0).toString();
      setPrecioRealDivisas(pUSD);
      setPrecioBs(((Number(pUSD) || 0) * tasaBCV).toFixed(2));
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelarEdicion = () => {
    setModoEdicion(false);
    setCodigo('');
    setNombre('');
    setMonedaCosto('Divisas');
    setCosto('10.00');
    setUnidadesEmpaque('1');
    setImpuesto('0.00');
    setPorcentajeGanar('30.00');
    setPrecioRealDivisas('1.50');
    setPrecioBs('75.00');
    setStock('20');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codigo.trim() || !nombre.trim()) {
      alert('Por favor ingresa código y nombre.');
      return;
    }

    setGuardando(true);
    let pRealUSD = parseFloat(precioRealDivisas) || 0;
    let pBsFinal = parseFloat(precioBs) || 0;

    if (monedaCosto === 'Precio Fijo') {
      pBsFinal = parseFloat(precioBs) || 0;
      pRealUSD = tasaBCV > 0 ? pBsFinal / tasaBCV : pRealUSD;
    } else {
      pBsFinal = pRealUSD * tasaBCV;
    }

    try {
      const res = await apiSaveProduct(
        {
          codigo: codigo.trim(),
          nombre: nombre.trim(),
          incluir_Costo_en_Bs_o_Divisas: monedaCosto,
          costo: parseFloat(costo) || 0,
          unidadesxEmpaque: parseFloat(unidadesEmpaque) || 1,
          impuesto: parseFloat(impuesto) || 0,
          porcentajeGanar: parseFloat(porcentajeGanar) || 0,
          precioVtaRealDivisas: Number(pRealUSD.toFixed(2)),
          precio: Number(pRealUSD.toFixed(2)),
          precioBs: Number(pBsFinal.toFixed(2)),
          stock: parseFloat(stock) || 0,
        },
        modoEdicion
      );

      if (res && res.status === 'error') {
        alert('Error: ' + (res.message || 'No se pudo guardar el producto.'));
      } else {
        alert(
          modoEdicion
            ? '¡Producto modificado con éxito!'
            : '¡Producto registrado con éxito!'
        );
        cancelarEdicion();
        onActualizarDatos();
      }
    } catch (err) {
      alert('Error de comunicación con Google Apps Script.');
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminar = async (cod: string) => {
    if (!confirm(`¿Estás seguro de eliminar el producto ${cod}?`)) return;
    try {
      await apiDeleteProduct(cod);
      alert('Producto eliminado.');
      onActualizarDatos();
    } catch (err) {
      alert('Error al eliminar producto.');
    }
  };

  const productosFiltrados = productos.filter((p) => {
    const q = busqueda.toLowerCase().trim();
    if (!q) return true;
    return (
      (p.Nombre || '').toLowerCase().includes(q) ||
      (p.Codigo || '').toString().toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex-1 p-4 sm:p-6 overflow-y-auto flex flex-col lg:flex-row gap-4 max-w-7xl mx-auto w-full">
      {/* Formulario de Registro / Modificación */}
      <div className="w-full lg:w-3/5 bg-white p-4 sm:p-6 rounded-2xl shadow-xs border border-gray-200 flex flex-col gap-4">
        <div className="flex justify-between items-center border-b border-gray-200 pb-3">
          <div>
            <h2 className="text-base sm:text-lg font-black text-gray-800 flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-600" />
              <span>
                {modoEdicion
                  ? '✏️ Modificar Producto'
                  : '📦 Registrar Producto - iMtec'}
              </span>
            </h2>
            <p className="text-[11px] text-gray-500">
              Cálculos automáticos con tasa oficial BCV
            </p>
          </div>
          <span className="text-xs bg-blue-50 text-blue-800 border border-blue-200 font-bold px-2.5 py-1 rounded-full">
            Tasa: {formatearBS(tasaBCV)}
          </span>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase mb-1 flex justify-between items-center">
                <span>Código:</span>
                <span className="text-[10px] text-blue-600 normal-case font-semibold">
                  Escanear o escribir
                </span>
              </label>
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value)}
                  required
                  placeholder="Ej: 7591234567890"
                  className="w-full border border-gray-300 p-2 pr-24 rounded-lg text-xs font-mono font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <button
                  type="button"
                  onClick={() => onAbrirCamara('inventario')}
                  className="absolute right-1 top-1 bottom-1 bg-blue-600 hover:bg-blue-700 text-white px-2.5 rounded-md text-xs font-bold flex items-center gap-1 shadow cursor-pointer transition active:scale-95"
                >
                  <Camera className="w-3 h-3" />
                  <span>Escanear</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase mb-1">
                Nombre / Descripción:
              </label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                required
                placeholder="Ej: Harina PAN 1kg"
                className="w-full border border-gray-300 p-2 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          {/* Bloque Moneda Costo & Base */}
          <div className="bg-blue-50/60 p-3 rounded-xl border border-blue-200 flex flex-col gap-2">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-gray-700 uppercase mb-1">
                  Moneda Costo:
                </label>
                <select
                  value={monedaCosto}
                  onChange={(e) =>
                    setMonedaCosto(e.target.value as any)
                  }
                  className="w-full border border-gray-300 p-1.5 rounded-lg text-xs font-bold bg-white"
                >
                  <option value="Divisas">💵 Divisas ($)</option>
                  <option value="Bs">🇻🇪 Bs (Bolívares)</option>
                  <option value="Precio Fijo">🔒 Precio Fijo</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-700 uppercase mb-1">
                  {monedaCosto === 'Divisas'
                    ? 'Costo Base ($):'
                    : 'Costo Base (Bs):'}
                </label>
                <input
                  type="number"
                  step="0.0001"
                  min="0"
                  value={costo}
                  onChange={(e) => setCosto(e.target.value)}
                  required
                  placeholder="10.00"
                  className="w-full border border-gray-300 p-1.5 rounded-lg text-xs font-bold bg-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-700 uppercase mb-1">
                  Unid. x Empaque:
                </label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  value={unidadesEmpaque}
                  onChange={(e) => setUnidadesEmpaque(e.target.value)}
                  required
                  className="w-full border border-gray-300 p-1.5 rounded-lg text-xs font-bold bg-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-700 uppercase mb-1">
                  Impuesto (%):
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={impuesto}
                  onChange={(e) => setImpuesto(e.target.value)}
                  className="w-full border border-gray-300 p-1.5 rounded-lg text-xs font-bold bg-white"
                />
              </div>
            </div>

            {monedaCosto === 'Precio Fijo' && (
              <div className="bg-amber-100 border border-amber-300 text-amber-900 px-3 py-1.5 rounded-lg text-[11px] font-semibold mt-1 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" />
                <span>
                  <strong>Precio Fijo:</strong> El precio en Bolívares (Bs.) se
                  mantendrá fijo y no variará cuando cambie la tasa del dólar.
                </span>
              </div>
            )}
          </div>

          {/* Bloque Precios de Venta & Ganancia */}
          <div className="bg-emerald-50/60 p-3 rounded-xl border border-emerald-200 flex flex-col gap-2">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-gray-700 uppercase mb-1">
                  % Ganancia:
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={porcentajeGanar}
                  onChange={(e) => setPorcentajeGanar(e.target.value)}
                  className="w-full border border-gray-300 p-1.5 rounded-lg text-xs font-bold bg-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-700 uppercase mb-1">
                  Precio Sug. ($):
                </label>
                <input
                  type="number"
                  step="0.0001"
                  value={precioSugerido}
                  readOnly
                  className="w-full border border-gray-200 bg-gray-100 p-1.5 rounded-lg text-xs font-bold text-gray-700"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-emerald-900 uppercase mb-1">
                  Precio Real ($):
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={precioRealDivisas}
                  onChange={(e) =>
                    handleCambioPrecioRealDivisas(e.target.value)
                  }
                  required
                  placeholder="1.50"
                  className="w-full border-2 border-emerald-500 p-1.5 rounded-lg text-xs font-black text-emerald-900 bg-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-emerald-900 uppercase mb-1 flex items-center justify-between">
                  <span>Precio Real (Bs):</span>
                  {monedaCosto === 'Precio Fijo' && (
                    <span className="text-[8px] bg-amber-200 text-amber-900 px-1 rounded font-bold">
                      Editable
                    </span>
                  )}
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={precioBs}
                  readOnly={monedaCosto !== 'Precio Fijo'}
                  onChange={(e) => handleCambioPrecioBs(e.target.value)}
                  required
                  placeholder="75.00"
                  className={`w-full p-1.5 rounded-lg text-xs font-black ${
                    monedaCosto === 'Precio Fijo'
                      ? 'border-2 border-amber-500 text-amber-950 bg-white'
                      : 'border border-emerald-300 text-emerald-800 bg-emerald-100'
                  }`}
                />
              </div>
            </div>

            <div className="w-full sm:w-1/3">
              <label className="block text-[10px] font-bold text-gray-700 uppercase mb-1">
                Stock (Unidades):
              </label>
              <input
                type="number"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                required
                placeholder="20"
                className="w-full border border-gray-300 p-1.5 rounded-lg text-xs font-bold bg-white"
              />
            </div>
          </div>

          {/* Panel Informativo de Proyección de Ganancias */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50/50 p-3.5 rounded-xl border border-blue-200 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-black text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-blue-700" />
                <span>Proyección Informativa de Ganancia</span>
              </span>
              <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full border border-blue-200">
                Solo informativo
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Ganancia por Unidad */}
              <div className="bg-white p-2.5 rounded-lg border border-blue-100 shadow-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold text-gray-600 uppercase">
                    Ganancia x Unidad
                  </span>
                  <span className="text-[9px] text-gray-400 font-medium">
                    1 unidad
                  </span>
                </div>
                <div className="flex items-baseline justify-between gap-2">
                  <div className="flex flex-col">
                    <span className="text-[9px] text-gray-500 font-semibold">
                      En Divisas:
                    </span>
                    <span
                      className={`text-sm font-black ${
                        proyecciones.gananciaUnidadUSD >= 0
                          ? 'text-emerald-600'
                          : 'text-rose-600'
                      }`}
                    >
                      {proyecciones.gananciaUnidadUSD >= 0 ? '+' : ''}
                      {formatearUSD(proyecciones.gananciaUnidadUSD)}
                    </span>
                  </div>
                  <div className="flex flex-col text-right">
                    <span className="text-[9px] text-gray-500 font-semibold">
                      En Bolívares:
                    </span>
                    <span
                      className={`text-xs font-black ${
                        proyecciones.gananciaUnidadBs >= 0
                          ? 'text-emerald-700'
                          : 'text-rose-700'
                      }`}
                    >
                      {proyecciones.gananciaUnidadBs >= 0 ? '+' : ''}
                      {formatearBS(proyecciones.gananciaUnidadBs)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Ganancia por Empaque */}
              <div className="bg-white p-2.5 rounded-lg border border-blue-100 shadow-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold text-gray-600 uppercase">
                    Ganancia x Empaque
                  </span>
                  <span className="text-[9px] text-indigo-700 bg-indigo-50 font-bold px-1.5 py-0.5 rounded">
                    {unidadesEmpaque} unidades
                  </span>
                </div>
                <div className="flex items-baseline justify-between gap-2">
                  <div className="flex flex-col">
                    <span className="text-[9px] text-gray-500 font-semibold">
                      En Divisas:
                    </span>
                    <span
                      className={`text-sm font-black ${
                        proyecciones.gananciaEmpaqueUSD >= 0
                          ? 'text-indigo-600'
                          : 'text-rose-600'
                      }`}
                    >
                      {proyecciones.gananciaEmpaqueUSD >= 0 ? '+' : ''}
                      {formatearUSD(proyecciones.gananciaEmpaqueUSD)}
                    </span>
                  </div>
                  <div className="flex flex-col text-right">
                    <span className="text-[9px] text-gray-500 font-semibold">
                      En Bolívares:
                    </span>
                    <span
                      className={`text-xs font-black ${
                        proyecciones.gananciaEmpaqueBs >= 0
                          ? 'text-indigo-700'
                          : 'text-rose-700'
                      }`}
                    >
                      {proyecciones.gananciaEmpaqueBs >= 0 ? '+' : ''}
                      {formatearBS(proyecciones.gananciaEmpaqueBs)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-2 pt-2 border-t border-blue-100 flex flex-wrap justify-between items-center text-[10px] text-gray-500">
              <span>
                Costo real unitario:{' '}
                <strong>{formatearUSD(proyecciones.costoUnitarioUSD)}</strong> (
                {formatearBS(proyecciones.costoUnitarioBs)})
              </span>
              <span>
                Precio venta:{' '}
                <strong>{formatearUSD(proyecciones.precioVentaUSD)}</strong> (
                {formatearBS(proyecciones.precioVentaBs)})
              </span>
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={guardando}
              className="flex-1 bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-bold py-3 rounded-xl shadow transition text-xs sm:text-sm cursor-pointer flex items-center justify-center gap-2"
            >
              {guardando ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Procesando...</span>
                </>
              ) : (
                <span>
                  {modoEdicion
                    ? '💾 Guardar Cambios'
                    : '💾 Registrar Producto'}
                </span>
              )}
            </button>

            {modoEdicion && (
              <button
                type="button"
                onClick={cancelarEdicion}
                className="bg-gray-400 hover:bg-gray-500 text-white font-bold px-4 py-3 rounded-xl transition text-xs cursor-pointer"
              >
                Cancelar
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Right Column: Catalog Listing & Quick Edit/Delete */}
      <div className="w-full lg:w-2/5 bg-white p-4 sm:p-6 rounded-2xl shadow-xs border border-gray-200 flex flex-col max-h-[75vh]">
        <h2 className="text-sm font-black text-gray-800 border-b border-gray-200 pb-2 mb-2 flex items-center justify-between">
          <span>Catálogo de Productos</span>
          <span className="text-xs text-blue-600 font-bold">
            {productosFiltrados.length} items
          </span>
        </h2>
        <div className="relative mb-2">
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="🔍 Buscar producto por nombre o código..."
            className="w-full border border-gray-300 p-2 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        <div className="flex flex-col gap-2 overflow-y-auto flex-1">
          {productosFiltrados.length === 0 ? (
            <div className="p-8 text-center text-xs text-gray-400">
              No hay productos coincidentes
            </div>
          ) : (
            productosFiltrados.map((p) => {
              const precioUSD =
                Number(p.PrecioVtaRealDivisas || p.Precio) || 0;
              const precioBsVal =
                p.incluir_Costo_en_Bs_o_Divisas === 'Precio Fijo'
                  ? Number(p.PrecioBs) || 0
                  : Number(p.PrecioBs) || precioUSD * tasaBCV;

              return (
                <div
                  key={p.Codigo}
                  className="border border-gray-200 p-2.5 rounded-xl flex justify-between items-center bg-gray-50 text-xs hover:border-blue-300 transition"
                >
                  <div className="flex-1 mr-2">
                    <div className="font-bold text-gray-800 flex items-center gap-1.5 flex-wrap">
                      <span>{p.Nombre}</span>
                      {p.incluir_Costo_en_Bs_o_Divisas === 'Precio Fijo' && (
                        <span className="bg-amber-100 text-amber-900 text-[9px] font-bold px-1.5 py-0.2 rounded border border-amber-300">
                          🔒 Fijo
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-gray-500 font-mono mt-0.5">
                      Cód: {p.Codigo} | Stock: {p.Stock}
                    </div>
                    <div className="font-bold text-emerald-700 text-xs mt-0.5">
                      {formatearUSD(precioUSD)} ({formatearBS(precioBsVal)})
                    </div>
                  </div>

                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => prepararEdicion(p)}
                      className="bg-amber-500 hover:bg-amber-600 text-white p-1.5 rounded-lg cursor-pointer transition"
                      title="Modificar producto"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleEliminar(p.Codigo)}
                      className="bg-red-600 hover:bg-red-700 text-white p-1.5 rounded-lg cursor-pointer transition"
                      title="Eliminar producto"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
