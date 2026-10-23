import React, { useEffect, useMemo, useState } from 'react';
import {
    Check,
    CheckCheck,
    RefreshCw,
    AlertTriangle,
    Trash2,
    Inbox,
} from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa';
import { whatsappMessagesApi, IncomingWhatsAppMessageDto } from '@/api/whatsappMessages.api';
import { whatsappOutboxApi, WhatsAppOutboxMessageDto } from '@/api/whatsappOutbox.api';
import { useToast } from '@/hooks/useToast';
import {
    DashCard,
    Spinner,
    DIVIDER,
    TEXT_DARK,
    TEXT_MID,
    formatMessageTime,
} from './DashboardCommon';
import { confirmDialog } from '../../../components/ui/confirmDialog';

interface ClientWhatsAppGroup {
    clientKey: string;
    senderName: string;
    customerName?: string | null;
    customerId?: number | null;
    fromPhone: string;
    unreadCount: number;
    totalCount: number;
    latestCreatedAt: string;
    messages: IncomingWhatsAppMessageDto[];
    replyUrl: string;
}

export const WhatsAppManagerWidget: React.FC = () => {
    const toast = useToast();
    const [whatsappMessages, setWhatsappMessages] = useState<IncomingWhatsAppMessageDto[]>([]);
    const [unreadWaCount, setUnreadWaCount] = useState<number>(0);
    const [waLoading, setWaLoading] = useState<boolean>(false);
    const [waInboxView, setWaInboxView] = useState<'UNREAD' | 'READ' | 'ALL'>('UNREAD');
    const [waActiveTab, setWaActiveTab] = useState<'INBOX' | 'OUTBOX'>('INBOX');
    const [outboxMessages, setOutboxMessages] = useState<WhatsAppOutboxMessageDto[]>([]);
    const [pendingOutboxCount, setPendingOutboxCount] = useState<number>(0);
    const [outboxLoading, setOutboxLoading] = useState<boolean>(false);
    const [retryingId, setRetryingId] = useState<number | null>(null);
    const [retryingAll, setRetryingAll] = useState<boolean>(false);
    const [discardingId, setDiscardingId] = useState<number | null>(null);

    const groupedWaMessages = useMemo<ClientWhatsAppGroup[]>(() => {
        const map = new Map<string, ClientWhatsAppGroup>();

        for (const msg of whatsappMessages) {
            const cleanPhone = (msg.fromPhone || '').replace(/\D/g, '');
            const key = msg.customerId ? `c_${msg.customerId}` : `p_${cleanPhone || msg.senderName || msg.id}`;

            if (!map.has(key)) {
                map.set(key, {
                    clientKey: key,
                    senderName: msg.senderName || msg.customerName || (msg.fromPhone ? `+${msg.fromPhone}` : 'Clienta'),
                    customerName: msg.customerName,
                    customerId: msg.customerId,
                    fromPhone: msg.fromPhone,
                    unreadCount: 0,
                    totalCount: 0,
                    latestCreatedAt: msg.createdAt,
                    messages: [],
                    replyUrl: msg.replyUrl,
                });
            }

            const group = map.get(key)!;
            group.messages.push(msg);
            group.totalCount += 1;
            if (!msg.isRead) {
                group.unreadCount += 1;
            }

            if (new Date(msg.createdAt).getTime() > new Date(group.latestCreatedAt).getTime()) {
                group.latestCreatedAt = msg.createdAt;
                group.replyUrl = msg.replyUrl;
                if (msg.senderName) group.senderName = msg.senderName;
                if (msg.customerName) group.customerName = msg.customerName;
            }
        }

        for (const group of map.values()) {
            group.messages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        }

        return Array.from(map.values()).sort(
            (a, b) => new Date(b.latestCreatedAt).getTime() - new Date(a.latestCreatedAt).getTime()
        );
    }, [whatsappMessages]);

    const loadWhatsAppMessages = async (view: 'UNREAD' | 'READ' | 'ALL' = waInboxView) => {
        setWaLoading(true);
        try {
            const isUnread = view === 'UNREAD';
            const isRead = view === 'READ';
            const [resp, count] = await Promise.all([
                whatsappMessagesApi.getMessages(0, 50, isUnread, isRead),
                whatsappMessagesApi.getUnreadCount(),
            ]);
            setWhatsappMessages(resp.content || []);
            setUnreadWaCount(count);
        } catch (error) {
            console.error("Error cargando mensajes de WhatsApp:", error);
        } finally {
            setWaLoading(false);
        }
    };

    const loadOutboxMessages = async () => {
        setOutboxLoading(true);
        try {
            const [resp, count] = await Promise.all([
                whatsappOutboxApi.getMessages(0, 20, true),
                whatsappOutboxApi.getPendingCount(),
            ]);
            setOutboxMessages(resp.content || []);
            setPendingOutboxCount(count);
        } catch (error) {
            console.error("Error cargando mensajes outbox de WhatsApp:", error);
        } finally {
            setOutboxLoading(false);
        }
    };

    useEffect(() => {
        loadWhatsAppMessages('UNREAD');
        loadOutboxMessages();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleRetryOne = async (id: number) => {
        setRetryingId(id);
        try {
            const res = await whatsappOutboxApi.retryMessage(id);
            if (res.success) {
                toast.success(res.message || 'Mensaje reintentado y enviado exitosamente');
                await loadOutboxMessages();
            } else {
                toast.error(res.error || res.message || 'Falló el reintento');
                await loadOutboxMessages();
            }
        } catch (e: any) {
            toast.error(e?.response?.data?.message || 'Error al reintentar el mensaje');
        } finally {
            setRetryingId(null);
        }
    };

    const handleRetryAll = async () => {
        setRetryingAll(true);
        try {
            const res = await whatsappOutboxApi.retryAll();
            toast.info(`Reintento completado: ${res.succeeded} exitosos, ${res.failed} fallidos de ${res.total}`);
            await loadOutboxMessages();
        } catch (e: any) {
            toast.error(e?.response?.data?.message || 'Error al reintentar mensajes');
        } finally {
            setRetryingAll(false);
        }
    };

    const handleDiscardOne = async (id: number) => {
        setDiscardingId(id);
        try {
            await whatsappOutboxApi.discardMessage(id);
            toast.success('Mensaje descartado de la cola');
            setOutboxMessages((prev) => prev.filter((m) => m.id !== id));
            setPendingOutboxCount((prev) => Math.max(0, prev - 1));
        } catch (e: any) {
            toast.error(e?.response?.data?.message || 'Error al descartar el mensaje');
        } finally {
            setDiscardingId(null);
        }
    };

    const handleDiscardAll = async () => {
        if (!(await confirmDialog({ message: '¿Descartar todos los mensajes fallidos? Ya no se podrán reintentar.', confirmLabel: 'Descartar todos', tone: 'danger' }))) {
            return;
        }
        try {
            const count = await whatsappOutboxApi.discardAll();
            toast.success(`${count} mensaje(s) descartado(s) correctamente`);
            setOutboxMessages([]);
            setPendingOutboxCount(0);
        } catch (e: any) {
            toast.error(e?.response?.data?.message || 'Error al descartar los mensajes');
        }
    };

    const handleMarkWaAsRead = async (id: number) => {
        try {
            await whatsappMessagesApi.markAsRead(id);
            setWhatsappMessages((prev) => {
                if (waInboxView === 'UNREAD') {
                    return prev.filter((m) => m.id !== id);
                }
                return prev.map((m) => (m.id === id ? { ...m, isRead: true } : m));
            });
            setUnreadWaCount((prev) => Math.max(0, prev - 1));
            toast.success('Mensaje marcado como leído');
        } catch {
            toast.error('No se pudo marcar como leído');
        }
    };

    const handleMarkClientAsRead = async (group: ClientWhatsAppGroup) => {
        try {
            if (group.fromPhone) {
                await whatsappMessagesApi.markByPhoneAsRead(group.fromPhone);
            } else {
                await Promise.all(
                    group.messages.filter((m) => !m.isRead).map((m) => whatsappMessagesApi.markAsRead(m.id))
                );
            }
            setWhatsappMessages((prev) => {
                const groupMsgIds = new Set(group.messages.map((m) => m.id));
                if (waInboxView === 'UNREAD') {
                    return prev.filter((m) => !groupMsgIds.has(m.id));
                }
                return prev.map((m) => (groupMsgIds.has(m.id) ? { ...m, isRead: true } : m));
            });
            setUnreadWaCount((prev) => Math.max(0, prev - group.unreadCount));
            toast.success(`Mensajes de ${group.senderName} marcados como leídos`);
        } catch {
            toast.error('No se pudieron marcar los mensajes como leídos');
        }
    };

    const handleMarkAllWaAsRead = async () => {
        try {
            await whatsappMessagesApi.markAllAsRead();
            if (waInboxView === 'UNREAD') {
                setWhatsappMessages([]);
            } else {
                setWhatsappMessages((prev) => prev.map((m) => ({ ...m, isRead: true })));
            }
            setUnreadWaCount(0);
            toast.success('Todos los mensajes marcados como leídos');
        } catch {
            toast.error('No se pudieron marcar todos como leídos');
        }
    };

    const handleSwitchWaInboxView = (newView: 'UNREAD' | 'READ' | 'ALL') => {
        setWaInboxView(newView);
        loadWhatsAppMessages(newView);
    };

    return (
        <DashCard style={{ padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        background: '#e8f7ee',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#25D366'
                    }}>
                        <FaWhatsapp size={22} />
                    </div>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontWeight: 700, fontSize: '15px', color: TEXT_DARK }}>
                                Gestión de WhatsApp
                            </span>
                        </div>
                        <div style={{ fontSize: '12px', color: TEXT_MID }}>
                            Mensajes recibidos de clientas y cola de reintentos de notificaciones automáticas.
                        </div>
                    </div>
                </div>

                {/* Pestañas principales: Bandeja Entrada vs No Entregados / Reintentos */}
                <div style={{ display: 'inline-flex', background: '#f0f2f5', padding: '3px', borderRadius: '10px', gap: '4px' }}>
                    <button
                        type="button"
                        onClick={() => setWaActiveTab('INBOX')}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            border: 'none',
                            background: waActiveTab === 'INBOX' ? '#fff' : 'transparent',
                            color: waActiveTab === 'INBOX' ? '#128C7E' : TEXT_MID,
                            fontWeight: waActiveTab === 'INBOX' ? 700 : 500,
                            fontSize: '12px',
                            padding: '5px 12px',
                            borderRadius: '7px',
                            cursor: 'pointer',
                            boxShadow: waActiveTab === 'INBOX' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                        }}
                    >
                        <Inbox size={13} />
                        <span>Recibidos</span>
                        {unreadWaCount > 0 && (
                            <span style={{
                                background: '#25D366',
                                color: '#fff',
                                fontSize: '10px',
                                fontWeight: 700,
                                padding: '1px 6px',
                                borderRadius: '999px',
                            }}>
                                {unreadWaCount}
                            </span>
                        )}
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            setWaActiveTab('OUTBOX');
                            loadOutboxMessages();
                        }}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            border: 'none',
                            background: waActiveTab === 'OUTBOX' ? '#fff' : 'transparent',
                            color: waActiveTab === 'OUTBOX' ? '#d93829' : TEXT_MID,
                            fontWeight: waActiveTab === 'OUTBOX' ? 700 : 500,
                            fontSize: '12px',
                            padding: '5px 12px',
                            borderRadius: '7px',
                            cursor: 'pointer',
                            boxShadow: waActiveTab === 'OUTBOX' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                        }}
                    >
                        <AlertTriangle size={13} style={{ color: pendingOutboxCount > 0 ? '#d93829' : TEXT_MID }} />
                        <span>No Entregados / Reintentos</span>
                        {pendingOutboxCount > 0 && (
                            <span style={{
                                background: '#d93829',
                                color: '#fff',
                                fontSize: '10px',
                                fontWeight: 700,
                                padding: '1px 6px',
                                borderRadius: '999px',
                            }}>
                                {pendingOutboxCount}
                            </span>
                        )}
                    </button>
                </div>
            </div>

            {/* VISTA 1: BANDEJA DE ENTRADA (Mensajes de clientas) */}
            {waActiveTab === 'INBOX' && (
                <div>
                    {/* Selector de sub-vistas: No leídos (default) | Leídos | Todos */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                        <div style={{ display: 'inline-flex', background: '#f0f2f5', padding: '3px', borderRadius: '9px', gap: '3px' }}>
                            <button
                                type="button"
                                onClick={() => handleSwitchWaInboxView('UNREAD')}
                                style={{
                                    border: 'none',
                                    background: waInboxView === 'UNREAD' ? '#fff' : 'transparent',
                                    color: waInboxView === 'UNREAD' ? '#128C7E' : TEXT_MID,
                                    fontWeight: waInboxView === 'UNREAD' ? 700 : 500,
                                    fontSize: '12px',
                                    padding: '5px 12px',
                                    borderRadius: '7px',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    boxShadow: waInboxView === 'UNREAD' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                    transition: 'all 0.15s ease',
                                }}
                            >
                                <span>No leídos</span>
                                {unreadWaCount > 0 && (
                                    <span style={{
                                        background: '#25D366',
                                        color: '#fff',
                                        fontSize: '10px',
                                        fontWeight: 700,
                                        padding: '1px 6px',
                                        borderRadius: '999px',
                                    }}>
                                        {unreadWaCount}
                                    </span>
                                )}
                            </button>

                            <button
                                type="button"
                                onClick={() => handleSwitchWaInboxView('READ')}
                                style={{
                                    border: 'none',
                                    background: waInboxView === 'READ' ? '#fff' : 'transparent',
                                    color: waInboxView === 'READ' ? '#128C7E' : TEXT_MID,
                                    fontWeight: waInboxView === 'READ' ? 700 : 500,
                                    fontSize: '12px',
                                    padding: '5px 12px',
                                    borderRadius: '7px',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    boxShadow: waInboxView === 'READ' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                    transition: 'all 0.15s ease',
                                }}
                            >
                                <span>Leídos</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => handleSwitchWaInboxView('ALL')}
                                style={{
                                    border: 'none',
                                    background: waInboxView === 'ALL' ? '#fff' : 'transparent',
                                    color: waInboxView === 'ALL' ? TEXT_DARK : TEXT_MID,
                                    fontWeight: waInboxView === 'ALL' ? 700 : 500,
                                    fontSize: '12px',
                                    padding: '5px 12px',
                                    borderRadius: '7px',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    boxShadow: waInboxView === 'ALL' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                    transition: 'all 0.15s ease',
                                }}
                            >
                                <span>Todos</span>
                            </button>
                        </div>

                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            {unreadWaCount > 0 && waInboxView === 'UNREAD' && (
                                <button
                                    type="button"
                                    onClick={handleMarkAllWaAsRead}
                                    title="Marcar todos los mensajes como leídos"
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '5px',
                                        background: '#f8f9fa',
                                        color: TEXT_MID,
                                        border: `1px solid ${DIVIDER}`,
                                        borderRadius: '8px',
                                        padding: '5px 11px',
                                        fontSize: '11.5px',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        transition: 'background 0.15s',
                                    }}
                                >
                                    <CheckCheck size={14} style={{ color: '#128C7E' }} />
                                    <span>Marcar todo leído</span>
                                </button>
                            )}

                            <button
                                type="button"
                                onClick={() => loadWhatsAppMessages()}
                                title="Actualizar mensajes"
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '8px',
                                    border: `1px solid ${DIVIDER}`,
                                    background: '#fff',
                                    color: TEXT_MID,
                                    cursor: 'pointer',
                                }}
                            >
                                <RefreshCw size={14} style={{ animation: waLoading ? 'spin 1s linear infinite' : 'none' }} />
                            </button>
                        </div>
                    </div>

                    {/* Estado de carga */}
                    {waLoading && whatsappMessages.length === 0 ? (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: '28px' }}>
                            <Spinner />
                        </div>
                    ) : groupedWaMessages.length === 0 ? (
                        <div style={{
                            textAlign: 'center',
                            padding: '28px 16px',
                            background: '#fafafa',
                            borderRadius: '12px',
                            border: `1px dashed #dcdcdc`,
                            color: TEXT_MID,
                            fontSize: '13px',
                        }}>
                            {waInboxView === 'UNREAD' ? (
                                <>
                                    <div style={{ fontSize: '24px', marginBottom: '8px' }}>✨</div>
                                    <div style={{ fontWeight: 700, fontSize: '14px', color: TEXT_DARK, marginBottom: '4px' }}>
                                        ¡Estás al día!
                                    </div>
                                    <div>No tienes mensajes sin leer pendientes de clientas.</div>
                                    <button
                                        type="button"
                                        onClick={() => handleSwitchWaInboxView('READ')}
                                        style={{
                                            marginTop: '12px',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '5px',
                                            border: 'none',
                                            background: '#e8f7ee',
                                            color: '#128C7E',
                                            fontWeight: 600,
                                            fontSize: '12px',
                                            padding: '5px 12px',
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        Ver mensajes leídos &rarr;
                                    </button>
                                </>
                            ) : waInboxView === 'READ' ? (
                                <>
                                    <div style={{ fontSize: '24px', marginBottom: '8px' }}>📬</div>
                                    <div style={{ fontWeight: 700, fontSize: '14px', color: TEXT_DARK, marginBottom: '4px' }}>
                                        Sin mensajes en el historial
                                    </div>
                                    <div>Aún no hay mensajes marcados como leídos.</div>
                                </>
                            ) : (
                                <>
                                    <div style={{ fontSize: '24px', marginBottom: '8px' }}>💬</div>
                                    <div style={{ fontWeight: 700, fontSize: '14px', color: TEXT_DARK, marginBottom: '4px' }}>
                                        Sin mensajes registrados
                                    </div>
                                    <div>Cuando tus clientas te escriban por WhatsApp, aparecerán aquí agrupadas por contacto.</div>
                                </>
                            )}
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {groupedWaMessages.map((group) => {
                                const isGroupUnread = group.unreadCount > 0;
                                const hasMultipleMessages = group.messages.length > 1;

                                return (
                                    <div
                                        key={group.clientKey}
                                        style={{
                                            border: isGroupUnread ? '1.5px solid #a7e3c4' : `1px solid ${DIVIDER}`,
                                            background: isGroupUnread ? '#f8fcf9' : '#ffffff',
                                            borderRadius: '14px',
                                            padding: '14px 16px',
                                            boxShadow: isGroupUnread ? '0 2px 8px rgba(18, 140, 126, 0.07)' : '0 1px 3px rgba(0,0,0,0.03)',
                                            transition: 'all 0.2s ease',
                                        }}
                                    >
                                        <div style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'flex-start',
                                            flexWrap: 'wrap',
                                            gap: '10px',
                                            marginBottom: '10px'
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <div style={{
                                                    width: '36px',
                                                    height: '36px',
                                                    borderRadius: '50%',
                                                    background: isGroupUnread ? '#dcf8e6' : '#edf2f7',
                                                    color: isGroupUnread ? '#0d683c' : '#718096',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontWeight: 700,
                                                    fontSize: '14px',
                                                    flexShrink: 0,
                                                }}>
                                                    {group.senderName ? group.senderName.charAt(0).toUpperCase() : '💬'}
                                                </div>

                                                <div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                        <span style={{ fontWeight: 700, fontSize: '14px', color: TEXT_DARK }}>
                                                            {group.senderName}
                                                        </span>

                                                        {group.customerName && (
                                                            <span style={{
                                                                fontSize: '10.5px',
                                                                fontWeight: 700,
                                                                background: '#e8f7ee',
                                                                color: '#128C7E',
                                                                padding: '1.5px 7px',
                                                                borderRadius: '5px',
                                                            }}>
                                                                Clienta
                                                            </span>
                                                        )}

                                                        {isGroupUnread ? (
                                                            <span style={{
                                                                fontSize: '10.5px',
                                                                fontWeight: 700,
                                                                background: '#25D366',
                                                                color: '#ffffff',
                                                                padding: '2px 8px',
                                                                borderRadius: '999px',
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: '4px',
                                                                boxShadow: '0 1px 3px rgba(37, 211, 102, 0.35)',
                                                            }}>
                                                                {group.unreadCount === 1 ? '1 no leído' : `${group.unreadCount} no leídos`}
                                                            </span>
                                                        ) : (
                                                            <span style={{
                                                                fontSize: '10.5px',
                                                                fontWeight: 600,
                                                                background: '#f1f3f5',
                                                                color: '#6c757d',
                                                                padding: '1.5px 7px',
                                                                borderRadius: '5px',
                                                            }}>
                                                                Leído
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px', fontSize: '11.5px', color: TEXT_MID }}>
                                                        <span style={{ fontFamily: 'monospace', fontWeight: 500 }}>
                                                            +{group.fromPhone}
                                                        </span>
                                                        <span>&bull;</span>
                                                        <span>
                                                            {formatMessageTime(group.latestCreatedAt)}
                                                        </span>
                                                        {hasMultipleMessages && (
                                                            <>
                                                                <span>&bull;</span>
                                                                <span style={{ fontWeight: 600, color: isGroupUnread ? '#128C7E' : TEXT_MID }}>
                                                                    {group.messages.length} mensajes agrupados
                                                                </span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                                                {isGroupUnread && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleMarkClientAsRead(group)}
                                                        title={hasMultipleMessages ? 'Marcar todos los mensajes de esta clienta como leídos' : 'Marcar como leído'}
                                                        style={{
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '5px',
                                                            background: '#edf2f7',
                                                            color: '#334155',
                                                            border: '1px solid #cbd5e1',
                                                            borderRadius: '7px',
                                                            padding: '5px 10px',
                                                            fontSize: '11.5px',
                                                            fontWeight: 600,
                                                            cursor: 'pointer',
                                                        }}
                                                    >
                                                        <CheckCheck size={14} style={{ color: '#0d683c' }} />
                                                        <span>{hasMultipleMessages ? 'Marcar leídos' : 'Marcar leído'}</span>
                                                    </button>
                                                )}

                                                <a
                                                    href={group.replyUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '5px',
                                                        background: '#25D366',
                                                        color: '#ffffff',
                                                        border: 'none',
                                                        borderRadius: '7px',
                                                        padding: '5px 12px',
                                                        fontSize: '12px',
                                                        fontWeight: 700,
                                                        textDecoration: 'none',
                                                        boxShadow: '0 2px 5px rgba(37, 211, 102, 0.28)',
                                                    }}
                                                >
                                                    <FaWhatsapp size={14} />
                                                    <span>💬 Responder en WhatsApp</span>
                                                </a>
                                            </div>
                                        </div>

                                        <div style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '6px',
                                            background: isGroupUnread ? 'rgba(255, 255, 255, 0.9)' : '#f8f9fa',
                                            border: `1px solid ${isGroupUnread ? '#d8f0e3' : '#ebebeb'}`,
                                            borderRadius: '10px',
                                            padding: '8px 10px',
                                        }}>
                                            {group.messages.map((msg, idx) => (
                                                <div
                                                    key={msg.id}
                                                    style={{
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'center',
                                                        gap: '10px',
                                                        padding: '7px 10px',
                                                        borderRadius: '7px',
                                                        background: !msg.isRead ? '#ffffff' : 'transparent',
                                                        border: !msg.isRead ? '1px solid #bfead4' : '1px solid transparent',
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flex: 1, minWidth: 0 }}>
                                                        {hasMultipleMessages && (
                                                            <span style={{
                                                                fontSize: '10.5px',
                                                                fontWeight: 700,
                                                                color: !msg.isRead ? '#128C7E' : '#94a3b8',
                                                                minWidth: '18px',
                                                            }}>
                                                                #{idx + 1}
                                                            </span>
                                                        )}
                                                        <div style={{
                                                            fontSize: '13px',
                                                            color: '#1f2937',
                                                            lineHeight: 1.4,
                                                            wordBreak: 'break-word',
                                                            whiteSpace: 'pre-wrap',
                                                        }}>
                                                            «{msg.content}»
                                                        </div>
                                                    </div>

                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                                                        <span style={{ fontSize: '11px', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                                                            {formatMessageTime(msg.createdAt)}
                                                        </span>

                                                        {!msg.isRead && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleMarkWaAsRead(msg.id)}
                                                                title="Marcar este mensaje individual como leído"
                                                                style={{
                                                                    display: 'inline-flex',
                                                                    alignItems: 'center',
                                                                    gap: '3px',
                                                                    background: '#edf2f7',
                                                                    color: '#475569',
                                                                    border: '1px solid #e2e8f0',
                                                                    borderRadius: '5px',
                                                                    padding: '2px 7px',
                                                                    fontSize: '11px',
                                                                    fontWeight: 600,
                                                                    cursor: 'pointer',
                                                                }}
                                                            >
                                                                <Check size={12} style={{ color: '#0d683c' }} />
                                                                <span>Leído</span>
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* VISTA 2: NO ENTREGADOS / REINTENTOS (Outbox) */}
            {waActiveTab === 'OUTBOX' && (
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                        <div style={{ fontSize: '12.5px', color: TEXT_MID }}>
                            {pendingOutboxCount === 0 ? (
                                <span>No hay notificaciones pendientes ni errores registrados.</span>
                            ) : (
                                <span>Hay <strong>{pendingOutboxCount}</strong> mensaje(s) que no pudieron ser entregados por Meta.</span>
                            )}
                        </div>

                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            {pendingOutboxCount > 0 && (
                                <>
                                    <button
                                        type="button"
                                        onClick={handleRetryAll}
                                        disabled={retryingAll}
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '5px',
                                            background: '#128C7E',
                                            color: '#fff',
                                            border: 'none',
                                            borderRadius: '8px',
                                            padding: '5px 12px',
                                            fontSize: '11.5px',
                                            fontWeight: 700,
                                            cursor: retryingAll ? 'not-allowed' : 'pointer',
                                            boxShadow: '0 1px 3px rgba(18,140,126,0.3)',
                                        }}
                                    >
                                        <RefreshCw size={13} style={{ animation: retryingAll ? 'spin 1s linear infinite' : 'none' }} />
                                        <span>{retryingAll ? 'Reintentando...' : `Reintentar todos (${pendingOutboxCount})`}</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={handleDiscardAll}
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '5px',
                                            background: '#fff',
                                            color: '#e05244',
                                            border: `1px solid #fed7d7`,
                                            borderRadius: '8px',
                                            padding: '5px 10px',
                                            fontSize: '11.5px',
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                        }}
                                    >
                                        <Trash2 size={13} />
                                        <span>Descartar todos</span>
                                    </button>
                                </>
                            )}

                            <button
                                type="button"
                                onClick={loadOutboxMessages}
                                title="Actualizar cola"
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: '30px',
                                    height: '30px',
                                    borderRadius: '8px',
                                    border: `1px solid ${DIVIDER}`,
                                    background: '#fff',
                                    color: TEXT_MID,
                                    cursor: 'pointer',
                                }}
                            >
                                <RefreshCw size={14} style={{ animation: outboxLoading ? 'spin 1s linear infinite' : 'none' }} />
                            </button>
                        </div>
                    </div>

                    {outboxLoading && outboxMessages.length === 0 ? (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: '24px' }}>
                            <Spinner />
                        </div>
                    ) : outboxMessages.length === 0 ? (
                        <div style={{
                            textAlign: 'center',
                            padding: '24px 16px',
                            background: '#f8faf9',
                            borderRadius: '10px',
                            border: `1px dashed #c6e7d6`,
                            color: '#2d6a4f',
                            fontSize: '13px',
                        }}>
                            <div style={{ fontSize: '22px', marginBottom: '6px' }}>🎉</div>
                            <div style={{ fontWeight: 600 }}>¡Excelente! No hay mensajes fallidos.</div>
                            <div style={{ fontSize: '12px', color: TEXT_MID, marginTop: '3px' }}>
                                Todas las confirmaciones y recordatorios salientes han sido procesados sin errores.
                            </div>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {outboxMessages.map((msg) => (
                                <div
                                    key={msg.id}
                                    style={{
                                        border: '1px solid #fecaca',
                                        background: '#fffbfb',
                                        borderRadius: '12px',
                                        padding: '12px 14px',
                                        transition: 'box-shadow 0.15s ease',
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                            <span style={{ fontWeight: 700, fontSize: '13.5px', color: TEXT_DARK }}>
                                                {msg.customerName || msg.recipientPhone}
                                            </span>
                                            <span style={{
                                                fontSize: '10.5px',
                                                fontWeight: 700,
                                                background: '#fee2e2',
                                                color: '#b91c1c',
                                                padding: '1px 7px',
                                                borderRadius: '4px',
                                                fontFamily: 'monospace',
                                            }}>
                                                {msg.templateName ? `Plantilla: ${msg.templateName}` : 'Texto plano'}
                                            </span>
                                            <span style={{
                                                fontSize: '10.5px',
                                                fontWeight: 600,
                                                background: '#fef3c7',
                                                color: '#92400e',
                                                padding: '1px 6px',
                                                borderRadius: '4px',
                                            }}>
                                                Intento #{msg.attemptCount}
                                            </span>
                                        </div>

                                        <span style={{ fontSize: '11px', color: '#888' }}>
                                            {msg.formattedLastAttemptAt || msg.formattedCreatedAt || msg.createdAt}
                                        </span>
                                    </div>

                                    {msg.summaryContent && (
                                        <div style={{ fontSize: '12px', color: '#4a5568', marginBottom: '8px' }}>
                                            {msg.summaryContent}
                                        </div>
                                    )}

                                    {msg.lastError && (
                                        <div style={{
                                            background: '#fff1f2',
                                            border: '1px solid #ffe4e6',
                                            borderRadius: '6px',
                                            padding: '7px 10px',
                                            fontSize: '11.5px',
                                            color: '#9f1239',
                                            lineHeight: 1.4,
                                            marginBottom: '10px',
                                            wordBreak: 'break-word',
                                            display: 'flex',
                                            alignItems: 'flex-start',
                                            gap: '6px',
                                        }}>
                                            <AlertTriangle size={13} style={{ flexShrink: 0, marginTop: '2px', color: '#e11d48' }} />
                                            <div>
                                                <strong>Error de Meta:</strong> {msg.lastError}
                                            </div>
                                        </div>
                                    )}

                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                                        <span style={{ fontSize: '11.5px', color: TEXT_MID, fontFamily: 'monospace' }}>
                                            +{msg.recipientPhone}
                                        </span>

                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                            <button
                                                type="button"
                                                onClick={() => handleDiscardOne(msg.id)}
                                                disabled={discardingId === msg.id}
                                                style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '4px',
                                                    background: '#edf2f7',
                                                    color: '#4a5568',
                                                    border: 'none',
                                                    borderRadius: '6px',
                                                    padding: '5px 10px',
                                                    fontSize: '11.5px',
                                                    fontWeight: 600,
                                                    cursor: discardingId === msg.id ? 'not-allowed' : 'pointer',
                                                }}
                                            >
                                                <Trash2 size={13} />
                                                <span>Descartar</span>
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => handleRetryOne(msg.id)}
                                                disabled={retryingId === msg.id}
                                                style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '5px',
                                                    background: '#128C7E',
                                                    color: '#ffffff',
                                                    border: 'none',
                                                    borderRadius: '6px',
                                                    padding: '5px 12px',
                                                    fontSize: '12px',
                                                    fontWeight: 700,
                                                    cursor: retryingId === msg.id ? 'not-allowed' : 'pointer',
                                                    boxShadow: '0 2px 4px rgba(18, 140, 126, 0.25)',
                                                }}
                                            >
                                                <RefreshCw size={13} style={{ animation: retryingId === msg.id ? 'spin 1s linear infinite' : 'none' }} />
                                                <span>{retryingId === msg.id ? 'Reintentando...' : 'Reintentar'}</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </DashCard>
    );
};
