import React from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarDays } from 'lucide-react';
import { UnavailabilityColorConfig } from '@/types/unavailability.types';
import { DashCard, CARD_PAD, TEXT_DARK, TEXT_MID } from './DashboardCommon';

const weekDayNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export interface MonthCalendarCell {
    date: Date;
    isToday: boolean;
    isOutsideMonth: boolean;
    appointmentCount: number;
    dotColors: string[];
    isFullDayBlocked: boolean;
    blockReason?: string;
    isTimeSlotBlocked: boolean;
    timeSlotReason?: string;
    timeSlotBlocks?: any[];
}

interface MonthCalendarPreviewProps {
    calendarMonth: Date;
    calendarDisplayConfig: any;
    unavailabilityColors: UnavailabilityColorConfig;
    monthCalendarCells: MonthCalendarCell[];
}

export const MonthCalendarPreview: React.FC<MonthCalendarPreviewProps> = ({
    calendarMonth,
    calendarDisplayConfig,
    unavailabilityColors,
    monthCalendarCells,
}) => {
    return (
        <DashCard style={{ padding: CARD_PAD }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', gap: '10px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CalendarDays size={18} style={{ color: '#c9897a' }} />
                    <span style={{ fontWeight: 600, fontSize: '15px', color: TEXT_DARK }}>
                        Calendario del Mes
                    </span>
                </div>
                <span style={{ fontSize: '13px', color: TEXT_MID, textTransform: 'capitalize' }}>
                    {format(calendarMonth, 'MMMM yyyy', { locale: es })}
                </span>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.9rem' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '11px', color: TEXT_MID }}>
                    <i style={{ width: '10px', height: '10px', borderRadius: '50%', background: calendarDisplayConfig.morning.color, display: 'inline-block' }} />
                    {calendarDisplayConfig.morning.start}-{calendarDisplayConfig.morning.end}
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '11px', color: TEXT_MID }}>
                    <i style={{ width: '10px', height: '10px', borderRadius: '50%', background: calendarDisplayConfig.afternoon.color, display: 'inline-block' }} />
                    {calendarDisplayConfig.afternoon.start}-{calendarDisplayConfig.afternoon.end}
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '11px', color: TEXT_MID }}>
                    <i style={{ width: '10px', height: '10px', borderRadius: '50%', background: calendarDisplayConfig.night.color, display: 'inline-block' }} />
                    {calendarDisplayConfig.night.start}-{calendarDisplayConfig.night.end}
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '11px', color: '#991b1b', fontWeight: 600, background: unavailabilityColors.fullDayColor, padding: '1px 6px', borderRadius: '6px' }}>
                    <i style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f87171', display: 'inline-block' }} />
                    Cerrado
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '11px', color: '#92400e', fontWeight: 600, background: unavailabilityColors.timeSlotColor, padding: '1px 6px', borderRadius: '6px' }}>
                    <i style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }} />
                    Bloqueo
                </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: '0.35rem', marginBottom: '0.4rem' }}>
                {weekDayNames.map((day) => (
                    <div key={day} style={{ textAlign: 'center', fontWeight: 600, fontSize: '12px', color: TEXT_MID }}>
                        {day}
                    </div>
                ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: '0.35rem' }}>
                {monthCalendarCells.map((cell, idx) => {
                    let cellBg = cell.isToday ? 'linear-gradient(135deg, #fdf6f3 0%, #fce8e4 100%)' : '#fffdfc';
                    let cellBorder = '1px solid #f0e0d8';
                    if (cell.isFullDayBlocked) {
                        cellBg = unavailabilityColors.fullDayColor;
                        cellBorder = '1px solid #f87171';
                    } else if (cell.isTimeSlotBlocked) {
                        cellBg = unavailabilityColors.timeSlotColor;
                        cellBorder = '1px solid #f59e0b';
                    }

                    return (
                        <div
                            key={idx}
                            style={{
                                minHeight: '62px',
                                border: cellBorder,
                                borderRadius: '12px',
                                padding: '0.35rem',
                                background: cellBg,
                                opacity: cell.isOutsideMonth ? 0.48 : 1,
                            }}
                            title={cell.isFullDayBlocked ? `Cerrado: ${cell.blockReason}` : cell.isTimeSlotBlocked ? `Bloqueo: ${cell.timeSlotReason}` : undefined}
                        >
                            <div style={{ fontSize: '12px', fontWeight: 600, color: TEXT_DARK, marginBottom: '0.2rem' }}>
                                {format(cell.date, 'd')}
                            </div>
                            {cell.isFullDayBlocked && (
                                <div style={{ fontSize: '8.5px', color: '#991b1b', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    🚫 {cell.blockReason}
                                </div>
                            )}
                            {!cell.isFullDayBlocked && cell.isTimeSlotBlocked && (
                                <div style={{ fontSize: '8.5px', color: '#92400e', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    ⏰ {cell.timeSlotReason}
                                </div>
                            )}
                            {cell.appointmentCount > 0 && (
                                <>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.18rem', minHeight: '12px', marginTop: '2px' }}>
                                        {cell.dotColors.map((color, dotIndex) => (
                                            <span
                                                key={dotIndex}
                                                style={{
                                                    width: '0.34rem',
                                                    height: '0.34rem',
                                                    borderRadius: '999px',
                                                    backgroundColor: color,
                                                    display: 'inline-block',
                                                }}
                                            />
                                        ))}
                                    </div>
                                    <div style={{ marginTop: '0.15rem', fontSize: '9px', color: TEXT_MID, fontWeight: 600 }}>
                                        {cell.appointmentCount === 1 ? '1 cita' : `${cell.appointmentCount} citas`}
                                    </div>
                                </>
                            )}
                        </div>
                    );
                })}
            </div>
        </DashCard>
    );
};
