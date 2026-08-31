import React, { useState } from 'react';
import { Client } from '../types';
import { apiSaveClient, apiDeleteClient } from '../services/api';
import { Users, Edit2, Trash2, Search, Loader2 } from 'lucide-react';

interface ClientesViewProps {
  clientes: Client[];
  onActualizarDatos: () => void;
}

export const ClientesView: React.FC<ClientesViewProps> = ({
  clientes,
  onActualizarDatos,
}) => {
  const [modoEdicion, setModoEdicion] = useState(false);
  const [id, setId] = useState('');
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [guardando, setGuardando] = useState(false);

  const prepararEdicion = (c: Client) => {
    setModoEdicion(true);
    setId(c.ID);
    setNombre(c.Nombre);
    setTelefono(c.Telefono || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelarEdicion = () => {
    setModoEdicion(false);
    setId('');
    setNombre('');
    setTelefono('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id.trim() || !nombre.trim()) {
      alert('Por favor ingresa Cédula/RIF y Nombre');
      return;
    }

    setGuardando(true);
    try {
      const res = await apiSaveClient(
        {
          id: id.trim(),
          nombre: nombre.trim(),
          telefono: telefono.trim(),
        },
        modoEdicion
      );

      if (res && res.status === 'error') {
        alert('Error: ' + (res.message || 'No se pudo guardar el cliente'));
      } else {
        alert(
          modoEdicion
            ? '¡Cliente modificado con éxito!'
            : '¡Cliente registrado con éxito!'
        );
        cancelarEdicion();
        onActualizarDatos();
      }
    } catch (err) {
      alert('Error de comunicación al guardar cliente.');
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminar = async (clientId: string) => {
    if (!confirm(`¿Eliminar cliente ${clientId}?`)) return;
    try {
      await apiDeleteClient(clientId);
      alert('Cliente eliminado.');
      onActualizarDatos();
    } catch (err) {
      alert('Error al eliminar cliente.');
    }
  };

  const clientesFiltrados = clientes.filter((c) => {
    const q = busqueda.toLowerCase().trim();
    if (!q) return true;
    return (
      (c.Nombre || '').toLowerCase().includes(q) ||
      (c.ID || '').toLowerCase().includes(q) ||
      (c.Telefono || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex-1 p-4 sm:p-6 overflow-y-auto flex flex-col lg:flex-row gap-4 max-w-7xl mx-auto w-full">
      {/* Formulario */}
      <div className="w-full lg:w-1/2 bg-white p-4 sm:p-6 rounded-xl shadow-xs border border-gray-200">
        <h2 className="text-base sm:text-lg font-bold text-gray-800 border-b border-gray-200 pb-2 mb-3 flex items-center gap-2">
          <Users className="w-5 h-5 text-blue-600" />
          <span>{modoEdicion ? '✏️ Modificar Cliente' : '👥 Registrar Cliente'}</span>
        </h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase mb-1">
              Cédula / RIF (ID):
            </label>
            <input
              type="text"
              value={id}
              readOnly={modoEdicion}
              onChange={(e) => setId(e.target.value)}
              required
              placeholder="Ej: V-12345678"
              className={`w-full border border-gray-300 p-2.5 rounded-lg text-xs font-mono font-bold ${
                modoEdicion ? 'bg-gray-100 text-gray-500' : 'bg-white'
              }`}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase mb-1">
              Nombre Completo:
            </label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
              placeholder="Ej: Maria Perez"
              className="w-full border border-gray-300 p-2.5 rounded-lg text-xs"
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
              className="w-full border border-gray-300 p-2.5 rounded-lg text-xs"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={guardando}
              className="flex-1 bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-bold py-3 rounded-lg shadow text-xs cursor-pointer flex items-center justify-center gap-1.5"
            >
              {guardando ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <span>
                  {modoEdicion ? '💾 Guardar Cambios' : '💾 Registrar Cliente'}
                </span>
              )}
            </button>

            {modoEdicion && (
              <button
                type="button"
                onClick={cancelarEdicion}
                className="bg-gray-400 hover:bg-gray-500 text-white font-bold px-4 py-3 rounded-lg text-xs cursor-pointer"
              >
                Cancelar
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Lista */}
      <div className="w-full lg:w-1/2 bg-white p-4 sm:p-6 rounded-xl shadow-xs border border-gray-200 flex flex-col max-h-[75vh]">
        <h2 className="text-sm font-bold text-gray-800 border-b border-gray-200 pb-2 mb-2 flex items-center justify-between">
          <span>Lista de Clientes</span>
          <span className="text-xs text-blue-600">{clientesFiltrados.length}</span>
        </h2>

        <div className="relative mb-2">
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="🔍 Buscar cliente por nombre, cédula o teléfono..."
            className="w-full border border-gray-300 p-2 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex flex-col gap-2 overflow-y-auto flex-1">
          {clientesFiltrados.length === 0 ? (
            <div className="p-8 text-center text-xs text-gray-400">
              No hay clientes registrados o coincidentes
            </div>
          ) : (
            clientesFiltrados.map((c) => (
              <div
                key={c.ID}
                className="border border-gray-200 p-2.5 rounded-xl flex justify-between items-center bg-gray-50 text-xs hover:border-blue-300 transition"
              >
                <div>
                  <div className="font-bold text-gray-800">{c.Nombre}</div>
                  <div className="text-[10px] text-gray-500">
                    ID: {c.ID} | Tel: {c.Telefono || 'N/A'}
                  </div>
                </div>

                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => prepararEdicion(c)}
                    title="Modificar datos del cliente"
                    className="bg-amber-500 hover:bg-amber-600 text-white p-1.5 rounded-lg cursor-pointer transition"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleEliminar(c.ID)}
                    title="Eliminar cliente"
                    className="bg-red-600 hover:bg-red-700 text-white p-1.5 rounded-lg cursor-pointer transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
