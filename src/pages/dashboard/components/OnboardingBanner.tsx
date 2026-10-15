import React from 'react';
import { Sparkles, Check, X } from 'lucide-react';
import { DashCard } from './DashboardCommon';

interface OnboardingBannerProps {
    canAdmin: boolean;
    isOnboardingCompleted: boolean;
    tenantName?: string;
    onStartOnboarding: () => void;
    onDismissAndKeepConfig: () => void;
}

export const OnboardingBanner: React.FC<OnboardingBannerProps> = ({
    canAdmin,
    isOnboardingCompleted,
    tenantName,
    onStartOnboarding,
    onDismissAndKeepConfig,
}) => {
    if (!canAdmin || isOnboardingCompleted) return null;

    return (
        <DashCard style={{
            position: 'relative',
            padding: '18px 24px',
            border: '1.5px solid #F0E0D8',
            background: 'linear-gradient(135deg, #fff7f4 0%, #ffffff 100%)',
            boxShadow: '0 4px 16px rgba(201, 137, 122, 0.12)',
        }}>
            <button
                type="button"
                onClick={onDismissAndKeepConfig}
                title="Cerrar y mantener configuración actual"
                aria-label="Cerrar banner"
                style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    background: 'transparent',
                    border: 'none',
                    color: '#B09489',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '6px',
                    transition: 'color 0.15s',
                }}
            >
                <X size={16} />
            </button>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', maxWidth: '620px' }}>
                    <div style={{
                        width: '46px',
                        height: '46px',
                        borderRadius: '14px',
                        background: '#FDF0EC',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '24px',
                        border: '1px solid #E8CFC4',
                        flexShrink: 0,
                    }}>
                        ✨
                    </div>
                    <div>
                        <div style={{ fontWeight: 800, fontSize: '15px', color: '#5C3D2E' }}>
                            ¡Bienvenida a {tenantName || 'BunnyCure'}! Configura tu salón en 3 minutos
                        </div>
                        <div style={{ fontSize: '12.5px', color: '#9E7B6E', marginTop: '3px', lineHeight: 1.4 }}>
                            Establece tus horarios de atención, carga los primeros servicios y obtén tu código QR de reservas listo para compartir.
                        </div>
                    </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                        <button
                            type="button"
                            onClick={onStartOnboarding}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '8px',
                                background: '#C9897A',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '10px',
                                padding: '9px 16px',
                                fontWeight: 700,
                                fontSize: '12.5px',
                                cursor: 'pointer',
                                boxShadow: '0 2px 8px rgba(201, 137, 122, 0.35)',
                                transition: 'all 0.15s ease',
                            }}
                        >
                            <Sparkles size={15} />
                            <span>Iniciar Asistente</span>
                        </button>
                        <button
                            type="button"
                            onClick={onDismissAndKeepConfig}
                            title="Mantener servicios, horarios y ajustes actuales sin reiniciar de cero"
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                background: '#ffffff',
                                color: '#5C3D2E',
                                border: '1px solid #E8CFC4',
                                borderRadius: '10px',
                                padding: '9px 14px',
                                fontWeight: 600,
                                fontSize: '12px',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                            }}
                        >
                            <Check size={14} style={{ color: '#16a34a' }} />
                            <span>Mantener Configuración Actual</span>
                        </button>
                    </div>
                    <label style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '11.5px',
                        color: '#8C6858',
                        cursor: 'pointer',
                        userSelect: 'none',
                    }}>
                        <input
                            type="checkbox"
                            onChange={(e) => {
                                if (e.target.checked) onDismissAndKeepConfig();
                            }}
                            style={{ cursor: 'pointer', accentColor: '#C9897A' }}
                        />
                        <span>Ya está configurado (no volver a mostrar)</span>
                    </label>
                </div>
            </div>
        </DashCard>
    );
};
