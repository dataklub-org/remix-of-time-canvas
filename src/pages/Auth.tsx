import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Mail, Lock, Loader2, User, Check, X, Link2, Users2 } from 'lucide-react';
import fractalito from '@/assets/fractalito-logo.png';
import { toast } from 'sonner';
import { validateGroupInviteCode } from '@/hooks/useGroupInviteCode';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp';

const usernameSchema = z.string()
  .min(3, { message: "Username must be at least 3 characters" })
  .max(20, { message: "Username must be less than 20 characters" })
  .regex(/^[a-zA-Z0-9_]+$/, { message: "Only letters, numbers, and underscores allowed" });

const authSchema = z.object({
  email: z.string().trim().email({ message: "Invalid email address" }).max(255),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }).max(100),
});

export default function Auth() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const inviteCode = searchParams.get('invite');
  const groupInviteCode = searchParams.get('group_invite');
  
  const { signIn, signInWithGoogle, isAuthenticated, loading, checkUsernameAvailable } = useAuth();
  const [isSignUp, setIsSignUp] = useState(!!inviteCode || !!groupInviteCode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [inviterUsername, setInviterUsername] = useState<string | null>(null);
  const [groupInviteInfo, setGroupInviteInfo] = useState<{ groupName: string; inviterUsername?: string } | null>(null);
  
  // OTP verification state
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [pendingUsername, setPendingUsername] = useState('');
  const [pendingOtpCode, setPendingOtpCode] = useState('');
  const [pendingEmail, setPendingEmail] = useState('');
  const [pendingPassword, setPendingPassword] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  // Check invite code validity and get inviter info
  useEffect(() => {
    if (inviteCode) {
      checkInviteCode(inviteCode);
    }
    if (groupInviteCode) {
      checkGroupInviteCode(groupInviteCode);
    }
  }, [inviteCode, groupInviteCode]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const checkGroupInviteCode = async (code: string) => {
    const result = await validateGroupInviteCode(code);
    if (result.isValid && result.groupName) {
      setGroupInviteInfo({
        groupName: result.groupName,
        inviterUsername: result.inviterUsername,
      });
    } else {
      toast.error('Invalid or expired group invite link');
    }
  };

  const checkInviteCode = async (code: string) => {
    try {
      const { data, error } = await supabase
        .rpc('validate_invite_code', { code_to_validate: code });

      if (error) {
        console.error('Error validating invite code:', error);
        toast.error('Invalid invite link');
        return;
      }

      const result = Array.isArray(data) ? data[0] : data;
      
      if (!result || !result.is_valid) {
        toast.error('Invalid or expired invite link');
        return;
      }

      if (result.inviter_username) {
        setInviterUsername(result.inviter_username);
      }
    } catch (err) {
      console.error('Error checking invite code:', err);
    }
  };

  // Debounced username check
  useEffect(() => {
    if (!isSignUp || !username || showOtpInput) {
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
  }, [username, isSignUp, checkUsernameAvailable, showOtpInput]);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && !loading) {
      navigate('/');
    }
  }, [isAuthenticated, loading, navigate]);

  const handleGoogleSignIn = async () => {
    setError(null);
    setGoogleLoading(true);
    try {
      if (inviteCode) {
        localStorage.setItem('pending_invite_code', inviteCode);
      }
      if (groupInviteCode) {
        localStorage.setItem('pending_group_invite_code', groupInviteCode);
      }
      const { error } = await signInWithGoogle();
      if (error) {
        setError(error.message);
      }
    } catch (err) {
      setError('Failed to sign in with Google');
    } finally {
      setGoogleLoading(false);
    }
  };

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

  const handleSignUp = async () => {
    // Validate input
    const validation = authSchema.safeParse({ email, password });
    if (!validation.success) {
      setError(validation.error.errors[0].message);
      return;
    }

    const usernameValidation = usernameSchema.safeParse(username);
    if (!usernameValidation.success) {
      setError(usernameValidation.error.errors[0].message);
      return;
    }
    
    if (!usernameAvailable) {
      setError('Please choose an available username');
      return;
    }
    
    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // First check if username is still available
      const isAvailable = await checkUsernameAvailable(username);
      if (!isAvailable) {
        setError('Username is already taken');
        setSubmitting(false);
        return;
      }

      // Generate OTP and send via edge function
      const code = generateOtpCode();
      await sendOtpEmail(email, code);

      // Store pending data for after verification
      setPendingOtpCode(code);
      setPendingEmail(email);
      setPendingPassword(password);
      setPendingUsername(username);
      
      if (inviteCode) {
        localStorage.setItem('pending_invite_code', inviteCode);
      }
      if (groupInviteCode) {
        localStorage.setItem('pending_group_invite_code', groupInviteCode);
      }

      // Show OTP input
      setShowOtpInput(true);
      setResendCooldown(60);
      setSuccessMessage('We sent a 6-digit code to your email');
    } catch (err: any) {
      console.error('Signup error:', err);
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

    setVerifyingOtp(true);
    setError(null);

    try {
      // Now create the actual account
      const { data, error } = await supabase.auth.signUp({
        email: pendingEmail,
        password: pendingPassword,
        options: {
          // Skip email confirmation since we already verified
          data: {
            email_verified: true,
          },
        },
      });

      if (error) {
        if (error.message.includes('already registered')) {
          setError('This email is already registered. Please sign in instead.');
        } else {
          setError(error.message);
        }
        setVerifyingOtp(false);
        return;
      }

      if (data.user) {
        // Sign in the user since signUp might not auto-login
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: pendingEmail,
          password: pendingPassword,
        });

        if (signInError) {
          console.error('Auto sign-in error:', signInError);
        }

        // Create profile with username
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            user_id: data.user.id,
            username: pendingUsername.toLowerCase(),
          });

        if (profileError) {
          console.error('Error creating profile:', profileError);
          if (!profileError.message.includes('duplicate')) {
            toast.error('Failed to create profile');
          }
        }

        toast.success('Account created successfully!');
        navigate('/');
      }
    } catch (err) {
      console.error('Verification error:', err);
      setError('Account creation failed. Please try again.');
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleResendCode = async () => {
    if (resendCooldown > 0) return;

    setSubmitting(true);
    setError(null);

    try {
      // Generate a new OTP and send it
      const code = generateOtpCode();
      await sendOtpEmail(pendingEmail, code);
      
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (isSignUp) {
      await handleSignUp();
    } else {
      // Sign in flow
      const validation = authSchema.safeParse({ email, password });
      if (!validation.success) {
        setError(validation.error.errors[0].message);
        return;
      }

      setSubmitting(true);
      try {
        const { error } = await signIn(email, password);
        if (error) {
          if (error.message.includes('Invalid login')) {
            setError('Invalid email or password');
          } else if (error.message.includes('Email not confirmed')) {
            setError('Please verify your email first');
          } else {
            setError(error.message);
          }
        }
      } catch (err) {
        setError('An unexpected error occurred');
      } finally {
        setSubmitting(false);
      }
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
        <Button
          variant="ghost"
          size="icon"
          onClick={showOtpInput ? handleBackFromOtp : () => navigate('/')}
          className="rounded-full"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <img src={fractalito} alt="Fractalito" className="h-8 w-auto" />
      </header>

      {/* Form */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-6">
          {/* Invite banner */}
          {inviteCode && inviterUsername && !showOtpInput && (
            <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 flex items-center gap-2">
              <Link2 className="h-4 w-4 text-primary shrink-0" />
              <p className="text-sm text-primary">
                You've been invited by <strong>@{inviterUsername}</strong>
              </p>
            </div>
          )}
          
          {/* Group invite banner */}
          {groupInviteCode && groupInviteInfo && !showOtpInput && (
            <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center gap-2">
              <Users2 className="h-4 w-4 text-green-600 shrink-0" />
              <p className="text-sm text-green-600">
                You've been invited to join <strong>"{groupInviteInfo.groupName}"</strong>
                {groupInviteInfo.inviterUsername && (
                  <> by <strong>@{groupInviteInfo.inviterUsername}</strong></>
                )}
              </p>
            </div>
          )}

          {/* OTP Verification View */}
          {showOtpInput ? (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <h1 className="text-2xl font-bold text-foreground">
                  Verify your email
                </h1>
                <p className="text-muted-foreground text-sm">
                  Enter the 6-digit code sent to <strong>{email}</strong>
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
                  'Verify & Create Account'
                )}
              </Button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={resendCooldown > 0 || submitting}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                >
                  {resendCooldown > 0 
                    ? `Resend code in ${resendCooldown}s` 
                    : "Didn't receive the code? Resend"}
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="text-center space-y-2">
                <h1 className="text-2xl font-bold text-foreground">
                  {isSignUp ? 'Create an account' : 'Welcome back'}
                </h1>
                <p className="text-muted-foreground text-sm">
                  {isSignUp
                    ? 'Sign up to start your timeline journey'
                    : 'Sign in to continue your journey'}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                {isSignUp && (
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
                )}

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                {isSignUp && (
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="confirmPassword"
                        type="password"
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                )}

                {error && (
                  <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                    <p className="text-sm text-destructive">{error}</p>
                  </div>
                )}

                {successMessage && (
                  <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                    <p className="text-sm text-green-600 dark:text-green-400">{successMessage}</p>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full rounded-full"
                  disabled={submitting}
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : isSignUp ? (
                    'Sign Up'
                  ) : (
                    'Sign In'
                  )}
                </Button>

                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      Or continue with
                    </span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full rounded-full"
                  onClick={handleGoogleSignIn}
                  disabled={googleLoading || submitting}
                >
                  {googleLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
                        <path
                          fill="currentColor"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="currentColor"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="currentColor"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                          fill="currentColor"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                      </svg>
                      Continue with Google
                    </>
                  )}
                </Button>
              </form>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUp(!isSignUp);
                    setError(null);
                    setSuccessMessage(null);
                    setUsername('');
                    setUsernameAvailable(null);
                    setUsernameError(null);
                  }}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {isSignUp
                    ? 'Already have an account? Sign in'
                    : "Don't have an account? Sign up"}
                </button>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
