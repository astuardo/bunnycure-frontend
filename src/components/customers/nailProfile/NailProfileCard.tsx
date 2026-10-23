import React, { useState } from 'react';
import { Card, Button } from '@/components/ui';
import { FiEdit2, FiCheck, FiX, FiAlertCircle } from 'react-icons/fi';
import {
  BaseTechniqueType,
  CustomerNailProfile,
  NailConditionType,
} from '../../../types/nailProfile.types';
import {
  BASE_TECHNIQUE_LABELS,
  NAIL_CONDITION_LABELS,
  saveCustomerNailProfile,
} from '../../../utils/nailProfileUtils';
import { useToast } from '../../../hooks/useToast';

interface NailProfileCardProps {
  customerId: number;
  profile: CustomerNailProfile;
  onProfileUpdated: (updated: CustomerNailProfile) => void;
}

export const NailProfileCard: React.FC<NailProfileCardProps> = ({
  customerId,
  profile,
  onProfileUpdated,
}) => {
  const toast = useToast();
  const [editing, setEditing] = useState(false);

  const [preferredBase, setPreferredBase] = useState<BaseTechniqueType | ''>(profile.preferredBaseType || '');
  const [usualCondition, setUsualCondition] = useState<NailConditionType | ''>(profile.usualNailCondition || '');
  const [favoriteColors, setFavoriteColors] = useState<string>(profile.favoriteColors || '');
  const [allergyNotes, setAllergyNotes] = useState<string>(profile.allergyNotes || '');
  const [generalNotes, setGeneralNotes] = useState<string>(profile.generalNotes || '');

  const handleSave = () => {
    const updated: CustomerNailProfile = {
      ...profile,
      preferredBaseType: preferredBase || undefined,
      usualNailCondition: usualCondition || undefined,
      favoriteColors: favoriteColors.trim(),
      allergyNotes: allergyNotes.trim(),
      generalNotes: generalNotes.trim(),
    };

    saveCustomerNailProfile(customerId, updated);
    onProfileUpdated(updated);
    setEditing(false);
    toast.success('Ficha técnica de manicure actualizada');
  };

  const handleCancel = () => {
    setPreferredBase(profile.preferredBaseType || '');
    setUsualCondition(profile.usualNailCondition || '');
    setFavoriteColors(profile.favoriteColors || '');
    setAllergyNotes(profile.allergyNotes || '');
    setGeneralNotes(profile.generalNotes || '');
    setEditing(false);
  };

  return (
    <Card className="border border-bunny-accent/40 bg-white shadow-sm mb-4">
      <Card.Header className="bg-transparent border-0 flex justify-between items-center p-4">
        <div>
          <h5 className="font-bold text-bunny-dark text-base sm:text-lg mb-0.5">
            💅 Ficha Técnica Permanente de Manicure
          </h5>
          <small className="text-slate-500 text-xs">
            Preferencias de base, estado de uña y precauciones para cada servicio
          </small>
        </div>
        {!editing ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setEditing(true)}
            className="flex items-center gap-1.5 text-xs"
          >
            <FiEdit2 /> Editar
          </Button>
        ) : (
          <div className="flex gap-1.5">
            <Button size="sm" variant="primary" onClick={handleSave} className="flex items-center gap-1 text-xs">
              <FiCheck /> Guardar
            </Button>
            <Button size="sm" variant="secondary" onClick={handleCancel} className="text-xs p-2">
              <FiX />
            </Button>
          </div>
        )}
      </Card.Header>

      <Card.Body className="px-4 pb-4 pt-0">
        {editing ? (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
            <div className="md:col-span-6">
              <label htmlFor="nail-profile-card-tecnica-base-habitual" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                TÉCNICA / BASE HABITUAL
              </label>
              <select id="nail-profile-card-tecnica-base-habitual"
                value={preferredBase}
                onChange={(e) => setPreferredBase(e.target.value as BaseTechniqueType)}
                className="w-full text-xs sm:text-sm rounded-lg border border-bunny-accent/60 p-2 focus:outline-none focus:ring-1 focus:ring-bunny-primary"
              >
                <option value="">Seleccionar...</option>
                {Object.entries(BASE_TECHNIQUE_LABELS).map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-6">
              <label htmlFor="nail-profile-card-condicion-habitual-de-la" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                CONDICIÓN HABITUAL DE LA UÑA
              </label>
              <select id="nail-profile-card-condicion-habitual-de-la"
                value={usualCondition}
                onChange={(e) => setUsualCondition(e.target.value as NailConditionType)}
                className="w-full text-xs sm:text-sm rounded-lg border border-bunny-accent/60 p-2 focus:outline-none focus:ring-1 focus:ring-bunny-primary"
              >
                <option value="">Seleccionar...</option>
                {Object.entries(NAIL_CONDITION_LABELS).map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-12">
              <label htmlFor="nail-profile-card-tonos-gamas-favoritas" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                TONOS / GAMAS FAVORITAS
              </label>
              <input id="nail-profile-card-tonos-gamas-favoritas"
                type="text"
                placeholder="Ej: Nudes rosados, Burdeos, Francesa con microglitter..."
                value={favoriteColors}
                onChange={(e) => setFavoriteColors(e.target.value)}
                className="w-full text-xs sm:text-sm rounded-lg border border-bunny-accent/60 p-2 focus:outline-none focus:ring-1 focus:ring-bunny-primary"
              />
            </div>

            <div className="md:col-span-6">
              <label htmlFor="nail-profile-card-alergias-o-sensibilidades" className="block text-xs font-bold text-rose-600 uppercase tracking-wider mb-1">
                ⚠️ ALERGIAS O SENSIBILIDADES
              </label>
              <input id="nail-profile-card-alergias-o-sensibilidades"
                type="text"
                placeholder="Ej: Alergia a monómero fuerte, cutícula hipersensible..."
                value={allergyNotes}
                onChange={(e) => setAllergyNotes(e.target.value)}
                className="w-full text-xs sm:text-sm rounded-lg border border-rose-300 p-2 focus:outline-none focus:ring-1 focus:ring-rose-500"
              />
            </div>

            <div className="md:col-span-6">
              <label htmlFor="nail-profile-card-recomendaciones-tecnicas-generales" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                RECOMENDACIONES TÉCNICAS GENERALES
              </label>
              <input id="nail-profile-card-recomendaciones-tecnicas-generales"
                type="text"
                placeholder="Ej: Trabajar a baja revolución, usar primer sin ácido..."
                value={generalNotes}
                onChange={(e) => setGeneralNotes(e.target.value)}
                className="w-full text-xs sm:text-sm rounded-lg border border-bunny-accent/60 p-2 focus:outline-none focus:ring-1 focus:ring-bunny-primary"
              />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <small className="text-slate-400 block text-xs uppercase tracking-wider">TÉCNICA HABITUAL</small>
              <div className="font-bold text-bunny-dark text-sm mt-0.5">
                {profile.preferredBaseType
                  ? BASE_TECHNIQUE_LABELS[profile.preferredBaseType]
                  : <span className="text-slate-400 font-normal">No definida</span>}
              </div>
            </div>

            <div>
              <small className="text-slate-400 block text-xs uppercase tracking-wider">CONDICIÓN DE UÑA</small>
              <div className="font-bold text-bunny-dark text-sm mt-0.5">
                {profile.usualNailCondition
                  ? NAIL_CONDITION_LABELS[profile.usualNailCondition]
                  : <span className="text-slate-400 font-normal">No evaluada</span>}
              </div>
            </div>

            <div>
              <small className="text-slate-400 block text-xs uppercase tracking-wider">COLORES FAVORITOS</small>
              <div className="text-bunny-dark text-sm mt-0.5 break-words">
                {profile.favoriteColors || <span className="text-slate-400">Sin registrar</span>}
              </div>
            </div>

            <div>
              <small className="text-slate-400 block text-xs uppercase tracking-wider">SENSIBILIDAD / ALERGIAS</small>
              {profile.allergyNotes ? (
                <div className="flex items-start gap-1 text-rose-600 font-semibold text-xs sm:text-sm mt-0.5 break-words">
                  <FiAlertCircle className="shrink-0 mt-0.5" /> <span>{profile.allergyNotes}</span>
                </div>
              ) : (
                <span className="text-slate-400 text-sm mt-0.5 block">Ninguna reportada</span>
              )}
            </div>
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

export default NailProfileCard;
