/**
 * Utility functions for system configuration management
 */

// Default configuration values
const DEFAULT_CONFIG = {
    date_range_days: 7,
};

/**
 * Get configuration value with fallback to default
 */
export async function getConfig(key: string): Promise<any> {
    try {
        // Check if we're on the client side
        const baseUrl = typeof window !== 'undefined' 
            ? '' 
            : process.env.NODE_ENV === 'development'
            ? 'http://localhost:3000'
            : process.env.NEXT_PUBLIC_APP_URL || '';
            
        const res = await fetch(`${baseUrl}/api/config?key=${key}`);
        
        if (res.ok) {
            const data = await res.json();
            return data.value;
        } else {
            // Return default value if config doesn't exist
            return DEFAULT_CONFIG[key as keyof typeof DEFAULT_CONFIG];
        }
    } catch (error) {
        console.error(`Error fetching config ${key}:`, error);
        return DEFAULT_CONFIG[key as keyof typeof DEFAULT_CONFIG];
    }
}

/**
 * Get multiple configuration values
 */
export async function getConfigs(keys: string[]): Promise<Record<string, any>> {
    try {
        const res = await fetch("/api/config");
        
        if (res.ok) {
            const configs = await res.json();
            const result: Record<string, any> = {};
            
            for (const key of keys) {
                const config = configs.find((c: any) => c.key === key);
                result[key] = config ? config.value : DEFAULT_CONFIG[key as keyof typeof DEFAULT_CONFIG];
            }
            
            return result;
        } else {
            // Return all defaults if API fails
            const result: Record<string, any> = {};
            for (const key of keys) {
                result[key] = DEFAULT_CONFIG[key as keyof typeof DEFAULT_CONFIG];
            }
            return result;
        }
    } catch (error) {
        console.error("Error fetching configs:", error);
        const result: Record<string, any> = {};
        for (const key of keys) {
            result[key] = DEFAULT_CONFIG[key as keyof typeof DEFAULT_CONFIG];
        }
        return result;
    }
}

/**
 * Client-side configuration hook
 */
export function useConfig(key: string, defaultValue?: any) {
    if (typeof window === 'undefined') {
        // Server-side: return default value
        return defaultValue || DEFAULT_CONFIG[key as keyof typeof DEFAULT_CONFIG];
    }
    
    // Client-side: can be enhanced with React hooks later
    return defaultValue || DEFAULT_CONFIG[key as keyof typeof DEFAULT_CONFIG];
}