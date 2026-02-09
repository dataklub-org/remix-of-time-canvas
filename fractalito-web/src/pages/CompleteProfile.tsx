import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { redeemInviteCode } from '@/hooks/useInviteCode';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, User, Check, X, ArrowLeft } from 'lucide-react';
import fractalito from '@/assets/fractalito-logo.png';
import { toast } from 'sonner';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp';

const usernameSchema = z.string()
  .min(3, { message: "Username must be at least 3 characters" })
  .max(20, { message: "Username must be less than 20 characters" })
  .regex(/^[a-zA-Z0-9_]+$/, { message: "Only letters, numbers, and underscores allowed" });

export default function CompleteProfile() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // OTP verification state
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [pendingOtpCode, setPendingOtpCode] = useState('');
  const [pendingUsername, setPendingUsername] = useState('');
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Check if user is authenticated and needs to complete profile
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        navigate('/auth');
        return;
      }

      // Check if profile already exists
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (profile) {
        // Profile exists, redirect to home
        navigate('/');
        return;
      }

      setUserId(session.user.id);
      setUserEmail(session.user.email || null);
      setLoading(false);
    };

    checkAuth();
  }, [navigate]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const checkUsernameAvailable = useCallback(async (usernameToCheck: string): Promise<boolean> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .ilike('username', usernameToCheck)
      .maybeSingle();
    
    return !data && !error;
  }, []);

  // Debounced username check
  useEffect(() => {
    if (!username || showOtpInput) {
      setUsernameAvailable(null);
      setUsernameError(null);
      return;
    }

    const validation = usernameSchema.safeParse(username);
    if (!validation.success) {
      setUsernameError(validation.error.errors[0].message);
      setUsernameAvailable(null);
      return;
    }

    setUsernameError(null);
    setCheckingUsername(true);
    
    const timeout = setTimeout(async () => {
      const available = await checkUsernameAvailable(username);
      setUsernameAvailable(available);
      setCheckingUsername(false);
    }, 500);

    return () => clearTimeout(timeout);
  }, [username, checkUsernameAvailable, showOtpInput]);

  // Generate a 6-digit OTP code
  const generateOtpCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  // Send OTP via edge function
  const sendOtpEmail = async (toEmail: string, code: string) => {
    const response = await supabase.functions.invoke('send-otp-email', {
      body: { email: toEmail, code },
    });
    
    if (response.error) {
      throw new Error(response.error.message || 'Failed to send verification email');
    }
    
    return response.data;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validation = usernameSchema.safeParse(username);
    if (!validation.success) {
      setError(validation.error.errors[0].message);
      return;
    }

    if (!usernameAvailable) {
      setError('Please choose an available username');
      return;
    }

    if (!userId || !userEmail) {
      setError('Session expired. Please sign in again.');
      return;
    }

    setSubmitting(true);

    try {
      // Check if username is still available
      const isAvailable = await checkUsernameAvailable(username);
      if (!isAvailable) {
        setError('Username is already taken');
        setSubmitting(false);
        return;
      }

      // Generate OTP and send via edge function
      const code = generateOtpCode();
      await sendOtpEmail(userEmail, code);

      // Store pending data for after verification
      setPendingOtpCode(code);
      setPendingUsername(username);

      // Show OTP input
      setShowOtpInput(true);
      setResendCooldown(60);
      setSuccessMessage('We sent a 6-digit code to your email');
    } catch (err: any) {
      console.error('Error sending OTP:', err);
      setError(err.message || 'Failed to send verification email');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otpCode.length !== 6) {
      setError('Please enter the 6-digit code');
      return;
    }

    // Verify the OTP code matches
    if (otpCode !== pendingOtpCode) {
      setError('Invalid code. Please try again.');
      return;
    }

    if (!userId) {
      setError('Session expired. Please sign in again.');
      return;
    }

    setVerifyingOtp(true);
    setError(null);

    try {
      // Create the profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          user_id: userId,
          username: pendingUsername.toLowerCase(),
        });

      if (profileError) {
        if (profileError.code === '23505') {
          setError('Username is already taken. Please choose another.');
          setShowOtpInput(false);
          setOtpCode('');
        } else {
          throw profileError;
        }
        return;
      }

      // Try to redeem any pending invite code
      await redeemInviteCode(userId);

      toast.success('Profile created successfully!');
      navigate('/');
    } catch (err: any) {
      console.error('Error creating profile:', err);
      setError('Failed to create profile. Please try again.');
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleResendCode = async () => {
    if (resendCooldown > 0 || !userEmail) return;

    setSubmitting(true);
    setError(null);

    try {
      // Generate a new OTP and send it
      const code = generateOtpCode();
      await sendOtpEmail(userEmail, code);
      
      // Update the pending code
      setPendingOtpCode(code);
      setResendCooldown(60);
      toast.success('New code sent to your email');
    } catch (err: any) {
      setError(err.message || 'Failed to resend code');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBackFromOtp = () => {
    setShowOtpInput(false);
    setOtpCode('');
    setError(null);
    setSuccessMessage(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="p-4 flex items-center gap-4">
        {showOtpInput && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBackFromOtp}
            className="rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        <img src={fractalito} alt="Fractalito" className="h-8 w-auto" />
      </header>

      {/* Form */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-6">
          {/* OTP Verification View */}
          {showOtpInput ? (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <h1 className="text-2xl font-bold text-foreground">
                  Verify your email
                </h1>
                <p className="text-muted-foreground text-sm">
                  Enter the 6-digit code sent to <strong>{userEmail}</strong>
                </p>
              </div>

              <div className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={otpCode}
                  onChange={setOtpCode}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <p className="text-sm text-destructive text-center">{error}</p>
                </div>
              )}

              {successMessage && (
                <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                  <p className="text-sm text-green-600 dark:text-green-400 text-center">{successMessage}</p>
                </div>
              )}

              <Button
                onClick={handleVerifyOtp}
                className="w-full rounded-full"
                disabled={verifyingOtp || otpCode.length !== 6}
              >
                {verifyingOtp ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Verify & Complete Profile'
                )}
              </Button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={resendCooldown > 0 || submitting}
                  className="text-sm text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {resendCooldown > 0 
                    ? `Resend code in ${resendCooldown}s` 
                    : "Didn't receive a code? Resend"}
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="text-center space-y-2">
                <h1 className="text-2xl font-bold text-foreground">
                  Choose your username
                </h1>
                <p className="text-muted-foreground text-sm">
                  Pick a unique username to complete your profile
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="username"
                      type="text"
                      placeholder="your_username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value.toLowerCase())}
                      className="pl-10 pr-10"
                      required
                      autoFocus
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {checkingUsername && (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      )}
                      {!checkingUsername && usernameAvailable === true && (
                        <Check className="h-4 w-4 text-green-500" />
                      )}
                      {!checkingUsername && usernameAvailable === false && (
                        <X className="h-4 w-4 text-destructive" />
                      )}
                    </div>
                  </div>
                  {usernameError && (
                    <p className="text-xs text-destructive">{usernameError}</p>
                  )}
                  {!checkingUsername && usernameAvailable === false && !usernameError && (
                    <p className="text-xs text-destructive">Username is taken</p>
                  )}
                </div>

                {error && (
                  <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                    <p className="text-sm text-destructive">{error}</p>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full rounded-full"
                  disabled={submitting || !usernameAvailable}
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Continue'
                  )}
                </Button>
              </form>

              <p className="text-xs text-center text-muted-foreground">
                Your username will be visible to other users when sharing moments
              </p>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
