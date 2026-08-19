import { useState, useEffect, useMemo, useCallback } from 'react';
import { Container, Row, Col, Card, Table, Button, Badge, Form, Spinner, Modal } from 'react-bootstrap';
import { FiUsers, FiPlus, FiEdit2, FiLock, FiTrash2, FiSearch, FiCheckCircle, FiXCircle, FiRefreshCw } from 'react-icons/fi';
import DashboardLayout from '../../components/common/DashboardLayout';
import { usersApi } from '../../api/users.api';
import { User, CreateUserFormData, UpdateUserFormData, ChangeUserPasswordFormData, ROLE_LABELS, ROLE_BADGE_VARIANTS } from '../../types/user.types';
import { UserFormModal } from '../../components/users/UserFormModal';
import { ChangeUserPasswordModal } from '../../components/users/ChangeUserPasswordModal';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../../hooks/useAuth';

export default function UsersPage() {
  const toast = useToast();
  const { user: currentUser } = useAuth();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [showFormModal, setShowFormModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordUser, setPasswordUser] = useState<User | null>(null);

  const [deleteCandidate, setDeleteCandidate] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const data = await usersApi.list();
      setUsers(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al cargar usuarios';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const filteredUsers = useMemo(() => {
    if (!search.trim()) return users;
    const q = search.toLowerCase();
    return users.filter(
      (u) =>
        u.username.toLowerCase().includes(q) ||
        u.fullName.toLowerCase().includes(q) ||
        (u.email && u.email.toLowerCase().includes(q))
    );
  }, [users, search]);

  const handleCreateOrUpdate = async (data: CreateUserFormData | UpdateUserFormData) => {
    if (editingUser) {
      await usersApi.update(editingUser.id, data as UpdateUserFormData);
      toast.success('Usuario actualizado exitosamente');
    } else {
      await usersApi.create(data as CreateUserFormData);
      toast.success('Usuario creado exitosamente');
    }
    fetchUsers();
  };

  const handleToggleEnabled = async (user: User) => {
    try {
      await usersApi.toggleEnabled(user.id);
      toast.success(`Usuario ${user.enabled ? 'desactivado' : 'activado'} exitosamente`);
      fetchUsers();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al cambiar estado del usuario';
      toast.error(msg);
    }
  };

  const handleChangePassword = async (userId: number, data: ChangeUserPasswordFormData) => {
    await usersApi.changePassword(userId, data);
    toast.success('Contraseña actualizada exitosamente');
  };

  const handleDelete = async () => {
    if (!deleteCandidate) return;
    try {
      setDeleting(true);
      await usersApi.delete(deleteCandidate.id);
      toast.success('Usuario eliminado exitosamente');
      setDeleteCandidate(null);
      fetchUsers();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al eliminar usuario';
      toast.error(msg);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <DashboardLayout>
      <Container fluid className="px-3 px-md-4 py-4">
        {/* Header */}
        <Row className="mb-4 align-items-center">
          <Col xs={12} md={7}>
            <div className="d-flex align-items-center gap-2">
              <h2 className="mb-0 fw-bold" style={{ color: '#422314', letterSpacing: '-0.5px' }}>
                <FiUsers className="me-2 text-primary" style={{ color: '#c9897a !important' }} />
                Personal y Usuarios
              </h2>
              <Badge bg="secondary" pill className="ms-2">
                {users.length} {users.length === 1 ? 'cuenta' : 'cuentas'}
              </Badge>
            </div>
            <p className="text-muted mb-0 mt-1 small">
              Administración de cuentas de acceso, roles y contraseñas del salón.
            </p>
          </Col>
          <Col xs={12} md={5} className="mt-3 mt-md-0 d-flex justify-content-md-end gap-2">
            <Button
              variant="outline-secondary"
              size="sm"
              onClick={fetchUsers}
              disabled={loading}
              style={{ borderRadius: '8px' }}
            >
              <FiRefreshCw className={loading ? 'spin' : ''} />
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setEditingUser(null);
                setShowFormModal(true);
              }}
              style={{
                borderRadius: '8px',
                background: '#c9897a',
                borderColor: '#c9897a',
                color: '#fff',
                fontWeight: 600,
              }}
            >
              <FiPlus className="me-1" /> Nuevo Usuario
            </Button>
          </Col>
        </Row>

        {/* Barra de búsqueda */}
        <Card className="border-0 shadow-sm mb-4" style={{ borderRadius: '12px', background: '#fff' }}>
          <Card.Body className="p-3">
            <Row>
              <Col md={6}>
                <div className="input-group input-group-sm">
                  <span className="input-group-text bg-transparent border-end-0" style={{ borderColor: '#eed0c5' }}>
                    <FiSearch className="text-muted" />
                  </span>
                  <Form.Control
                    type="text"
                    placeholder="Buscar por usuario, nombre o email..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="border-start-0"
                    style={{ borderColor: '#eed0c5', borderRadius: '0 8px 8px 0' }}
                  />
                </div>
              </Col>
            </Row>
          </Card.Body>
        </Card>

        {/* Tabla de Usuarios */}
        <Card className="border-0 shadow-sm" style={{ borderRadius: '14px', background: '#fff', overflow: 'hidden' }}>
          <Card.Body className="p-0">
            {loading ? (
              <div className="text-center py-5">
                <Spinner animation="border" style={{ color: '#c9897a' }} />
                <p className="text-muted mt-2 small">Cargando usuarios...</p>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-5">
                <FiUsers size={36} className="text-muted mb-2 opacity-50" />
                <p className="text-muted mb-0">No se encontraron usuarios.</p>
              </div>
            ) : (
              <div className="table-responsive">
                <Table hover className="align-middle mb-0">
                  <thead style={{ background: '#fdf6f3', borderBottom: '1px solid #eed0c5' }}>
                    <tr>
                      <th className="px-3 py-3 text-muted small fw-bold">USUARIO</th>
                      <th className="py-3 text-muted small fw-bold">NOMBRE COMPLETO</th>
                      <th className="py-3 text-muted small fw-bold">EMAIL</th>
                      <th className="py-3 text-muted small fw-bold">ROL</th>
                      <th className="py-3 text-muted small fw-bold text-center">ESTADO</th>
                      <th className="px-3 py-3 text-muted small fw-bold text-end">ACCIONES</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u) => {
                      const isSelf = currentUser?.username === u.username;

                      return (
                        <tr key={u.id}>
                          <td className="px-3 fw-bold" style={{ color: '#422314' }}>
                            {u.username}
                            {isSelf && (
                              <Badge bg="info" className="ms-2" style={{ fontSize: '10px' }}>
                                Tú
                              </Badge>
                            )}
                          </td>
                          <td style={{ color: '#5c3d2e' }}>{u.fullName}</td>
                          <td className="text-muted small">{u.email || <span className="opacity-50">—</span>}</td>
                          <td>
                            <Badge
                              bg={ROLE_BADGE_VARIANTS[u.role.replace('ROLE_', '').toUpperCase()] || 'secondary'}
                              style={{ fontSize: '11.5px', padding: '6px 10px', borderRadius: '6px' }}
                            >
                              {ROLE_LABELS[u.role.replace('ROLE_', '').toUpperCase()] || u.role.replace('ROLE_', '')}
                            </Badge>
                          </td>
                          <td className="text-center">
                            {u.enabled ? (
                              <Badge bg="success" className="d-inline-flex align-items-center gap-1">
                                <FiCheckCircle /> Activo
                              </Badge>
                            ) : (
                              <Badge bg="danger" className="d-inline-flex align-items-center gap-1">
                                <FiXCircle /> Inactivo
                              </Badge>
                            )}
                          </td>
                          <td className="px-3 text-end">
                            <div className="d-inline-flex gap-1">
                              <Button
                                size="sm"
                                variant="outline-primary"
                                title="Editar"
                                onClick={() => {
                                  setEditingUser(u);
                                  setShowFormModal(true);
                                }}
                                style={{ borderRadius: '6px', padding: '4px 8px' }}
                              >
                                <FiEdit2 size={13} />
                              </Button>

                              <Button
                                size="sm"
                                variant="outline-warning"
                                title="Cambiar Contraseña"
                                onClick={() => {
                                  setPasswordUser(u);
                                  setShowPasswordModal(true);
                                }}
                                style={{ borderRadius: '6px', padding: '4px 8px' }}
                              >
                                <FiLock size={13} />
                              </Button>

                              <Button
                                size="sm"
                                variant={u.enabled ? 'outline-secondary' : 'outline-success'}
                                title={u.enabled ? 'Desactivar' : 'Activar'}
                                onClick={() => handleToggleEnabled(u)}
                                style={{ borderRadius: '6px', padding: '4px 8px' }}
                              >
                                {u.enabled ? <FiXCircle size={13} /> : <FiCheckCircle size={13} />}
                              </Button>

                              <Button
                                size="sm"
                                variant="outline-danger"
                                title="Eliminar"
                                disabled={isSelf}
                                onClick={() => setDeleteCandidate(u)}
                                style={{ borderRadius: '6px', padding: '4px 8px' }}
                              >
                                <FiTrash2 size={13} />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Table>
              </div>
            )}
          </Card.Body>
        </Card>

        {/* Modal Crear/Editar */}
        <UserFormModal
          show={showFormModal}
          user={editingUser}
          onHide={() => {
            setShowFormModal(false);
            setEditingUser(null);
          }}
          onSave={handleCreateOrUpdate}
        />

        {/* Modal Cambiar Clave */}
        <ChangeUserPasswordModal
          show={showPasswordModal}
          user={passwordUser}
          onHide={() => {
            setShowPasswordModal(false);
            setPasswordUser(null);
          }}
          onSave={handleChangePassword}
        />

        {/* Modal Confirmar Eliminación */}
        <Modal show={!!deleteCandidate} onHide={() => setDeleteCandidate(null)} centered>
          <Modal.Header closeButton style={{ background: '#fdf6f3', borderBottom: '1px solid #eed0c5' }}>
            <Modal.Title style={{ color: '#422314', fontSize: '1.1rem', fontWeight: 700 }}>
              ⚠️ Confirmar Eliminación
            </Modal.Title>
          </Modal.Header>
          <Modal.Body className="p-4">
            ¿Está seguro de que desea eliminar permanentemente al usuario{' '}
            <strong>{deleteCandidate?.fullName} ({deleteCandidate?.username})</strong>?
          </Modal.Body>
          <Modal.Footer style={{ background: '#fdf6f3', borderTop: '1px solid #eed0c5' }}>
            <Button variant="secondary" onClick={() => setDeleteCandidate(null)} disabled={deleting} style={{ borderRadius: '8px' }}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={handleDelete} disabled={deleting} style={{ borderRadius: '8px' }}>
              {deleting ? 'Eliminando...' : 'Eliminar Usuario'}
            </Button>
          </Modal.Footer>
        </Modal>
      </Container>
    </DashboardLayout>
  );
}
