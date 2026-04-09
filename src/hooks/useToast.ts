import { useCallback, useMemo } from 'react';
import { toast, ToastOptions } from 'react-toastify';

const defaultOptions: ToastOptions = {
  position: 'top-right',
  autoClose: 3000,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
};

export const useToast = () => {
  const success = useCallback((message: string, options?: ToastOptions) => {
    toast.success(message, { ...defaultOptions, ...options });
  }, []);

  const error = useCallback((message: string, options?: ToastOptions) => {
    toast.error(message, { ...defaultOptions, ...options });
  }, []);

  const info = useCallback((message: string, options?: ToastOptions) => {
    toast.info(message, { ...defaultOptions, ...options });
  }, []);

  const warning = useCallback((message: string, options?: ToastOptions) => {
    toast.warning(message, { ...defaultOptions, ...options });
  }, []);

  const promise = useCallback(<T,>(
      promise: Promise<T>,
      messages: {
        pending: string;
        success: string;
        error: string;
      }
  ) => {
    return toast.promise(promise, messages, defaultOptions);
  }, []);

  return useMemo(() => ({
    success,
    error,
    info,
    warning,
    promise,
  }), [success, error, info, warning, promise]);
};
