import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "resend";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface OtpEmailRequest {
  email: string;
  code: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { email, code }: OtpEmailRequest = await req.json();

    // Validate required fields
    if (!email || !code) {
      console.error("Missing required fields:", { email: !!email, code: !!code });
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Sending OTP email to:", email);

    const emailResponse = await resend.emails.send({
      from: "Fractalito <noreply@fractalito.com>",
      to: [email],
      subject: "Your Fractalito verification code",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background-color: #f9fafb;">
            <div style="max-width: 480px; margin: 0 auto; padding: 40px 20px;">
              <div style="background-color: #ffffff; border-radius: 12px; padding: 40px 32px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);">
                <h1 style="color: #111827; font-size: 24px; font-weight: 600; margin: 0 0 8px 0; text-align: center;">
                  Verify your email
                </h1>
                <p style="color: #6b7280; font-size: 16px; margin: 0 0 32px 0; text-align: center;">
                  Enter this code to complete your signup
                </p>
                <div style="background-color: #f3f4f6; border-radius: 8px; padding: 24px; text-align: center; margin-bottom: 32px;">
                  <span style="font-family: 'SF Mono', Monaco, 'Courier New', monospace; font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #111827;">
                    ${code}
                  </span>
                </div>
                <p style="color: #9ca3af; font-size: 14px; margin: 0; text-align: center;">
                  This code expires in 10 minutes.<br>
                  If you didn't request this, you can safely ignore this email.
                </p>
              </div>
              <p style="color: #9ca3af; font-size: 12px; margin: 24px 0 0 0; text-align: center;">
                Fractalito - Your life as a landscape
              </p>
            </div>
          </body>
        </html>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending OTP email:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to send email" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
