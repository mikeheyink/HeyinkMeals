import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { devNotesService, type DevNoteStatus } from '../../services/devNotesService';

export const devNotesKeys = {
    all: ['dev-notes'] as const,
};

export function useDevNotes() {
    return useQuery({
        queryKey: devNotesKeys.all,
        queryFn: () => devNotesService.getNotes(),
    });
}

export function useAddDevNote() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ note, context }: { note: string; context?: string | null }) =>
            devNotesService.addNote(note, context),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: devNotesKeys.all });
        },
    });
}

export function useSetDevNoteStatus() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, status }: { id: string; status: DevNoteStatus }) =>
            devNotesService.setStatus(id, status),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: devNotesKeys.all });
        },
    });
}

export function useDeleteDevNote() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => devNotesService.deleteNote(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: devNotesKeys.all });
        },
    });
}

export function useClearDoneDevNotes() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: () => devNotesService.clearDone(),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: devNotesKeys.all });
        },
    });
}
