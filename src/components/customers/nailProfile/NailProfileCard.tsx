import React, { useState } from 'react';
import { Card, Row, Col, Button, Form } from 'react-bootstrap';
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
    <Card className="border-0 shadow-sm mb-4" style={{ borderRadius: '14px', background: '#fff', borderLeft: '4px solid #8c2a3e' }}>
      <Card.Header className="bg-transparent border-0 d-flex justify-content-between align-items-center pt-3 px-3 px-md-4">
        <div>
          <h5 className="mb-0 fw-bold" style={{ color: '#422314', fontSize: '1rem' }}>
            💅 Ficha Técnica Permanente de Manicure
          </h5>
          <small className="text-muted" style={{ fontSize: '12px' }}>
            Preferencias de base, estado de uña y precauciones para cada servicio
          </small>
        </div>
        {!editing ? (
          <Button
            size="sm"
            variant="outline-secondary"
            onClick={() => setEditing(true)}
            style={{ borderRadius: '8px', fontSize: '12px' }}
          >
            <FiEdit2 className="me-1" /> Editar
          </Button>
        ) : (
          <div className="d-flex gap-1">
            <Button size="sm" variant="success" onClick={handleSave} style={{ borderRadius: '8px', fontSize: '12px' }}>
              <FiCheck className="me-1" /> Guardar
            </Button>
            <Button size="sm" variant="secondary" onClick={handleCancel} style={{ borderRadius: '8px', fontSize: '12px' }}>
              <FiX />
            </Button>
          </div>
        )}
      </Card.Header>

      <Card.Body className="px-3 px-md-4 pb-3">
        {editing ? (
          <Row className="g-3">
            <Col md={6}>
              <Form.Group>
                <Form.Label className="fw-bold small text-muted">TÉCNICA / BASE HABITUAL</Form.Label>
                <Form.Select
                  size="sm"
                  value={preferredBase}
                  onChange={(e) => setPreferredBase(e.target.value as BaseTechniqueType)}
                  style={{ borderRadius: '8px', borderColor: '#eed0c5' }}
                >
                  <option value="">Seleccionar...</option>
                  {Object.entries(BASE_TECHNIQUE_LABELS).map(([k, label]) => (
                    <option key={k} value={k}>
                      {label}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>

            <Col md={6}>
              <Form.Group>
                <Form.Label className="fw-bold small text-muted">CONDICIÓN HABITUAL DE LA UÑA</Form.Label>
                <Form.Select
                  size="sm"
                  value={usualCondition}
                  onChange={(e) => setUsualCondition(e.target.value as NailConditionType)}
                  style={{ borderRadius: '8px', borderColor: '#eed0c5' }}
                >
                  <option value="">Seleccionar...</option>
                  {Object.entries(NAIL_CONDITION_LABELS).map(([k, label]) => (
                    <option key={k} value={k}>
                      {label}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>

            <Col md={12}>
              <Form.Group>
                <Form.Label className="fw-bold small text-muted">TONOS / GAMAS FAVORITAS</Form.Label>
                <Form.Control
                  size="sm"
                  type="text"
                  placeholder="Ej: Nudes rosados, Burdeos, Francesa con microglitter..."
                  value={favoriteColors}
                  onChange={(e) => setFavoriteColors(e.target.value)}
                  style={{ borderRadius: '8px', borderColor: '#eed0c5' }}
                />
              </Form.Group>
            </Col>

            <Col md={6}>
              <Form.Group>
                <Form.Label className="fw-bold small text-danger">⚠️ ALERGIAS O SENSIBILIDADES</Form.Label>
                <Form.Control
                  size="sm"
                  type="text"
                  placeholder="Ej: Alergia a monómero fuerte, cutícula hipersensible..."
                  value={allergyNotes}
                  onChange={(e) => setAllergyNotes(e.target.value)}
                  style={{ borderRadius: '8px', borderColor: '#fca5a5' }}
                />
              </Form.Group>
            </Col>

            <Col md={6}>
              <Form.Group>
                <Form.Label className="fw-bold small text-muted">RECOMENDACIONES TÉCNICAS GENERALES</Form.Label>
                <Form.Control
                  size="sm"
                  type="text"
                  placeholder="Ej: Trabajar a baja revolución, usar primer sin ácido..."
                  value={generalNotes}
                  onChange={(e) => setGeneralNotes(e.target.value)}
                  style={{ borderRadius: '8px', borderColor: '#eed0c5' }}
                />
              </Form.Group>
            </Col>
          </Row>
        ) : (
          <Row className="g-3">
            <Col xs={6} md={3}>
              <small className="text-muted d-block" style={{ fontSize: '11.5px' }}>TÉCNICA HABITUAL</small>
              <div className="fw-bold" style={{ color: '#422314', fontSize: '13.5px' }}>
                {profile.preferredBaseType
                  ? BASE_TECHNIQUE_LABELS[profile.preferredBaseType]
                  : <span className="text-muted fw-normal">No definida</span>}
              </div>
            </Col>

            <Col xs={6} md={3}>
              <small className="text-muted d-block" style={{ fontSize: '11.5px' }}>CONDICIÓN DE UÑA</small>
              <div className="fw-bold" style={{ color: '#422314', fontSize: '13.5px' }}>
                {profile.usualNailCondition
                  ? NAIL_CONDITION_LABELS[profile.usualNailCondition]
                  : <span className="text-muted fw-normal">No evaluada</span>}
              </div>
            </Col>

            <Col xs={12} md={3}>
              <small className="text-muted d-block" style={{ fontSize: '11.5px' }}>COLORES FAVORITOS</small>
              <div style={{ color: '#422314', fontSize: '13.5px' }}>
                {profile.favoriteColors || <span className="text-muted">Sin registrar</span>}
              </div>
            </Col>

            <Col xs={12} md={3}>
              <small className="text-muted d-block" style={{ fontSize: '11.5px' }}>SENSIBILIDAD / ALERGIAS</small>
              {profile.allergyNotes ? (
                <div className="d-flex align-items-center gap-1 text-danger fw-semibold" style={{ fontSize: '13px' }}>
                  <FiAlertCircle /> {profile.allergyNotes}
                </div>
              ) : (
                <span className="text-muted" style={{ fontSize: '13px' }}>Ninguna reportada</span>
              )}
            </Col>
          </Row>
        )}
      </Card.Body>
    </Card>
  );
};

export default NailProfileCard;
