import { SendEmailCommand, SESClient } from "@aws-sdk/client-ses";
import { env } from "../../lib/env.js";

interface SendEmailProps {
  toAddress: string;
  fromAddress: string;
  html: string;
  subject: string;
  bodyText: string;
}

export const SES_CLIENT = new SESClient({
  region: "us-east-1",
  credentials: {
    accessKeyId: env.AWS_SES_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SES_SECRET_KEY,
  },
});

const createSendEmailCommand = ({
  toAddress,
  fromAddress,
  html,
  subject,
  bodyText,
}: SendEmailProps) => {
  return new SendEmailCommand({
    Destination: {
      CcAddresses: [],
      ToAddresses: [toAddress],
    },
    Message: {
      Body: {
        Html: {
          Charset: "UTF-8",
          Data: html,
        },
        Text: {
          Charset: "UTF-8",
          Data: bodyText,
        },
      },
      Subject: {
        Charset: "UTF-8",
        Data: subject,
      },
    },
    Source: fromAddress,
    ReplyToAddresses: [],
  });
};

export const sendEmail = async (props: SendEmailProps) => {
  const command = createSendEmailCommand(props);
  return await SES_CLIENT.send(command);
};
