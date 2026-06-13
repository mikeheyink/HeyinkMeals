import { supabase } from '../lib/supabase';
import type { Database } from '../types/supabase';

export type DevNote = Database['public']['Tables']['dev_notes']['Row'];
export type DevNoteStatus = 'open' | 'done';

export const devNotesService = {
    /**
     * Fetch all notes, newest first. Open notes always sort above done ones.
     */
    async getNotes(): Promise<DevNote[]> {
        const { data, error } = await supabase
            .from('dev_notes')
            .select('*')
            .order('status', { ascending: true }) // 'done' > 'open' alphabetically, so open first
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching dev notes:', error);
            throw error;
        }

        return data ?? [];
    },

    /**
     * Capture a new note. `context` is the route it was jotted from.
     */
    async addNote(note: string, context?: string | null): Promise<DevNote> {
        const { data, error } = await supabase
            .from('dev_notes')
            .insert({ note: note.trim(), context: context ?? null })
            .select()
            .single();

        if (error) {
            console.error('Error adding dev note:', error);
            throw error;
        }

        return data;
    },

    /**
     * Flip a note between open/done, stamping done_at accordingly.
     */
    async setStatus(id: string, status: DevNoteStatus): Promise<void> {
        const { error } = await supabase
            .from('dev_notes')
            .update({ status, done_at: status === 'done' ? new Date().toISOString() : null })
            .eq('id', id);

        if (error) {
            console.error('Error updating dev note status:', error);
            throw error;
        }
    },

    async deleteNote(id: string): Promise<void> {
        const { error } = await supabase.from('dev_notes').delete().eq('id', id);

        if (error) {
            console.error('Error deleting dev note:', error);
            throw error;
        }
    },

    /**
     * Remove every note already marked done — for clearing the backlog after a session.
     */
    async clearDone(): Promise<void> {
        const { error } = await supabase.from('dev_notes').delete().eq('status', 'done');

        if (error) {
            console.error('Error clearing done dev notes:', error);
            throw error;
        }
    },
};
