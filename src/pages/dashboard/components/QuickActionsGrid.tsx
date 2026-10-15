import React from 'react';
import {
    CalendarDays,
    CalendarOff,
    UserPlus,
    Scissors,
    Zap,
    Users,
    CalendarPlus,
    Sparkles,
} from 'lucide-react';
import { DashCard, SectionTitle, ActionButton, CARD_PAD } from './DashboardCommon';

interface QuickActionsGridProps {
    canAdmin: boolean;
    onOpenOnboarding: () => void;
}

export const QuickActionsGrid: React.FC<QuickActionsGridProps> = ({ canAdmin, onOpenOnboarding }) => {
    return (
        <DashCard style={{ padding: CARD_PAD }}>
            <SectionTitle>
                <Zap size={14} style={{ display: 'inline', color: '#e8a838', marginRight: '6px', verticalAlign: 'middle' }} />
                Acciones Rápidas
            </SectionTitle>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
                <ActionButton icon={<CalendarPlus size={22} />} label="Nueva Cita" to="/appointments?create=1&returnTo=%2Fdashboard" variant="emerald" />
                <ActionButton icon={<UserPlus size={22} />} label="Nuevo Cliente" to="/customers?create=1&returnTo=%2Fdashboard" variant="mint" />
                <ActionButton icon={<Users size={22} />} label="Clientes" to="/customers" variant="indigo" />
                <ActionButton icon={<CalendarOff size={22} />} label="Bloquear Agenda" to="/calendar?manageBlocks=1" variant="amber" />
                <ActionButton icon={<CalendarDays size={22} />} label="Calendario" to="/calendar" variant="purple" />
                <ActionButton icon={<Scissors size={22} />} label="Gestionar Servicios" to="/services" variant="sky" />
                {canAdmin && (
                    <ActionButton icon={<Sparkles size={22} />} label="Asistente Salón" onClick={onOpenOnboarding} variant="purple" />
                )}
            </div>
        </DashCard>
    );
};
