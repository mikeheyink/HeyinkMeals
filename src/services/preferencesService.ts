import { supabase } from '../lib/supabase';

export interface PlannerConfigItem {
    id: string;
    slots: string[];
}

const DEFAULT_PLANNER_CONFIG: PlannerConfigItem[] = [
    { id: 'Everyone', slots: ['Breakfast', 'Lunch', 'Dinner'] },
    { id: 'Parents', slots: ['Breakfast', 'Lunch', 'Dinner'] },
    { id: 'Children', slots: ['Breakfast', 'Lunch', 'Dinner'] }
];

export const preferencesService = {
    /**
     * Get a preference value by key
     */
    async getPreference<T>(key: string): Promise<T | null> {
        const { data, error } = await supabase
            .from('user_preferences')
            .select('value')
            .eq('key', key)
            .single();

        if (error) {
            // PGRST116 = "not found" - this is expected for new preferences
            if (error.code === 'PGRST116') return null;
            console.error('Error fetching preference:', error);
            return null;
        }

        return data?.value as T;
    },

    /**
     * Set a preference value (upsert)
     */
    async setPreference<T>(key: string, value: T): Promise<boolean> {
        const { error } = await supabase
            .from('user_preferences')
            .upsert(
                { key, value, updated_at: new Date().toISOString() },
                { onConflict: 'key' }
            );

        if (error) {
            console.error('Error saving preference:', error);
            return false;
        }

        return true;
    },

    /**
     * Get planner configuration with defaults fallback
     */
    async getPlannerConfig(): Promise<PlannerConfigItem[]> {
        const config = await this.getPreference<PlannerConfigItem[]>('planner_config');
        return config || DEFAULT_PLANNER_CONFIG;
    },

    /**
     * Save planner configuration
     */
    async setPlannerConfig(config: PlannerConfigItem[]): Promise<boolean> {
        return this.setPreference('planner_config', config);
    },

    /**
     * Get the planner viewport anchor date (first visible day)
     */
    async getPlannerViewportAnchor(): Promise<string | null> {
        return this.getPreference<string>('planner_viewport_anchor');
    },

    /**
     * Save the planner viewport anchor date
     */
    async setPlannerViewportAnchor(dateStr: string): Promise<boolean> {
        return this.setPreference('planner_viewport_anchor', dateStr);
    }
};
