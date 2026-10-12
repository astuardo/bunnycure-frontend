# 🚀 Pipeline de Staging - BunnyCure Frontend

Este documento describe la arquitectura y configuración del pipeline de **Integración y Despliegue Continuo (CI/CD)** para el entorno de **Staging** del frontend.

---

## 📋 Flujo de Trabajo (Git Workflow)

1. Las nuevas funcionalidades se desarrollan en ramas `feature/*` o correcciones en `fix/*`.
2. Para probar en el entorno de pre-producción/staging, se realiza un Pull Request hacia la rama **`staging`**.
3. Al hacer merge o push a `staging`, GitHub Actions ejecuta automáticamente el workflow [frontend-staging.yml](file:///c:/Users/alfre/IdeaProjects/bunnycure-frontend/.github/workflows/frontend-staging.yml).
4. El pipeline:
   - Valida dependencias de forma limpia (`npm ci`).
   - Verifica tipos con TypeScript (`tsc -b`).
   - Compila la aplicación con Vite inyectando las variables de Staging (`VITE_API_BASE_URL`).
   - Valida la construcción del contenedor Docker Nginx.
   - Despliega automáticamente a Vercel Staging/Preview o genera el artefacto empaquetado.

---

## 🔑 Configuración de Secrets en GitHub

Para habilitar el despliegue automático hacia Vercel, agrega los siguientes **Repository Secrets** en GitHub (`Settings > Secrets and variables > Actions > Secrets`):

| Secret | Descripción | Requerido | Valor Sugerido / Ejemplo |
| :--- | :--- | :---: | :--- |
| `VERCEL_TOKEN` | Token personal de Vercel (generado en [vercel.com/account/tokens](https://vercel.com/account/tokens)) | **Sí** (para auto-deploy) | `tok_xxxxxxxxxxxx` |
| `VERCEL_ORG_ID` | ID de la organización o equipo en Vercel | Opcional (pre-configurado) | `team_cEonHxkHQlmkR1cHOX3l4GPa` |
| `VERCEL_PROJECT_ID` | ID del proyecto BunnyCure Frontend en Vercel | Opcional (pre-configurado) | `prj_MoAh68e9uqn4vulWtFwpuTeKBiI9` |

### Variables de Entorno Opcionales (Repository Variables):
| Variable | Descripción | Valor por Defecto |
| :--- | :--- | :--- |
| `STAGING_VITE_API_BASE_URL` | URL del backend de Staging | `https://staging-api.bunnycure.cl` |

---

## 🏃 Disparo Manual (Workflow Dispatch)
Puedes ejecutar el pipeline de Staging de forma manual en cualquier momento desde la pestaña **Actions** en GitHub:
1. Ir a **Actions > Frontend Staging - Build & Deploy**.
2. Hacer clic en **Run workflow**.
3. Seleccionar la rama y, opcionalmente, especificar una URL alternativa para la API de Staging.
