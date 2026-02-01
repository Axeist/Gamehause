
import React, { useEffect, useMemo, useRef } from 'react';
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
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Edit, Upload, X, Crop } from 'lucide-react';

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
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null); // cropped file ready to upload
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null); // current preview (station image or cropped preview)
  const [rawFile, setRawFile] = React.useState<File | null>(null); // original chosen file (before crop)
  const [rawPreviewUrl, setRawPreviewUrl] = React.useState<string | null>(null); // object URL for original chosen file
  const [isCropping, setIsCropping] = React.useState(false);
  const [zoom, setZoom] = React.useState(1);
  const [center, setCenter] = React.useState<{ x: number; y: number }>({ x: 0.5, y: 0.5 }); // normalized 0..1
  const [imageNatural, setImageNatural] = React.useState<{ w: number; h: number } | null>(null);
  const [cropFrameSize, setCropFrameSize] = React.useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const [isUploadingImage, setIsUploadingImage] = React.useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cropFrameRef = useRef<HTMLDivElement>(null);
  const cropImgRef = useRef<HTMLImageElement>(null);
  const { toast } = useToast();

  const PRESET_IMAGES: { id: string; label: string; url: string }[] = useMemo(
    () => [
      { id: 'american', label: 'American Table', url: '/American table.jpg' },
      { id: 'medium', label: 'Medium Table', url: '/Medium Table.jpg' },
      { id: 'standard', label: 'Standard Table', url: '/Standard Table.jpg' },
      { id: 'foosball', label: 'Foosball', url: '/Foosball.jpeg' },
      { id: 'ps', label: 'PS', url: '/controller.png' },
    ],
    []
  );

  // Update form when station changes
  React.useEffect(() => {
    if (station) {
      setName(station.name);
      setHourlyRate(station.hourlyRate);
      setSelectedFile(null);
      setRawFile(null);
      setIsCropping(false);
      setZoom(1);
      setCenter({ x: 0.5, y: 0.5 });
      setImageNatural(null);
      if (rawPreviewUrl) URL.revokeObjectURL(rawPreviewUrl);
      setRawPreviewUrl(null);
      setPreviewUrl(station.imageUrl ?? null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [station]);

  // Keep crop frame size updated (for drag math + preview transform)
  useEffect(() => {
    if (!cropFrameRef.current) return;
    const el = cropFrameRef.current;
    const ro = new ResizeObserver(() => {
      const rect = el.getBoundingClientRect();
      setCropFrameSize({ w: rect.width, h: rect.height });
    });
    ro.observe(el);
    // Ensure an initial size immediately (prevents tiny top-left preview)
    const rect = el.getBoundingClientRect();
    setCropFrameSize({ w: rect.width, h: rect.height });
    return () => ro.disconnect();
  }, [isCropping]);

  // Cleanup object URL on unmount
  useEffect(() => {
    return () => {
      if (rawPreviewUrl) URL.revokeObjectURL(rawPreviewUrl);
      if (previewUrl && previewUrl.startsWith('blob:')) URL.revokeObjectURL(previewUrl);
    };
  }, [rawPreviewUrl, previewUrl]);

  const clampCenter = React.useCallback(
    (next: { x: number; y: number }, z: number) => {
      if (!imageNatural) return next;

      // We constrain based on the final output ratio (16:9) so what you see is what you save.
      const outW = 1200;
      const outH = 675;
      const { w: imgW, h: imgH } = imageNatural;
      const scale0 = Math.max(outW / imgW, outH / imgH);
      const scale = scale0 * z;
      const srcW = outW / scale;
      const srcH = outH / scale;

      const minX = (srcW / 2) / imgW;
      const maxX = 1 - minX;
      const minY = (srcH / 2) / imgH;
      const maxY = 1 - minY;

      return {
        x: Math.min(Math.max(next.x, minX), maxX),
        y: Math.min(Math.max(next.y, minY), maxY),
      };
    },
    [imageNatural]
  );

  const previewTransform = useMemo(() => {
    if (!isCropping || !imageNatural || cropFrameSize.w === 0 || cropFrameSize.h === 0) return null;
    const { w: imgW, h: imgH } = imageNatural;
    const frameW = cropFrameSize.w;
    const frameH = cropFrameSize.h;
    const scale0 = Math.max(frameW / imgW, frameH / imgH);
    const scale = scale0 * zoom;
    const cx = center.x * imgW;
    const cy = center.y * imgH;
    const tx = frameW / 2 - scale * cx;
    const ty = frameH / 2 - scale * cy;
    return { tx, ty, scale };
  }, [center.x, center.y, cropFrameSize.h, cropFrameSize.w, imageNatural, isCropping, zoom]);

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

    // Start crop flow
    if (rawPreviewUrl) URL.revokeObjectURL(rawPreviewUrl);
    const url = URL.createObjectURL(file);
    setRawFile(file);
    setRawPreviewUrl(url);
    setSelectedFile(null); // will be set after crop applied
    setIsCropping(true);
    setZoom(1);
    setCenter({ x: 0.5, y: 0.5 });
    setImageNatural(null);
  };

  const applyCrop = async () => {
    if (!rawFile || !rawPreviewUrl || !station) return;
    if (!imageNatural) return;

    const outW = 1200;
    const outH = 675;
    const { w: imgW, h: imgH } = imageNatural;

    const imgEl = cropImgRef.current;
    if (!imgEl) return;

    const scale0 = Math.max(outW / imgW, outH / imgH);
    const scale = scale0 * zoom;
    const srcW = outW / scale;
    const srcH = outH / scale;

    const clamped = clampCenter(center, zoom);
    const cx = clamped.x * imgW;
    const cy = clamped.y * imgH;

    const sx = Math.max(0, Math.min(imgW - srcW, cx - srcW / 2));
    const sy = Math.max(0, Math.min(imgH - srcH, cy - srcH / 2));

    const canvas = document.createElement('canvas');
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(imgEl, sx, sy, srcW, srcH, 0, 0, outW, outH);

    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.9)
    );
    if (!blob) return;

    const croppedFile = new File([blob], `station-${station.id}-${Date.now()}.jpg`, {
      type: 'image/jpeg',
    });

    // Replace preview with cropped output
    if (previewUrl && previewUrl.startsWith('blob:')) URL.revokeObjectURL(previewUrl);
    const croppedUrl = URL.createObjectURL(croppedFile);

    setSelectedFile(croppedFile);
    setPreviewUrl(croppedUrl);
    setIsCropping(false);
    toast({
      title: 'Crop applied',
      description: 'Now upload to save this cropped image.',
    });
  };

  const cancelCrop = () => {
    if (rawPreviewUrl) URL.revokeObjectURL(rawPreviewUrl);
    setRawPreviewUrl(null);
    setRawFile(null);
    setSelectedFile(null);
    setIsCropping(false);
    setZoom(1);
    setCenter({ x: 0.5, y: 0.5 });
    setImageNatural(null);
    setPreviewUrl(station?.imageUrl ?? null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const applyPresetImage = async (imageUrl: string) => {
    if (!station) return;

    // Reset local crop/upload state; this is a direct assignment.
    cancelCrop();
    setPreviewUrl(imageUrl);

    setIsUploadingImage(true);
    try {
      if (onUpdateImage) {
        const ok = await onUpdateImage(station.id, imageUrl);
        if (!ok) return;
      } else {
        const { error: updateError } = await supabase
          .from('stations')
          .update({ image_url: imageUrl })
          .eq('id', station.id);
        if (updateError) {
          console.error('Error saving preset station image url:', updateError);
          toast({
            title: 'Save failed',
            description: 'Failed to set preset image for this station.',
            variant: 'destructive',
          });
          return;
        }
      }

      toast({
        title: 'Preset applied',
        description: 'Station image updated.',
      });
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleUploadImage = async () => {
    if (!station) return;
    if (!selectedFile) {
      toast({
        title: 'No image selected',
        description: isCropping ? 'Apply the crop first, then upload.' : 'Choose an image first, then upload.',
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
      if (rawPreviewUrl) URL.revokeObjectURL(rawPreviewUrl);
      setRawPreviewUrl(null);
      setRawFile(null);
      setIsCropping(false);
      setSelectedFile(null);
      setZoom(1);
      setCenter({ x: 0.5, y: 0.5 });
      setImageNatural(null);

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

            {/* Preset image selector */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Quick presets</Label>
              <Select
                onValueChange={(value) => {
                  const preset = PRESET_IMAGES.find((p) => p.id === value);
                  if (preset) applyPresetImage(preset.url);
                }}
                disabled={isUploadingImage || isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select: American / Medium / Standard / Foosball / PS" />
                </SelectTrigger>
                <SelectContent>
                  {PRESET_IMAGES.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Selecting a preset will instantly set the station image.
              </p>
            </div>

            {isCropping ? (
              <div className="space-y-3">
                <div
                  ref={cropFrameRef}
                  className="relative overflow-hidden rounded-lg border border-white/10 bg-black/20 select-none touch-none"
                  style={{ aspectRatio: '16 / 9' }}
                  onPointerDown={(e) => {
                    if (!previewTransform || !imageNatural) return;
                    const frame = cropFrameRef.current;
                    if (!frame) return;
                    frame.setPointerCapture(e.pointerId);
                    const startX = e.clientX;
                    const startY = e.clientY;
                    const startCenter = { ...center };
                    const { w: imgW, h: imgH } = imageNatural;
                    const frameW = cropFrameSize.w;
                    const frameH = cropFrameSize.h;
                    const scale0 = Math.max(frameW / imgW, frameH / imgH);
                    const scale = scale0 * zoom;

                    const onMove = (ev: PointerEvent) => {
                      const dx = ev.clientX - startX;
                      const dy = ev.clientY - startY;
                      const next = {
                        x: startCenter.x - dx / (imgW * scale),
                        y: startCenter.y - dy / (imgH * scale),
                      };
                      setCenter(clampCenter(next, zoom));
                    };
                    const onUp = () => {
                      window.removeEventListener('pointermove', onMove);
                      window.removeEventListener('pointerup', onUp);
                    };
                    window.addEventListener('pointermove', onMove);
                    window.addEventListener('pointerup', onUp);
                  }}
                >
                  {rawPreviewUrl && (
                    <img
                      ref={cropImgRef}
                      src={rawPreviewUrl}
                      alt="Crop preview"
                      className="absolute left-0 top-0 max-w-none will-change-transform"
                      style={{
                        transformOrigin: 'top left',
                        // Important: size the element to its natural pixel size so transform math is stable.
                        width: imageNatural ? `${imageNatural.w}px` : undefined,
                        height: imageNatural ? `${imageNatural.h}px` : undefined,
                        opacity: previewTransform ? 1 : 0,
                        transition: "opacity 150ms ease",
                        // Use a matrix to avoid transform-order quirks (pan won't affect zoom).
                        transform: previewTransform
                          ? `matrix(${previewTransform.scale}, 0, 0, ${previewTransform.scale}, ${previewTransform.tx}, ${previewTransform.ty})`
                          : undefined,
                      }}
                      onLoad={(e) => {
                        const img = e.currentTarget;
                        setImageNatural({ w: img.naturalWidth, h: img.naturalHeight });
                      }}
                      draggable={false}
                    />
                  )}
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-black/5 to-transparent" />
                  <div className="pointer-events-none absolute inset-2 rounded-md border border-white/15" />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">Drag to reposition</p>
                    <p className="text-xs text-muted-foreground">Zoom</p>
                  </div>
                  <Slider
                    value={[zoom]}
                    min={1}
                    max={3}
                    step={0.01}
                    onValueChange={(v) => {
                      const nextZoom = v[0] ?? 1;
                      setZoom(nextZoom);
                      setCenter((c) => clampCenter(c, nextZoom));
                    }}
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={cancelCrop}
                    disabled={isUploadingImage || isLoading}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={applyCrop}
                    disabled={isUploadingImage || isLoading || !imageNatural}
                    className="bg-cuephoria-purple hover:bg-cuephoria-purple/80 gap-2"
                  >
                    <Crop className="h-4 w-4" />
                    Apply Crop
                  </Button>
                </div>
              </div>
            ) : previewUrl ? (
              <div
                className="relative overflow-hidden rounded-lg border border-white/10 bg-black/20"
                style={{ aspectRatio: "16 / 9" }}
              >
                <img
                  src={previewUrl}
                  alt="Station preview"
                  className="absolute inset-0 h-full w-full object-cover"
                />
                <div className="absolute top-2 right-2 flex gap-2">
                  <Button
                    type="button"
                    size="icon"
                    variant="secondary"
                    className="h-8 w-8 bg-black/50 hover:bg-black/70 text-white"
                    onClick={() => {
                      setSelectedFile(null);
                      cancelCrop();
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
                disabled={isUploadingImage || isLoading || !selectedFile || isCropping}
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
            <p className="text-xs text-muted-foreground">
              PNG/JPG/WebP up to 5MB. After choosing, adjust crop then upload.
            </p>
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
