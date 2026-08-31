import React, { useState } from 'react';
import { KeyRound, User, Lock, Loader2 } from 'lucide-react';
import { apiLogin } from '../services/api';
import { User as UserType } from '../types';

interface LoginModalProps {
  onLoginExitoso: (user: UserType) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ onLoginExitoso }) => {
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usuario.trim() || !password.trim()) {
      setError('Por favor ingresa usuario y contraseña.');
      return;
    }

    setError('');
    setCargando(true);

    try {
      const res = await apiLogin(usuario.trim(), password.trim());
      if (res.status === 'error' || !res.usuario) {
        setError(res.message || 'Credenciales incorrectas.');
      } else {
        const u = res.usuario;
        u.role = (u.role || u.roll || 'vendedor').toLowerCase().trim();
        localStorage.setItem('imtec_user', JSON.stringify(u));
        onLoginExitoso(u);
      }
    } catch (err: any) {
      setError('Error conectando con el servidor.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-950/90 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-2xl w-full max-w-md border border-gray-200">
        <div className="text-center mb-6">
          <div className="inline-flex p-3 bg-blue-50 border border-blue-200 rounded-2xl text-blue-600 mb-3">
            <KeyRound className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-black text-blue-600 tracking-wide">
            iMtec POS
          </h1>
          <p className="text-gray-500 text-xs sm:text-sm mt-1">
            Ingresa tus credenciales para continuar al sistema
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase mb-1">
              Usuario:
            </label>
            <div className="relative flex items-center">
              <User className="absolute left-3 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                required
                autoComplete="username"
                placeholder="Usuario (ej: admin o jmarcano)"
                className="w-full border border-gray-300 p-3 pl-9 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase mb-1">
              Contraseña:
            </label>
            <div className="relative flex items-center">
              <Lock className="absolute left-3 w-4 h-4 text-gray-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full border border-gray-300 p-3 pl-9 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium"
              />
            </div>
          </div>

          {error && (
            <div className="text-red-600 text-xs font-semibold text-center bg-red-50 p-2.5 rounded-lg border border-red-200 animate-fade-in">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={cargando}
            className="bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-bold py-3.5 rounded-xl shadow-md transition mt-2 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-75 disabled:cursor-not-allowed"
          >
            {cargando ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Verificando...</span>
              </>
            ) : (
              <span>🔑 Iniciar Sesión</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
