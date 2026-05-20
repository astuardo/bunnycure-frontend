import axios from 'axios';

const authSessionClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'X-XSRF-TOKEN',
});

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    errorCode: string;
  };
}

interface AccessTokenResponse {
  token: string;
}

export const refreshAccessToken = async (): Promise<string> => {
  const response = await authSessionClient.get<ApiResponse<AccessTokenResponse>>('/api/auth/refresh');

  if (response.data.success && response.data.data?.token) {
    return response.data.data.token;
  }

  throw new Error(response.data.error?.message || 'No autenticado');
};
