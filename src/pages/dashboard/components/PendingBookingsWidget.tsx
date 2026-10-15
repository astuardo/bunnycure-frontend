import React from 'react';
import { Link } from 'react-router-dom';
import { FaWhatsapp } from 'react-icons/fa';
import { Appointment } from '@/types/appointment.types';
import { DashCard, TEXT_MID, getWhatsAppUrlForReschedule } from './DashboardCommon';

interface PendingBookingsWidgetProps {
    rescheduleRequestedAppointments: Appointment[];
}

export const PendingBookingsWidget: React.FC<PendingBookingsWidgetProps> = ({
    rescheduleRequestedAppointments,
}) => {
    if (rescheduleRequestedAppointments.length === 0) return null;

    return (
        <DashCard style={{
            padding: '16px 20px',
            border: '1px solid rgba(217, 72, 15, 0.22)',
            background: 'linear-gradient(135deg, #fffbf7 0%, #fff6ee 100%)',
            boxShadow: '0 2px 10px rgba(217, 72, 15, 0.05)',
        }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '22px' }}>🔄</span>
                    <div>
                        <strong style={{ color: '#d9480f', fontSize: '14px' }}>
                            {rescheduleRequestedAppointments.length} cita(s) solicitan reprogramación
                        </strong>
                        <div style={{ fontSize: '12px', color: TEXT_MID }}>
                            Clientas que respondieron para reagendar. Contáctalas por WhatsApp para coordinar su nueva hora.
                        </div>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                    {rescheduleRequestedAppointments.slice(0, 3).map((apt) => (
                        <a
                            key={apt.id}
                            href={getWhatsAppUrlForReschedule(apt)}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={`Contactar a ${apt.customer.fullName} por WhatsApp`}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                background: '#e8f7ee',
                                color: '#128C7E',
                                border: '1px solid #25D366',
                                borderRadius: '999px',
                                padding: '4px 12px',
                                fontSize: '12px',
                                fontWeight: 700,
                                textDecoration: 'none',
                                boxShadow: '0 1px 3px rgba(37, 211, 102, 0.2)',
                            }}
                        >
                            <FaWhatsapp size={14} style={{ color: '#25D366' }} />
                            <span>{apt.customer.fullName?.split(' ')[0]}: WhatsApp</span>
                        </a>
                    ))}
                    <Link
                        to="/appointments?status=RESCHEDULE_REQUESTED"
                        style={{
                            fontSize: '12px',
                            color: '#d9480f',
                            fontWeight: 600,
                            textDecoration: 'underline',
                            marginLeft: '4px',
                        }}
                    >
                        Ver todas ({rescheduleRequestedAppointments.length}) &rarr;
                    </Link>
                </div>
            </div>
        </DashCard>
    );
};
