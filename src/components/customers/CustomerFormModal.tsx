import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Customer, CustomerFormData, NotificationPreference } from '../../types/customer.types';
import { useCustomersStore } from '../../stores/customersStore';
import { normalizeRut, isValidRutFormat } from '../../utils/rutUtils';
import { Modal, Button, Input, Select, Textarea } from '../ui';

interface CustomerFormModalProps {
  show: boolean;
  onHide: () => void;
  customer?: Customer | null;
  onSuccess?: (customer: Customer) => void;
}

const normalizePhone = (value?: string): string => {
  if (!value) return '';
  const trimmed = value.trim();
  const hasLeadingPlus = trimmed.startsWith('+');
  const digitsOnly = trimmed.replace(/\D/g, '');
  if (!digitsOnly) return '';
  return hasLeadingPlus ? `+${digitsOnly}` : digitsOnly;
};

const normalizeGenderForForm = (gender?: string): string => {
  if (!gender) return '';
  const upper = gender.trim().toUpperCase();
  if (upper === 'F' || upper === 'FEMALE' || upper === 'FEMENINO') return 'FEMENINO';
  if (upper === 'M' || upper === 'MALE' || upper === 'MASCULINO') return 'MASCULINO';
  return upper;
};

const normalizePreferenceForForm = (pref?: NotificationPreference | string): NotificationPreference => {
  if (!pref) return NotificationPreference.WHATSAPP_ONLY;
  const upper = String(pref).trim().toUpperCase();
  if (upper === 'WHATSAPP' || upper === 'WHATSAPP_ONLY') return NotificationPreference.WHATSAPP_ONLY;
  if (upper === 'EMAIL' || upper === 'EMAIL_ONLY') return NotificationPreference.EMAIL_ONLY;
  if (upper === 'BOTH') return NotificationPreference.BOTH;
  if (upper === 'NONE') return NotificationPreference.NONE;
  return NotificationPreference.WHATSAPP_ONLY;
};

// Esquema de validación
const customerSchema: yup.ObjectSchema<CustomerFormData> = yup.object({
  fullName: yup
    .string()
    .required('El nombre completo es requerido')
    .min(3, 'El nombre debe tener al menos 3 caracteres')
    .max(100, 'El nombre no puede tener más de 100 caracteres'),

  phone: yup
    .string()
    .transform((_, originalValue) => normalizePhone(originalValue))
    .required('El teléfono es requerido')
    .matches(/^\+?[0-9]{8,15}$/, 'Formato de teléfono inválido (8-15 dígitos, opcional +)'),

  rut: yup
    .string()
    .transform((_, originalValue) => normalizeRut(originalValue))
    .required('El RUT es obligatorio')
    .test('valid-rut', 'Formato de RUT inválido. Ingresa ej: 18.664.589-8 o 18664589-8', (val) => {
      return isValidRutFormat(val);
    }),

  email: yup.string().email('Email inválido').optional(),

  gender: yup.string().optional(),

  birthDate: yup.string().optional(),

  emergencyPhone: yup
    .string()
    .transform((_, originalValue) => normalizePhone(originalValue))
    .matches(/^\+?[0-9]{8,15}$/, {
      message: 'Formato de teléfono de emergencia inválido (8-15 dígitos, opcional +)',
      excludeEmptyString: true,
    })
    .optional(),

  healthNotes: yup
    .string()
    .max(500, 'Las notas de salud no pueden tener más de 500 caracteres')
    .optional(),

  notes: yup
    .string()
    .max(500, 'Las notas no pueden tener más de 500 caracteres')
    .optional(),

  instagram: yup
    .string()
    .max(50, 'El usuario de Instagram no puede tener más de 50 caracteres')
    .optional(),

  notificationPreference: yup
    .mixed<NotificationPreference>()
    .oneOf(Object.values(NotificationPreference))
    .required('La preferencia de notificación es requerida'),
}) as yup.ObjectSchema<CustomerFormData>;

export default function CustomerFormModal({ show, onHide, customer, onSuccess }: CustomerFormModalProps) {
  const { createCustomer, updateCustomer, loading } = useCustomersStore();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CustomerFormData>({
    resolver: yupResolver(customerSchema),
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: {
      fullName: '',
      phone: '',
      rut: '',
      email: '',
      gender: '',
      birthDate: '',
      emergencyPhone: '',
      healthNotes: '',
      notes: '',
      instagram: '',
      notificationPreference: NotificationPreference.WHATSAPP_ONLY,
    },
  });

  // Cargar datos cuando se edita
  useEffect(() => {
    if (customer) {
      reset({
        fullName: customer.fullName || '',
        phone: customer.phone || '',
        rut: customer.rut || '',
        email: customer.email || '',
        gender: normalizeGenderForForm(customer.gender),
        birthDate: customer.birthDate || '',
        emergencyPhone: customer.emergencyPhone || '',
        healthNotes: customer.healthNotes || '',
        notes: customer.notes || '',
        instagram: customer.instagram || '',
        notificationPreference: normalizePreferenceForForm(customer.notificationPreference),
      });
    } else {
      reset({
        fullName: '',
        phone: '',
        rut: '',
        email: '',
        gender: '',
        birthDate: '',
        emergencyPhone: '',
        healthNotes: '',
        notes: '',
        instagram: '',
        notificationPreference: NotificationPreference.WHATSAPP_ONLY,
      });
    }
  }, [customer, reset]);

  const onSubmit = async (data: CustomerFormData) => {
    const normalizedData: CustomerFormData = {
      ...data,
      phone: normalizePhone(data.phone),
      rut: normalizeRut(data.rut),
      emergencyPhone: data.emergencyPhone ? normalizePhone(data.emergencyPhone) : '',
    };

    if (customer) {
      const result = await updateCustomer(customer.id, normalizedData);
      if (result) {
        onSuccess?.(result);
        onHide();
        reset();
      }
    } else {
      const result = await createCustomer(normalizedData);
      if (result) {
        onSuccess?.(result);
        onHide();
        reset();
      }
    }
  };

  const handleClose = () => {
    reset();
    onHide();
  };

  return (
    <Modal show={show} onHide={handleClose} size="xl" centered backdrop="static">
      <Modal.Header closeButton>
        <Modal.Title>
          {customer ? '✏️ Editar Cliente' : '➕ Nuevo Cliente'}
        </Modal.Title>
      </Modal.Header>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Modal.Body className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
          {/* Nombre Completo */}
          <Input
            label="Nombre Completo *"
            placeholder="Ej: María González"
            {...register('fullName')}
            error={errors.fullName?.message}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Teléfono */}
            <Input
              type="tel"
              label="Teléfono *"
              placeholder="Ej: +56912345678"
              {...register('phone')}
              error={errors.phone?.message}
              helperText="Formato: +56912345678 o 912345678"
            />

            {/* RUT */}
            <Input
              label="RUT *"
              placeholder="18.664.589-8 o 18664589-8"
              {...register('rut')}
              error={errors.rut?.message}
              helperText="Con o sin puntos, con guion"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Email */}
            <Input
              type="email"
              label="Email"
              placeholder="cliente@ejemplo.com"
              {...register('email')}
              error={errors.email?.message}
            />

            {/* Instagram */}
            <Input
              label="Instagram"
              placeholder="Ej: @usuario"
              {...register('instagram')}
              error={errors.instagram?.message}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Género */}
            <Select label="Género" {...register('gender')}>
              <option value="">Seleccione...</option>
              <option value="FEMENINO">Femenino</option>
              <option value="MASCULINO">Masculino</option>
            </Select>

            {/* Fecha de Nacimiento */}
            <Input
              type="date"
              label="Fecha de Nacimiento"
              {...register('birthDate')}
            />

            {/* Teléfono de Emergencia */}
            <Input
              type="tel"
              label="Teléfono de Emergencia"
              placeholder="Contacto de emergencia"
              {...register('emergencyPhone')}
              error={errors.emergencyPhone?.message}
            />
          </div>

          {/* Preferencia de Notificación */}
          <Select
            label="Preferencia de Notificación *"
            {...register('notificationPreference')}
            error={errors.notificationPreference?.message}
          >
            <option value={NotificationPreference.WHATSAPP_ONLY}>💬 WhatsApp</option>
            <option value={NotificationPreference.EMAIL_ONLY}>📧 Email</option>
            <option value={NotificationPreference.BOTH}>📧💬 Ambos</option>
            <option value={NotificationPreference.NONE}>🔕 Ninguno</option>
          </Select>

          {/* Notas de Salud */}
          <Textarea
            label="Notas de Salud"
            rows={2}
            placeholder="Alergias, condiciones médicas, hongos previos, etc."
            {...register('healthNotes')}
            error={errors.healthNotes?.message}
            helperText="Información importante para el servicio de manicure."
          />

          {/* Notas Generales */}
          <Textarea
            label="Notas Generales"
            rows={2}
            placeholder="Preferencias de esmalte, observaciones, etc."
            {...register('notes')}
            error={errors.notes?.message}
          />
        </Modal.Body>

        <Modal.Footer>
          <Button variant="outline" size="sm" onClick={handleClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            size="sm"
            type="submit"
            disabled={loading}
            isLoading={loading}
            loadingText="Guardando..."
          >
            {customer ? '💾 Actualizar' : '➕ Crear Cliente'}
          </Button>
        </Modal.Footer>
      </form>
    </Modal>
  );
}
