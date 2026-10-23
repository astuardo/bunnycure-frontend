export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** danger: acción destructiva (botón rojo) */
  tone?: 'default' | 'danger';
}

export interface PendingConfirm extends ConfirmOptions {
  resolve: (confirmed: boolean) => void;
}

let showConfirm: ((request: PendingConfirm) => void) | null = null;

/** Lo registra <ConfirmDialogHost /> al montarse. */
export const registerConfirmHost = (show: typeof showConfirm) => {
  showConfirm = show;
};

/**
 * Reemplazo de window.confirm con el diseño de la app: `if (!(await confirmDialog('¿…?'))) return;`
 * Requiere <ConfirmDialogHost /> montado una vez (App.tsx); sin él cae en window.confirm.
 */
export const confirmDialog = (options: ConfirmOptions | string): Promise<boolean> => {
  const opts = typeof options === 'string' ? { message: options } : options;
  if (!showConfirm) return Promise.resolve(window.confirm(opts.message));
  return new Promise((resolve) => showConfirm?.({ ...opts, resolve }));
};
