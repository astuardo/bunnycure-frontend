import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  FiUsers,
  FiPlus,
  FiEdit2,
  FiLock,
  FiTrash2,
  FiSearch,
  FiCheckCircle,
  FiXCircle,
  FiRefreshCw,
} from 'react-icons/fi';
import DashboardLayout from '../../components/common/DashboardLayout';
import { usersApi } from '../../api/users.api';
import {
  User,
  CreateUserFormData,
  UpdateUserFormData,
  ChangeUserPasswordFormData,
  ROLE_LABELS,
  ROLE_BADGE_VARIANTS,
} from '../../types/user.types';
import { UserFormModal } from '../../components/users/UserFormModal';
import { ChangeUserPasswordModal } from '../../components/users/ChangeUserPasswordModal';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../../hooks/useAuth';
import { Card, Button, Badge, BadgeVariant, Spinner, Modal, Input } from '../../components/ui';

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
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-bunny-cocoa tracking-tight flex items-center gap-2 m-0">
                <FiUsers className="text-bunny-primary" />
                Personal y Usuarios
              </h1>
              <Badge variant="neutral">
                {users.length} {users.length === 1 ? 'cuenta' : 'cuentas'}
              </Badge>
            </div>
            <p className="text-sm text-bunny-text-muted mt-1 m-0">
              Administración de cuentas de acceso, roles y contraseñas del salón.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchUsers}
              disabled={loading}
              title="Recargar usuarios"
            >
              <FiRefreshCw className={loading ? 'animate-spin' : ''} />
            </Button>
            <Button
              size="sm"
              variant="primary"
              onClick={() => {
                setEditingUser(null);
                setShowFormModal(true);
              }}
              leftIcon={<FiPlus />}
            >
              Nuevo Usuario
            </Button>
          </div>
        </div>

        {/* Barra de búsqueda */}
        <Card className="shadow-xs border-bunny-border/80">
          <Card.Body className="p-4">
            <div className="max-w-md">
              <Input
                type="text"
                placeholder="Buscar por usuario, nombre o email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                leftIcon={<FiSearch className="text-bunny-text-muted text-sm" />}
              />
            </div>
          </Card.Body>
        </Card>

        {/* Tabla de Usuarios */}
        <Card className="shadow-bunny border-bunny-border overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-bunny-text-muted">
              <Spinner size="lg" variant="primary" />
              <p className="text-sm mt-3">Cargando usuarios...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-16 text-bunny-text-muted">
              <FiUsers className="mx-auto text-4xl mb-2 opacity-40 text-bunny-primary" />
              <p className="text-sm">No se encontraron usuarios.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-bunny-paper/70 border-b border-bunny-border text-xs font-semibold text-bunny-text-muted uppercase">
                    <th className="py-3.5 px-4">Usuario</th>
                    <th className="py-3.5 px-4">Nombre Completo</th>
                    <th className="py-3.5 px-4">Email</th>
                    <th className="py-3.5 px-4">Rol</th>
                    <th className="py-3.5 px-4 text-center">Estado</th>
                    <th className="py-3.5 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-bunny-border/60">
                  {filteredUsers.map((u) => {
                    const isSelf = currentUser?.username === u.username;
                    const roleKey = u.role.replace('ROLE_', '').toUpperCase();
                    const badgeVariant =
                      (ROLE_BADGE_VARIANTS[roleKey] as BadgeVariant) || 'neutral';

                    return (
                      <tr key={u.id} className="hover:bg-bunny-blush/20 transition-colors">
                        <td className="py-3.5 px-4 font-semibold text-bunny-cocoa">
                          {u.username}
                          {isSelf && (
                            <Badge variant="info" className="ml-2 text-[10px]">
                              Tú
                            </Badge>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-bunny-text font-medium">{u.fullName}</td>
                        <td className="py-3.5 px-4 text-bunny-text-muted text-xs">
                          {u.email || <span className="opacity-40">—</span>}
                        </td>
                        <td className="py-3.5 px-4">
                          <Badge variant={badgeVariant} className="text-xs">
                            {ROLE_LABELS[roleKey] || roleKey}
                          </Badge>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {u.enabled ? (
                            <Badge variant="success" className="gap-1 inline-flex items-center">
                              <FiCheckCircle className="text-[11px]" /> Activo
                            </Badge>
                          ) : (
                            <Badge variant="danger" className="gap-1 inline-flex items-center">
                              <FiXCircle className="text-[11px]" /> Inactivo
                            </Badge>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              title="Editar"
                              onClick={() => {
                                setEditingUser(u);
                                setShowFormModal(true);
                              }}
                              className="p-1.5 rounded-lg border border-bunny-border text-bunny-cocoa hover:bg-bunny-blush/60 hover:border-bunny-terracotta/40 transition-colors"
                            >
                              <FiEdit2 className="text-xs" />
                            </button>

                            <button
                              type="button"
                              title="Cambiar Contraseña"
                              onClick={() => {
                                setPasswordUser(u);
                                setShowPasswordModal(true);
                              }}
                              className="p-1.5 rounded-lg border border-bunny-border text-amber-700 hover:bg-amber-50 hover:border-amber-300 transition-colors"
                            >
                              <FiLock className="text-xs" />
                            </button>

                            <button
                              type="button"
                              title={u.enabled ? 'Desactivar' : 'Activar'}
                              onClick={() => handleToggleEnabled(u)}
                              className={`p-1.5 rounded-lg border transition-colors ${
                                u.enabled
                                  ? 'border-bunny-border text-bunny-text-muted hover:bg-gray-100'
                                  : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                              }`}
                            >
                              {u.enabled ? (
                                <FiXCircle className="text-xs" />
                              ) : (
                                <FiCheckCircle className="text-xs" />
                              )}
                            </button>

                            <button
                              type="button"
                              title="Eliminar"
                              disabled={isSelf}
                              onClick={() => setDeleteCandidate(u)}
                              className="p-1.5 rounded-lg border border-bunny-border text-bunny-danger hover:bg-rose-50 hover:border-rose-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              <FiTrash2 className="text-xs" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
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
        <Modal show={!!deleteCandidate} onHide={() => setDeleteCandidate(null)} size="sm" centered>
          <Modal.Header closeButton>
            <Modal.Title>⚠️ Confirmar Eliminación</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <p className="text-sm text-bunny-text leading-relaxed m-0">
              ¿Está seguro de que desea eliminar permanentemente al usuario{' '}
              <strong className="text-bunny-cocoa">
                {deleteCandidate?.fullName} ({deleteCandidate?.username})
              </strong>
              ?
            </p>
          </Modal.Body>
          <Modal.Footer>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteCandidate(null)}
              disabled={deleting}
            >
              Cancelar
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleDelete}
              isLoading={deleting}
              loadingText="Eliminando..."
            >
              Eliminar Usuario
            </Button>
          </Modal.Footer>
        </Modal>
      </div>
    </DashboardLayout>
  );
}
