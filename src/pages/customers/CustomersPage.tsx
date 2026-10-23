import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import DashboardLayout from '../../components/common/DashboardLayout';
import CustomerFormModal from '../../components/customers/CustomerFormModal';
import DeleteCustomerModal from '../../components/customers/DeleteCustomerModal';
import CustomerReactivationTab from '../../components/customers/CustomerReactivationTab';
import CustomerBirthdaysTab from '../../components/customers/CustomerBirthdaysTab';
import { useCustomersStore } from '../../stores/customersStore';
import { LoadMoreSentinel } from '../../components/common/LoadMoreSentinel';
import { RANGE_PAGE_SIZE, useAppointmentsStore } from '../../stores/appointmentsStore';
import { addDays, format, subMonths } from 'date-fns';
import { useServicesStore } from '../../stores/servicesStore';
import { useAuthStore } from '../../stores/authStore';
import { Customer, NotificationPreference } from '../../types/customer.types';
import { computeInactiveCustomers } from '../../utils/reactivationUtils';
import { computeBirthdayCustomers } from '../../utils/birthdayUtils';
import { formatRutWithDots } from '../../utils/rutUtils';
import { Button, Badge, Card, Spinner, Alert, Modal } from '@/components/ui';

export default function CustomersPage() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const initialTab = (searchParams.get('tab') as 'directory' | 'reactivation' | 'birthdays') || 'directory';
    const [activeTab, setActiveTab] = useState<'directory' | 'reactivation' | 'birthdays'>(initialTab);
    const [search, setSearch] = useState('');
    const [showFormModal, setShowFormModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showSyncModal, setShowSyncModal] = useState(false);
    const [syncingAll, setSyncingAll] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    
    const { 
        customers, 
        totalCustomers,
        hasMoreCustomers,
        loadingMore,
        loadMoreCustomers,
        directory,
        loadingDirectory,
        fetchDirectory,
        loading, 
        error, 
        fetchCustomers, 
        deleteCustomer,
        syncAllCustomersVisits 
    } = useCustomersStore();
    const { appointments, isLoading: appointmentsLoading, fetchAppointments } = useAppointmentsStore();
    const { services, isLoading: servicesLoading, fetchServices } = useServicesStore();
    const { isAuthenticated, user } = useAuthStore();
    const isQuickCreateMode = searchParams.get('create') === '1';

    useEffect(() => {
        const tabParam = searchParams.get('tab');
        if (tabParam === 'birthdays' || tabParam === 'reactivation' || tabParam === 'directory') {
            setActiveTab(tabParam);
        }
    }, [searchParams]);

    useEffect(() => {
        if (isAuthenticated && user) {
            fetchCustomers();
            fetchDirectory(true);
            // Reactivación: última visita de cada clienta dentro de los últimos 12 meses
            const today = new Date();
            fetchAppointments({
                startDate: format(subMonths(today, 12), 'yyyy-MM-dd'),
                endDate: format(addDays(today, 90), 'yyyy-MM-dd'),
                size: RANGE_PAGE_SIZE,
            }).catch(() => {});
            fetchServices();
        }
    }, [isAuthenticated, user, fetchCustomers, fetchDirectory, fetchAppointments, fetchServices]);

    const showCustomerFormModal = showFormModal || isQuickCreateMode;

    // Calcular cantidad de clientas inactivas para la insignia del tab (sobre todas las clientas, no solo la página visible)
    const inactiveCustomersCount = useMemo(() => {
        return computeInactiveCustomers(directory, appointments).length;
    }, [directory, appointments]);

    // Calcular cumpleañeras del mes para la insignia del tab
    const { metrics: birthdayMetrics } = useMemo(() => {
        return computeBirthdayCustomers(directory);
    }, [directory]);

    const isFirstSearchRender = useRef(true);

    // Búsqueda en tiempo real a medida que se escribe (debounce de 300ms)
    useEffect(() => {
        if (isFirstSearchRender.current) {
            isFirstSearchRender.current = false;
            return;
        }

        const timer = setTimeout(() => {
            fetchCustomers(search.trim() || undefined);
        }, 300);

        return () => clearTimeout(timer);
    }, [search, fetchCustomers]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        fetchCustomers(search.trim() || undefined);
    };

    const handleClearSearch = () => {
        setSearch('');
        fetchCustomers();
    };

    const handleNewCustomer = () => {
        setSelectedCustomer(null);
        setShowFormModal(true);
    };

    const handleEditCustomer = (customer: Customer) => {
        setSelectedCustomer(customer);
        setShowFormModal(true);
    };

    const handleDeleteCustomer = (customer: Customer) => {
        setSelectedCustomer(customer);
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        if (!selectedCustomer) return;
        
        const success = await deleteCustomer(selectedCustomer.id);
        if (success) {
            setShowDeleteModal(false);
            setSelectedCustomer(null);
        }
    };

    const handleCloseFormModal = () => {
        setShowFormModal(false);
        setSelectedCustomer(null);
        if (isQuickCreateMode) {
            setSearchParams({}, { replace: true });
        }
    };

    const handleCloseDeleteModal = () => {
        setShowDeleteModal(false);
        setSelectedCustomer(null);
    };

    const handleCustomerFormSuccess = () => {
        const returnTo = searchParams.get('returnTo');
        if (isQuickCreateMode && returnTo) {
            navigate(returnTo, { replace: true });
        }
    };

    const isBirthdayThisMonth = (birthDate?: string) => {
        if (!birthDate) return false;
        try {
            const currentMonth = new Date().getMonth() + 1;
            const parts = birthDate.split('-');
            if (parts.length >= 2) {
                return parseInt(parts[1], 10) === currentMonth;
            }
        } catch {
            return false;
        }
        return false;
    };

    const getNotificationBadge = (pref?: NotificationPreference | string) => {
        if (!pref || pref === NotificationPreference.BOTH || pref === 'BOTH') {
            return <Badge variant="primary" className="text-[11px]">📧💬 WhatsApp + Email</Badge>;
        }
        if (pref === NotificationPreference.WHATSAPP_ONLY || pref === 'WHATSAPP_ONLY' || pref === 'WHATSAPP') {
            return <Badge variant="success" className="text-[11px]">💬 Solo WhatsApp</Badge>;
        }
        if (pref === NotificationPreference.EMAIL_ONLY || pref === 'EMAIL_ONLY' || pref === 'EMAIL') {
            return <Badge variant="info" className="text-[11px]">📧 Solo Email</Badge>;
        }
        if (pref === NotificationPreference.NONE || pref === 'NONE') {
            return <Badge variant="secondary" className="text-[11px]">🔕 Sin avisos</Badge>;
        }
        return <Badge variant="success" className="text-[11px]">💬 WhatsApp</Badge>;
    };

    const formatHealthNotes = (notes?: string) => {
        if (!notes || !notes.trim()) return <span className="text-slate-400 text-xs">Sin observaciones</span>;
        const isAlert = /alerg|diabet|hong|medic|sensib|dolor/i.test(notes);
        return (
            <div>
                {isAlert && <Badge variant="danger" className="mb-1 inline-block text-[10px]">⚠️ Alerta de Salud</Badge>}
                <div className="text-xs text-slate-500 leading-tight">
                    {notes.length > 70 ? `${notes.slice(0, 70)}...` : notes}
                </div>
            </div>
        );
    };

    const handleConfirmSyncAllVisits = async () => {
        setSyncingAll(true);
        try {
            await syncAllCustomersVisits();
            setShowSyncModal(false);
        } finally {
            setSyncingAll(false);
        }
    };

    return (
        <DashboardLayout>
            <div className="p-4 sm:p-6 lg:p-8 space-y-5 max-w-7xl mx-auto">
                {/* Header de Página */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-bunny-dark tracking-tight mb-1">
                            👥 Clientes &amp; Reactivación
                        </h1>
                        <p className="text-slate-500 text-sm">
                            Administra la base de datos de clientas y fideliza a las inactivas
                        </p>
                    </div>
                    <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
                        <Button 
                            variant="secondary" 
                            onClick={() => setShowSyncModal(true)}
                            className="flex-1 md:flex-initial flex items-center justify-center gap-2 text-xs sm:text-sm"
                            title="Recalcular visitas completadas de todos los clientes según sus citas reales"
                        >
                            🔄 <span className="hidden sm:inline">Sincronizar Visitas</span>
                            <span className="sm:hidden">Sincronizar</span>
                        </Button>
                        <Button 
                            variant="primary" 
                            onClick={handleNewCustomer}
                            className="flex-1 md:flex-initial bg-bunny-primary hover:bg-bunny-dark text-white font-semibold text-xs sm:text-sm"
                        >
                            ➕ Nuevo Cliente
                        </Button>
                    </div>
                </div>

                {/* Pestañas de Navegación */}
                <div className="flex items-center gap-2 flex-wrap border-b border-slate-200 pb-2">
                    <button
                        type="button"
                        onClick={() => {
                            setActiveTab('directory');
                            setSearchParams({});
                        }}
                        className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                            activeTab === 'directory'
                                ? 'bg-bunny-primary text-white shadow-sm'
                                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                        }`}
                    >
                        <span>👥 Directorio de Clientes</span>
                        <Badge 
                            variant={activeTab === 'directory' ? 'secondary' : 'secondary'} 
                            className={`text-xs ${activeTab === 'directory' ? 'bg-white/20 text-white' : ''}`}
                        >
                            {customers.length}
                        </Badge>
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            setActiveTab('birthdays');
                            setSearchParams({ tab: 'birthdays' });
                        }}
                        className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                            activeTab === 'birthdays'
                                ? 'bg-bunny-primary text-white shadow-sm'
                                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                        }`}
                    >
                        <span>🎂 Cumpleañeras del Mes</span>
                        {birthdayMetrics.totalThisMonth > 0 && (
                            <Badge 
                                variant={activeTab === 'birthdays' ? 'danger' : 'secondary'} 
                                className="text-xs"
                            >
                                {birthdayMetrics.totalThisMonth} este mes
                            </Badge>
                        )}
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            setActiveTab('reactivation');
                            setSearchParams({ tab: 'reactivation' });
                        }}
                        className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                            activeTab === 'reactivation'
                                ? 'bg-bunny-primary text-white shadow-sm'
                                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                        }`}
                    >
                        <span>✨ Reactivación de Clientas</span>
                        {inactiveCustomersCount > 0 && (
                            <Badge 
                                variant={activeTab === 'reactivation' ? 'danger' : 'warning'} 
                                className="text-xs"
                            >
                                {inactiveCustomersCount} inactivas
                            </Badge>
                        )}
                    </button>
                </div>

                {/* Vista: Directorio de Clientes */}
                {activeTab === 'directory' && (
                    <div className="space-y-4">
                        {/* Búsqueda */}
                        <div className="max-w-xl">
                            <Card className="border border-slate-200 shadow-sm bg-white">
                                <Card.Body className="p-3">
                                    <form onSubmit={handleSearch} className="flex gap-2">
                                        <input
                                            type="text"
                                            placeholder="Buscar por nombre, RUT (18.664.589-8 o 18664589-8) o teléfono..."
                                            value={search}
                                            onChange={(e) => setSearch(e.target.value)}
                                            className="w-full text-xs sm:text-sm rounded-lg border border-slate-300 p-2 focus:outline-none focus:ring-1 focus:ring-bunny-primary"
                                        />
                                        <Button type="submit" variant="primary" size="sm" disabled={loading} className="whitespace-nowrap flex items-center gap-1">
                                            {loading ? (
                                                <>
                                                    <Spinner size="sm" className="border-white mr-1" />
                                                    <span className="hidden sm:inline">Buscando...</span>
                                                </>
                                            ) : (
                                                <>
                                                    🔍 <span className="hidden sm:inline">Buscar</span>
                                                </>
                                            )}
                                        </Button>
                                        {search && (
                                            <Button 
                                                type="button" 
                                                variant="secondary"
                                                size="sm"
                                                onClick={handleClearSearch}
                                            >
                                                ✖️
                                            </Button>
                                        )}
                                    </form>
                                </Card.Body>
                            </Card>
                        </div>

                        {/* Error */}
                        {error && (
                            <Alert variant="danger" dismissible>
                                {error}
                            </Alert>
                        )}

                        {/* Tabla de Clientes */}
                        <Card className="border border-slate-200 shadow-sm bg-white overflow-hidden">
                            <Card.Header className="bg-slate-50 border-b border-slate-200 py-3 px-4 flex justify-between items-center">
                                <h5 className="font-bold text-sm sm:text-base text-slate-800 mb-0">Lista de Clientes</h5>
                                <div className="flex items-center gap-2">
                                    {loading && <Spinner size="sm" className="border-bunny-primary" />}
                                    <Badge variant="secondary">
                                        {totalCustomers > customers.length
                                            ? `Mostrando ${customers.length} de ${totalCustomers} clientas`
                                            : (totalCustomers === 1 || customers.length === 1 ? '1 clienta' : `${totalCustomers || customers.length} clientas`)}
                                    </Badge>
                                </div>
                            </Card.Header>
                            <Card.Body className="p-0">
                                {loading && customers.length === 0 ? (
                                    <div className="text-center py-12">
                                        <Spinner size="lg" className="border-bunny-primary mx-auto" />
                                        <p className="mt-2 text-slate-500 text-xs">Cargando clientes...</p>
                                    </div>
                                ) : !loading && customers.length === 0 ? (
                                    <div className="text-center py-12 px-4">
                                        <p className="text-slate-500 text-sm mb-0">
                                            {search 
                                                ? 'No se encontraron clientes con ese criterio'
                                                : 'No hay clientes registrados'
                                            }
                                        </p>
                                    </div>
                                ) : (
                                    <div className={loading ? 'opacity-60 transition-opacity' : ''}>
                                        {/* Vista Desktop: Tabla */}
                                        <div className="hidden md:block overflow-x-auto">
                                            <table className="w-full text-left text-xs sm:text-sm">
                                                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-xs uppercase tracking-wider">
                                                    <tr>
                                                        <th className="py-3 px-4 min-w-[220px]">Cliente</th>
                                                        <th className="py-3 px-4">Contacto Directo</th>
                                                        <th className="py-3 px-4">Notificaciones</th>
                                                        <th className="py-3 px-4">Ficha & Salud</th>
                                                        <th className="py-3 px-4 text-center min-w-[160px]">Acciones</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {customers.map((customer) => {
                                                        const rawPhone = (customer.phone || '').replace(/\D/g, '');
                                                        const waPhone = rawPhone.length === 9 ? `56${rawPhone}` : rawPhone;

                                                        return (
                                                            <tr key={customer.id} className="hover:bg-slate-50/60 transition-colors">
                                                                <td className="py-3 px-4">
                                                                    <div className="flex flex-col gap-1">
                                                                        <div className="flex items-center gap-2 flex-wrap">
                                                                            <span className="font-bold text-bunny-dark text-sm sm:text-base">
                                                                                {customer.fullName}
                                                                            </span>
                                                                            {customer.totalCompletedVisits !== undefined && customer.totalCompletedVisits >= 5 && (
                                                                                <Badge variant="warning" className="text-[10px]">👑 VIP</Badge>
                                                                            )}
                                                                            {customer.totalCompletedVisits !== undefined && customer.totalCompletedVisits < 2 && (
                                                                                <Badge variant="secondary" className="text-[10px]">✨ Nueva</Badge>
                                                                            )}
                                                                            {isBirthdayThisMonth(customer.birthDate) && (
                                                                                <Badge variant="danger" className="text-[10px]">🎂 Cumpleañera</Badge>
                                                                            )}
                                                                        </div>
                                                                        <div className="flex items-center gap-2 flex-wrap text-xs">
                                                                            {customer.rut ? (
                                                                                <span className="bg-slate-100 text-slate-600 border border-slate-200 px-1.5 py-0.5 rounded font-mono text-[11px]">
                                                                                    🆔 {formatRutWithDots(customer.rut)}
                                                                                </span>
                                                                            ) : (
                                                                                <span className="text-slate-400 italic text-[11px]">Sin RUT</span>
                                                                            )}
                                                                            <span className="text-slate-500 text-[11px]">
                                                                                ⭐ <strong className="text-slate-700">{customer.loyaltyStamps || 0}/10</strong> sellos &bull; {customer.totalCompletedVisits || 0} visitas
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="py-3 px-4">
                                                                    <div className="flex flex-col gap-1">
                                                                        <div className="flex items-center gap-2">
                                                                            <a href={`tel:${customer.phone}`} className="text-xs font-semibold text-bunny-dark hover:underline">
                                                                                📱 {customer.phone}
                                                                            </a>
                                                                            {rawPhone && (
                                                                                <a
                                                                                    href={`https://wa.me/${waPhone}`}
                                                                                    target="_blank"
                                                                                    rel="noopener noreferrer"
                                                                                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold px-2 py-0.5 rounded transition-colors"
                                                                                    title="Enviar WhatsApp"
                                                                                >
                                                                                    💬 WhatsApp
                                                                                </a>
                                                                            )}
                                                                        </div>
                                                                        {customer.email && (
                                                                            <span className="text-slate-400 text-xs truncate max-w-[200px]">
                                                                                ✉️ {customer.email}
                                                                            </span>
                                                                        )}
                                                                        {customer.instagram && (
                                                                            <span className="text-bunny-primary text-xs">
                                                                                📸 {customer.instagram.startsWith('@') ? customer.instagram : `@${customer.instagram}`}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                                <td className="py-3 px-4">{getNotificationBadge(customer.notificationPreference)}</td>
                                                                <td className="py-3 px-4">{formatHealthNotes(customer.healthNotes)}</td>
                                                                <td className="py-3 px-4 text-center">
                                                                    <div className="inline-flex items-center gap-1.5">
                                                                        <Button 
                                                                            variant="outline" 
                                                                            size="sm" 
                                                                            onClick={() => navigate(`/customers/${customer.id}`)}
                                                                            className="text-xs"
                                                                        >
                                                                            👁️ Ver Ficha
                                                                        </Button>
                                                                        <Button 
                                                                            variant="secondary" 
                                                                            size="sm" 
                                                                            onClick={() => handleEditCustomer(customer)}
                                                                            className="text-xs p-1.5"
                                                                        >
                                                                            ✏️
                                                                        </Button>
                                                                        <Button 
                                                                            variant="danger" 
                                                                            size="sm" 
                                                                            onClick={() => handleDeleteCustomer(customer)}
                                                                            className="text-xs p-1.5"
                                                                        >
                                                                            🗑️
                                                                        </Button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>

                                        {/* Vista Móvil: Cards */}
                                        <div className="md:hidden p-3 space-y-3">
                                            {customers.map((customer) => {
                                                const rawPhone = (customer.phone || '').replace(/\D/g, '');
                                                const waPhone = rawPhone.length === 9 ? `56${rawPhone}` : rawPhone;

                                                return (
                                                    <div key={customer.id} className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-sm space-y-2.5">
                                                        <div className="flex justify-between items-start gap-2">
                                                            <div className="min-w-0">
                                                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                                                    <h6 className="font-bold text-bunny-dark text-sm break-words">{customer.fullName}</h6>
                                                                    {customer.totalCompletedVisits !== undefined && customer.totalCompletedVisits >= 5 && (
                                                                        <Badge variant="warning" className="text-[9px]">👑 VIP</Badge>
                                                                    )}
                                                                    {isBirthdayThisMonth(customer.birthDate) && (
                                                                        <Badge variant="danger" className="text-[9px]">🎂</Badge>
                                                                    )}
                                                                </div>
                                                                <div className="flex items-center gap-2 flex-wrap text-xs">
                                                                    {customer.rut ? (
                                                                        <span className="bg-slate-100 text-slate-600 border border-slate-200 px-1 py-0.5 rounded font-mono text-[10.5px]">
                                                                            🆔 {formatRutWithDots(customer.rut)}
                                                                        </span>
                                                                    ) : (
                                                                        <span className="text-slate-400 italic text-[10.5px]">Sin RUT</span>
                                                                    )}
                                                                    <span className="text-slate-500 text-[11px]">
                                                                        ⭐ {customer.loyaltyStamps || 0}/10 sellos
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <div className="shrink-0">
                                                                {getNotificationBadge(customer.notificationPreference)}
                                                            </div>
                                                        </div>
                                                        
                                                        <div className="flex items-center gap-2">
                                                            <small className="text-slate-500 text-xs">📱 {customer.phone}</small>
                                                            {rawPhone && (
                                                                <a
                                                                    href={`https://wa.me/${waPhone}`}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-semibold px-2 py-0.5 rounded transition-colors"
                                                                >
                                                                    💬 WhatsApp
                                                                </a>
                                                            )}
                                                        </div>

                                                        <div>
                                                            {formatHealthNotes(customer.healthNotes)}
                                                        </div>
                                                        
                                                        <div className="flex gap-1.5 pt-1">
                                                            <Button 
                                                                variant="outline" 
                                                                size="sm" 
                                                                className="flex-1 text-xs"
                                                                onClick={() => navigate(`/customers/${customer.id}`)}
                                                            >
                                                                👁️ Ver Ficha
                                                            </Button>
                                                            <Button 
                                                                variant="secondary" 
                                                                size="sm" 
                                                                className="flex-1 text-xs"
                                                                onClick={() => handleEditCustomer(customer)}
                                                            >
                                                                ✏️ Editar
                                                            </Button>
                                                            <Button 
                                                                variant="danger" 
                                                                size="sm" 
                                                                onClick={() => handleDeleteCustomer(customer)}
                                                                className="text-xs p-2"
                                                            >
                                                                🗑️
                                                            </Button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        <LoadMoreSentinel
                                            hasMore={hasMoreCustomers}
                                            loading={loadingMore}
                                            onLoadMore={loadMoreCustomers}
                                            remaining={totalCustomers - customers.length}
                                        />
                                    </div>
                                )}
                            </Card.Body>
                        </Card>
                    </div>
                )}

                {/* Vista: Cumpleañeras del Mes */}
                {activeTab === 'birthdays' && (
                    <CustomerBirthdaysTab
                        customers={directory}
                        loading={loadingDirectory}
                    />
                )}

                {/* Vista: Reactivación de Clientas */}
                {activeTab === 'reactivation' && (
                    <CustomerReactivationTab
                        customers={directory}
                        appointments={appointments}
                        services={services}
                        loading={loadingDirectory || appointmentsLoading || servicesLoading}
                    />
                )}

                {/* Modales */}
                <CustomerFormModal
                    show={showCustomerFormModal}
                    onHide={handleCloseFormModal}
                    customer={selectedCustomer}
                    onSuccess={handleCustomerFormSuccess}
                />

                <DeleteCustomerModal
                    show={showDeleteModal}
                    onHide={handleCloseDeleteModal}
                    customer={selectedCustomer}
                    onConfirm={confirmDelete}
                    loading={loading}
                />

                {/* Modal de Sincronización Masiva de Visitas */}
                <Modal show={showSyncModal} onHide={() => !syncingAll && setShowSyncModal(false)} centered>
                    <Modal.Header closeButton={!syncingAll}>
                        <Modal.Title>
                            <span className="text-base font-bold text-slate-800">🔄 Sincronizar Visitas de Clientes</span>
                        </Modal.Title>
                    </Modal.Header>
                    <Modal.Body className="space-y-3">
                        <p className="text-slate-600 text-sm mb-0">
                            ¿Deseas recalcular las visitas registradas de <strong>todos los clientes ({customers.length})</strong> basándote en sus citas reales en estado <strong>COMPLETADA</strong>?
                        </p>
                        <Alert variant="info" className="text-xs">
                            ℹ️ Esta acción ajustará el contador de visitas históricas de cada cliente para que coincida exactamente con las citas completadas reales en la base de datos.
                        </Alert>
                    </Modal.Body>
                    <Modal.Footer>
                        <div className="w-full flex justify-end gap-2">
                            <Button 
                                variant="secondary" 
                                size="sm"
                                onClick={() => setShowSyncModal(false)} 
                                disabled={syncingAll}
                            >
                                Cancelar
                            </Button>
                            <Button 
                                variant="primary" 
                                size="sm"
                                onClick={handleConfirmSyncAllVisits} 
                                disabled={syncingAll}
                                className="flex items-center gap-1.5"
                            >
                                {syncingAll ? (
                                    <>
                                        <Spinner size="sm" className="border-white" />
                                        Sincronizando...
                                    </>
                                ) : (
                                    'Confirmar Sincronización'
                                )}
                            </Button>
                        </div>
                    </Modal.Footer>
                </Modal>
            </div>
        </DashboardLayout>
    );
}
