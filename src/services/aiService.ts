import { supabase } from '../lib/supabase';

export interface CommandResult {
    success: boolean;
    message: string;
}

export interface CommandContext {
    page: string;
    entityId?: string;
}

export const aiService = {
    /**
     * Send a natural language command to the AI agent
     */
    async executeCommand(command: string, context?: CommandContext): Promise<CommandResult> {
        const { data, error } = await supabase.functions.invoke('command-agent', {
            body: {
                command,
                context: context || {
                    page: window.location.pathname
                }
            }
        });

        if (error) {
            console.error('Command agent error:', error);
            return {
                success: false,
                message: error.message || 'Failed to process command'
            };
        }

        return {
            success: data.success ?? true,
            message: data.message || 'Done'
        };
    }
};
