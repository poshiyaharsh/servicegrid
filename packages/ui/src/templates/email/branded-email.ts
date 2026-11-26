export interface BrandedEmailParams {
  recipientName: string;
  subject: string;
  bodyHtml: string;
  ctaLabel?: string;
  ctaUrl?: string;
  tenantName?: string;
}

export function renderBrandedEmail({
  recipientName,
  subject,
  bodyHtml,
  ctaLabel,
  ctaUrl,
  tenantName = 'FieldSutra',
}: BrandedEmailParams): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#F8FAFC;font-family:Inter,Arial,sans-serif;color:#0F172A;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color:#FFFFFF;border:1px solid #E2E8F0;border-radius:10px;overflow:hidden;">
          <tr>
            <td style="background-color:#0F172A;padding:20px 28px;">
              <span style="font-size:18px;font-weight:700;color:#F8FAFC;letter-spacing:-0.02em;">Field<span style="color:#14B8A6;">Sutra</span></span>
              <span style="float:right;font-size:12px;color:#94A3B8;padding-top:3px;">${tenantName}</span>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;">
              <p style="margin:0 0 12px;font-size:15px;">Hello ${recipientName},</p>
              <div style="font-size:14px;line-height:1.6;color:#334155;">${bodyHtml}</div>
              ${
                ctaLabel && ctaUrl
                  ? `<p style="margin:24px 0 0;"><a href="${ctaUrl}" style="display:inline-block;background-color:#0D9488;color:#FFFFFF;text-decoration:none;font-size:14px;font-weight:600;padding:10px 20px;border-radius:6px;">${ctaLabel}</a></p>`
                  : ''
              }
            </td>
          </tr>
          <tr>
            <td style="background-color:#F8FAFC;border-top:1px solid #E2E8F0;padding:16px 28px;font-size:12px;color:#64748B;">
              Powered by FieldSutra Field Service Operations
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
