import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle, XCircle, Shield } from 'lucide-react';
import fractalito from '@/assets/fractalito-logo.png';

export default function OAuthConsent() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading, isAuthenticated } = useAuth();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Extract OAuth parameters from URL
  const clientId = searchParams.get('client_id');
  const redirectUri = searchParams.get('redirect_uri');
  const responseType = searchParams.get('response_type');
  const scope = searchParams.get('scope');
  const state = searchParams.get('state');

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      // Preserve the current URL so we can redirect back after login
      const currentUrl = window.location.href;
      navigate(`/auth?redirect=${encodeURIComponent(currentUrl)}`);
    }
  }, [loading, isAuthenticated, navigate]);

  const handleApprove = async () => {
    setProcessing(true);
    setError(null);

    try {
      // Build the redirect URL with the authorization response
      if (redirectUri) {
        const url = new URL(redirectUri);
        
        // For implicit flow, add token to fragment
        // For authorization code flow, this would involve generating a code
        if (state) {
          url.searchParams.set('state', state);
        }
        
        // Redirect to the client's redirect URI
        window.location.href = url.toString();
      } else {
        setError('Missing redirect URI');
        setProcessing(false);
      }
    } catch (err) {
      setError('Failed to process authorization');
      setProcessing(false);
    }
  };

  const handleDeny = () => {
    if (redirectUri) {
      const url = new URL(redirectUri);
      url.searchParams.set('error', 'access_denied');
      url.searchParams.set('error_description', 'User denied the authorization request');
      if (state) {
        url.searchParams.set('state', state);
      }
      window.location.href = url.toString();
    } else {
      navigate('/');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Parse scopes for display
  const scopes = scope?.split(' ').filter(Boolean) || ['profile'];
  const scopeDescriptions: Record<string, string> = {
    profile: 'View your basic profile information',
    email: 'View your email address',
    openid: 'Authenticate using your identity',
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="flex justify-center">
          <img src={fractalito} alt="Fractalito" className="h-12 w-auto" />
        </div>

        <Card className="border-border/50 shadow-lg">
          <CardHeader className="text-center space-y-2">
            <div className="flex justify-center mb-2">
              <Shield className="h-10 w-10 text-primary" />
            </div>
            <CardTitle className="text-xl">Authorization Request</CardTitle>
            <CardDescription>
              {clientId ? (
                <>
                  <span className="font-medium text-foreground">{clientId}</span>
                  {' '}wants to access your account
                </>
              ) : (
                'An application wants to access your account'
              )}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* User info */}
            {user && (
              <div className="p-3 rounded-lg bg-muted/50 text-center">
                <p className="text-sm text-muted-foreground">Logged in as</p>
                <p className="font-medium text-foreground">{user.email}</p>
              </div>
            )}

            {/* Requested permissions */}
            <div className="space-y-3">
              <p className="text-sm font-medium text-foreground">
                This will allow the application to:
              </p>
              <ul className="space-y-2">
                {scopes.map((s) => (
                  <li key={s} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>{scopeDescriptions[s] || s}</span>
                  </li>
                ))}
              </ul>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <p className="text-sm text-destructive flex items-center gap-2">
                  <XCircle className="h-4 w-4" />
                  {error}
                </p>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleDeny}
                disabled={processing}
              >
                Deny
              </Button>
              <Button
                className="flex-1"
                onClick={handleApprove}
                disabled={processing}
              >
                {processing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Authorize'
                )}
              </Button>
            </div>

            <p className="text-xs text-center text-muted-foreground">
              By authorizing, you agree to share the above information with this application.
            </p>
          </CardContent>
        </Card>

        <p className="text-xs text-center text-muted-foreground">
          <button
            onClick={() => navigate('/')}
            className="hover:text-foreground transition-colors"
          >
            Return to Fractalito
          </button>
        </p>
      </div>
    </div>
  );
}
