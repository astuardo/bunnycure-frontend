import React, { useState, useRef } from 'react';
import { Modal, Button, Badge, Spinner } from '@/components/ui';
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
      <Modal.Header closeButton className="bg-bunny-creamy/30 border-b border-bunny-accent/40">
        <Modal.Title>
          <span className="text-bunny-dark font-bold text-base sm:text-lg">
            📸 Agregar Diseño / Ficha Técnica de Manicure &bull; {customerName}
          </span>
        </Modal.Title>
      </Modal.Header>

      <form onSubmit={handleSubmit}>
        <Modal.Body className="p-4 sm:p-5 space-y-4 max-h-[75vh] overflow-y-auto bg-bunny-creamy/20">
          {/* Subida de Fotos */}
          <div className="p-4 rounded-xl text-center bg-white border-2 border-dashed border-bunny-accent/60">
            <div className="flex justify-center gap-2 mb-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={processingImages}
                className="border-bunny-primary text-bunny-primary hover:bg-bunny-light/30"
              >
                {processingImages ? (
                  <>
                    <Spinner size="sm" className="mr-1.5 border-bunny-primary" />
                    Procesando fotos...
                  </>
                ) : (
                  <>
                    <FiUpload className="mr-1.5 inline" /> Subir Fotos de Manicure
                  </>
                )}
              </Button>
            </div>
            <small className="text-slate-500 text-xs block">
              Puedes subir fotos del resultado final o del proceso (antes / después) desde la galería o cámara.
            </small>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />

            {/* Grid de Previsualización de Fotos */}
            {photoUrls.length > 0 && (
              <div className="flex gap-2.5 flex-wrap justify-center mt-3">
                {photoUrls.map((url, idx) => (
                  <div
                    key={idx}
                    className="relative w-24 h-24 rounded-xl overflow-hidden border-2 border-bunny-accent shadow-sm"
                  >
                    <img
                      src={url}
                      alt={`Foto ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(idx)}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center hover:bg-rose-700 shadow-sm"
                    >
                      <FiX size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
            {/* Título */}
            <div className="md:col-span-8">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                TÍTULO O DISEÑO REALIZADO *
              </label>
              <input
                type="text"
                placeholder="Ej: Kapping Gel Rosa Glaseado + Cristales Swarovski"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full text-xs sm:text-sm rounded-lg border border-bunny-accent/60 p-2.5 focus:outline-none focus:ring-1 focus:ring-bunny-primary"
                required
              />
            </div>

            {/* Fecha */}
            <div className="md:col-span-4">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                FECHA DE ATENCIÓN
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full text-xs sm:text-sm rounded-lg border border-bunny-accent/60 p-2.5 focus:outline-none focus:ring-1 focus:ring-bunny-primary"
              />
            </div>

            {/* Técnica / Base Usada */}
            <div className="md:col-span-6">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                TÉCNICA / BASE APLICADA
              </label>
              <select
                value={baseType}
                onChange={(e) => setBaseType(e.target.value as BaseTechniqueType)}
                className="w-full text-xs sm:text-sm rounded-lg border border-bunny-accent/60 p-2.5 font-semibold text-bunny-dark focus:outline-none focus:ring-1 focus:ring-bunny-primary"
              >
                {Object.entries(BASE_TECHNIQUE_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {/* Estado de Cutícula / Uña */}
            <div className="md:col-span-6">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                ESTADO DE LA UÑA / CUTÍCULA
              </label>
              <select
                value={nailCondition}
                onChange={(e) => setNailCondition(e.target.value as NailConditionType)}
                className="w-full text-xs sm:text-sm rounded-lg border border-bunny-accent/60 p-2.5 focus:outline-none focus:ring-1 focus:ring-bunny-primary"
              >
                {Object.entries(NAIL_CONDITION_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {/* Esmaltes y Tonos Usados */}
            <div className="md:col-span-12">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                ESMALTES Y TONOS UTILIZADOS
              </label>
              <input
                type="text"
                placeholder="Ej: OPI #21, Pink Blush, Foil Dorado, Top Coat Diamond"
                value={polishColors}
                onChange={(e) => setPolishColors(e.target.value)}
                className="w-full text-xs sm:text-sm rounded-lg border border-bunny-accent/60 p-2.5 focus:outline-none focus:ring-1 focus:ring-bunny-primary"
              />
            </div>

            {/* Notas Técnicas */}
            <div className="md:col-span-12">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                NOTAS TÉCNICAS & OBSERVACIONES
              </label>
              <textarea
                rows={3}
                placeholder="Ej: Cutícula sensible en dedo anular derecho. Requiere nivelación con base rubber media. Prefiere largo almendra."
                value={techniqueNotes}
                onChange={(e) => setTechniqueNotes(e.target.value)}
                className="w-full text-xs sm:text-sm rounded-lg border border-bunny-accent/60 p-2.5 focus:outline-none focus:ring-1 focus:ring-bunny-primary"
              />
            </div>

            {/* Etiquetas / Tags */}
            <div className="md:col-span-12">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                ETIQUETAS DEL ESTILO
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  placeholder="Ej: Francesa, Glitter, Efecto Espejo..."
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                  className="max-w-xs text-xs sm:text-sm rounded-lg border border-bunny-accent/60 p-2 focus:outline-none focus:ring-1 focus:ring-bunny-primary"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddTag}
                  className="flex items-center gap-1"
                >
                  <FiPlus /> Agregar Tag
                </Button>
              </div>

              <div className="flex gap-1.5 flex-wrap">
                {tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="cursor-pointer hover:bg-slate-200 text-xs px-2.5 py-1"
                    onClick={() => handleRemoveTag(tag)}
                    title="Click para remover"
                  >
                    {tag} &times;
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </Modal.Body>

        <Modal.Footer className="bg-bunny-creamy/30 border-t border-bunny-accent/40">
          <div className="w-full flex justify-end gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={onHide}>
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              className="bg-bunny-primary hover:bg-bunny-dark text-white font-semibold px-5"
            >
              💾 Guardar en Ficha
            </Button>
          </div>
        </Modal.Footer>
      </form>
    </Modal>
  );
};

export default AddNailRecordModal;
