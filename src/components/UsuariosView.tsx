import React, { useState } from 'react';
import { User } from '../types';
import { apiSaveUser, apiDeleteUser } from '../services/api';
import { UserCheck, Edit2, Trash2, Search, Loader2 } from 'lucide-react';

interface UsuariosViewProps {
  usuarios: User[];
  onActualizarDatos: () => void;
}

export const UsuariosView: React.FC<UsuariosViewProps> = ({
  usuarios,
  onActualizarDatos,
}) => {
  const [modoEdicion, setModoEdicion] = useState(false);
  const [idusuario, setIdusuario] = useState('');
  const [nombre, setNombre] = useState('');
  const [password, setPassword] = useState('');
  const [rol, setRol] = useState<'vendedor' | 'admin'>('vendedor');
  const [busqueda, setBusqueda] = useState('');
  const [guardando, setGuardando] = useState(false);

  const prepararEdicion = (u: User) => {
    setModoEdicion(true);
    setIdusuario(u.idusuario);
    setNombre(u.nombre);
    setPassword(u.password || '');
    setRol(((u.role || u.roll || 'vendedor').toLowerCase().trim() as any) || 'vendedor');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelarEdicion = () => {
    setModoEdicion(false);
    setIdusuario('');
    setNombre('');
    setPassword('');
    setRol('vendedor');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idusuario.trim() || !nombre.trim()) {
      alert('Por favor ingresa ID y Nombre de usuario');
      return;
    }

    setGuardando(true);
    try {
      const res = await apiSaveUser(
        {
          idusuario: idusuario.trim(),
          nombre: nombre.trim(),
          password: password.trim(),
          roll: rol,
        },
        modoEdicion
      );

      if (res && res.status === 'error') {
        alert('Error: ' + (res.message || 'No se pudo guardar el usuario'));
      } else {
        alert(
          modoEdicion
            ? '¡Usuario modificado con éxito!'
            : '¡Usuario registrado con éxito!'
        );
        cancelarEdicion();
        onActualizarDatos();
      }
    } catch (err) {
      alert('Error de comunicación al guardar usuario.');
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminar = async (id: string) => {
    if (!confirm(`¿Eliminar usuario ${id}?`)) return;
    try {
      await apiDeleteUser(id);
      alert('Usuario eliminado.');
      onActualizarDatos();
    } catch (err) {
      alert('Error al eliminar usuario.');
    }
  };

  const usuariosFiltrados = usuarios.filter((u) => {
    const q = busqueda.toLowerCase().trim();
    if (!q) return true;
    return (
      (u.nombre || '').toLowerCase().includes(q) ||
      (u.idusuario || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex-1 p-4 sm:p-6 overflow-y-auto flex flex-col lg:flex-row gap-4 max-w-7xl mx-auto w-full">
      {/* Formulario */}
      <div className="w-full lg:w-1/2 bg-white p-4 sm:p-6 rounded-xl shadow-xs border border-gray-200">
        <h2 className="text-base sm:text-lg font-bold text-gray-800 border-b border-gray-200 pb-2 mb-3 flex items-center gap-2">
          <UserCheck className="w-5 h-5 text-blue-600" />
          <span>{modoEdicion ? '✏️ Modificar Usuario' : '👤 Registrar Usuario'}</span>
        </h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase mb-1">
              ID Usuario:
            </label>
            <input
              type="text"
              value={idusuario}
              readOnly={modoEdicion}
              onChange={(e) => setIdusuario(e.target.value)}
              required
              placeholder="Ej: U001"
              className={`w-full border border-gray-300 p-2.5 rounded-lg text-xs font-mono font-bold ${
                modoEdicion ? 'bg-gray-100 text-gray-500' : 'bg-white'
              }`}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase mb-1">
              Nombre de Usuario:
            </label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
              placeholder="Ej: jmarcano"
              className="w-full border border-gray-300 p-2.5 rounded-lg text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase mb-1">
              Contraseña:
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required={!modoEdicion}
              placeholder="••••••••"
              className="w-full border border-gray-300 p-2.5 rounded-lg text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase mb-1">
              Rol:
            </label>
            <select
              value={rol}
              onChange={(e) => setRol(e.target.value as any)}
              className="w-full border border-gray-300 p-2.5 rounded-lg text-xs bg-white font-medium"
            >
              <option value="vendedor">vendedor</option>
              <option value="admin">admin</option>
            </select>
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
                  {modoEdicion ? '💾 Guardar Cambios' : '💾 Registrar Usuario'}
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
          <span>Lista de Usuarios</span>
          <span className="text-xs text-blue-600">{usuariosFiltrados.length}</span>
        </h2>

        <div className="relative mb-2">
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="🔍 Buscar usuario por nombre o ID..."
            className="w-full border border-gray-300 p-2 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex flex-col gap-2 overflow-y-auto flex-1">
          {usuariosFiltrados.length === 0 ? (
            <div className="p-8 text-center text-xs text-gray-400">
              No hay usuarios registrados
            </div>
          ) : (
            usuariosFiltrados.map((u) => (
              <div
                key={u.idusuario}
                className="border border-gray-200 p-2.5 rounded-xl flex justify-between items-center bg-gray-50 text-xs hover:border-blue-300 transition"
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-gray-800">{u.nombre}</span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 uppercase">
                      {u.role || u.roll || 'vendedor'}
                    </span>
                  </div>
                  <div className="text-[10px] text-gray-500 mt-0.5 font-mono">
                    ID: {u.idusuario}
                  </div>
                </div>

                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => prepararEdicion(u)}
                    title="Modificar usuario"
                    className="bg-amber-500 hover:bg-amber-600 text-white p-1.5 rounded-lg cursor-pointer transition"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleEliminar(u.idusuario)}
                    title="Eliminar usuario"
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
