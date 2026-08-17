import React, { useState, useMemo } from 'react';
import { Row, Col, Card, Badge, Button, Form } from 'react-bootstrap';
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

  const records = profile.records || [];

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
    <div className="nail-gallery-tab">
      {/* 1. Ficha Técnica Permanente */}
      <NailProfileCard
        customerId={customerId}
        profile={profile}
        onProfileUpdated={(updated) => setProfile(updated)}
      />

      {/* 2. Barra de Acciones y Filtros de la Galería */}
      <Card className="border-0 shadow-sm mb-4" style={{ borderRadius: '14px', background: '#fff' }}>
        <Card.Body className="p-3">
          <Row className="g-2 align-items-center">
            <Col xs={12} md={4}>
              <Button
                variant="primary"
                size="sm"
                className="w-100 d-flex align-items-center justify-content-center gap-2"
                onClick={() => setShowAddModal(true)}
                style={{
                  background: '#8c2a3e',
                  borderColor: '#8c2a3e',
                  borderRadius: '10px',
                  fontWeight: 600,
                  padding: '8px 16px',
                }}
              >
                <FiCamera size={16} /> 📸 Agregar Diseño / Foto
              </Button>
            </Col>

            <Col xs={12} sm={6} md={4}>
              <Form.Select
                size="sm"
                value={filterBase}
                onChange={(e) => setFilterBase(e.target.value)}
                style={{ borderRadius: '8px', borderColor: '#eed0c5' }}
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
              </Form.Select>
            </Col>

            <Col xs={12} sm={6} md={4}>
              <Form.Control
                size="sm"
                type="text"
                placeholder="Buscar por color, diseño o tag..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ borderRadius: '8px', borderColor: '#eed0c5' }}
              />
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* 3. Grid de Galería Fotográfica */}
      {filteredRecords.length === 0 ? (
        <Card className="border-0 shadow-sm text-center py-5" style={{ borderRadius: '14px', background: '#fff' }}>
          <Card.Body>
            <FiImage size={40} className="text-muted opacity-50 mb-2" />
            <h6 className="fw-bold" style={{ color: '#422314' }}>
              No hay fotos o diseños registrados aún
            </h6>
            <p className="text-muted small mb-3">
              Guarda las fotos del resultado final de cada cita para llevar un historial visual de la clienta.
            </p>
            <Button
              variant="outline-primary"
              size="sm"
              onClick={() => setShowAddModal(true)}
              style={{ borderRadius: '8px', borderColor: '#8c2a3e', color: '#8c2a3e' }}
            >
              <FiPlus className="me-1" /> Subir Primera Foto
            </Button>
          </Card.Body>
        </Card>
      ) : (
        <Row className="g-3">
          {filteredRecords.map((record) => {
            const coverPhoto = (record.photoUrls && record.photoUrls[0]) || null;
            const photoCount = (record.photoUrls && record.photoUrls.length) || 0;

            return (
              <Col key={record.id} xs={12} sm={6} lg={4}>
                <Card
                  className="border-0 shadow-sm h-100"
                  style={{
                    borderRadius: '14px',
                    overflow: 'hidden',
                    background: '#fff',
                    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                    cursor: 'pointer',
                  }}
                  onClick={() => setSelectedRecord(record)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-3px)';
                    e.currentTarget.style.boxShadow = '0 8px 25px rgba(92, 61, 46, 0.12)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(92, 61, 46, 0.06)';
                  }}
                >
                  {/* Foto de Portada */}
                  <div
                    className="position-relative"
                    style={{
                      height: '200px',
                      background: '#fdf4f2',
                      overflow: 'hidden',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {coverPhoto ? (
                      <img
                        src={coverPhoto}
                        alt={record.title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <FiImage size={36} style={{ color: '#eed0c5' }} />
                    )}

                    {photoCount > 1 && (
                      <Badge
                        bg="dark"
                        className="position-absolute top-0 end-0 m-2"
                        style={{ opacity: 0.85, fontSize: '11px' }}
                      >
                        +{photoCount} fotos
                      </Badge>
                    )}

                    <Badge
                      bg="light"
                      text="dark"
                      className="position-absolute bottom-0 start-0 m-2"
                      style={{ border: '1px solid #eed0c5', fontSize: '11px', fontWeight: 600 }}
                    >
                      <FiCalendar className="me-1" /> {record.date}
                    </Badge>
                  </div>

                  <Card.Body className="p-3">
                    <div className="d-flex justify-content-between align-items-start mb-1 gap-2">
                      <h6 className="fw-bold mb-0 text-truncate" style={{ color: '#422314', fontSize: '14px' }}>
                        {record.title}
                      </h6>
                    </div>

                    <div className="mb-2">
                      <Badge
                        bg="primary"
                        style={{
                          background: '#8c2a3e',
                          fontSize: '11px',
                          padding: '4px 8px',
                          fontWeight: 500,
                        }}
                      >
                        {BASE_TECHNIQUE_LABELS[record.baseType] || record.baseType}
                      </Badge>
                    </div>

                    {record.polishColors && (
                      <small className="text-muted d-block text-truncate mb-2" style={{ fontSize: '12px' }}>
                        🎨 {record.polishColors}
                      </small>
                    )}

                    {record.tags && record.tags.length > 0 && (
                      <div className="d-flex gap-1 flex-wrap mt-2">
                        {record.tags.slice(0, 3).map((t, idx) => (
                          <Badge key={idx} bg="light" text="dark" style={{ border: '1px solid #eed0c5', fontSize: '10px' }}>
                            #{t}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </Card.Body>
                </Card>
              </Col>
            );
          })}
        </Row>
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
