import React, { useState } from 'react';
import { Modal, Button, Badge, Row, Col } from 'react-bootstrap';
import { FiTrash2, FiCalendar, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { NailPhotoRecord } from '../../../types/nailProfile.types';
import { BASE_TECHNIQUE_LABELS, NAIL_CONDITION_LABELS } from '../../../utils/nailProfileUtils';

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

  const handleDelete = () => {
    if (window.confirm('¿Segura que deseas eliminar este registro y sus fotos?')) {
      if (onDeleteRecord) {
        onDeleteRecord(record.id);
      }
      onHide();
    }
  };

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton style={{ background: '#fdf4f2', borderBottom: '1px solid #eed0c5' }}>
        <Modal.Title style={{ color: '#422314', fontSize: '1.1rem', fontWeight: 700 }}>
          {record.title}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className="p-0" style={{ background: '#2c170e' }}>
        {/* Visor de Fotos */}
        {photos.length > 0 ? (
          <div
            className="position-relative d-flex align-items-center justify-content-center"
            style={{ minHeight: '360px', maxHeight: '520px', background: '#1a0d08' }}
          >
            <img
              src={currentPhoto}
              alt={record.title}
              style={{
                maxWidth: '100%',
                maxHeight: '520px',
                objectFit: 'contain',
              }}
            />

            {photos.length > 1 && (
              <>
                <button
                  onClick={handlePrev}
                  className="btn btn-dark position-absolute start-0 top-50 translate-middle-y ms-2 rounded-circle p-2 opacity-75"
                  style={{ zIndex: 10 }}
                >
                  <FiChevronLeft size={20} />
                </button>
                <button
                  onClick={handleNext}
                  className="btn btn-dark position-absolute end-0 top-50 translate-middle-y me-2 rounded-circle p-2 opacity-75"
                  style={{ zIndex: 10 }}
                >
                  <FiChevronRight size={20} />
                </button>
                <div
                  className="position-absolute bottom-0 start-50 translate-middle-x mb-2 px-3 py-1 rounded-pill"
                  style={{ background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: '12px' }}
                >
                  {photoIndex + 1} de {photos.length}
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="text-center py-5 text-muted" style={{ background: '#fdf6f3' }}>
            Sin fotografías adjuntas
          </div>
        )}

        {/* Ficha Técnica del Diseño */}
        <div className="p-3 p-md-4" style={{ background: '#fff' }}>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div className="d-flex align-items-center gap-2">
              <Badge bg="primary" style={{ background: '#8c2a3e', fontSize: '12px', padding: '6px 10px' }}>
                {BASE_TECHNIQUE_LABELS[record.baseType] || record.baseType}
              </Badge>
              {record.nailCondition && (
                <Badge bg="light" text="dark" style={{ border: '1px solid #eed0c5', fontSize: '12px' }}>
                  {NAIL_CONDITION_LABELS[record.nailCondition] || record.nailCondition}
                </Badge>
              )}
            </div>
            <small className="text-muted d-flex align-items-center gap-1">
              <FiCalendar /> {record.date}
            </small>
          </div>

          <Row className="g-2 mb-3">
            {record.polishColors && (
              <Col xs={12}>
                <strong style={{ color: '#8c6052', fontSize: '12px' }}>🎨 ESMALTES / TONOS:</strong>
                <p className="mb-0" style={{ color: '#422314', fontSize: '14px' }}>
                  {record.polishColors}
                </p>
              </Col>
            )}

            {record.techniqueNotes && (
              <Col xs={12} className="mt-2">
                <strong style={{ color: '#8c6052', fontSize: '12px' }}>📝 NOTAS TÉCNICAS & OBSERVACIONES:</strong>
                <p
                  className="mb-0 p-2 rounded-2"
                  style={{ color: '#422314', fontSize: '13px', background: '#fdf6f3', border: '1px solid #eed0c5' }}
                >
                  {record.techniqueNotes}
                </p>
              </Col>
            )}
          </Row>

          {/* Tags */}
          {record.tags && record.tags.length > 0 && (
            <div className="d-flex gap-1 flex-wrap">
              {record.tags.map((t, idx) => (
                <Badge key={idx} bg="light" text="dark" style={{ border: '1px solid #eed0c5', fontSize: '11px' }}>
                  #{t}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </Modal.Body>

      <Modal.Footer style={{ background: '#fdf4f2', borderTop: '1px solid #eed0c5', justifyContent: 'space-between' }}>
        <Button variant="outline-danger" size="sm" onClick={handleDelete} style={{ borderRadius: '8px' }}>
          <FiTrash2 className="me-1" /> Eliminar Registro
        </Button>
        <Button variant="secondary" size="sm" onClick={onHide} style={{ borderRadius: '8px' }}>
          Cerrar
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default NailPhotoViewerModal;
