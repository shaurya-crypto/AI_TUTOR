/**
 * Anaxly - Classical OTP Email Template Generator
 * 
 * Invariants:
 * - Brand Name: Anaxly
 * - Palette: #FAF8F4 (canvas), #FFFFFF (card), #1F1C18 (ink primary), #555852 (ink secondary),
 *            #2E6347 (Scholar sage), #255D88 (Academic cobalt), #E5E3DB (paper border).
 * - Bulletproof table layout compatible with Outlook, Gmail, Apple Mail, and iOS/Android.
 * - Zero emojis. Pure classical academic elegance.
 * - Supports both dynamic token rendering and Go template syntax ({{ .Token }}) for Supabase Dashboard.
 */

export interface OtpEmailOptions {
  code: string
  email?: string
  expiresMinutes?: number
  confirmationUrl?: string
}

/**
 * Generates the responsive HTML email with Anaxly classical aesthetics
 */
export function generateOtpEmailHtml({
  code = '{{ .Token }}',
  email = '{{ .Email }}',
  expiresMinutes = 10,
  confirmationUrl = '{{ .ConfirmationURL }}',
}: Partial<OtpEmailOptions> = {}): string {
  // If code is a literal 6-digit string (e.g. "482910"), render 6 individual digit cells
  const isLiteralCode = /^\d{6}$/.test(code.trim())
  const digits = isLiteralCode ? code.trim().split('') : null

  const digitBoxesHtml = digits
    ? `
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin: 0 auto;">
        <tr>
          ${digits
            .map(
              (d) => `
            <td style="width: 44px; height: 52px; background-color: #FFFFFF; border: 1.5px solid #D5D2C8; border-radius: 8px; text-align: center; vertical-align: middle; padding: 0 4px;">
              <span style="font-family: -apple-system, BlinkMacSystemFont, 'SF Mono', Monaco, Menlo, 'Courier New', monospace; font-size: 28px; font-weight: 700; color: #1F1C18; line-height: 52px; display: inline-block;">
                ${d}
              </span>
            </td>
          `
            )
            .join('<td style="width: 6px;"></td>')}
        </tr>
      </table>
    `
    : `
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin: 0 auto;">
        <tr>
          <td style="background-color: #FFFFFF; border: 1.5px solid #D5D2C8; border-radius: 10px; padding: 14px 28px; text-align: center;">
            <span style="font-family: -apple-system, BlinkMacSystemFont, 'SF Mono', Monaco, Menlo, 'Courier New', monospace; font-size: 32px; font-weight: 700; letter-spacing: 12px; color: #1F1C18; display: inline-block; padding-left: 12px;">
              ${code}
            </span>
          </td>
        </tr>
      </table>
    `

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Your Anaxly Sign-In Code</title>
  <!--[if mso]>
  <xml>
    <o:OfficeDocumentSettings>
      <o:AllowPNG/>
      <o:PixelsPerInch>96</o:PixelsPerInch>
    </o:OfficeDocumentSettings>
  </xml>
  <![endif]-->
  <style type="text/css">
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    table { border-collapse: collapse !important; }
    body { height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; background-color: #FAF8F4; }
    @media screen and (max-width: 600px) {
      .mobile-padding { padding-left: 20px !important; padding-right: 20px !important; }
      .mobile-card { border-radius: 12px !important; }
      .otp-digit { font-size: 24px !important; width: 36px !important; height: 46px !important; line-height: 46px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #FAF8F4; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #1F1C18;">
  <!-- Preheader text (preview snippet in inbox) -->
  <div style="display: none; font-size: 1px; color: #F8F6F0; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">
    Your single-use 6-digit verification code for Anaxly. Valid for ${expiresMinutes} minutes.
  </div>

  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #FAF8F4; min-height: 100vh;">
    <tr>
      <td align="center" style="padding: 40px 16px 48px 16px;">
        <!-- Container 560px -->
        <table role="presentation" class="mobile-padding" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 560px; margin: 0 auto;">
          
          <!-- Brand Monogram / Header -->
          <tr>
            <td align="center" style="padding-bottom: 28px;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <span style="font-family: Georgia, 'Times New Roman', serif; font-size: 18px; font-weight: 600; letter-spacing: 0.22em; text-transform: uppercase; color: #1F1C18;">
                      Anaxly
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main White Parchment Card -->
          <tr>
            <td class="mobile-card" style="background-color: #FFFFFF; border: 1px solid #E5E3DB; border-radius: 16px; padding: 44px 40px 36px 40px; box-shadow: 0 4px 20px rgba(31, 28, 24, 0.04);">
              
              <!-- Classical Title -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center" style="padding-bottom: 8px;">
                    <h1 style="margin: 0; font-family: Georgia, 'Times New Roman', serif; font-size: 26px; font-weight: 400; line-height: 34px; color: #1F1C18; letter-spacing: -0.01em;">
                      Verification Code
                    </h1>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-bottom: 28px;">
                    <p style="margin: 0; font-size: 14px; line-height: 22px; color: #555852; max-width: 420px; text-align: center;">
                      Use the six-digit single-use code below to sign in.
                    </p>
                  </td>
                </tr>

                <!-- Code Container Box -->
                <tr>
                  <td align="center" style="padding-bottom: 28px;">
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #FAF9F5; border: 1px solid #EAE7DE; border-radius: 12px; padding: 24px 16px;">
                      <tr>
                        <td align="center" style="padding-bottom: 14px;">
                          <span style="font-size: 11px; font-weight: 600; letter-spacing: 0.14em; text-transform: uppercase; color: #7A7C75;">
                            Security Code
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td align="center" style="padding-bottom: 12px;">
                          ${digitBoxesHtml}
                        </td>
                      </tr>
                      <tr>
                        <td align="center">
                          <span style="display: inline-block; background-color: #F0F7F1; border: 1px solid #C8E0CE; border-radius: 20px; padding: 4px 12px; font-size: 11px; font-weight: 500; color: #3E5D4B;">
                            Expires in ${expiresMinutes} minutes &bull; Single-use only
                          </span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Direct Link Option (if available) -->
                ${
                  confirmationUrl && confirmationUrl !== '{{ .ConfirmationURL }}'
                    ? `
                <tr>
                  <td align="center" style="padding-bottom: 24px;">
                    <a href="${confirmationUrl}" target="_blank" style="display: inline-block; background-color: #1F3852; color: #FFFFFF; font-size: 13px; font-weight: 600; text-decoration: none; padding: 12px 26px; border-radius: 10px; letter-spacing: 0.02em;">
                      Sign in directly
                    </a>
                  </td>
                </tr>
                `
                    : ''
                }

                <!-- Security Advisory Notice -->
                <tr>
                  <td style="border-top: 1px solid #F0EFEB; padding-top: 24px; padding-bottom: 8px;">
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td style="padding-left: 0;">
                          <p style="margin: 0; font-size: 12px; line-height: 19px; color: #7A7C75;">
                            <strong style="color: #555852; font-weight: 600;">Security notice:</strong> If you did not request this verification code, please ignore this email. Never share this code with anyone.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

              </table>
            </td>
          </tr>

          <!-- Minimal Clean Footer -->
          <tr>
            <td align="center" style="padding-top: 28px;">
              <p style="margin: 0; font-size: 11px; line-height: 17px; color: #9A9C96; text-align: center;">
                &copy; Anaxly. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

/**
 * Returns the exact production HTML ready to be pasted into the Supabase Dashboard
 * under Authentication -> Email Templates -> "Magic Link" or "Send OTP".
 */
export function getSupabaseOtpEmailTemplateHtml(): string {
  return generateOtpEmailHtml({
    code: '{{ .Token }}',
    email: '{{ .Email }}',
    expiresMinutes: 10,
    confirmationUrl: '{{ .ConfirmationURL }}',
  })
}

/**
 * Returns the recommended email subject for Supabase email settings
 */
export function getSupabaseOtpEmailSubject(): string {
  return '{{ .Token }} is your Anaxly verification code'
}
