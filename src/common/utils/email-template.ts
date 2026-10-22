import { escapeHtml } from "./escape-html";

export const verificationEmailTemplate = (
  name: string,
  verificationLink: string,
) => {
  const safeName = escapeHtml(name);
  const safeLink = escapeHtml(verificationLink);

  return {
    subject: "Verify your account",
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>Hello ${safeName || "there"},</h2>
        <p>Thank you for registering.</p>
        <p>Please click the button below to verify your account:</p>
        <a href="${safeLink}" style="display: inline-block; padding: 12px 20px; background: #28a745; color: #fff; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Verify Account
        </a>
        <p>If the button does not work, copy and paste this link into your browser:</p>
        <p>${safeLink}</p>
      </div>
    `,
  };
};
