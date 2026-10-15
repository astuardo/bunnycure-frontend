import React, { useState, useMemo } from 'react';
import { FiCamera, FiPlus, FiCalendar, FiImage } from 'react-icons/fi';
import {
  CustomerNailProfile,
  NailPhotoRecord,
} from '../../../types/nailProfile.types';
import {
  getCustomerNailProfile,
  deleteNailPhotoRecord,
  BASE_TECHNIQUE_LABELS,
} from '../../../utils/nailProfileUtils';
import { Button, Badge, Card } from '@/components/ui';
import NailProfileCard from './NailProfileCard';
import AddNailRecordModal from './AddNailRecordModal';
import NailPhotoViewerModal from './NailPhotoViewerModal';

interface NailGalleryTabProps {
  customerId: number;
  customerName: string;
}

export const NailGalleryTab: React.FC<NailGalleryTabProps> = ({
  customerId,
  customerName,
}) => {
  const [profile, setProfile] = useState<CustomerNailProfile>(() =>
    getCustomerNailProfile(customerId)
  );

  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<NailPhotoRecord | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBase, setFilterBase] = useState<string>('ALL');

  const records = useMemo(() => profile.records || [], [profile.records]);

  const filteredRecords = useMemo(() => {
    return records.filter((rec) => {
      if (filterBase !== 'ALL' && rec.baseType !== filterBase) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = (rec.title || '').toLowerCase().includes(q);
        const colorMatch = (rec.polishColors || '').toLowerCase().includes(q);
        const tagMatch = (rec.tags || []).some((t) => t.toLowerCase().includes(q));
        const notesMatch = (rec.techniqueNotes || '').toLowerCase().includes(q);
        return titleMatch || colorMatch || tagMatch || notesMatch;
      }
      return true;
    });
  }, [records, filterBase, searchQuery]);

  const handleRecordSaved = (newRecord: NailPhotoRecord) => {
    setProfile(getCustomerNailProfile(customerId));
    setSelectedRecord(newRecord);
  };

  const handleDeleteRecord = (recordId: string) => {
    deleteNailPhotoRecord(customerId, recordId);
    setProfile(getCustomerNailProfile(customerId));
  };

  return (
    <div className="space-y-4">
      {/* 1. Ficha Técnica Permanente */}
      <NailProfileCard
        customerId={customerId}
        profile={profile}
        onProfileUpdated={(updated) => setProfile(updated)}
      />

      {/* 2. Barra de Acciones y Filtros de la Galería */}
      <Card className="border border-slate-200 shadow-sm bg-white">
        <Card.Body className="p-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
            <div className="sm:col-span-4">
              <Button
                variant="primary"
                size="sm"
                className="w-full flex items-center justify-center gap-2 bg-bunny-primary hover:bg-bunny-dark text-white font-semibold py-2"
                onClick={() => setShowAddModal(true)}
              >
                <FiCamera size={16} /> 📸 Agregar Diseño / Foto
              </Button>
            </div>

            <div className="sm:col-span-4">
              <select
                value={filterBase}
                onChange={(e) => setFilterBase(e.target.value)}
                className="w-full text-xs sm:text-sm rounded-lg border border-bunny-accent/60 p-2 focus:outline-none focus:ring-1 focus:ring-bunny-primary"
              >
                <option value="ALL">🎨 Todas las técnicas ({records.length})</option>
                {Object.entries(BASE_TECHNIQUE_LABELS).map(([key, label]) => {
                  const count = records.filter((r) => r.baseType === key).length;
                  if (count === 0) return null;
                  return (
                    <option key={key} value={key}>
                      {label} ({count})
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="sm:col-span-4">
              <input
                type="text"
                placeholder="Buscar por color, diseño o tag..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs sm:text-sm rounded-lg border border-bunny-accent/60 p-2 focus:outline-none focus:ring-1 focus:ring-bunny-primary"
              />
            </div>
          </div>
        </Card.Body>
      </Card>

      {/* 3. Grid de Galería Fotográfica */}
      {filteredRecords.length === 0 ? (
        <Card className="border border-slate-200 shadow-sm text-center py-12 bg-white">
          <Card.Body>
            <FiImage size={44} className="text-slate-300 mx-auto mb-2" />
            <h6 className="font-bold text-bunny-dark text-base mb-1">
              No hay fotos o diseños registrados aún
            </h6>
            <p className="text-slate-500 text-xs sm:text-sm max-w-md mx-auto mb-4">
              Guarda las fotos del resultado final de cada cita para llevar un historial visual de la clienta.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddModal(true)}
              className="border-bunny-primary text-bunny-primary hover:bg-bunny-light/30"
            >
              <FiPlus className="mr-1 inline" /> Subir Primera Foto
            </Button>
          </Card.Body>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRecords.map((record) => {
            const coverPhoto = (record.photoUrls && record.photoUrls[0]) || null;
            const photoCount = (record.photoUrls && record.photoUrls.length) || 0;

            return (
              <div
                key={record.id}
                onClick={() => setSelectedRecord(record)}
                className="group rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden hover:shadow-md hover:-translate-y-1 transition-all cursor-pointer flex flex-col"
              >
                {/* Foto de Portada */}
                <div className="relative h-48 bg-bunny-light/20 flex items-center justify-center overflow-hidden">
                  {coverPhoto ? (
                    <img
                      src={coverPhoto}
                      alt={record.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <FiImage size={40} className="text-bunny-accent" />
                  )}

                  {photoCount > 1 && (
                    <Badge
                      variant="secondary"
                      className="absolute top-2 right-2 text-xs bg-black/75 text-white backdrop-blur-sm border-0"
                    >
                      +{photoCount} fotos
                    </Badge>
                  )}

                  <Badge
                    variant="secondary"
                    className="absolute bottom-2 left-2 text-xs bg-white/90 backdrop-blur-sm border border-bunny-accent/40 font-medium"
                  >
                    <FiCalendar className="mr-1 inline" /> {record.date}
                  </Badge>
                </div>

                <div className="p-3.5 flex-1 flex flex-col justify-between">
                  <div>
                    <h6 className="font-bold text-bunny-dark text-sm truncate mb-1.5" title={record.title}>
                      {record.title}
                    </h6>

                    <div className="mb-2">
                      <Badge variant="primary" className="text-[11px] font-medium">
                        {BASE_TECHNIQUE_LABELS[record.baseType] || record.baseType}
                      </Badge>
                    </div>

                    {record.polishColors && (
                      <p className="text-xs text-slate-500 truncate mb-2">
                        🎨 {record.polishColors}
                      </p>
                    )}
                  </div>

                  {record.tags && record.tags.length > 0 && (
                    <div className="flex gap-1 flex-wrap pt-1">
                      {record.tags.slice(0, 3).map((t, idx) => (
                        <Badge key={idx} variant="secondary" className="text-[10px]">
                          #{t}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal para Subir Nueva Foto / Diseño */}
      <AddNailRecordModal
        show={showAddModal}
        onHide={() => setShowAddModal(false)}
        customerId={customerId}
        customerName={customerName}
        onRecordSaved={handleRecordSaved}
      />

      {/* Modal Visor de Pantalla Completa y Detalles */}
      <NailPhotoViewerModal
        show={Boolean(selectedRecord)}
        onHide={() => setSelectedRecord(null)}
        record={selectedRecord}
        onDeleteRecord={handleDeleteRecord}
      />
    </div>
  );
};

export default NailGalleryTab;
