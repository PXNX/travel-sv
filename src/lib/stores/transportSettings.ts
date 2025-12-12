// src/lib/stores/transportSettings.ts
/**
 * Transport settings store with localStorage persistence
 */

export interface TransportSettings {
    minTransferTime: number; // minutes
    maxTransferTime: number; // minutes
    deutschlandTicketOnly: boolean;
    maxConnections: number;
}

const DEFAULT_SETTINGS: TransportSettings = {
    minTransferTime: 5, // minimum 5 minutes
    maxTransferTime: 60, // maximum 60 minutes
    deutschlandTicketOnly: false,
    maxConnections: 10
};

const STORAGE_KEY = 'transportSettings';

/**
 * Load settings from localStorage
 */
export function loadTransportSettings(): TransportSettings {
    if (typeof window === 'undefined') return DEFAULT_SETTINGS;

    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
        }
    } catch (error) {
        console.warn('Failed to load transport settings:', error);
    }
    return DEFAULT_SETTINGS;
}

/**
 * Save settings to localStorage
 */
export function saveTransportSettings(settings: TransportSettings): void {
    if (typeof window === 'undefined') return;

    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
        console.warn('Failed to save transport settings:', error);
    }
}

/**
 * Reset settings to defaults
 */
export function resetTransportSettings(): TransportSettings {
    if (typeof window !== 'undefined') {
        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch (error) {
            console.warn('Failed to reset transport settings:', error);
        }
    }
    return DEFAULT_SETTINGS;
}
