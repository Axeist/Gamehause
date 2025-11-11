import { supabase, handleSupabaseError } from "@/integrations/supabase/client";
import { Tournament, convertFromSupabaseTournament, convertToSupabaseTournament, Player, Match, MatchStage } from "@/types/tournament.types";
import { useToast } from '@/hooks/use-toast';
import { PostgrestError } from "@supabase/supabase-js";
import { useAuth } from "@/context/AuthContext";
import { generateId } from "@/utils/pos.utils";
import { determineRunnerUp, saveTournamentHistory } from "@/services/tournamentHistoryService";
import { generateTournamentMatches } from "@/utils/tournamentMatchGeneration";

// Define a more specific type for Supabase operations with tournaments
// This helps us work around the type limitations without modifying the types.ts file
type SupabaseTournament = {
  id: string;
  name: string;
  game_type: string;
  game_variant?: string;
  game_title?: string;
  date: string;
  players: any[];
  matches: any[];
  status: string;
  budget?: number;
  winner_prize?: number;
  runner_up_prize?: number;
  winner?: any;
  created_at?: string;
  updated_at?: string;
}

// Create a type-safe wrapper for Supabase operations with tournaments
// This prevents TypeScript errors without needing to modify the types.ts file
const tournamentsTable = {
  select: () => supabase.from('tournaments' as any),
  insert: (data: any) => supabase.from('tournaments' as any).insert(data),
  update: (data: any) => supabase.from('tournaments' as any).update(data),
  delete: () => supabase.from('tournaments' as any).delete(),
};

// Function to generate tournament matches from a list of players (updated to use new utility)
export const generateMatches = (players: Player[], format: 'knockout' | 'league' = 'knockout'): Match[] => {
  return generateTournamentMatches(players, format);
};

// Function to determine tournament winner based on matches
export const determineWinner = (matches: Match[], players: Player[]): Player | undefined => {
  // Find the final match (highest round number or one marked as 'final')
  const finalMatches = matches.filter(m => m.stage === 'final');
  
  if (finalMatches.length === 0) {
    return undefined;
  }
  
  const finalMatch = finalMatches[0];
  
  // If the final match is completed and has a winner, return that player
  if (finalMatch.completed && finalMatch.winnerId) {
    return players.find(p => p.id === finalMatch.winnerId);
  }
  
  return undefined;
};

// Fetch all tournaments from Supabase
export const fetchTournaments = async (): Promise<Tournament[]> => {
  try {
    const { data, error } = await tournamentsTable
      .select()
      .select('*')
      .order('created_at', { ascending: false });
      
    if (error) {
      console.error('Error fetching tournaments:', error);
      return [];
    }
    
    return data.map(convertFromSupabaseTournament);
  } catch (error) {
    console.error('Unexpected error fetching tournaments:', error);
    return [];
  }
};

// Format error message from Supabase for tournament operations
const formatTournamentError = (error: PostgrestError): string => {
  if (error.code === '42501') {
    return 'Permission denied. You may not have the required access rights to perform this operation. Only authenticated users can manage tournaments.';
  }
  if (error.code === 'PGRST301' || error.message?.includes('JWT')) {
    return 'Authentication required. Please log in and try again.';
  }
  if (error.message?.includes('auth.uid()') || error.message?.includes('auth.role()')) {
    return 'You need to be authenticated to perform this operation.';
  }
  if (error.message?.includes('foreign key') || error.message?.includes('constraint')) {
    return 'Cannot delete: This tournament has related records that must be deleted first.';
  }
  // Log the full error for debugging
  console.error('Tournament error details:', {
    code: error.code,
    message: error.message,
    details: error.details,
    hint: error.hint
  });
  return handleSupabaseError(error, 'tournament operation');
};

// Save a tournament to Supabase (create or update)
export const saveTournament = async (tournament: Tournament): Promise<{ data: Tournament | null; error: string | null }> => {
  try {
    // Log the tournament being saved for debugging
    console.log('Saving tournament to Supabase:', tournament);
    
    // If tournament is completed and has matches, determine runner-up and save history
    if (tournament.status === 'completed' && tournament.matches.length > 0) {
      if (!tournament.runnerUp) {
        tournament.runnerUp = determineRunnerUp(tournament.matches, tournament.players);
      }
      
      // Save tournament history asynchronously (don't block the save operation)
      saveTournamentHistory(tournament).catch(error => {
        console.error('Error saving tournament history:', error);
      });
    }
    
    const supabaseTournament = convertToSupabaseTournament(tournament);
    console.log('Converted to Supabase format:', supabaseTournament);
    
    // Ensure max_players is always set with a proper value
    if (!supabaseTournament.max_players || supabaseTournament.max_players < 2) {
      supabaseTournament.max_players = 16; // Default fallback
    }
    
    // Check if the tournament already exists
    const { data: existingTournament, error: checkError } = await tournamentsTable
      .select()
      .select('id')
      .eq('id', tournament.id)
      .single();
      
    if (checkError && checkError.code !== 'PGRST116') { // Not found is not an error in this case
      console.error('Error checking tournament existence:', checkError);
      return { data: null, error: formatTournamentError(checkError) };
    }
      
    let result;
    
    if (existingTournament) {
      // Update existing tournament - set updated_at timestamp
      console.log('Updating existing tournament with ID:', tournament.id);
      const updateData = {
        ...supabaseTournament,
        updated_at: new Date().toISOString()
      };
      
      // Clean up any undefined or malformed values before sending to Supabase
      Object.keys(updateData).forEach(key => {
        const value = updateData[key];
        if (value && typeof value === 'object' && value._type === 'undefined') {
          updateData[key] = null;
        }
      });
      
      console.log('Update data with max_players:', updateData.max_players);
      
      const { data, error } = await tournamentsTable
        .update(updateData)
        .eq('id', tournament.id)
        .select()
        .single();
        
      if (error) {
        console.error('Error updating tournament:', error);
        return { data: null, error: formatTournamentError(error) };
      }
      
      result = data;
      console.log('Tournament updated successfully:', result);
    } else {
      // Create new tournament with created_at timestamp
      console.log('Creating new tournament with max_players:', supabaseTournament.max_players);
      
      // Clean up any undefined or malformed values before sending to Supabase
      const insertData = { ...supabaseTournament, created_at: new Date().toISOString() };
      Object.keys(insertData).forEach(key => {
        const value = insertData[key];
        if (value && typeof value === 'object' && value._type === 'undefined') {
          insertData[key] = null;
        }
      });
      
      console.log('Insert data with max_players:', insertData.max_players);
      
      const { data, error } = await tournamentsTable
        .insert(insertData)
        .select()
        .single();
        
      if (error) {
        console.error('Error creating tournament:', error);
        return { data: null, error: formatTournamentError(error) };
      }
      
      result = data;
      console.log('Tournament created successfully with max_players:', result.max_players);
    }
    
    const convertedResult = convertFromSupabaseTournament(result);
    console.log('Final converted tournament max_players:', convertedResult.maxPlayers);
    
    return { data: convertedResult, error: null };
  } catch (error) {
    console.error('Unexpected error saving tournament:', error);
    return { data: null, error: 'An unexpected error occurred while saving the tournament.' };
  }
};

// Delete a tournament from Supabase
export const deleteTournament = async (id: string): Promise<{ success: boolean; error: string | null }> => {
  try {
    console.log('Starting tournament deletion for ID:', id);
    
    // Try to delete related records first, but don't fail if RLS blocks it
    // (Foreign key constraints may handle cascading deletes, or we may need admin privileges)
    
    // Delete related tournament public registrations
    const { error: publicRegistrationsError } = await supabase
      .from('tournament_public_registrations')
      .delete()
      .eq('tournament_id', id);
      
    if (publicRegistrationsError) {
      console.warn('Warning: Could not delete tournament public registrations (may be blocked by RLS):', publicRegistrationsError);
      // Continue - foreign key may handle this with CASCADE
    } else {
      console.log('Deleted tournament public registrations');
    }
    
    // Delete related tournament registrations (legacy)
    const { error: registrationsError } = await supabase
      .from('tournament_registrations')
      .delete()
      .eq('tournament_id', id);
      
    if (registrationsError) {
      console.warn('Warning: Could not delete tournament registrations (may be blocked by RLS):', registrationsError);
      // Continue - foreign key may handle this with CASCADE
    } else {
      console.log('Deleted tournament registrations');
    }
    
    // Delete related tournament winner images
    const { error: winnerImagesError } = await supabase
      .from('tournament_winner_images')
      .delete()
      .eq('tournament_id', id);
      
    if (winnerImagesError) {
      console.warn('Warning: Could not delete tournament winner images:', winnerImagesError);
      // Continue - try to delete tournament anyway
    } else {
      console.log('Deleted tournament winner images');
    }
    
    // Delete related tournament history entries
    const { error: historyError } = await supabase
      .from('tournament_history')
      .delete()
      .eq('tournament_id', id);
      
    if (historyError) {
      console.warn('Warning: Could not delete tournament history:', historyError);
      // Continue - try to delete tournament anyway
    } else {
      console.log('Deleted tournament history');
    }
    
    // Delete related tournament winner entries
    const { error: winnersError } = await supabase
      .from('tournament_winners')
      .delete()
      .eq('tournament_id', id);
      
    if (winnersError) {
      console.warn('Warning: Could not delete tournament winners:', winnersError);
      // Continue - try to delete tournament anyway
    } else {
      console.log('Deleted tournament winners');
    }
    
    // Finally, delete the tournament itself
    // This is the critical operation - if this fails, the whole deletion fails
    const { error: deleteError } = await tournamentsTable
      .delete()
      .eq('id', id);
      
    if (deleteError) {
      console.error('Error deleting tournament:', deleteError);
      // Check if it's a foreign key constraint error
      if (deleteError.message?.includes('foreign key') || deleteError.message?.includes('constraint')) {
        return { 
          success: false, 
          error: 'Cannot delete tournament: It has related records that must be deleted first. Please contact an administrator.' 
        };
      }
      return { success: false, error: formatTournamentError(deleteError) };
    }
    
    console.log('Tournament delete operation completed');
    
    // Verify the tournament was actually deleted by trying to fetch it
    const { data: verifyData, error: verifyError } = await tournamentsTable
      .select('id')
      .eq('id', id)
      .maybeSingle();
    
    if (verifyError && verifyError.code !== 'PGRST116') {
      // Some error other than "not found" - log it but assume success if delete didn't error
      console.warn('Error verifying tournament deletion:', verifyError);
    }
    
    if (verifyData) {
      // Tournament still exists - deletion didn't work
      console.error('Tournament still exists after deletion attempt. Data:', verifyData);
      return { 
        success: false, 
        error: 'Tournament deletion failed. The tournament still exists in the database. Please check your permissions and try again.' 
      };
    }
    
    // Tournament not found - deletion was successful
    console.log('Tournament and all related entries deleted successfully');
    return { success: true, error: null };
  } catch (error) {
    console.error('Unexpected error deleting tournament:', error);
    return { success: false, error: 'An unexpected error occurred while deleting the tournament.' };
  }
};

// Custom hook for tournament operations with toast notifications
export const useTournamentOperations = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  
  return {
    fetchTournaments: async () => {
      const tournaments = await fetchTournaments();
      if (tournaments.length === 0) {
        console.log("No tournaments found or error occurred");
      }
      return tournaments;
    },
    
    saveTournament: async (tournament: Tournament) => {
      if (!user?.isAdmin) {
        toast({
          title: "Permission denied",
          description: "Only admin users can create or edit tournaments",
          variant: "destructive"
        });
        return null;
      }
      
      const { data, error } = await saveTournament(tournament);
      if (data) {
        toast({
          title: "Success",
          description: `Tournament "${tournament.name}" ${tournament.id === data.id ? "updated" : "created"} successfully`,
        });
        return data;
      } else {
        toast({
          title: "Failed to save tournament",
          description: error || `Could not save tournament "${tournament.name}"`,
          variant: "destructive"
        });
        return null;
      }
    },
    
    deleteTournament: async (id: string, name: string) => {
      if (!user?.isAdmin) {
        toast({
          title: "Permission denied",
          description: "Only admin users can delete tournaments",
          variant: "destructive"
        });
        return false;
      }
      
      const { success, error } = await deleteTournament(id);
      if (success) {
        toast({
          title: "Success",
          description: `Tournament "${name}" deleted successfully`,
        });
        return true;
      } else {
        toast({
          title: "Error",
          description: error || `Failed to delete tournament "${name}"`,
          variant: "destructive"
        });
        return false;
      }
    }
  };
};
