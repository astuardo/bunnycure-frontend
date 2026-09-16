import apiClient from './client';
import { ApiResponse } from '../types/api.types';

export type AudienceType =
  | 'ALL'
  | 'INACTIVE_30_DAYS'
  | 'INACTIVE_60_DAYS'
  | 'ACTIVE_RECENT'
  | 'FREQUENT_VIP'
  | 'BIRTHDAYS_TODAY'
  | 'BIRTHDAYS_THIS_MONTH'
  | 'SPECIFIC_CUSTOMERS';

export interface MarketingTemplate {
  name: string;
  displayName: string;
  occasion: string;
  emoji: string;
  category: string;
  language: string;
  metaStatus: 'APPROVED' | 'PENDING' | 'REJECTED' | 'NOT_REGISTERED' | string;
  metaId?: string;
  headerText: string;
  bodyText: string;
  footerText: string;
  buttonText: string;
  buttonUrl: string;
  sampleVariables: string[];
}

export interface SampleRecipient {
  id: number;
  fullName: string;
  maskedPhone: string;
  lastVisitDate: string;
  completedVisits: number;
}

export interface AudiencePreview {
  audienceType: AudienceType;
  audienceDescription: string;
  totalCount: number;
  sampleRecipients: SampleRecipient[];
}

export interface CampaignDispatchRequest {
  templateName: string;
  audienceType: AudienceType;
  testPhoneNumber?: string;
  customBenefit?: string;
  customParameters?: string[];
  customerIds?: number[];
}

export interface TemplateUpdateRequest {
  headerText?: string;
  bodyText: string;
  footerText?: string;
  buttonText?: string;
  buttonUrl?: string;
}

export interface CampaignDispatchResult {
  templateName: string;
  audienceType: AudienceType;
  totalTargeted: number;
  sentCount: number;
  failedCount: number;
  errorMessages: string[];
  isTestRun: boolean;
}

export interface SyncTemplatesResult {
  created: string[];
  alreadyExisted: string[];
  failed: string[];
  totalCatalog: number;
}

export interface SaveApprovedTemplateRequest {
  name?: string;
  displayName: string;
  occasion?: string;
  emoji?: string;
  headerText?: string;
  bodyText: string;
  footerText?: string;
  buttonText?: string;
  buttonUrl?: string;
  sampleVariables?: string[];
  autoRegisterInMeta?: boolean;
}

export const marketingApi = {
  getTemplates: async (): Promise<MarketingTemplate[]> => {
    const response = await apiClient.get<ApiResponse<MarketingTemplate[]>>('/api/marketing/templates');
    return response.data.data || [];
  },

  syncTemplates: async (): Promise<SyncTemplatesResult> => {
    const response = await apiClient.post<ApiResponse<SyncTemplatesResult>>('/api/marketing/templates/sync');
    return response.data.data || { created: [], alreadyExisted: [], failed: [], totalCatalog: 0 };
  },

  previewAudience: async (audienceType: AudienceType = 'ALL', customerIds?: number[]): Promise<AudiencePreview> => {
    const params: Record<string, unknown> = { audienceType };
    if (customerIds && customerIds.length > 0) {
      params.customerIds = customerIds.join(',');
    }
    const response = await apiClient.get<ApiResponse<AudiencePreview>>('/api/marketing/audience-preview', {
      params,
    });
    return (
      response.data.data || {
        audienceType,
        audienceDescription: '',
        totalCount: 0,
        sampleRecipients: [],
      }
    );
  },

  dispatchCampaign: async (request: CampaignDispatchRequest): Promise<CampaignDispatchResult> => {
    const response = await apiClient.post<ApiResponse<CampaignDispatchResult>>(
      '/api/marketing/campaigns/dispatch',
      request
    );
    if (!response.data.data) {
      throw new Error('Error al despachar la campaña');
    }
    return response.data.data;
  },

  updateTemplate: async (name: string, request: TemplateUpdateRequest): Promise<MarketingTemplate> => {
    const response = await apiClient.put<ApiResponse<MarketingTemplate>>(`/api/marketing/templates/${name}`, request);
    if (!response.data.data) {
      throw new Error('Error al actualizar la plantilla en Meta');
    }
    return response.data.data;
  },

  deleteTemplate: async (name: string): Promise<{ name: string; deleted: boolean; message: string }> => {
    const response = await apiClient.delete<ApiResponse<{ name: string; deleted: boolean; message: string }>>(`/api/marketing/templates/${name}`);
    if (!response.data.data) {
      throw new Error('Error al eliminar la plantilla en Meta');
    }
    return response.data.data;
  },

  generateAiDraft: async (prompt: string): Promise<MarketingTemplate> => {
    const response = await apiClient.post<ApiResponse<MarketingTemplate>>('/api/marketing/templates/ai-draft', {
      prompt,
    });
    if (!response.data.data) {
      throw new Error('Error al generar la propuesta de plantilla con el Agente IA');
    }
    return response.data.data;
  },

  saveApprovedTemplate: async (request: SaveApprovedTemplateRequest): Promise<MarketingTemplate> => {
    const response = await apiClient.post<ApiResponse<MarketingTemplate>>('/api/marketing/templates/save-approved', request);
    if (!response.data.data) {
      throw new Error('Error al guardar y registrar la plantilla en Meta');
    }
    return response.data.data;
  },

  generateAiTemplate: async (prompt: string, autoRegisterInMeta: boolean = true): Promise<MarketingTemplate> => {
    const response = await apiClient.post<ApiResponse<MarketingTemplate>>('/api/marketing/templates/ai-generate', {
      prompt,
      autoRegisterInMeta,
    });
    if (!response.data.data) {
      throw new Error('Error al generar plantilla con el Agente IA');
    }
    return response.data.data;
  },
};
