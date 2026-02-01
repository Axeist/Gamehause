
import React, { useRef } from 'react';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Station } from '@/types/pos.types';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Edit, Upload, X } from 'lucide-react';

interface EditStationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  station: Station | null;
  onSave: (stationId: string, name: string, hourlyRate: number) => Promise<boolean>;
  onUpdateImage?: (stationId: string, imageUrl: string | null) => Promise<boolean>;
}

const EditStationDialog: React.FC<EditStationDialogProps> = ({
  open,
  onOpenChange,
  station,
  onSave,
  onUpdateImage,
}) => {
  const [name, setName] = React.useState('');
  const [hourlyRate, setHourlyRate] = React.useState(0);
  const [isLoading, setIsLoading] = React.useState(false);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = React.useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Update form when station changes
  React.useEffect(() => {
    if (station) {
      setName(station.name);
      setHourlyRate(station.hourlyRate);
      setSelectedFile(null);
      setPreviewUrl(station.imageUrl ?? null);
    }
  }, [station]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!station) return;
    
    setIsLoading(true);
    try {
      const success = await onSave(station.id, name, hourlyRate);
      if (success) {
        onOpenChange(false);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file',
        description: 'Please select a valid image file.',
        variant: 'destructive',
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Please select an image smaller than 5MB.',
        variant: 'destructive',
      });
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleUploadImage = async () => {
    if (!station) return;
    if (!selectedFile) {
      toast({
        title: 'No image selected',
        description: 'Choose an image first, then upload.',
        variant: 'destructive',
      });
      return;
    }

    setIsUploadingImage(true);
    try {
      const fileExt = selectedFile.name.split('.').pop() || 'jpg';
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
      const filePath = `stations/${station.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('station-images')
        .upload(filePath, selectedFile, {
          contentType: selectedFile.type,
          upsert: true,
        });

      if (uploadError) {
        console.error('Error uploading station image:', uploadError);
        toast({
          title: 'Upload failed',
          description: 'Could not upload the image. Please try again.',
          variant: 'destructive',
        });
        return;
      }

      const { data: urlData } = supabase.storage
        .from('station-images')
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;

      if (onUpdateImage) {
        const ok = await onUpdateImage(station.id, publicUrl);
        if (!ok) return;
      } else {
        const { error: updateError } = await supabase
          .from('stations')
          .update({ image_url: publicUrl })
          .eq('id', station.id);
        if (updateError) {
          console.error('Error saving station image url:', updateError);
          toast({
            title: 'Save failed',
            description: 'Uploaded image but failed to save it to the station.',
            variant: 'destructive',
          });
          return;
        }
      }

      toast({
        title: 'Image uploaded',
        description: 'Station image updated successfully.',
      });

      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error) {
      console.error('Unexpected station image upload error:', error);
      toast({
        title: 'Upload error',
        description: 'Something went wrong while uploading.',
        variant: 'destructive',
      });
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleRemoveImage = async () => {
    if (!station) return;
    setIsUploadingImage(true);
    try {
      if (onUpdateImage) {
        const ok = await onUpdateImage(station.id, null);
        if (!ok) return;
      } else {
        const { error } = await supabase
          .from('stations')
          .update({ image_url: null })
          .eq('id', station.id);
        if (error) {
          console.error('Error clearing station image url:', error);
          toast({
            title: 'Remove failed',
            description: 'Could not remove station image.',
            variant: 'destructive',
          });
          return;
        }
      }

      toast({
        title: 'Image removed',
        description: 'Station image removed successfully.',
      });

      setSelectedFile(null);
      setPreviewUrl(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } finally {
      setIsUploadingImage(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-background border-cuephoria-purple">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit size={16} />
            Edit Station
          </DialogTitle>
          <DialogDescription>
            Update station name and hourly rate
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          {/* Station Image */}
          <div className="space-y-2">
            <Label>Station Image</Label>
            {previewUrl ? (
              <div className="relative overflow-hidden rounded-lg border border-white/10 bg-black/20">
                <img
                  src={previewUrl}
                  alt="Station preview"
                  className="h-28 w-full object-cover"
                />
                <div className="absolute top-2 right-2 flex gap-2">
                  <Button
                    type="button"
                    size="icon"
                    variant="secondary"
                    className="h-8 w-8 bg-black/50 hover:bg-black/70 text-white"
                    onClick={() => {
                      setSelectedFile(null);
                      setPreviewUrl(station?.imageUrl ?? null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    title="Clear selected"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-white/15 bg-black/15 p-4">
                <p className="text-xs text-muted-foreground">
                  No image uploaded yet.
                </p>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />

              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingImage || isLoading}
                className="gap-2"
              >
                <Upload className="h-4 w-4" />
                Choose Image
              </Button>

              <Button
                type="button"
                onClick={handleUploadImage}
                disabled={isUploadingImage || isLoading || !selectedFile}
                className="bg-cuephoria-purple hover:bg-cuephoria-purple/80"
              >
                {isUploadingImage ? 'Uploading...' : 'Upload'}
              </Button>

              {(station?.imageUrl || previewUrl) && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleRemoveImage}
                  disabled={isUploadingImage || isLoading}
                >
                  Remove
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">PNG/JPG/WebP up to 5MB.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Station Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter station name"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="hourlyRate">Hourly Rate</Label>
            <Input
              id="hourlyRate"
              type="number"
              value={hourlyRate}
              onChange={(e) => setHourlyRate(parseFloat(e.target.value))}
              placeholder="Enter hourly rate"
              min={0}
              step={0.01}
              required
            />
          </div>
          
          <DialogFooter className="pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="bg-cuephoria-purple hover:bg-cuephoria-purple/80" 
              disabled={isLoading || !name || hourlyRate <= 0}
            >
              {isLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditStationDialog;
