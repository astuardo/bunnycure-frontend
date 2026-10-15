import React from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, TrendingUp, Users } from 'lucide-react';
import { DashboardStats } from '@/types/stats.types';
import {
    DashCard,
    SectionTitle,
    Spinner,
    CARD_PAD,
    DIVIDER,
    TEXT_DARK,
    TEXT_MID,
    formatCurrency,
} from './DashboardCommon';

interface WeekStatItem {
    label: string;
    count: number;
    bg: string;
    color: string;
}

interface DashboardMetricsGridProps {
    statsLoading: boolean;
    customerCount: number;
    thisWeekAppointmentsCount: number;
    weekStats: WeekStatItem[];
    dashboardStats: DashboardStats | null;
}

export const DashboardMetricsGrid: React.FC<DashboardMetricsGridProps> = ({
    statsLoading,
    customerCount,
    thisWeekAppointmentsCount,
    weekStats,
    dashboardStats,
}) => {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Clientes Activos */}
            <DashCard style={{ padding: CARD_PAD, textAlign: 'center' }}>
                <SectionTitle>Clientes Activos</SectionTitle>
                {statsLoading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '16px' }}>
                        <Spinner />
                    </div>
                ) : (
                    <>
                        <div style={{ fontSize: '72px', fontWeight: 300, color: '#5a8f7b', lineHeight: 1, marginBottom: '6px' }}>
                            {customerCount}
                        </div>
                        <div style={{ fontSize: '14px', color: TEXT_MID }}>Total registrados</div>
                    </>
                )}
            </DashCard>

            {/* Resumen Semanal */}
            <DashCard style={{ padding: CARD_PAD }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <BarChart3 size={18} style={{ color: '#c9897a' }} />
                        <span style={{ fontWeight: 600, fontSize: '15px', color: TEXT_DARK }}>Resumen Semanal</span>
                    </div>
                    <span style={{ fontWeight: 700, fontSize: '20px', color: '#5a8f7b' }}>
                        {thisWeekAppointmentsCount}
                    </span>
                </div>
                <div>
                    {weekStats.map(({ label, count, bg, color }, i) => (
                        <div key={label} style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '9px 0',
                            borderBottom: i < weekStats.length - 1 ? DIVIDER : 'none',
                        }}>
                            <span style={{ fontSize: '14px', color: TEXT_MID }}>{label}</span>
                            <span style={{
                                background: bg, color, fontSize: '12px', fontWeight: 700,
                                borderRadius: '999px', padding: '2px 10px', minWidth: '28px', textAlign: 'center',
                            }}>{count}</span>
                        </div>
                    ))}
                </div>
            </DashCard>

            {/* Insights del Mes */}
            <DashCard style={{ padding: CARD_PAD }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <TrendingUp size={18} style={{ color: '#c9897a' }} />
                        <span style={{ fontWeight: 600, fontSize: '15px', color: TEXT_DARK }}>Insights del Mes</span>
                    </div>
                    <Link to="/analytics" style={{ fontSize: '12px', color: TEXT_MID, textDecoration: 'underline' }}>
                        Ver Analíticas &rarr;
                    </Link>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: DIVIDER }}>
                    <div>
                        <span style={{ fontSize: '14px', color: TEXT_DARK, fontWeight: 500, display: 'block' }}>Ingresos Reales (Cobrados)</span>
                        <span style={{ fontSize: '11px', color: TEXT_MID }}>{dashboardStats?.completedAppointmentsMonth ?? 0} citas atendidas</span>
                    </div>
                    <span style={{ fontWeight: 700, fontSize: '16px', color: '#2d6b55' }}>
                        {formatCurrency(dashboardStats?.completedRevenueMonth ?? 0)}
                    </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: DIVIDER }}>
                    <div>
                        <span style={{ fontSize: '14px', color: TEXT_MID, display: 'block' }}>Ingresos Proyectados</span>
                        <span style={{ fontSize: '11px', color: TEXT_MID }}>{dashboardStats?.totalAppointmentsMonth ?? 0} citas activas en el mes</span>
                    </div>
                    <span style={{ fontWeight: 700, fontSize: '16px', color: '#5a8f7b' }}>
                        {formatCurrency(dashboardStats?.totalRevenueMonth || 0)}
                    </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: DIVIDER, gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                        <Users size={14} style={{ color: '#b09080' }} />
                        <div>
                            <span style={{ fontSize: '14px', color: TEXT_MID, display: 'block' }}>Clienta Destacada</span>
                            <span style={{ fontSize: '11px', color: TEXT_MID }}>Mayor frecuencia este mes</span>
                        </div>
                    </div>
                    <span style={{ fontWeight: 600, fontSize: '13px', color: TEXT_DARK, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '55%' }} title={dashboardStats?.topCustomer ? `${dashboardStats.topCustomer.name} (${dashboardStats.topCustomer.appointmentCount} visitas - ${formatCurrency(dashboardStats.topCustomer.totalSpent)})` : undefined}>
                        {dashboardStats?.topCustomer ? `${dashboardStats.topCustomer.name} (${dashboardStats.topCustomer.appointmentCount} visitas)` : 'Sin datos'}
                    </span>
                </div>

                <div style={{ paddingTop: '16px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#b09080', marginBottom: '12px' }}>
                        Ranking de Servicios
                    </div>
                    {!dashboardStats?.topServices || dashboardStats.topServices.length === 0 ? (
                        <p style={{ fontSize: '13px', color: '#c9a898' }}>Aún no hay datos de servicios.</p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {dashboardStats.topServices.map((s: any) => {
                                const maxRevenue = Math.max(...dashboardStats.topServices.map((ts: any) => ts.revenue), 1);
                                const percentage = (s.revenue / maxRevenue) * 100;
                                return (
                                    <div key={s.name}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                            <span style={{ fontSize: '13px', color: TEXT_DARK, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {s.name}
                                            </span>
                                            <span style={{ fontSize: '12px', fontWeight: 600, color: TEXT_DARK }}>
                                                {formatCurrency(s.revenue)}
                                            </span>
                                        </div>
                                        <div style={{ height: '6px', background: '#f3e9e2', borderRadius: '3px', overflow: 'hidden' }}>
                                            <div style={{
                                                height: '100%',
                                                width: '100%',
                                                transform: `scaleX(${Math.min(Math.max(percentage, 0), 100) / 100})`,
                                                transformOrigin: 'left',
                                                background: 'linear-gradient(90deg, #c9897a, #e5b2a7)',
                                                borderRadius: '3px',
                                                transition: 'transform 600ms cubic-bezier(0.16, 1, 0.3, 1)',
                                            }} />
                                        </div>
                                        <div style={{ fontSize: '10px', color: TEXT_MID, marginTop: '2px' }}>
                                            {s.count} servicios realizados este mes
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </DashCard>
        </div>
    );
};
