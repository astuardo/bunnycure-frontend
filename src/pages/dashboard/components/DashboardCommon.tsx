/* eslint-disable react-refresh/only-export-components */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, isToday, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Appointment, AppointmentStatus } from '@/types/appointment.types';
import { ServiceSummary } from '@/types/service.types';

export const PAGE_BG = '#fcf6f3';
export const TEXT_DARK = '#4a332a';
export const TEXT_MID = '#9c7b6e';
export const CARD_PAD = '18px';
export const DIVIDER = '1px solid #f0e0d8';

export const formatCurrency = (value: number) => `$${value.toLocaleString('es-CL')}`;

export function getAppointmentServices(apt: Appointment): ServiceSummary[] {
    if (apt.services && apt.services.length > 0) return apt.services;
    return apt.service ? [apt.service] : [];
}

export function statusLabel(status: AppointmentStatus): string {
    const map: Record<AppointmentStatus, string> = {
        PENDING: 'Pendiente',
        CONFIRMED: 'Confirmada',
        COMPLETED: 'Completada',
        CANCELLED: 'Cancelada',
        RESCHEDULE_REQUESTED: 'Reprogramar',
    };
    return map[status] ?? status;
}

export function statusPillStyle(status: AppointmentStatus): React.CSSProperties {
    switch (status) {
        case AppointmentStatus.PENDING:
            return { background: '#fde8cc', color: '#7c4a00' };
        case AppointmentStatus.CONFIRMED:
            return { background: '#d4edda', color: '#155724' };
        case AppointmentStatus.COMPLETED:
            return { background: '#c8e6e0', color: '#0d5c4a' };
        case AppointmentStatus.CANCELLED:
            return { background: '#fce4e4', color: '#7c1c1c' };
        case AppointmentStatus.RESCHEDULE_REQUESTED:
            return { background: '#ffe8cc', color: '#d9480f' };
        default:
            return { background: '#e9ecef', color: '#495057' };
    }
}

export function getWhatsAppUrlForReschedule(apt: Appointment): string {
    const rawPhone = apt.customer?.phone?.replace(/\D/g, '') || '';
    if (!rawPhone) return '#';
    const phone = rawPhone.startsWith('56') ? rawPhone : (rawPhone.length === 9 ? `56${rawPhone}` : `56${rawPhone}`);
    const dateFormatted = apt.appointmentDate
        ? format(parseISO(apt.appointmentDate.split('T')[0]), 'dd/MM/yyyy', { locale: es })
        : '';
    const timeFormatted = apt.appointmentTime ? apt.appointmentTime.slice(0, 5) : '';
    const dateText = dateFormatted ? ` del ${dateFormatted}${timeFormatted ? ` a las ${timeFormatted} hrs` : ''}` : '';
    const message = `Hola ${apt.customer?.fullName || 'Clienta'}! Te escribimos de BunnyCure respecto a tu solicitud para reprogramar tu cita${dateText}. ¿Qué día y horario te acomodaría?`;
    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

export function formatMessageTime(dateStr: string): string {
    if (!dateStr) return '';
    try {
        const d = parseISO(dateStr);
        if (isToday(d)) {
            return `Hoy a las ${format(d, 'HH:mm')}`;
        }
        return format(d, 'dd/MM/yyyy HH:mm', { locale: es });
    } catch {
        return dateStr;
    }
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <span style={{ flex: 1, height: '1px', background: '#d4a89a' }} />
            <span style={{ color: '#8b6f5e', fontSize: '15px', fontWeight: 500, letterSpacing: '0.03em', whiteSpace: 'nowrap' }}>
                {children}
            </span>
            <span style={{ flex: 1, height: '1px', background: '#d4a89a' }} />
        </div>
    );
}

export function DashCard({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) {
    return (
        <div style={{
            background: 'rgba(255,255,255,0.88)',
            borderRadius: '20px',
            border: '1px solid rgba(240,224,216,0.7)',
            boxShadow: '0 2px 12px rgba(180,120,100,0.08)',
            overflow: 'hidden',
            ...style,
        }}>
            {children}
        </div>
    );
}

export type ActionVariant = 'emerald' | 'mint' | 'indigo' | 'blue' | 'sky' | 'purple' | 'amber' | 'rose' | 'beige';

export const variantStyles: Record<ActionVariant, { bg: string; hover: string; text: string; icon: string; border: string; shadow: string }> = {
    emerald: {
        bg: '#ecfdf5',
        hover: '#d1fae5',
        text: '#065f46',
        icon: '#059669',
        border: 'rgba(16, 185, 129, 0.25)',
        shadow: 'rgba(16, 185, 129, 0.18)',
    },
    mint: {
        bg: '#f0fdf4',
        hover: '#dcfce7',
        text: '#166534',
        icon: '#16a34a',
        border: 'rgba(34, 197, 94, 0.25)',
        shadow: 'rgba(34, 197, 94, 0.18)',
    },
    indigo: {
        bg: '#eef2ff',
        hover: '#e0e7ff',
        text: '#3730a3',
        icon: '#4f46e5',
        border: 'rgba(99, 102, 241, 0.25)',
        shadow: 'rgba(99, 102, 241, 0.18)',
    },
    blue: {
        bg: '#eff6ff',
        hover: '#dbeafe',
        text: '#1e40af',
        icon: '#2563eb',
        border: 'rgba(59, 130, 246, 0.25)',
        shadow: 'rgba(59, 130, 246, 0.18)',
    },
    sky: {
        bg: '#f0f9ff',
        hover: '#e0f2fe',
        text: '#0369a1',
        icon: '#0284c7',
        border: 'rgba(14, 165, 233, 0.25)',
        shadow: 'rgba(14, 165, 233, 0.18)',
    },
    purple: {
        bg: '#faf5ff',
        hover: '#f3e8ff',
        text: '#6b21a8',
        icon: '#9333ea',
        border: 'rgba(168, 85, 247, 0.25)',
        shadow: 'rgba(168, 85, 247, 0.18)',
    },
    amber: {
        bg: '#fffbeb',
        hover: '#fef3c7',
        text: '#92400e',
        icon: '#d97706',
        border: 'rgba(245, 158, 11, 0.28)',
        shadow: 'rgba(245, 158, 11, 0.18)',
    },
    rose: {
        bg: '#fff1f2',
        hover: '#ffe4e6',
        text: '#9f1239',
        icon: '#e11d48',
        border: 'rgba(244, 63, 94, 0.25)',
        shadow: 'rgba(244, 63, 94, 0.18)',
    },
    beige: {
        bg: '#f5ede8',
        hover: '#eeddd6',
        text: '#6b4c38',
        icon: '#b07a5e',
        border: 'rgba(176, 122, 94, 0.25)',
        shadow: 'rgba(176, 122, 94, 0.18)',
    },
};

export function ActionButton({ icon, label, to, onClick, variant }: {
    icon: React.ReactNode; label: string; to?: string; onClick?: () => void; variant: ActionVariant;
}) {
    const navigate = useNavigate();
    const st = variantStyles[variant];
    const [hover, setHover] = useState(false);

    return (
        <button
            onClick={onClick ? onClick : to ? () => navigate(to) : undefined}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            style={{
                width: '100%',
                background: hover ? st.hover : st.bg,
                border: `1px solid ${st.border}`,
                borderRadius: '14px',
                padding: '12px 8px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                color: st.text,
                fontWeight: 600,
                fontSize: '12px',
                lineHeight: 1.2,
                textAlign: 'center',
                transition: 'all 0.18s ease-in-out',
                transform: hover ? 'translateY(-2px)' : 'none',
                boxShadow: hover ? `0 4px 12px ${st.shadow}` : '0 1px 2px rgba(0,0,0,0.03)',
                minHeight: '74px',
            }}
        >
            <span style={{ color: st.icon, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {icon}
            </span>
            <span style={{ wordBreak: 'break-word', maxWidth: '100%' }}>{label}</span>
        </button>
    );
}

export function Spinner() {
    return (
        <div style={{
            width: '28px', height: '28px', borderRadius: '50%',
            border: '3px solid #f0d0c8', borderTopColor: '#c9897a',
            animation: 'spin 0.8s linear infinite',
        }} />
    );
}
