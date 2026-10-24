import nodemailer from "nodemailer";
import env from "../../config/env";

type SendEmailOptions = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
};

const createMailtrapTransporter = () => {
  return nodemailer.createTransport({
    host: env.mailtrapHost,
    port: Number(env.mailtrapPort),
    secure: false,
    auth: {
      user: env.mailtrapUser,
      pass: env.mailtrapPass,
    },
  });
};

const sendWithBrevoApi = async ({
  to,
  subject,
  html,
  text,
}: SendEmailOptions) => {
  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      accept: "application/json",
      "api-key": env.brevoApiKey,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      sender: {
        name: extractSenderName(env.mailFrom),
        email: extractSenderEmail(env.mailFrom),
      },
      to: Array.isArray(to) ? to.map((email) => ({ email })) : [{ email: to }],
      subject,
      htmlContent: html,
      textContent: text,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("Brevo API Error:", data);
    throw new Error(data.message || "Failed to send email with Brevo API");
  }

  console.log("Email sent successfully with Brevo API:", data);
  return data;
};

const sendWithMailtrap = async ({
  to,
  subject,
  html,
  text,
}: SendEmailOptions) => {
  const transporter = createMailtrapTransporter();

  const info = await transporter.sendMail({
    from: env.mailFrom,
    to,
    subject,
    text,
    html,
  });

  console.log("Email sent successfully with Mailtrap:", info.messageId);
  return info;
};

const extractSenderEmail = (mailFrom: string): string => {
  const match = mailFrom.match(/<(.+?)>/);
  return match ? match[1] : mailFrom;
};

const extractSenderName = (mailFrom: string): string => {
  const match = mailFrom.match(/^(.*?)\s*<.+?>$/);
  return match ? match[1].replace(/"/g, "").trim() : "No Reply";
};

export const sendEmail = async (options: SendEmailOptions) => {
  switch (env.emailProvider) {
    case "brevo":
      return sendWithBrevoApi(options);
    case "mailtrap":
      return sendWithMailtrap(options);
    default:
      throw new Error(`Unknown EMAIL_PROVIDER: ${env.emailProvider}`);
  }
};
