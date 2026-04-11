import { Modal, Button, Spinner } from 'react-bootstrap';
import { Customer } from '../../types/customer.types';

interface DeleteCustomerModalProps {
    show: boolean;
    onHide: () => void;
    customer: Customer | null;
    onConfirm: () => Promise<void>;
    loading?: boolean;
}

export default function DeleteCustomerModal({ 
    show, 
    onHide, 
    customer, 
    onConfirm,
    loading = false 
}: DeleteCustomerModalProps) {
    if (!customer) return null;

    const handleConfirm = async () => {
        await onConfirm();
    };

    return (
        <Modal
            show={show}
            onHide={onHide}
            centered
            backdrop="static"
            className="bunny-modal delete-customer-modal"
        >
            <Modal.Header closeButton>
                <Modal.Title>🗑️ Confirmar Eliminación</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <p className="mb-3">
                    ¿Estás seguro que deseas eliminar al cliente <strong>{customer.fullName}</strong>?
                </p>
                <div className="alert alert-warning mb-0">
                    <small>
                        ⚠️ <strong>Advertencia:</strong> Esta acción no se puede deshacer.
                        Se eliminarán todos los datos del cliente.
                    </small>
                </div>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={onHide} disabled={loading}>
                    Cancelar
                </Button>
                <Button variant="danger" onClick={handleConfirm} disabled={loading}>
                    {loading ? (
                        <>
                            <Spinner
                                as="span"
                                animation="border"
                                size="sm"
                                role="status"
                                className="me-2"
                            />
                            Eliminando...
                        </>
                    ) : (
                        '🗑️ Eliminar Cliente'
                    )}
                </Button>
            </Modal.Footer>
        </Modal>
    );
}
