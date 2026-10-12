import { useEffect, useState, useMemo, type ReactNode } from 'react';
import { Plus, Trash2, Trophy, Search, ExternalLink, MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/common/DashboardLayout';
import { useLoyaltyStore } from '@/stores/loyaltyStore';
import { useCustomersStore } from '@/stores/customersStore';
import { formatRutWithDots } from '@/utils/rutUtils';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';

export default function LoyaltySettingsPage() {
  const navigate = useNavigate();
  const { rewards, loading: rewardsLoading, fetchRewards, createReward, updateReward, deleteReward } = useLoyaltyStore();
  const { customers, loading: customersLoading, fetchCustomers } = useCustomersStore();
  const [newRewardName, setNewRewardName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchRewards();
    fetchCustomers();
  }, [fetchRewards, fetchCustomers]);

  const handleAddReward = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRewardName.trim()) return;
    await createReward(newRewardName);
    setNewRewardName('');
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('¿Estás seguro de eliminar este premio de la lista?')) {
      await deleteReward(id);
    }
  };

  // Ordenar clientas por mayor cantidad de visitas completadas y sellos acumulados
  const rankedCustomers = useMemo(() => {
    const list = [...customers];
    return list.sort((a, b) => {
      const scoreA = (a.totalCompletedVisits || 0) * 10 + (a.loyaltyStamps || 0);
      const scoreB = (b.totalCompletedVisits || 0) * 10 + (b.loyaltyStamps || 0);
      if (scoreB !== scoreA) return scoreB - scoreA;
      return (b.loyaltyStamps || 0) - (a.loyaltyStamps || 0);
    });
  }, [customers]);

  const filteredRankedCustomers = useMemo(() => {
    if (!searchQuery.trim()) return rankedCustomers;
    const q = searchQuery.toLowerCase();
    return rankedCustomers.filter(
      (c) =>
        c.fullName.toLowerCase().includes(q) ||
        (c.rut && c.rut.toLowerCase().includes(q)) ||
        (c.phone && c.phone.includes(q))
    );
  }, [rankedCustomers, searchQuery]);

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-bunny-text tracking-tight flex items-center gap-2">
            <span>⭐</span> Fidelización &amp; Club de Sellos
          </h1>
          <p className="text-sm text-bunny-text-muted mt-1">
            Configura el ciclo de recompensas y consulta el ranking de clientas con mayor cantidad de sellos y visitas.
          </p>
        </div>

        {/* Sección Superior: Configuración de Premios y Estrategia */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7">
            <Card className="h-full flex flex-col justify-between">
              <div>
                <Card.Header>
                  <Card.Title>Ciclo de Premios</Card.Title>
                  <Card.Description>
                    Las clientas ganarán estos premios en orden cada vez que completen 10 visitas.
                  </Card.Description>
                </Card.Header>
                <Card.Body>
                  {rewardsLoading ? (
                    <div className="text-center py-8">
                      <Spinner size="md" className="mx-auto" />
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="divide-y divide-bunny-border/40 border border-bunny-border rounded-xl overflow-hidden bg-white">
                        {rewards.map((reward, index) => (
                          <div
                            key={reward.id}
                            className="flex items-center gap-3 p-3 hover:bg-bunny-paper/30 transition-colors"
                          >
                            <div className="font-bold text-center w-8 text-bunny-primary text-sm flex-shrink-0">
                              #{index + 1}
                            </div>
                            <input
                              type="text"
                              defaultValue={reward.name}
                              onBlur={(e) => {
                                if (e.target.value !== reward.name) {
                                  updateReward(reward.id, e.target.value);
                                }
                              }}
                              className="flex-1 rounded-lg border-0 bg-slate-50 px-3 py-1.5 text-sm font-medium text-bunny-text focus:ring-2 focus:ring-bunny-primary/20 focus:bg-white transition-all"
                            />
                            <button
                              type="button"
                              onClick={() => handleDelete(reward.id)}
                              className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors flex-shrink-0"
                              title="Eliminar premio"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        ))}
                      </div>

                      <form onSubmit={handleAddReward} className="flex gap-2 pt-2">
                        <input
                          type="text"
                          placeholder="Nuevo premio (ej: 20% Descuento en Esmaltado)"
                          value={newRewardName}
                          onChange={(e) => setNewRewardName(e.target.value)}
                          className="flex-1 rounded-xl border border-bunny-border bg-white px-3.5 py-2 text-sm text-bunny-text focus:outline-none focus:ring-2 focus:ring-bunny-primary/20 focus:border-bunny-primary"
                        />
                        <Button
                          type="submit"
                          leftIcon={<Plus size={18} />}
                        >
                          Agregar
                        </Button>
                      </form>
                    </div>
                  )}
                </Card.Body>
              </div>
              <Card.Footer>
                <strong>¿Cómo funciona el ciclo?</strong> Al completar 10 sellos, la visita #11 redime el premio actual. El contador vuelve a 0 y avanza al siguiente premio de la lista en orden continuo.
              </Card.Footer>
            </Card>
          </div>

          <div className="lg:col-span-5 space-y-4">
            <div className="rounded-2xl shadow-bunny p-6 text-white bg-gradient-to-br from-bunny-primary to-bunny-cocoa-dark">
              <div className="flex items-center gap-2 mb-2">
                <Trophy size={22} className="text-amber-300" />
                <h3 className="text-base font-bold">Estrategia de Fidelidad</h3>
              </div>
              <p className="text-xs text-white/90 mb-3 leading-relaxed">
                Premia la constancia de tus clientas para asegurar visitas recurrentes y aumentar el valor de por vida (LTV).
              </p>
              <ul className="space-y-1.5 text-xs text-white/95 list-disc pl-4">
                <li><strong>Premio 1:</strong> Descuento accesible o servicio express de regalo.</li>
                <li><strong>Premio 3 ó 5:</strong> Spa de manos o diseño nail art premium.</li>
                <li><strong>Edición en vivo:</strong> Puedes renombrar cualquier premio haciendo clic directamente en su texto.</li>
              </ul>
            </div>

            <Card>
              <Card.Body className="p-5">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-xs text-bunny-text-muted block">Total Clientas en Programa</span>
                    <h3 className="text-xl font-bold text-bunny-text mt-0.5">
                      {customers.length} clientas
                    </h3>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-bunny-text-muted block">Clientas con Sellos Activos</span>
                    <h3 className="text-xl font-bold text-emerald-700 mt-0.5">
                      {customers.filter((c) => (c.loyaltyStamps || 0) > 0).length}
                    </h3>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </div>
        </div>

        {/* Sección Inferior: Ranking de Clientas */}
        <Card>
          <Card.Header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Trophy size={20} className="text-bunny-primary" />
                <h3 className="text-base font-bold text-bunny-text">
                  Ranking de Clientas Más Fieles (Sellos &amp; Visitas)
                </h3>
              </div>
              <p className="text-xs text-bunny-text-muted mt-0.5">
                Ordenadas por total de visitas completadas y cantidad de sellos acumulados en su ciclo actual.
              </p>
            </div>

            <div className="relative w-full sm:w-72">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-bunny-text-muted" />
              <input
                type="text"
                placeholder="Buscar clienta por nombre o RUT..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3.5 py-1.5 text-xs rounded-xl border border-bunny-border bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-bunny-primary/20 focus:border-bunny-primary transition-all"
              />
            </div>
          </Card.Header>

          <Card.Body className="p-0">
            {customersLoading ? (
              <div className="text-center py-12 text-bunny-text-muted">
                <Spinner size="md" className="mx-auto mb-2" />
                <p className="text-xs">Cargando ranking de fidelidad...</p>
              </div>
            ) : filteredRankedCustomers.length === 0 ? (
              <div className="text-center py-12 text-bunny-text-muted text-sm">
                No se encontraron clientas para mostrar en el ranking.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-bunny-border bg-bunny-paper/60 text-xs font-semibold text-bunny-text-muted uppercase tracking-wider">
                      <th className="py-3 px-4 text-center w-16">LUGAR</th>
                      <th className="py-3 px-4">CLIENTA</th>
                      <th className="py-3 px-4">SELLOS DEL CICLO</th>
                      <th className="py-3 px-4 text-center">TOTAL VISITAS</th>
                      <th className="py-3 px-4 text-center">PREMIOS GANADOS</th>
                      <th className="py-3 px-4 text-right">ACCIONES</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-bunny-border/30">
                    {filteredRankedCustomers.map((customer, index) => {
                      const stamps = customer.loyaltyStamps || 0;
                      const visits = customer.totalCompletedVisits || 0;
                      const rewardIndex = customer.currentRewardIndex || 0;
                      const percent = Math.min(Math.round((stamps / 10) * 100), 100);
                      const rawPhone = (customer.phone || '').replace(/\D/g, '');
                      const waPhone = rawPhone.length === 9 ? `56${rawPhone}` : rawPhone;

                      let rankDisplay: ReactNode = `#${index + 1}`;
                      if (index === 0) rankDisplay = <span className="text-xl" title="1er Lugar">🥇</span>;
                      else if (index === 1) rankDisplay = <span className="text-xl" title="2do Lugar">🥈</span>;
                      else if (index === 2) rankDisplay = <span className="text-xl" title="3er Lugar">🥉</span>;

                      return (
                        <tr key={customer.id} className="hover:bg-bunny-paper/40 transition-colors">
                          <td className="py-3 px-4 text-center font-bold text-bunny-text">
                            {rankDisplay}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex flex-col">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-bunny-text">
                                  {customer.fullName}
                                </span>
                                {visits >= 5 && (
                                  <Badge variant="warning">👑 VIP</Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-xs text-bunny-text-muted mt-0.5">
                                {customer.rut ? (
                                  <span className="font-mono">
                                    {formatRutWithDots(customer.rut)}
                                  </span>
                                ) : (
                                  <span className="italic">Sin RUT</span>
                                )}
                                <span>&bull;</span>
                                <span>📱 {customer.phone}</span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 min-w-[200px]">
                            <div className="flex flex-col gap-1.5">
                              <div className="flex justify-between items-center text-xs">
                                <span className="font-semibold text-emerald-700">
                                  ⭐ {stamps} / 10 sellos
                                </span>
                                <span className="text-bunny-text-muted">
                                  {10 - stamps === 0 ? '¡Listo para canjear!' : `Faltan ${10 - stamps}`}
                                </span>
                              </div>
                              <div className="w-full bg-[#f3e9e2] rounded-full h-2 overflow-hidden">
                                <div
                                  className={`h-full transition-all duration-300 ${
                                    stamps === 10 ? 'bg-emerald-500' : 'bg-bunny-primary'
                                  }`}
                                  style={{ width: `${percent}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <Badge variant="neutral">
                              {visits} {visits === 1 ? 'visita' : 'visitas'}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <Badge variant={rewardIndex > 0 ? 'success' : 'neutral'}>
                              🎁 {rewardIndex} {rewardIndex === 1 ? 'premio' : 'premios'}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              {rawPhone && (
                                <a
                                  href={`https://wa.me/${waPhone}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1.5 rounded-lg border border-emerald-300 text-emerald-700 hover:bg-emerald-50 transition-colors"
                                  title="Enviar WhatsApp"
                                >
                                  <MessageCircle size={15} />
                                </a>
                              )}
                              <button
                                type="button"
                                title="Ver Ficha de Clienta"
                                onClick={() => navigate(`/customers/${customer.id}`)}
                                className="p-1.5 rounded-lg border border-bunny-border text-bunny-primary hover:bg-bunny-paper transition-colors"
                              >
                                <ExternalLink size={15} />
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
          </Card.Body>
        </Card>
      </div>
    </DashboardLayout>
  );
}
