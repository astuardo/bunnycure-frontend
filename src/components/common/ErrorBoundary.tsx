import { Component, type ErrorInfo, type ReactNode } from 'react';
import * as Sentry from '@sentry/react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[BunnyCure ErrorBoundary] Uncaught runtime error:', error, errorInfo);
    Sentry.captureException(error, {
      extra: {
        componentStack: errorInfo.componentStack,
      },
    });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-neutral-100 p-6 text-center">
            <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <h1 className="text-xl font-bold text-neutral-800 mb-2">
              Algo no salió como esperábamos
            </h1>

            <p className="text-sm text-neutral-600 mb-6 leading-relaxed">
              Ha ocurrido un error inesperado en la aplicación. Nuestro equipo ha sido notificado
              para resolverlo a la brevedad.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center mb-4">
              <button
                type="button"
                onClick={this.handleReload}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-500 hover:bg-rose-600 active:bg-rose-700 text-white font-medium rounded-xl text-sm transition-colors shadow-sm shadow-rose-200"
              >
                <RefreshCw className="w-4 h-4" />
                Reintentar
              </button>

              <button
                type="button"
                onClick={this.handleGoHome}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-neutral-100 hover:bg-neutral-200 active:bg-neutral-300 text-neutral-700 font-medium rounded-xl text-sm transition-colors"
              >
                <Home className="w-4 h-4" />
                Ir al Inicio
              </button>
            </div>

            {import.meta.env.DEV && this.state.error && (
              <details className="mt-4 text-left border-t border-neutral-100 pt-3">
                <summary className="text-xs text-neutral-400 cursor-pointer font-mono hover:text-neutral-600">
                  Detalles técnicos (modo desarrollo)
                </summary>
                <pre className="mt-2 text-xs bg-neutral-900 text-rose-200 p-3 rounded-lg overflow-x-auto font-mono whitespace-pre-wrap">
                  {this.state.error.toString()}
                  {'\n'}
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
