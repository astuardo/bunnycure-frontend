import React, { useState, useRef } from 'react';
import { Modal, Button, Form, Row, Col, Badge, Spinner } from 'react-bootstrap';
import { FiUpload, FiPlus, FiX } from 'react-icons/fi';
import {
  BaseTechniqueType,
  NailConditionType,
  NailPhotoRecord,
} from '../../../types/nailProfile.types';
import {
  BASE_TECHNIQUE_LABELS,
  NAIL_CONDITION_LABELS,
  compressImage,
  addNailPhotoRecord,
} from '../../../utils/nailProfileUtils';
import { useToast } from '../../../hooks/useToast';
import { customersApi } from '../../../api/customers.api';

interface AddNailRecordModalProps {
  show: boolean;
  onHide: () => void;
  customerId: number;
  customerName: string;
  onRecordSaved: (record: NailPhotoRecord) => void;
}

export const AddNailRecordModal: React.FC<AddNailRecordModalProps> = ({
  show,
  onHide,
  customerId,
  customerName,
  onRecordSaved,
}) => {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [title, setTitle] = useState<string>('');
  const [baseType, setBaseType] = useState<BaseTechniqueType>('KAPPING');
  const [nailCondition, setNailCondition] = useState<NailConditionType>('NORMAL');
  const [polishColors, setPolishColors] = useState<string>('');
  const [techniqueNotes, setTechniqueNotes] = useState<string>('');
  const [tagInput, setTagInput] = useState<string>('');
  const [tags, setTags] = useState<string[]>(['Nail Art']);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [processingImages, setProcessingImages] = useState<boolean>(false);

  const handleAddTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setProcessingImages(true);
    try {
      const compressedList: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.type.startsWith('image/')) {
          const compressed = await compressImage(file, 1200, 0.85);
          compressedList.push(compressed);
        }
      }
      setPhotoUrls((prev) => [...prev, ...compressedList]);
      toast.success(`${compressedList.length} foto(s) cargada(s) con éxito`);
    } catch {
      toast.error('Error al procesar las imágenes');
    } finally {
      setProcessingImages(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemovePhoto = (index: number) => {
    setPhotoUrls(photoUrls.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('Por favor ingresa un título o descripción del diseño');
      return;
    }

    try {
      const created = addNailPhotoRecord(customerId, {
        customerId,
        date,
        title: title.trim(),
        baseType,
        nailCondition,
        polishColors: polishColors.trim(),
        techniqueNotes: techniqueNotes.trim(),
        tags,
        photoUrls,
      });

      // Sincronizar en segundo plano con la base de datos del backend
      if (photoUrls.length > 0) {
        customersApi.createServiceRecord(customerId, {
          serviceDetail: `${title.trim()} (${BASE_TECHNIQUE_LABELS[baseType]})`,
          photoCaption: polishColors.trim() ? `Colores: ${polishColors.trim()}` : undefined,
          photoBase64: photoUrls[0],
          mimeType: 'image/jpeg',
        }).catch((err) => {
          console.warn('[BACKEND SYNC] Error al sincronizar foto con BD:', err);
        });
      }

      toast.success('📸 Diseño y ficha técnica guardados con éxito');
      onRecordSaved(created);
      handleReset();
      onHide();
    } catch {
      toast.error('Error al guardar el registro');
    }
  };

  const handleReset = () => {
    setDate(new Date().toISOString().slice(0, 10));
    setTitle('');
    setBaseType('KAPPING');
    setNailCondition('NORMAL');
    setPolishColors('');
    setTechniqueNotes('');
    setTags(['Nail Art']);
    setPhotoUrls([]);
  };

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton style={{ background: '#fdf4f2', borderBottom: '1px solid #eed0c5' }}>
        <Modal.Title style={{ color: '#422314', fontSize: '1.15rem', fontWeight: 700 }}>
          📸 Agregar Diseño / Ficha Técnica de Manicure &bull; {customerName}
        </Modal.Title>
      </Modal.Header>

      <Form onSubmit={handleSubmit}>
        <Modal.Body className="p-3 p-md-4" style={{ background: '#fff9f8', maxHeight: '75vh', overflowY: 'auto' }}>
          {/* Subida de Fotos */}
          <div
            className="mb-4 p-3 rounded-3 text-center"
            style={{
              background: '#fff',
              border: '2px dashed #eed0c5',
            }}
          >
            <div className="d-flex justify-content-center gap-2 mb-2">
              <Button
                variant="outline-primary"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={processingImages}
                style={{
                  borderRadius: '10px',
                  borderColor: '#8c2a3e',
                  color: '#8c2a3e',
                  fontWeight: 600,
                  background: '#fdf4f2',
                }}
              >
                {processingImages ? (
                  <>
                    <Spinner size="sm" animation="border" className="me-1" />
                    Procesando fotos...
                  </>
                ) : (
                  <>
                    <FiUpload className="me-1" /> Subir Fotos de Manicure
                  </>
                )}
              </Button>
            </div>
            <small className="text-muted d-block" style={{ fontSize: '11.5px' }}>
              Puedes subir fotos del resultado final o del proceso (antes / después) desde la galería o cámara.
            </small>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />

            {/* Grid de Previsualización de Fotos */}
            {photoUrls.length > 0 && (
              <div className="d-flex gap-2 flex-wrap justify-content-center mt-3">
                {photoUrls.map((url, idx) => (
                  <div
                    key={idx}
                    className="position-relative"
                    style={{
                      width: '100px',
                      height: '100px',
                      borderRadius: '10px',
                      overflow: 'hidden',
                      border: '2px solid #eed0c5',
                      boxShadow: '0 2px 8px rgba(92, 61, 46, 0.1)',
                    }}
                  >
                    <img
                      src={url}
                      alt={`Foto ${idx + 1}`}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(idx)}
                      className="btn btn-sm btn-danger position-absolute top-0 end-0 p-1 m-1"
                      style={{ borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <FiX size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Row className="g-3">
            {/* Título */}
            <Col md={8}>
              <Form.Group>
                <Form.Label className="fw-bold small text-muted">TÍTULO O DISEÑO REALIZADO *</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Ej: Kapping Gel Rosa Glaseado + Cristales Swarovski"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  style={{ borderRadius: '8px', borderColor: '#eed0c5' }}
                  required
                />
              </Form.Group>
            </Col>

            {/* Fecha */}
            <Col md={4}>
              <Form.Group>
                <Form.Label className="fw-bold small text-muted">FECHA DE ATENCIÓN</Form.Label>
                <Form.Control
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  style={{ borderRadius: '8px', borderColor: '#eed0c5' }}
                />
              </Form.Group>
            </Col>

            {/* Técnica / Base Usada */}
            <Col md={6}>
              <Form.Group>
                <Form.Label className="fw-bold small text-muted">TÉCNICA / BASE APLICADA</Form.Label>
                <Form.Select
                  value={baseType}
                  onChange={(e) => setBaseType(e.target.value as BaseTechniqueType)}
                  style={{ borderRadius: '8px', borderColor: '#eed0c5', fontWeight: 600 }}
                >
                  {Object.entries(BASE_TECHNIQUE_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>

            {/* Estado de Cutícula / Uña */}
            <Col md={6}>
              <Form.Group>
                <Form.Label className="fw-bold small text-muted">ESTADO DE LA UÑA / CUTÍCULA</Form.Label>
                <Form.Select
                  value={nailCondition}
                  onChange={(e) => setNailCondition(e.target.value as NailConditionType)}
                  style={{ borderRadius: '8px', borderColor: '#eed0c5' }}
                >
                  {Object.entries(NAIL_CONDITION_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>

            {/* Esmaltes y Tonos Usados */}
            <Col md={12}>
              <Form.Group>
                <Form.Label className="fw-bold small text-muted">ESMALTES Y TONOS UTILIZADOS</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Ej: OPI #21, Pink Blush, Foil Dorado, Top Coat Diamond"
                  value={polishColors}
                  onChange={(e) => setPolishColors(e.target.value)}
                  style={{ borderRadius: '8px', borderColor: '#eed0c5' }}
                />
              </Form.Group>
            </Col>

            {/* Notas Técnicas / Recomendaciones para la próxima cita */}
            <Col md={12}>
              <Form.Group>
                <Form.Label className="fw-bold small text-muted">NOTAS TÉCNICAS & OBSERVACIONES</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  placeholder="Ej: Cutícula sensible en dedo anular derecho. Requiere nivelación con base rubber media. Prefiere largo almendra."
                  value={techniqueNotes}
                  onChange={(e) => setTechniqueNotes(e.target.value)}
                  style={{ borderRadius: '8px', borderColor: '#eed0c5', fontSize: '13px' }}
                />
              </Form.Group>
            </Col>

            {/* Etiquetas / Tags */}
            <Col md={12}>
              <Form.Group>
                <Form.Label className="fw-bold small text-muted">ETIQUETAS DEL ESTILO</Form.Label>
                <div className="d-flex gap-2 mb-2">
                  <Form.Control
                    type="text"
                    size="sm"
                    placeholder="Ej: Francesa, Glitter, Efecto Espejo..."
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTag();
                      }
                    }}
                    style={{ borderRadius: '8px', borderColor: '#eed0c5', maxWidth: '280px' }}
                  />
                  <Button
                    variant="outline-secondary"
                    size="sm"
                    onClick={handleAddTag}
                    style={{ borderRadius: '8px' }}
                  >
                    <FiPlus className="me-1" /> Agregar Tag
                  </Button>
                </div>

                <div className="d-flex gap-1 flex-wrap">
                  {tags.map((tag) => (
                    <Badge
                      key={tag}
                      bg="light"
                      text="dark"
                      style={{
                        border: '1px solid #eed0c5',
                        padding: '6px 10px',
                        fontSize: '12px',
                        cursor: 'pointer',
                      }}
                      onClick={() => handleRemoveTag(tag)}
                      title="Click para remover"
                    >
                      {tag} &times;
                    </Badge>
                  ))}
                </div>
              </Form.Group>
            </Col>
          </Row>
        </Modal.Body>

        <Modal.Footer style={{ background: '#fdf4f2', borderTop: '1px solid #eed0c5' }}>
          <Button variant="secondary" size="sm" onClick={onHide} style={{ borderRadius: '8px' }}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            style={{
              background: '#8c2a3e',
              borderColor: '#8c2a3e',
              borderRadius: '8px',
              fontWeight: 700,
              padding: '6px 20px',
            }}
          >
            💾 Guardar en Ficha
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default AddNailRecordModal;
