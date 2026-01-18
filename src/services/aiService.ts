import { supabase } from '../lib/supabase';

export interface CommandResult {
    success: boolean;
    message: string;
    actionTaken: boolean; // true if AI actually performed an action, false if just a question/response
}

export interface CommandContext {
    page: string;
    entityId?: string;
}

export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

export const aiService = {
    /**
     * Send a natural language command to the AI agent
     * @param command - The current user message
     * @param history - Previous messages in the conversation (for multi-turn)
     * @param context - Page context
     */
    async executeCommand(
        command: string,
        history: ChatMessage[] = [],
        context?: CommandContext
    ): Promise<CommandResult> {
        const { data, error } = await supabase.functions.invoke('command-agent', {
            body: {
                command,
                history,
                context: context || {
                    page: window.location.pathname
                }
            }
        });

        if (error) {
            console.error('Command agent error:', error);
            return {
                success: false,
                message: error.message || 'Failed to process command',
                actionTaken: false
            };
        }

        return {
            success: data.success ?? true,
            message: data.message || 'Done',
            actionTaken: data.actionTaken ?? false
        };
    }
};
