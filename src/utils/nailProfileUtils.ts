/**
 * Utilidades para Ficha Técnica y Galería de Diseños de Manicure
 */

import {
  BaseTechniqueType,
  CustomerNailProfile,
  NailConditionType,
  NailPhotoRecord,
} from '../types/nailProfile.types';

export const BASE_TECHNIQUE_LABELS: Record<BaseTechniqueType, string> = {
  KAPPING: '💅 Kapping Gel',
  RUBBER: '✨ Base Rubber / Nivelación',
  POLYGEL: '🛡️ Polygel / Acrygel',
  ACRYLIC: '💎 Acrílico Esculpido',
  SOFT_GEL: '🪄 Soft Gel Tips',
  PERMANENT: '🎨 Esmaltado Permanente',
  TRADITIONAL: '🌸 Manicure Tradicional',
  REMOVAL: '🔄 Retiro / Descanso',
  OTHER: '⚙️ Otra Técnica',
};

export const NAIL_CONDITION_LABELS: Record<NailConditionType, string> = {
  NORMAL: '🟢 Uñas Saludables / Fuertes',
  FRAGILE: '🟡 Uñas Frágiles / Quebradizas',
  DAMAGED: '🔴 Uñas Dañadas / Descamadas',
  DRY_CUTICLE: '🍂 Cutículas Secas / Deshidratadas',
  OILY: '💧 Placa Ungueal Grasa',
  SENSITIVE: '⚠️ Piel / Cutícula Muy Sensible',
  ONICOPHAGIA: '🦷 Onicofagia (Hábito de morder)',
  OTHER: 'ℹ️ Otra Condición',
};

const getStorageKey = (customerId: number): string => {
  return `bunnycure_nail_profile_v1_${customerId}`;
};

/**
 * Obtiene la ficha técnica y registros fotográficos de una clienta
 */
export const getCustomerNailProfile = (customerId: number): CustomerNailProfile => {
  try {
    const raw = localStorage.getItem(getStorageKey(customerId));
    if (!raw) {
      return { records: [] };
    }
    const parsed = JSON.parse(raw);
    return {
      preferredBaseType: parsed.preferredBaseType,
      usualNailCondition: parsed.usualNailCondition,
      favoriteColors: parsed.favoriteColors || '',
      generalNotes: parsed.generalNotes || '',
      allergyNotes: parsed.allergyNotes || '',
      records: Array.isArray(parsed.records) ? parsed.records : [],
    };
  } catch {
    return { records: [] };
  }
};

/**
 * Guarda la ficha técnica y registros fotográficos de una clienta
 */
export const saveCustomerNailProfile = (
  customerId: number,
  profile: CustomerNailProfile
): void => {
  try {
    localStorage.setItem(getStorageKey(customerId), JSON.stringify(profile));
  } catch (err) {
    console.error('Error guardando perfil de manicure:', err);
  }
};

/**
 * Agrega un nuevo registro fotográfico a la ficha
 */
export const addNailPhotoRecord = (
  customerId: number,
  recordData: Omit<NailPhotoRecord, 'id' | 'createdAt'>
): NailPhotoRecord => {
  const profile = getCustomerNailProfile(customerId);
  const newRecord: NailPhotoRecord = {
    ...recordData,
    id: `rec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    createdAt: new Date().toISOString(),
  };

  const updatedRecords = [newRecord, ...(profile.records || [])];
  
  // Actualizar también técnica preferida si no estaba definida
  const updatedProfile: CustomerNailProfile = {
    ...profile,
    preferredBaseType: profile.preferredBaseType || recordData.baseType,
    usualNailCondition: profile.usualNailCondition || recordData.nailCondition,
    records: updatedRecords,
  };

  saveCustomerNailProfile(customerId, updatedProfile);
  return newRecord;
};

/**
 * Elimina un registro fotográfico
 */
export const deleteNailPhotoRecord = (
  customerId: number,
  recordId: string
): void => {
  const profile = getCustomerNailProfile(customerId);
  const filtered = (profile.records || []).filter((r) => r.id !== recordId);
  saveCustomerNailProfile(customerId, { ...profile, records: filtered });
};

/**
 * Comprime una imagen antes de almacenarla (máx 1000px, WebP/JPEG ~150kb)
 */
export const compressImage = (file: File, maxDimension = 1000, quality = 0.82): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('No se pudo inicializar canvas'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};
