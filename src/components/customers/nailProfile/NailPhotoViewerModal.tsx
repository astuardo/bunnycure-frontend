import React, { useState } from 'react';
import { Modal, Button, Badge } from '@/components/ui';
import { FiTrash2, FiCalendar, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { NailPhotoRecord } from '../../../types/nailProfile.types';
import { BASE_TECHNIQUE_LABELS, NAIL_CONDITION_LABELS } from '../../../utils/nailProfileUtils';
import { confirmDialog } from '../../ui/confirmDialog';

interface NailPhotoViewerModalProps {
  show: boolean;
  onHide: () => void;
  record: NailPhotoRecord | null;
  onDeleteRecord?: (recordId: string) => void;
}

export const NailPhotoViewerModal: React.FC<NailPhotoViewerModalProps> = ({
  show,
  onHide,
  record,
  onDeleteRecord,
}) => {
  const [photoIndex, setPhotoIndex] = useState(0);

  React.useEffect(() => {
    setPhotoIndex(0);
  }, [record]);

  if (!record) return null;

  const photos = record.photoUrls || [];
  const currentPhoto = photos[photoIndex];

  const handlePrev = () => {
    setPhotoIndex((prev) => (prev > 0 ? prev - 1 : photos.length - 1));
  };

  const handleNext = () => {
    setPhotoIndex((prev) => (prev < photos.length - 1 ? prev + 1 : 0));
  };

  const handleDelete = async () => {
    if (await confirmDialog({ message: '¿Eliminar este registro y sus fotos?', confirmLabel: 'Eliminar', tone: 'danger' })) {
      if (onDeleteRecord) {
        onDeleteRecord(record.id);
      }
      onHide();
    }
  };

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton className="bg-bunny-creamy/30 border-b border-bunny-accent/40">
        <Modal.Title>
          <span className="text-bunny-dark font-bold text-base sm:text-lg">
            {record.title}
          </span>
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className="p-0 bg-neutral-900 overflow-hidden">
        {/* Visor de Fotos */}
        {photos.length > 0 ? (
          <div className="relative flex items-center justify-center min-h-[360px] max-h-[520px] bg-black">
            <img
              src={currentPhoto}
              alt={record.title}
              className="max-w-full max-h-[520px] object-contain"
            />

            {photos.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={handlePrev}
                  className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 text-white hover:bg-black/80 transition-all z-10"
                >
                  <FiChevronLeft size={22} />
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 text-white hover:bg-black/80 transition-all z-10"
                >
                  <FiChevronRight size={22} />
                </button>
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/60 text-white text-xs tracking-wider">
                  {photoIndex + 1} de {photos.length}
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="text-center py-16 text-bunny-text-muted/70 bg-bunny-paper">
            Sin fotografías adjuntas
          </div>
        )}

        {/* Ficha Técnica del Diseño */}
        <div className="p-4 sm:p-5 bg-white space-y-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="primary" className="text-xs px-2.5 py-1">
                {BASE_TECHNIQUE_LABELS[record.baseType] || record.baseType}
              </Badge>
              {record.nailCondition && (
                <Badge variant="secondary" className="text-xs px-2.5 py-1">
                  {NAIL_CONDITION_LABELS[record.nailCondition] || record.nailCondition}
                </Badge>
              )}
            </div>
            <small className="text-bunny-text-muted/70 text-xs flex items-center gap-1">
              <FiCalendar /> {record.date}
            </small>
          </div>

          <div className="space-y-2">
            {record.polishColors && (
              <div>
                <strong className="text-bunny-dark/70 text-xs uppercase tracking-wider block">🎨 ESMALTES / TONOS:</strong>
                <p className="text-sm font-medium text-bunny-dark mb-0">
                  {record.polishColors}
                </p>
              </div>
            )}

            {record.techniqueNotes && (
              <div className="pt-1">
                <strong className="text-bunny-dark/70 text-xs uppercase tracking-wider block mb-1">📝 NOTAS TÉCNICAS & OBSERVACIONES:</strong>
                <p className="p-3 rounded-xl text-xs sm:text-sm text-bunny-dark bg-bunny-light/20 border border-bunny-accent/40 mb-0 leading-relaxed">
                  {record.techniqueNotes}
                </p>
              </div>
            )}
          </div>

          {/* Tags */}
          {record.tags && record.tags.length > 0 && (
            <div className="flex gap-1.5 flex-wrap pt-1">
              {record.tags.map((t, idx) => (
                <Badge key={idx} variant="secondary" className="text-xs">
                  #{t}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </Modal.Body>

      <Modal.Footer className="bg-bunny-creamy/20 border-t border-bunny-accent/40">
        <div className="w-full flex justify-between items-center">
          <Button variant="danger" size="sm" onClick={handleDelete} className="flex items-center gap-1.5">
            <FiTrash2 /> Eliminar Registro
          </Button>
          <Button variant="secondary" size="sm" onClick={onHide}>
            Cerrar
          </Button>
        </div>
      </Modal.Footer>
    </Modal>
  );
};

export default NailPhotoViewerModal;
