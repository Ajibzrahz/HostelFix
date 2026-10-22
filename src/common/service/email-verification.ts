import { randomBytes, createHash } from "node:crypto";
import User from "../../modules/users/user-model";
import env from "../../config/env";
import { sendEmail } from "./email-service";
import { verificationEmailTemplate } from "../utils/email-template";

export const sendVerificationEmail = async (
  userId: string,
  name: string,
  email: string,
) => {
  const token = randomBytes(32).toString("hex");

  const tokenHash = createHash("sha256").update(token).digest("hex");

  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  await User.findByIdAndUpdate(userId, {
    emailVerificationTokenHash: tokenHash,
    emailVerificationTokenExpiresAt: expiresAt,
  });

  const verificationLink =
    `${env.serverUrl}/api/v1/auth/verify-email` +
    `?token=${token}&email=${encodeURIComponent(email)}`;

  const { subject, html } = verificationEmailTemplate(name, verificationLink);

  await sendEmail({
    to: email,
    subject,
    html,
    text: `Verify your account using this link: ${verificationLink}`,
  });
};
