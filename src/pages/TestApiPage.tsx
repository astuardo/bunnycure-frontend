/**
 * Página de prueba para verificar conexión con API.
 */

import { useState, useEffect } from 'react';
import { servicesApi } from '../api/services.api';
import { customersApi } from '../api/customers.api';
import { ServiceCatalog } from '../types/service.types';
import { Customer } from '../types/customer.types';

export default function TestApiPage() {
  const [services, setServices] = useState<ServiceCatalog[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Probar endpoints públicos primero
      const servicesData = await servicesApi.list(true);
      setServices(servicesData);
      
      // Este requiere autenticación
      try {
        const customersData = await customersApi.list();
        setCustomers(customersData);
      } catch (err) {
        console.log('Clientes requiere autenticación:', err);
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem' }}>
        <h1>🔄 Cargando...</h1>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '2rem', color: 'red' }}>
        <h1>❌ Error</h1>
        <p>{error}</p>
        <button onClick={loadData}>Reintentar</button>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem' }}>
      <h1>✅ Conexión con API Exitosa!</h1>
      
      <div style={{ marginTop: '2rem' }}>
        <h2>📋 Servicios Activos ({services.length})</h2>
        <ul>
          {services.map(service => (
            <li key={service.id}>
              <strong>{service.name}</strong> - {service.durationMinutes} min - ${service.price}
            </li>
          ))}
        </ul>
      </div>

      {customers.length > 0 && (
        <div style={{ marginTop: '2rem' }}>
          <h2>👥 Clientes ({customers.length})</h2>
          <ul>
            {customers.slice(0, 5).map(customer => (
              <li key={customer.id}>
                {customer.fullName} - {customer.phone}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div style={{ marginTop: '2rem' }}>
        <h3>🔗 Enlaces Útiles:</h3>
        <ul>
          <li><a href="http://localhost:8080/swagger-ui.html" target="_blank">Swagger UI</a></li>
          <li><a href="http://localhost:8080/api/services?activeOnly=true" target="_blank">API Servicios (JSON)</a></li>
        </ul>
      </div>
    </div>
  );
}
