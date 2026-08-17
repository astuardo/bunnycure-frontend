/**
 * Tipos para Galería Fotográfica de Diseños y Ficha Técnica de Manicure por Clienta
 */

export type BaseTechniqueType =
  | 'KAPPING'
  | 'RUBBER'
  | 'POLYGEL'
  | 'ACRYLIC'
  | 'SOFT_GEL'
  | 'PERMANENT'
  | 'TRADITIONAL'
  | 'REMOVAL'
  | 'OTHER';

export type NailConditionType =
  | 'NORMAL'
  | 'FRAGILE'
  | 'DAMAGED'
  | 'DRY_CUTICLE'
  | 'OILY'
  | 'SENSITIVE'
  | 'ONICOPHAGIA'
  | 'OTHER';

export interface NailPhotoRecord {
  id: string;
  customerId: number;
  appointmentId?: number;
  date: string; // YYYY-MM-DD
  title: string;
  baseType: BaseTechniqueType;
  nailCondition?: NailConditionType;
  polishColors: string;
  techniqueNotes: string;
  tags: string[];
  photoUrls: string[];
  createdAt: string;
}

export interface CustomerNailProfile {
  preferredBaseType?: BaseTechniqueType;
  usualNailCondition?: NailConditionType;
  favoriteColors?: string;
  generalNotes?: string;
  allergyNotes?: string;
  records: NailPhotoRecord[];
}
