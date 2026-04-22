import { useEffect } from 'react';
import { Modal, Button, Form, Row, Col, Spinner } from 'react-bootstrap';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Customer, CustomerFormData, NotificationPreference } from '../../types/customer.types';
import { useCustomersStore } from '../../stores/customersStore';

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
    
    email: yup
        .string()
        .email('Email inválido')
        .optional(),
    
    gender: yup
        .string()
        .optional(),
    
    birthDate: yup
        .string()
        .optional(),
    
    emergencyPhone: yup
        .string()
        .transform((_, originalValue) => normalizePhone(originalValue))
        .matches(/^\+?[0-9]{8,15}$/, {
            message: 'Formato de teléfono de emergencia inválido (8-15 dígitos, opcional +)',
            excludeEmptyString: true
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
        .required('La preferencia de notificación es requerida')
}) as yup.ObjectSchema<CustomerFormData>;

export default function CustomerFormModal({ show, onHide, customer, onSuccess }: CustomerFormModalProps) {
    const { createCustomer, updateCustomer, loading } = useCustomersStore();
    
    const {
        register,
        handleSubmit,
        formState: { errors },
        reset,
        setValue
    } = useForm<CustomerFormData>({
        resolver: yupResolver(customerSchema),
        mode: 'onChange',
        reValidateMode: 'onChange',
        defaultValues: {
            fullName: '',
            phone: '',
            email: '',
            gender: '',
            birthDate: '',
            emergencyPhone: '',
            healthNotes: '',
            notes: '',
            instagram: '',
            notificationPreference: NotificationPreference.WHATSAPP
        }
    });

    // Cargar datos cuando se edita
    useEffect(() => {
        if (customer) {
            setValue('fullName', customer.fullName);
            setValue('phone', customer.phone);
            setValue('email', customer.email || '');
            setValue('gender', customer.gender || '');
            setValue('birthDate', customer.birthDate || '');
            setValue('emergencyPhone', customer.emergencyPhone || '');
            setValue('healthNotes', customer.healthNotes || '');
            setValue('notes', customer.notes || '');
            setValue('instagram', customer.instagram || '');
            setValue('notificationPreference', customer.notificationPreference);
        } else {
            reset();
        }
    }, [customer, setValue, reset]);

    const onSubmit = async (data: CustomerFormData) => {
        const normalizedData: CustomerFormData = {
            ...data,
            phone: normalizePhone(data.phone),
            emergencyPhone: data.emergencyPhone ? normalizePhone(data.emergencyPhone) : ''
        };

        if (customer) {
            // Actualizar
            const result = await updateCustomer(customer.id, normalizedData);
            if (result) {
                onSuccess?.(result);
                onHide();
                reset();
            }
        } else {
            // Crear nuevo
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
        <Modal
            show={show}
            onHide={handleClose}
            size="lg"
            backdrop="static"
            className="bunny-modal customer-form-modal"
            scrollable
            fullscreen="sm-down"
        >
            <Modal.Header closeButton>
                <Modal.Title>
                    {customer ? '✏️ Editar Cliente' : '➕ Nuevo Cliente'}
                </Modal.Title>
            </Modal.Header>

            <Form onSubmit={handleSubmit(onSubmit)} className="customer-form-inner">
                <Modal.Body>
                    <Row>
                        {/* Nombre Completo */}
                        <Col md={12} className="mb-3">
                            <Form.Group>
                                <Form.Label>
                                    Nombre Completo <span className="text-danger">*</span>
                                </Form.Label>
                                <Form.Control
                                    type="text"
                                    placeholder="Ej: María González"
                                    {...register('fullName')}
                                    isInvalid={!!errors.fullName}
                                />
                                <Form.Control.Feedback type="invalid">
                                    {errors.fullName?.message}
                                </Form.Control.Feedback>
                            </Form.Group>
                        </Col>

                        {/* Teléfono */}
                        <Col md={6} className="mb-3">
                            <Form.Group>
                                <Form.Label>
                                    Teléfono <span className="text-danger">*</span>
                                </Form.Label>
                                <Form.Control
                                    type="tel"
                                    placeholder="Ej: +56912345678"
                                    {...register('phone')}
                                    isInvalid={!!errors.phone}
                                />
                                <Form.Control.Feedback type="invalid">
                                    {errors.phone?.message}
                                </Form.Control.Feedback>
                                <Form.Text className="text-muted">
                                    Puedes escribir espacios o guiones (ej: +56 9 8369 2046)
                                </Form.Text>
                            </Form.Group>
                        </Col>

                        {/* Email */}
                        <Col md={6} className="mb-3">
                            <Form.Group>
                                <Form.Label>Email</Form.Label>
                                <Form.Control
                                    type="email"
                                    placeholder="cliente@ejemplo.com"
                                    {...register('email')}
                                    isInvalid={!!errors.email}
                                />
                                <Form.Control.Feedback type="invalid">
                                    {errors.email?.message}
                                </Form.Control.Feedback>
                            </Form.Group>
                        </Col>

                        {/* Instagram */}
                        <Col md={6} className="mb-3">
                            <Form.Group>
                                <Form.Label>Instagram</Form.Label>
                                <Form.Control
                                    type="text"
                                    placeholder="Ej: @usuario"
                                    {...register('instagram')}
                                    isInvalid={!!errors.instagram}
                                />
                                <Form.Control.Feedback type="invalid">
                                    {errors.instagram?.message}
                                </Form.Control.Feedback>
                            </Form.Group>
                        </Col>

                        {/* Género */}
                        <Col md={6} className="mb-3">
                            <Form.Group>
                                <Form.Label>Género</Form.Label>
                                <Form.Select {...register('gender')}>
                                    <option value="">Seleccione...</option>
                                    <option value="F">Femenino</option>
                                    <option value="M">Masculino</option>
                                    <option value="O">Otro</option>
                                </Form.Select>
                            </Form.Group>
                        </Col>

                        {/* Fecha de Nacimiento */}
                        <Col md={6} className="mb-3">
                            <Form.Group>
                                <Form.Label>Fecha de Nacimiento</Form.Label>
                                <Form.Control
                                    type="date"
                                    {...register('birthDate')}
                                />
                            </Form.Group>
                        </Col>

                        {/* Teléfono de Emergencia */}
                        <Col md={6} className="mb-3">
                            <Form.Group>
                                <Form.Label>Teléfono de Emergencia</Form.Label>
                                <Form.Control
                                    type="tel"
                                    placeholder="Contacto de emergencia"
                                    {...register('emergencyPhone')}
                                    isInvalid={!!errors.emergencyPhone}
                                />
                                <Form.Control.Feedback type="invalid">
                                    {errors.emergencyPhone?.message}
                                </Form.Control.Feedback>
                            </Form.Group>
                        </Col>

                        {/* Preferencia de Notificación */}
                        <Col md={6} className="mb-3">
                            <Form.Group>
                                <Form.Label>
                                    Preferencia de Notificación <span className="text-danger">*</span>
                                </Form.Label>
                                <Form.Select 
                                    {...register('notificationPreference')}
                                    isInvalid={!!errors.notificationPreference}
                                >
                                    <option value={NotificationPreference.WHATSAPP}>
                                        💬 WhatsApp
                                    </option>
                                    <option value={NotificationPreference.EMAIL}>
                                        📧 Email
                                    </option>
                                    <option value={NotificationPreference.BOTH}>
                                        📧💬 Ambos
                                    </option>
                                    <option value={NotificationPreference.NONE}>
                                        🔕 Ninguno
                                    </option>
                                </Form.Select>
                                <Form.Control.Feedback type="invalid">
                                    {errors.notificationPreference?.message}
                                </Form.Control.Feedback>
                            </Form.Group>
                        </Col>

                        {/* Notas de Salud */}
                        <Col md={12} className="mb-3">
                            <Form.Group>
                                <Form.Label>Notas de Salud</Form.Label>
                                <Form.Control
                                    as="textarea"
                                    rows={2}
                                    placeholder="Alergias, condiciones médicas, etc."
                                    {...register('healthNotes')}
                                    isInvalid={!!errors.healthNotes}
                                />
                                <Form.Control.Feedback type="invalid">
                                    {errors.healthNotes?.message}
                                </Form.Control.Feedback>
                                <Form.Text className="text-muted">
                                    Información importante para el servicio
                                </Form.Text>
                            </Form.Group>
                        </Col>

                        {/* Notas Generales */}
                        <Col md={12} className="mb-3">
                            <Form.Group>
                                <Form.Label>Notas Generales</Form.Label>
                                <Form.Control
                                    as="textarea"
                                    rows={2}
                                    placeholder="Preferencias, observaciones, etc."
                                    {...register('notes')}
                                    isInvalid={!!errors.notes}
                                />
                                <Form.Control.Feedback type="invalid">
                                    {errors.notes?.message}
                                </Form.Control.Feedback>
                            </Form.Group>
                        </Col>
                    </Row>
                </Modal.Body>

                <Modal.Footer>
                    <Button variant="secondary" onClick={handleClose} disabled={loading}>
                        Cancelar
                    </Button>
                    <Button variant="primary" type="submit" disabled={loading}>
                        {loading ? (
                            <>
                                <Spinner
                                    as="span"
                                    animation="border"
                                    size="sm"
                                    role="status"
                                    className="me-2"
                                />
                                Guardando...
                            </>
                        ) : (
                            <>
                                {customer ? '💾 Actualizar' : '➕ Crear Cliente'}
                            </>
                        )}
                    </Button>
                </Modal.Footer>
            </Form>
        </Modal>
    );
}
