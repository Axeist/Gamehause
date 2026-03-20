import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { usePOS } from '@/context/POSContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from "@/integrations/supabase/client";
import { generateId } from '@/utils/pos.utils';

const stationSchema = z.object({
  name: z.string().min(2, { message: 'Station name must be at least 2 characters.' }),
  type: z.enum(['ps5', '8ball', 'foosball', 'misc'], { 
    required_error: 'Please select a station type.' 
  }),
  hourlyRate: z.coerce.number()
    .min(10, { message: 'Rate must be at least ₹10.' })
    .max(5000, { message: 'Rate cannot exceed ₹5000.' }),
  maxPlayers: z.coerce.number().int().min(1).max(10).optional(),
});

type StationFormValues = z.infer<typeof stationSchema>;

interface AddStationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AddStationDialog: React.FC<AddStationDialogProps> = ({ open, onOpenChange }) => {
  const { toast } = useToast();
  const { stations, setStations } = usePOS();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const form = useForm<StationFormValues>({
    resolver: zodResolver(stationSchema),
    defaultValues: {
      name: '',
      type: 'ps5',
      hourlyRate: 100,
      maxPlayers: 4,
    },
  });

  const watchedType = form.watch('type');

  const onSubmit = async (values: StationFormValues) => {
    setIsSubmitting(true);
    
    try {
      const stationId = crypto.randomUUID();
      const maxPlayers = values.type === 'ps5' ? (values.maxPlayers ?? 4) : null;
      
      const newStation = {
        id: stationId,
        name: values.name,
        type: values.type,
        hourlyRate: values.hourlyRate,
        isOccupied: false,
        currentSession: null,
        maxPlayers,
      };
      
      const { error } = await supabase
        .from('stations')
        .insert({
          id: stationId,
          name: values.name,
          type: values.type,
          hourly_rate: values.hourlyRate,
          is_occupied: false,
          max_players: maxPlayers,
        });
      
      if (error) {
        console.error('Error adding station to Supabase:', error);
        toast({
          title: "Error",
          description: "Could not add the station to the database",
          variant: "destructive"
        });
        setIsSubmitting(false);
        return;
      }
      
      setStations([...stations, newStation]);
      
      toast({
        title: "Station Added",
        description: `${values.name} has been added successfully.`,
      });
      
      form.reset();
      onOpenChange(false);
    } catch (error) {
      console.error('Error in adding station:', error);
      toast({
        title: "Error",
        description: "Something went wrong while adding the station",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-heading gradient-text">Add New Station</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Station Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter station name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Station Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select station type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="ps5">PlayStation 5 Console</SelectItem>
                      <SelectItem value="8ball">8-Ball Pool Table</SelectItem>
                      <SelectItem value="foosball">Foosball Table</SelectItem>
                      <SelectItem value="misc">Misc / Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="hourlyRate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {watchedType === 'ps5' ? 'Hourly Rate per Player (₹)' : 'Hourly Rate (₹)'}
                  </FormLabel>
                  <FormControl>
                    <Input type="number" min="10" step="10" {...field} />
                  </FormControl>
                  {watchedType === 'ps5' && (
                    <p className="text-xs text-muted-foreground">
                      This rate is multiplied by the number of players at booking time.
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {watchedType === 'ps5' && (
              <FormField
                control={form.control}
                name="maxPlayers"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max Players per Session</FormLabel>
                    <Select
                      onValueChange={(v) => field.onChange(Number(v))}
                      defaultValue={String(field.value ?? 4)}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select max players" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {[1, 2, 3, 4, 5, 6].map((n) => (
                          <SelectItem key={n} value={String(n)}>{n} player{n > 1 ? 's' : ''}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            
            <DialogFooter className="pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                className="bg-gradient-to-r from-cuephoria-purple to-cuephoria-lightpurple hover:opacity-90"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Adding...' : 'Add Station'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AddStationDialog;

