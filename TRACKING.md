# 🚀 BunnyCure PWA - Registro de Cambios y Roadmap

Este archivo documenta el progreso actual de las correcciones y nuevas funcionalidades solicitadas.

## 🟢 Tareas Completadas

### Frontend (BunnyCure-Frontend)
1. **Filtros del Dashboard:** Corregido el problema de huso horario (`parseISO`) que mostraba las citas en días incorrectos.
2. **Formato de Horas:** Se eliminaron los segundos (HH:mm:ss -> HH:mm) en Dashboard y vista de Citas.
3. **Totales de Citas (Extras):** La vista de citas (el valor en verde) ahora muestra el valor real de la cita (`Total final estimado` o `totalPrice`) en lugar del subtotal de los servicios.
4. **Notificaciones Push (Limpieza & Perspectiva Administrativa):** 
   - Se removió cualquier traza de *"from BunnyCure"*.
   - Las plantillas por defecto se ajustaron al rol de la dueña del negocio ("Próxima Cita Agendada", "Tienes una cita con...").
   - Se incluyó la variable `{totalPrice}` para mostrar los precios en los mensajes push.
5. **UI Nueva Cita (Colapsable):** La lista de clientes y servicios ahora se colapsan automáticamente en tarjetas compactas tras la selección para mantener la vista del modal más limpia en dispositivos móviles.
6. **Consistencia en Clientes:** Eliminados los "campos negros" (ID internos) de las vistas de cliente.

7. **Dashboard Avanzado:** Conectados los "Insights de negocio" (Valor total de citas, Top servicios, y Ranking de clientas) con la API analítica real del backend (`/api/stats/dashboard`), eliminando los cálculos pesados en el móvil.

---

## 🟡 Tareas en Progreso o Pendientes

### Frontend (BunnyCure-Frontend)
- [ ] **Grillas Responsive:** Verificar que todas las tablas y tarjetas no sufran de overflow en móviles extremadamente estrechos.
- [ ] **Edición Avanzada de Citas:** Poder editar el precio final de una cita directamente sin tener que modificar la descripción base o agregar cargos extra manuales.

### Backend (BunnyCure Spring Boot)
- [x] **Endpoints Analíticos para el Dashboard:** Implementado y en uso.
- [ ] **Soporte Multi-servicio (V38):** Confirmar y ajustar la capa de servicios para que las citas manejen nativamente múltiples servicios sin romper reportes o transacciones.
- [ ] **Optimización de Notificaciones Push:** Trasladar la limpieza del sufijo "from BunnyCure" o variables erróneas directamente a la lógica de backend para no depender del frontend.
- [ ] **Resolución de Dependencia Circular:** Refactorizar `SecurityConfig` / `UserService` para evitar `@Lazy` (Mejora Arquitectónica).
