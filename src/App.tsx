import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  User,
  Product,
  Client,
  Sale,
  Abono,
  Proveedor,
  CuentaPorPagar,
  CartItem,
  PaymentSplit,
  SyncQueueItem,
} from './types';
import {
  fetchFullData,
  apiGetProveedores,
  apiGetCXP,
  apiSaveTasaBCV,
  apiRegisterSale,
  apiRegisterAbono,
  apiSaveProveedor,
  apiSaveCXP,
  apiAbonarCXP,
} from './services/api';
import {
  getOfflineCache,
  saveOfflineCache,
  getSyncQueue,
  addToSyncQueue,
  removeSyncQueueItem,
  clearSyncQueue,
  processSyncQueue,
} from './services/offlineSync';
import { Header } from './components/Header';
import { LoginModal } from './components/LoginModal';
import { PosView } from './components/PosView';
import { ProductsView } from './components/ProductsView';
import { SalesView } from './components/SalesView';
import { CobranzaView } from './components/CobranzaView';
import { HistorialAbonosView } from './components/HistorialAbonosView';
import { CxpView } from './components/CxpView';
import { ClientesView } from './components/ClientesView';
import { UsuariosView } from './components/UsuariosView';
import {
  ModalCobro,
  ModalAbono,
  ModalHistorialAbonos,
  ModalDetalleVenta,
  ModalProveedor,
  ModalNuevaCXP,
  ModalAbonarCXP,
  ModalCamara,
  ModalColaSincronizacion,
  TicketTermico,
} from './components/Modals';
import { normalizarId } from './utils/formatters';

export default function App() {
  const [usuario, setUsuario] = useState<User | null>(null);
  const [vistaActual, setVistaActual] = useState<string>('vender');
  const [loading, setLoading] = useState<boolean>(false);

  // Estado de Conexión y Cola de Sincronización
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [syncQueue, setSyncQueue] = useState<SyncQueueItem[]>(() =>
    getSyncQueue()
  );
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncProgress, setSyncProgress] = useState<{
    current: number;
    total: number;
    desc: string;
  } | null>(null);
  const [modalSyncOpen, setModalSyncOpen] = useState<boolean>(false);

  // Datos principales
  const [dbProductos, setDbProductos] = useState<Product[]>([]);
  const [dbClientes, setDbClientes] = useState<Client[]>([]);
  const [dbUsuarios, setDbUsuarios] = useState<User[]>([]);
  const [dbVentas, setDbVentas] = useState<Sale[]>([]);
  const [dbAbonos, setDbAbonos] = useState<Abono[]>([]);
  const [dbProveedores, setDbProveedores] = useState<Proveedor[]>([]);
  const [dbCXP, setDbCXP] = useState<CuentaPorPagar[]>([]);
  const [tasaBCV, setTasaBCV] = useState<number>(50.0);

  // Estado del POS
  const [carrito, setCarrito] = useState<CartItem[]>([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<Client | null>(
    null
  );

  // Modales
  const [modalCobroOpen, setModalCobroOpen] = useState(false);
  const [modalAbonoOpen, setModalAbonoOpen] = useState(false);
  const [abonoVentaId, setAbonoVentaId] = useState('');
  const [abonoDeudaRestanteUSD, setAbonoDeudaRestanteUSD] = useState(0);

  const [modalHistorialAbonosOpen, setModalHistorialAbonosOpen] =
    useState(false);
  const [ventaHistorial, setVentaHistorial] = useState<Sale | null>(null);

  const [modalDetalleVentaOpen, setModalDetalleVentaOpen] = useState(false);
  const [ventaDetalle, setVentaDetalle] = useState<Sale | null>(null);

  const [modalProveedorOpen, setModalProveedorOpen] = useState(false);
  const [modalNuevaCXPOpen, setModalNuevaCXPOpen] = useState(false);
  const [modalAbonarCXPOpen, setModalAbonarCXPOpen] = useState(false);
  const [cxpSeleccionada, setCxpSeleccionada] =
    useState<CuentaPorPagar | null>(null);

  const [modalCamaraOpen, setModalCamaraOpen] = useState(false);
  const [destinoCamara, setDestinoCamara] = useState<'pos' | 'inventario'>('pos');

  const [ticketParaImprimir, setTicketParaImprimir] = useState<Sale | null>(
    null
  );

  // 1. Cargar sesión previa y caché offline inicial
  useEffect(() => {
    try {
      const savedUser = localStorage.getItem('imtec_user');
      if (savedUser) {
        const u = JSON.parse(savedUser);
        if (u && u.nombre) {
          u.role = (u.role || u.roll || 'vendedor').toLowerCase().trim();
          setUsuario(u);
        }
      }

      // Hidratar desde caché local para carga instantánea offline
      const cached = getOfflineCache();
      if (cached) {
        if (cached.productos && cached.productos.length > 0)
          setDbProductos(cached.productos);
        if (cached.clientes && cached.clientes.length > 0)
          setDbClientes(cached.clientes);
        if (cached.usuarios && cached.usuarios.length > 0)
          setDbUsuarios(cached.usuarios);
        if (cached.ventas && cached.ventas.length > 0)
          setDbVentas(cached.ventas);
        if (cached.abonos && cached.abonos.length > 0)
          setDbAbonos(cached.abonos);
        if (cached.proveedores && cached.proveedores.length > 0)
          setDbProveedores(cached.proveedores);
        if (cached.cxpList && cached.cxpList.length > 0)
          setDbCXP(cached.cxpList);
        if (cached.tasaBCV && Number(cached.tasaBCV) > 0)
          setTasaBCV(Number(cached.tasaBCV));
      }
    } catch (e) {
      console.warn('Error leyendo caché inicial:', e);
    }
  }, []);

  // 2. Cargar datos del backend y actualizar caché local
  const cargarDatos = useCallback(async () => {
    setLoading(true);
    try {
      const [fullData, proveedores, cxpList] = await Promise.all([
        fetchFullData().catch(() => null),
        apiGetProveedores().catch(() => []),
        apiGetCXP().catch(() => []),
      ]);

      if (fullData) {
        let tasa = 50.0;
        if (fullData.tasaBCV && fullData.tasaBCV.tasa) {
          tasa = Number(fullData.tasaBCV.tasa) || 50.0;
          setTasaBCV(tasa);
        }

        const prods = (fullData.productos || []).map((p) => {
          if (p.incluir_Costo_en_Bs_o_Divisas === 'Precio Fijo') {
            const pBsFijo = Number(p.PrecioBs) || 0;
            return {
              ...p,
              PrecioBs: pBsFijo,
              Precio:
                tasa > 0 ? Number((pBsFijo / tasa).toFixed(2)) : p.Precio || 0,
              PrecioVtaRealDivisas:
                tasa > 0 ? Number((pBsFijo / tasa).toFixed(2)) : p.Precio || 0,
            };
          } else {
            const pUSD = Number(p.PrecioVtaRealDivisas || p.Precio) || 0;
            return {
              ...p,
              PrecioBs: Number((pUSD * tasa).toFixed(2)),
            };
          }
        });

        const listVentas = (fullData.ventas || []).slice().reverse();
        const listAbonos = fullData.abonos || [];
        const listClientes = fullData.clientes || [];
        const listUsuarios = fullData.usuarios || [];

        setDbProductos(prods);
        setDbClientes(listClientes);
        setDbUsuarios(listUsuarios);
        setDbVentas(listVentas);
        setDbAbonos(listAbonos);
        setDbProveedores(proveedores || []);
        setDbCXP(cxpList || []);

        // Guardar instantánea limpia en caché offline
        saveOfflineCache({
          productos: prods,
          clientes: listClientes,
          usuarios: listUsuarios,
          ventas: listVentas,
          abonos: listAbonos,
          proveedores: proveedores || [],
          cxpList: cxpList || [],
          tasaBCV: tasa,
        });
      }
    } catch (err) {
      console.warn('Modo offline activo: utilizando base de datos local');
    } finally {
      setLoading(false);
      setSyncQueue(getSyncQueue());
    }
  }, []);

  // 3. Ejecutar Sincronización de la Cola con el Servidor
  const ejecutarSincronizacion = useCallback(async () => {
    if (isSyncing) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      alert('⚠️ No hay conexión a internet para sincronizar.');
      return;
    }

    const currentQueue = getSyncQueue();
    if (currentQueue.length === 0) {
      await cargarDatos();
      return;
    }

    setIsSyncing(true);
    try {
      const res = await processSyncQueue((current, total, desc) => {
        setSyncProgress({ current, total, desc });
      });
      setSyncQueue(getSyncQueue());

      if (res.total > 0) {
        if (res.fallidos === 0) {
          alert(
            `✅ ¡Sincronización completada!\n\nSe subieron ${res.exitosos} movimiento(s) a Google Sheets exitosamente.`
          );
        } else {
          alert(
            `⚠️ Sincronización parcial:\n\n${res.exitosos} subidos con éxito.\n${res.fallidos} quedaron pendientes por error.`
          );
        }
      }
      await cargarDatos();
    } catch (err) {
      console.error('Error durante sincronización:', err);
    } finally {
      setIsSyncing(false);
      setSyncProgress(null);
    }
  }, [isSyncing, cargarDatos]);

  // 4. Escuchar eventos de red (Online / Offline)
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      const queue = getSyncQueue();
      if (queue.length > 0) {
        // Auto-sincronizar automáticamente en segundo plano al volver internet
        processSyncQueue().then((res) => {
          setSyncQueue(getSyncQueue());
          if (res.exitosos > 0) {
            cargarDatos();
          }
        });
      } else {
        cargarDatos();
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [cargarDatos]);

  // 5. Cargar datos tras login
  useEffect(() => {
    if (usuario) {
      cargarDatos();
    }
  }, [usuario, cargarDatos]);

  // Siguiente correlativo de ticket
  const proximoTicket = useMemo(() => {
    let maxNum = 0;
    dbVentas.forEach((v) => {
      const id = (v.idVenta || '').toString();
      const match = id.match(/\d+/g);
      if (match) {
        const n = parseInt(match.join(''), 10);
        if (!isNaN(n) && n < 10000000 && n > maxNum) maxNum = n;
      }
    });
    return '#' + String(maxNum > 0 ? maxNum + 1 : dbVentas.length + 1).padStart(7, '0');
  }, [dbVentas]);

  // Total pendiente de cobranza general
  const deudaTotalPendienteUSD = useMemo(() => {
    const creditos = dbVentas.filter(
      (v) => v.tipo === 'Crédito' && v.estado !== 'Anulada'
    );
    return creditos.reduce((acc, v) => {
      const vIdNorm = normalizarId(v.idVenta);
      const abonosV = dbAbonos.filter(
        (a) => normalizarId(a.idVenta) === vIdNorm
      );
      const abonado = abonosV.reduce(
        (s, a) => s + (Number(a.montoUSD) || 0),
        0
      );
      const deuda = Math.max(0, (Number(v.totalUSD) || 0) - abonado);
      return acc + deuda;
    }, 0);
  }, [dbVentas, dbAbonos]);

  // Acciones de Carrito
  const handleAddToCart = (codigo: string) => {
    const prod = dbProductos.find(
      (p) => p.Codigo.toString() === codigo.toString()
    );
    if (!prod || Number(prod.Stock) <= 0) {
      alert('Producto sin stock disponible.');
      return;
    }

    const itemIdx = carrito.findIndex(
      (i) => i.codigo.toString() === codigo.toString()
    );
    const precioUSD = Number(prod.PrecioVtaRealDivisas || prod.Precio) || 0;
    const precioBs =
      prod.incluir_Costo_en_Bs_o_Divisas === 'Precio Fijo'
        ? Number(prod.PrecioBs) || 0
        : Number(prod.PrecioBs) || precioUSD * tasaBCV;

    if (itemIdx > -1) {
      if (carrito[itemIdx].cantidad + 1 > parseFloat(prod.Stock.toString())) {
        alert(`Stock máximo alcanzado: ${prod.Stock}`);
        return;
      }
      const nuevo = [...carrito];
      nuevo[itemIdx].cantidad += 1;
      setCarrito(nuevo);
    } else {
      setCarrito([
        ...carrito,
        {
          codigo: prod.Codigo,
          nombre: prod.Nombre,
          precio: precioUSD,
          precioBs,
          cantidad: 1,
          stockMax: parseFloat(prod.Stock.toString()),
        },
      ]);
    }
  };

  const handleUpdateCartQty = (idx: number, qty: number) => {
    if (isNaN(qty) || qty <= 0) {
      handleRemoveFromCart(idx);
      return;
    }
    const nuevo = [...carrito];
    if (qty > nuevo[idx].stockMax) {
      alert(`Stock máximo disponible: ${nuevo[idx].stockMax}`);
      nuevo[idx].cantidad = nuevo[idx].stockMax;
    } else {
      nuevo[idx].cantidad = qty;
    }
    setCarrito(nuevo);
  };

  const handleRemoveFromCart = (idx: number) => {
    const nuevo = [...carrito];
    nuevo.splice(idx, 1);
    setCarrito(nuevo);
  };

  // Impresión de Ticket Térmico
  const ejecutarImpresionTicket = (venta: Sale) => {
    setTicketParaImprimir(venta);
    setTimeout(() => {
      const container = document.getElementById('ticketTermicoContainer');
      if (container) {
        container.classList.remove('hidden');
        window.print();
        container.classList.add('hidden');
      }
    }, 150);
  };

  // Descontar inventario optimista localmente
  const descontarStockLocal = (items: CartItem[]) => {
    setDbProductos((prevProds) => {
      const updated = prevProds.map((prod) => {
        const item = items.find(
          (i) => i.codigo.toString() === prod.Codigo.toString()
        );
        if (item) {
          const nuevoStock = Math.max(
            0,
            Number(prod.Stock || 0) - item.cantidad
          );
          return { ...prod, Stock: nuevoStock };
        }
        return prod;
      });
      saveOfflineCache({ productos: updated });
      return updated;
    });
  };

  // Checkout Contado (Soporte Online / Offline)
  const handleConfirmarVentaContado = async (pagos: PaymentSplit[]) => {
    if (carrito.length === 0) return;

    const totalUSD = carrito.reduce(
      (acc, i) => acc + i.precio * i.cantidad,
      0
    );
    const totalBS = carrito.reduce(
      (acc, i) => acc + i.precioBs * i.cantidad,
      0
    );

    const ventaTemp: Sale = {
      idVenta: proximoTicket,
      fecha: new Date().toLocaleString('es-VE'),
      clienteId: clienteSeleccionado ? clienteSeleccionado.ID : undefined,
      clienteNombre: clienteSeleccionado
        ? clienteSeleccionado.Nombre
        : 'Cliente General',
      tipo: 'Contado',
      totalUSD,
      totalBS,
      items: [...carrito],
      vendedor: usuario ? usuario.nombre : 'Desconocido',
      metodosPago: pagos,
      isOfflinePending: false,
    };

    // Descontar inventario localmente
    descontarStockLocal(carrito);

    setModalCobroOpen(false);
    setCarrito([]);
    setClienteSeleccionado(null);

    let esOffline = !navigator.onLine;

    if (!esOffline) {
      try {
        const res = await apiRegisterSale(ventaTemp);
        if (res && (res.idVenta || res.ventaId)) {
          ventaTemp.idVenta = res.idVenta || res.ventaId;
        }
        // Agregar a la lista de ventas en estado local
        setDbVentas((prev) => [ventaTemp, ...prev]);
        cargarDatos();
      } catch (err) {
        esOffline = true;
      }
    }

    if (esOffline) {
      ventaTemp.isOfflinePending = true;
      setDbVentas((prev) => [ventaTemp, ...prev]);

      // Guardar en cola de sincronización offline
      addToSyncQueue(
        'REGISTRAR_VENTA',
        ventaTemp,
        `Venta Contado ${ventaTemp.idVenta} ($${ventaTemp.totalUSD.toFixed(2)})`
      );
      setSyncQueue(getSyncQueue());
      saveOfflineCache({ ventas: [ventaTemp, ...dbVentas] });
    }

    const mensajeExito = esOffline
      ? `📦 ¡Venta #${ventaTemp.idVenta} guardada en MODO OFFLINE!\n\nSe sincronizará automáticamente cuando haya internet.\n\n¿Deseas imprimir el ticket térmico?`
      : `¡Venta #${ventaTemp.idVenta} registrada con éxito!\n\n¿Deseas imprimir el ticket térmico?`;

    if (confirm(mensajeExito)) {
      ejecutarImpresionTicket(ventaTemp);
    }
  };

  // Checkout Crédito (Soporte Online / Offline)
  const handleProcesarCredito = async () => {
    if (carrito.length === 0) {
      alert('El carrito está vacío.');
      return;
    }
    if (!clienteSeleccionado || !clienteSeleccionado.ID) {
      alert('⚠️ Debes seleccionar un cliente registrado para venta a CRÉDITO.');
      return;
    }

    const totalUSD = carrito.reduce(
      (acc, i) => acc + i.precio * i.cantidad,
      0
    );
    const totalBS = carrito.reduce(
      (acc, i) => acc + i.precioBs * i.cantidad,
      0
    );

    const ventaTemp: Sale = {
      idVenta: proximoTicket,
      fecha: new Date().toLocaleString('es-VE'),
      clienteId: clienteSeleccionado.ID,
      clienteNombre: clienteSeleccionado.Nombre,
      tipo: 'Crédito',
      totalUSD,
      totalBS,
      items: [...carrito],
      vendedor: usuario ? usuario.nombre : 'Desconocido',
      isOfflinePending: false,
    };

    // Descontar inventario localmente
    descontarStockLocal(carrito);

    setCarrito([]);
    setClienteSeleccionado(null);

    let esOffline = !navigator.onLine;

    if (!esOffline) {
      try {
        const res = await apiRegisterSale(ventaTemp);
        if (res && (res.idVenta || res.ventaId)) {
          ventaTemp.idVenta = res.idVenta || res.ventaId;
        }
        setDbVentas((prev) => [ventaTemp, ...prev]);
        cargarDatos();
      } catch (err) {
        esOffline = true;
      }
    }

    if (esOffline) {
      ventaTemp.isOfflinePending = true;
      setDbVentas((prev) => [ventaTemp, ...prev]);

      // Guardar en cola de sincronización
      addToSyncQueue(
        'REGISTRAR_VENTA',
        ventaTemp,
        `Venta Crédito ${ventaTemp.idVenta} a ${ventaTemp.clienteNombre} ($${ventaTemp.totalUSD.toFixed(2)})`
      );
      setSyncQueue(getSyncQueue());
      saveOfflineCache({ ventas: [ventaTemp, ...dbVentas] });
    }

    const mensajeExito = esOffline
      ? `📦 ¡Venta a Crédito #${ventaTemp.idVenta} guardada en MODO OFFLINE!\n\nSe sincronizará automáticamente cuando haya internet.\n\n¿Deseas imprimir el ticket?`
      : `¡Venta a crédito #${ventaTemp.idVenta} registrada!\n\n¿Deseas imprimir el ticket?`;

    if (confirm(mensajeExito)) {
      ejecutarImpresionTicket(ventaTemp);
    }
  };

  // Guardar Abono de cliente (Online / Offline)
  const handleGuardarAbono = async (montoUSD: number, ref: string) => {
    const payload = {
      idVenta: abonoVentaId,
      montoUSD,
      referencia: ref,
      usuario: usuario ? usuario.nombre : 'Sistema',
    };

    const nuevoAbonoTemp: Abono = {
      idAbono: `AB-${Date.now()}`,
      fecha: new Date().toLocaleString('es-VE'),
      idVenta: abonoVentaId,
      montoUSD,
      montoBs: Number((montoUSD * tasaBCV).toFixed(2)),
      referencia: ref,
      usuario: usuario ? usuario.nombre : 'Sistema',
      isOfflinePending: false,
    };

    let esOffline = !navigator.onLine;

    if (!esOffline) {
      try {
        await apiRegisterAbono(payload);
        alert('¡Abono registrado con éxito!');
        setDbAbonos((prev) => [nuevoAbonoTemp, ...prev]);
        await cargarDatos();
      } catch (err) {
        esOffline = true;
      }
    }

    if (esOffline) {
      nuevoAbonoTemp.isOfflinePending = true;
      setDbAbonos((prev) => [nuevoAbonoTemp, ...prev]);

      addToSyncQueue(
        'REGISTRAR_ABONO',
        payload,
        `Abono de $${montoUSD.toFixed(2)} a Venta #${abonoVentaId}`
      );
      setSyncQueue(getSyncQueue());
      saveOfflineCache({ abonos: [nuevoAbonoTemp, ...dbAbonos] });

      alert(
        '📦 ¡Abono guardado en MODO OFFLINE! Se enviará a Google Sheets en cuanto haya conexión.'
      );
    }
  };

  // Modificar Tasa BCV Manual (Online / Offline)
  const handleCambiarTasaBCV = async () => {
    const rol = (usuario?.role || '').toLowerCase().trim();
    if (rol !== 'admin') {
      alert('⚠️ Acceso denegado: Solo el Administrador puede modificar la tasa BCV.');
      return;
    }

    const nueva = prompt(
      `Ingresa la nueva tasa BCV (Actual: Bs. ${tasaBCV.toFixed(2)}):`,
      tasaBCV.toString()
    );
    if (!nueva || isNaN(Number(nueva)) || Number(nueva) <= 0) return;

    const nuevaNum = Number(nueva);
    setTasaBCV(nuevaNum);

    // Recalcular localmente
    setDbProductos((prev) =>
      prev.map((p) => {
        if (p.incluir_Costo_en_Bs_o_Divisas === 'Precio Fijo') {
          const pBsFijo = Number(p.PrecioBs) || 0;
          return {
            ...p,
            Precio: Number((pBsFijo / nuevaNum).toFixed(2)),
            PrecioVtaRealDivisas: Number((pBsFijo / nuevaNum).toFixed(2)),
          };
        } else {
          const pUSD = Number(p.PrecioVtaRealDivisas || p.Precio) || 0;
          return {
            ...p,
            PrecioBs: Number((pUSD * nuevaNum).toFixed(2)),
          };
        }
      })
    );

    saveOfflineCache({ tasaBCV: nuevaNum });

    if (navigator.onLine) {
      try {
        await apiSaveTasaBCV(nuevaNum);
      } catch (e) {
        addToSyncQueue(
          'GUARDAR_TASA_BCV',
          { tasa: nuevaNum },
          `Actualización Tasa BCV a Bs. ${nuevaNum.toFixed(2)}`
        );
        setSyncQueue(getSyncQueue());
      }
    } else {
      addToSyncQueue(
        'GUARDAR_TASA_BCV',
        { tasa: nuevaNum },
        `Actualización Tasa BCV a Bs. ${nuevaNum.toFixed(2)}`
      );
      setSyncQueue(getSyncQueue());
    }
  };

  // Limpiar y descartar cola
  const handleLimpiarCola = () => {
    clearSyncQueue();
    setSyncQueue([]);
  };

  const handleEliminarItemCola = (id: string) => {
    removeSyncQueueItem(id);
    setSyncQueue(getSyncQueue());
  };

  // Cerrar sesión
  const handleCerrarSesion = () => {
    if (confirm('¿Deseas cerrar la sesión activa?')) {
      localStorage.removeItem('imtec_user');
      setUsuario(null);
    }
  };

  // Login exitoso
  const handleLoginExitoso = (u: User) => {
    setUsuario(u);
    setVistaActual('vender');
  };

  // Cámara Scan Exitoso
  const handleScanExitoso = (codigo: string) => {
    if (destinoCamara === 'inventario') {
      // In inventario handled by ProductsView
    } else {
      const prod = dbProductos.find(
        (p) => p.Codigo.toString().toLowerCase() === codigo.toLowerCase()
      );
      if (prod) {
        handleAddToCart(prod.Codigo);
      } else {
        alert(`Producto con código ${codigo} no encontrado.`);
      }
    }
  };

  // Render view router
  const renderVista = () => {
    switch (vistaActual) {
      case 'vender':
        return (
          <PosView
            productos={dbProductos}
            clientes={dbClientes}
            carrito={carrito}
            clienteSeleccionado={clienteSeleccionado}
            onSelectCliente={setClienteSeleccionado}
            onAddToCart={handleAddToCart}
            onUpdateCartQty={handleUpdateCartQty}
            onRemoveFromCart={handleRemoveFromCart}
            onAbrirModalCobro={() => setModalCobroOpen(true)}
            onProcesarCredito={handleProcesarCredito}
            onAbrirCamara={(dest) => {
              setDestinoCamara(dest);
              setModalCamaraOpen(true);
            }}
            proximoTicket={proximoTicket}
            tasaBCV={tasaBCV}
          />
        );
      case 'ventas':
        return (
          <SalesView
            ventas={dbVentas}
            usuario={usuario}
            onActualizarDatos={cargarDatos}
            onVerDetalle={(v) => {
              setVentaDetalle(v);
              setModalDetalleVentaOpen(true);
            }}
            onImprimirTicket={ejecutarImpresionTicket}
          />
        );
      case 'cobranza':
        return (
          <CobranzaView
            ventas={dbVentas}
            abonos={dbAbonos}
            tasaBCV={tasaBCV}
            onActualizarDatos={cargarDatos}
            onAbrirModalAbono={(idV, deudaUSD) => {
              setAbonoVentaId(idV);
              setAbonoDeudaRestanteUSD(deudaUSD);
              setModalAbonoOpen(true);
            }}
            onAbrirHistorialAbonos={(v) => {
              setVentaHistorial(v);
              setModalHistorialAbonosOpen(true);
            }}
          />
        );
      case 'historialAbonos':
        return (
          <HistorialAbonosView
            abonos={dbAbonos}
            ventas={dbVentas}
            tasaBCV={tasaBCV}
            onActualizarDatos={cargarDatos}
          />
        );
      case 'cxp':
        return (
          <CxpView
            proveedores={dbProveedores}
            cxpList={dbCXP}
            tasaBCV={tasaBCV}
            onAbrirModalProveedor={() => setModalProveedorOpen(true)}
            onAbrirModalNuevaCXP={() => setModalNuevaCXPOpen(true)}
            onAbrirModalAbonarCXP={(c) => {
              setCxpSeleccionada(c);
              setModalAbonarCXPOpen(true);
            }}
          />
        );
      case 'clientes':
        return (
          <ClientesView
            clientes={dbClientes}
            onActualizarDatos={cargarDatos}
          />
        );
      case 'productos':
        return (
          <ProductsView
            productos={dbProductos}
            tasaBCV={tasaBCV}
            onActualizarDatos={cargarDatos}
            onAbrirCamara={(dest) => {
              setDestinoCamara(dest);
              setModalCamaraOpen(true);
            }}
          />
        );
      case 'usuarios':
        return (
          <UsuariosView
            usuarios={dbUsuarios}
            onActualizarDatos={cargarDatos}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col font-sans">
      {/* 1. Modal de Login */}
      {!usuario && <LoginModal onLoginExitoso={handleLoginExitoso} />}

      {/* 2. Header Superior con Navegación y Estado Online/Offline */}
      <Header
        vistaActual={vistaActual}
        onCambiarVista={setVistaActual}
        usuario={usuario}
        tasaBCV={tasaBCV}
        onCambiarTasaBCV={handleCambiarTasaBCV}
        onSincronizar={ejecutarSincronizacion}
        onCerrarSesion={handleCerrarSesion}
        deudaTotalPendienteUSD={deudaTotalPendienteUSD}
        loading={loading || isSyncing}
        isOnline={isOnline}
        pendingSyncCount={syncQueue.length}
        onAbrirColaSync={() => setModalSyncOpen(true)}
      />

      {/* 3. Contenedor de la Vista Activa */}
      <main className="flex-1 flex flex-col">{renderVista()}</main>

      {/* 4. Modales Globales */}
      <ModalCobro
        isOpen={modalCobroOpen}
        onClose={() => setModalCobroOpen(false)}
        carrito={carrito}
        tasaBCV={tasaBCV}
        onConfirmarVenta={handleConfirmarVentaContado}
      />

      <ModalAbono
        isOpen={modalAbonoOpen}
        onClose={() => setModalAbonoOpen(false)}
        idVenta={abonoVentaId}
        deudaUSD={abonoDeudaRestanteUSD}
        tasaBCV={tasaBCV}
        onGuardarAbono={handleGuardarAbono}
      />

      <ModalHistorialAbonos
        isOpen={modalHistorialAbonosOpen}
        onClose={() => {
          setModalHistorialAbonosOpen(false);
          setVentaHistorial(null);
        }}
        venta={ventaHistorial}
        abonosVenta={
          ventaHistorial
            ? dbAbonos.filter(
                (a) =>
                  normalizarId(a.idVenta) ===
                  normalizarId(ventaHistorial.idVenta)
              )
            : []
        }
        tasaBCV={tasaBCV}
        onAbrirNuevoAbono={(idV, deudaUSD) => {
          setAbonoVentaId(idV);
          setAbonoDeudaRestanteUSD(deudaUSD);
          setModalAbonoOpen(true);
        }}
      />

      <ModalDetalleVenta
        isOpen={modalDetalleVentaOpen}
        onClose={() => {
          setModalDetalleVentaOpen(false);
          setVentaDetalle(null);
        }}
        venta={ventaDetalle}
      />

      <ModalProveedor
        isOpen={modalProveedorOpen}
        onClose={() => setModalProveedorOpen(false)}
        onGuardar={async (prov) => {
          try {
            if (navigator.onLine) {
              const res = await apiSaveProveedor(prov);
              alert(res?.message || 'Proveedor guardado');
              await cargarDatos();
            } else {
              setDbProveedores((prev) => [...prev, prov]);
              addToSyncQueue('REGISTRAR_PROVEEDOR', prov, `Proveedor: ${prov.nombre}`);
              setSyncQueue(getSyncQueue());
              alert('📦 Proveedor guardado localmente (Offline).');
            }
          } catch (e) {
            setDbProveedores((prev) => [...prev, prov]);
            addToSyncQueue('REGISTRAR_PROVEEDOR', prov, `Proveedor: ${prov.nombre}`);
            setSyncQueue(getSyncQueue());
            alert('📦 Proveedor guardado en cola offline.');
          }
        }}
      />

      <ModalNuevaCXP
        isOpen={modalNuevaCXPOpen}
        onClose={() => setModalNuevaCXPOpen(false)}
        proveedores={dbProveedores}
        tasaBCV={tasaBCV}
        onGuardar={async (cxpData) => {
          const payload = {
            ...cxpData,
            usuario: usuario ? usuario.nombre : 'Admin',
          };
          try {
            if (navigator.onLine) {
              const res = await apiSaveCXP(payload);
              alert(res?.message || 'Cuenta por pagar registrada');
              await cargarDatos();
            } else {
              addToSyncQueue('REGISTRAR_CXP', payload, `CXP Factura: ${payload.nroFactura}`);
              setSyncQueue(getSyncQueue());
              alert('📦 Cuenta por pagar guardada localmente (Offline).');
            }
          } catch (e) {
            addToSyncQueue('REGISTRAR_CXP', payload, `CXP Factura: ${payload.nroFactura}`);
            setSyncQueue(getSyncQueue());
            alert('📦 Cuenta por pagar guardada en cola offline.');
          }
        }}
      />

      <ModalAbonarCXP
        isOpen={modalAbonarCXPOpen}
        onClose={() => {
          setModalAbonarCXPOpen(false);
          setCxpSeleccionada(null);
        }}
        cxp={cxpSeleccionada}
        tasaBCV={tasaBCV}
        onGuardarAbono={async (abonoData) => {
          const payload = {
            ...abonoData,
            usuario: usuario ? usuario.nombre : 'Admin',
          };
          try {
            if (navigator.onLine) {
              const res = await apiAbonarCXP(payload);
              alert(res?.message || 'Pago a proveedor registrado');
              await cargarDatos();
            } else {
              addToSyncQueue('ABONAR_CXP', payload, `Pago a proveedor CXP #${payload.idCXP}`);
              setSyncQueue(getSyncQueue());
              alert('📦 Pago a proveedor guardado localmente (Offline).');
            }
          } catch (e) {
            addToSyncQueue('ABONAR_CXP', payload, `Pago a proveedor CXP #${payload.idCXP}`);
            setSyncQueue(getSyncQueue());
            alert('📦 Pago guardado en cola offline.');
          }
        }}
      />

      <ModalCamara
        isOpen={modalCamaraOpen}
        onClose={() => setModalCamaraOpen(false)}
        onScanExitoso={handleScanExitoso}
        destino={destinoCamara}
      />

      {/* 5. Modal de Gestión de Cola de Sincronización Offline */}
      <ModalColaSincronizacion
        isOpen={modalSyncOpen}
        onClose={() => setModalSyncOpen(false)}
        queue={syncQueue}
        isOnline={isOnline}
        isSyncing={isSyncing}
        syncProgress={syncProgress}
        onSincronizarAhora={ejecutarSincronizacion}
        onLimpiarCola={handleLimpiarCola}
        onEliminarItem={handleEliminarItemCola}
      />

      {/* 6. Contenedor de Ticket Térmico Oculto para Impresión 80mm/72mm */}
      <TicketTermico venta={ticketParaImprimir} />
    </div>
  );
}
