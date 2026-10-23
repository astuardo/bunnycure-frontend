import React, { useState, useEffect } from 'react';
import { FiHome, FiGlobe, FiPhone, FiMail, FiMapPin, FiUser, FiLock, FiCheck, FiX, FiLayers, FiImage } from 'react-icons/fi';
import { TenantAdmin, TenantCreateFormData, TenantUpdateFormData } from '../../types/tenant.types';
import { Modal, Button, Input, Select, Alert } from '../ui';

interface TenantFormModalProps {
  show: boolean;
  tenant: TenantAdmin | null;
  onHide: () => void;
  onSave: (data: TenantCreateFormData | TenantUpdateFormData) => Promise<void>;
}

export const TenantFormModal: React.FC<TenantFormModalProps> = ({
  show,
  tenant,
  onHide,
  onSave,
}) => {
  const isEditing = !!tenant;

  // General fields
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [customDomain, setCustomDomain] = useState('');
  const [planTier, setPlanTier] = useState('STANDARD');
  const [primaryColor, setPrimaryColor] = useState('#d48b70');
  const [logoUrl, setLogoUrl] = useState('');
  const [rut, setRut] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [whatsappPhoneId, setWhatsappPhoneId] = useState('');

  // Initial Admin fields (for new salon)
  const [initialAdminUsername, setInitialAdminUsername] = useState('');
  const [initialAdminFullName, setInitialAdminFullName] = useState('');
  const [initialAdminEmail, setInitialAdminEmail] = useState('');
  const [initialAdminPassword, setInitialAdminPassword] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (tenant) {
      setName(tenant.name || '');
      setSlug(tenant.slug || '');
      setCustomDomain(tenant.customDomain || '');
      setPlanTier(tenant.planTier || 'STANDARD');
      setPrimaryColor(tenant.primaryColor || '#d48b70');
      setLogoUrl(tenant.logoUrl || '');
      setRut(tenant.rut || '');
      setPhone(tenant.phone || '');
      setEmail(tenant.email || '');
      setAddress(tenant.address || '');
      setWhatsappPhoneId(tenant.whatsappPhoneId || '');
    } else {
      setName('');
      setSlug('');
      setCustomDomain('');
      setPlanTier('STANDARD');
      setPrimaryColor('#d48b70');
      setLogoUrl('');
      setRut('');
      setPhone('');
      setEmail('');
      setAddress('');
      setWhatsappPhoneId('');
      setInitialAdminUsername('');
      setInitialAdminFullName('');
      setInitialAdminEmail('');
      setInitialAdminPassword('');
    }
    setError(null);
  }, [tenant, show]);

  // Sugerir slug automáticamente a partir del nombre en modo creación
  const handleNameChange = (val: string) => {
    setName(val);
    if (!isEditing && (!slug || slug === slugify(name))) {
      setSlug(slugify(val));
    }
  };

  const slugify = (text: string) => {
    return text
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('El nombre del salón es obligatorio');
      return;
    }

    const cleanSlug = slug.trim().toLowerCase();
    if (!cleanSlug) {
      setError('El slug identificador es obligatorio');
      return;
    }

    if (!/^[a-z0-9-]+$/.test(cleanSlug)) {
      setError('El slug solo puede contener letras minúsculas, números y guiones');
      return;
    }

    try {
      setSubmitting(true);
      if (isEditing) {
        await onSave({
          name: name.trim(),
          customDomain: customDomain.trim() || undefined,
          rut: rut.trim() || undefined,
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
          address: address.trim() || undefined,
          logoUrl: logoUrl.trim() || undefined,
          primaryColor: primaryColor || '#d48b70',
          planTier,
          whatsappPhoneId: whatsappPhoneId.trim() || undefined,
        } as TenantUpdateFormData);
      } else {
        await onSave({
          name: name.trim(),
          slug: cleanSlug,
          customDomain: customDomain.trim() || undefined,
          rut: rut.trim() || undefined,
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
          address: address.trim() || undefined,
          logoUrl: logoUrl.trim() || undefined,
          primaryColor: primaryColor || '#d48b70',
          planTier,
          whatsappPhoneId: whatsappPhoneId.trim() || undefined,
          initialAdminUsername: initialAdminUsername.trim() || undefined,
          initialAdminFullName: initialAdminFullName.trim() || undefined,
          initialAdminEmail: initialAdminEmail.trim() || undefined,
          initialAdminPassword: initialAdminPassword || undefined,
        } as TenantCreateFormData);
      }
      onHide();
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || err.message || 'Error al guardar salón';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>
          <span className="flex items-center gap-2">
            <FiHome className="text-[#d48b70]" />
            {isEditing ? `Editar Salón: ${tenant?.name}` : 'Aprovisionar Nuevo Salón SaaS'}
          </span>
        </Modal.Title>
      </Modal.Header>

      <form onSubmit={handleSubmit}>
        <Modal.Body className="space-y-4 max-h-[75vh] overflow-y-auto">
          {error && (
            <Alert variant="danger" dismissible onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {/* Bloque 1: Identidad del Salón */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#7a5c4d] mb-3 flex items-center gap-1.5">
              <FiHome /> Datos Generales e Identidad
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-bunny-text mb-1">Nombre Comercial *</label>
                <Input
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Ej: Glamour Nails Las Condes"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-bunny-text mb-1">Identificador Slug (Subdominio / Ruta) *</label>
                <Input
                  value={slug}
                  onChange={(e) => setSlug(slugify(e.target.value))}
                  placeholder="ej: glamour-las-condes"
                  disabled={isEditing}
                  required
                />
                {!isEditing && (
                  <p className="text-[11px] text-bunny-text-muted mt-1">
                    URL pública: <code>/reservar?salon={slug || 'slug'}</code>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-bunny-text mb-1">Dominio Personalizado (Opcional)</label>
                <div className="relative">
                  <FiGlobe className="absolute left-3 top-3 text-bunny-text-muted/70" />
                  <Input
                    className="pl-9"
                    value={customDomain}
                    onChange={(e) => setCustomDomain(e.target.value)}
                    placeholder="ej: reservas.glamour.cl"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-bunny-text mb-1">Plan de Suscripción</label>
                <Select
                  value={planTier}
                  onChange={(e) => setPlanTier(e.target.value)}
                >
                  <option value="STANDARD">🌱 Standard (Hasta 2 manicuristas)</option>
                  <option value="PRO">⭐ Pro (Hasta 6 manicuristas + Campañas)</option>
                  <option value="VIP">👑 VIP Enterprise (Manicuristas ilimitadas + Multisede)</option>
                </Select>
              </div>
            </div>
          </div>

          {/* Bloque 2: Branding y Estilo */}
          <div className="border-t border-bunny-border pt-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#7a5c4d] mb-3 flex items-center gap-1.5">
              <FiLayers /> Personalización de Marca
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label htmlFor="tenant-form-color-primario-de-marca" className="block text-xs font-semibold text-bunny-text mb-1">Color Primario de Marca</label>
                <div className="flex items-center gap-2">
                  <input id="tenant-form-color-primario-de-marca"
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-10 h-10 p-0 border border-bunny-border-strong rounded-lg cursor-pointer"
                  />
                  <Input
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    placeholder="#d48b70"
                    className="font-mono text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-bunny-text mb-1">URL de Logotipo</label>
                <div className="relative">
                  <FiImage className="absolute left-3 top-3 text-bunny-text-muted/70" />
                  <Input
                    className="pl-9"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="https://.../logo.png"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Bloque 3: Contacto y Facturación */}
          <div className="border-t border-bunny-border pt-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#7a5c4d] mb-3 flex items-center gap-1.5">
              <FiPhone /> Contacto y Facturación
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-bunny-text mb-1">Teléfono Comercial</label>
                <div className="relative">
                  <FiPhone className="absolute left-3 top-3 text-bunny-text-muted/70" />
                  <Input
                    className="pl-9"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+569..."
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-bunny-text mb-1">Email de Contacto</label>
                <div className="relative">
                  <FiMail className="absolute left-3 top-3 text-bunny-text-muted/70" />
                  <Input
                    type="email"
                    className="pl-9"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="contacto@salon.cl"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-bunny-text mb-1">RUT Empresa / Salón</label>
                <Input
                  value={rut}
                  onChange={(e) => setRut(e.target.value)}
                  placeholder="76.123.456-7"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-bunny-text mb-1">Dirección Física</label>
                <div className="relative">
                  <FiMapPin className="absolute left-3 top-3 text-bunny-text-muted/70" />
                  <Input
                    className="pl-9"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Av. Providencia 1234, Oficina 501"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Bloque 4: Administrador Inicial (Solo en Creación) */}
          {!isEditing && (
            <div className="border-t border-[#f0e0d8] pt-3 bg-[#fdfaf8] -mx-4 px-4 py-3 rounded-xl border">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#7a5c4d] mb-1 flex items-center gap-1.5">
                <FiUser /> Administrador(a) Inicial del Salón
              </h4>
              <p className="text-[11px] text-bunny-text-muted mb-3">
                Se creará una cuenta administradora exclusiva para este salón con cambio de contraseña obligatorio en el primer inicio.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-bunny-text mb-1">Usuario Admin</label>
                  <div className="relative">
                    <FiUser className="absolute left-3 top-3 text-bunny-text-muted/70" />
                    <Input
                      className="pl-9"
                      value={initialAdminUsername}
                      onChange={(e) => setInitialAdminUsername(e.target.value)}
                      placeholder={slug ? `admin_${slug}` : 'admin_salon'}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-bunny-text mb-1">Nombre Completo</label>
                  <Input
                    value={initialAdminFullName}
                    onChange={(e) => setInitialAdminFullName(e.target.value)}
                    placeholder="Ej: Carolina Administradora"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-bunny-text mb-1">Email del Admin</label>
                  <div className="relative">
                    <FiMail className="absolute left-3 top-3 text-bunny-text-muted/70" />
                    <Input
                      type="email"
                      className="pl-9"
                      value={initialAdminEmail}
                      onChange={(e) => setInitialAdminEmail(e.target.value)}
                      placeholder="admin@salon.cl"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-bunny-text mb-1">Contraseña Provisoria</label>
                  <div className="relative">
                    <FiLock className="absolute left-3 top-3 text-bunny-text-muted/70" />
                    <Input
                      type="password"
                      className="pl-9"
                      value={initialAdminPassword}
                      onChange={(e) => setInitialAdminPassword(e.target.value)}
                      placeholder="Generada automáticamente si se omite"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </Modal.Body>

        <Modal.Footer>
          <Button variant="outline" onClick={onHide} disabled={submitting}>
            <FiX className="mr-1.5" /> Cancelar
          </Button>
          <Button variant="primary" type="submit" isLoading={submitting}>
            <FiCheck className="mr-1.5" /> {isEditing ? 'Guardar Cambios' : 'Aprovisionar Salón'}
          </Button>
        </Modal.Footer>
      </form>
    </Modal>
  );
};
