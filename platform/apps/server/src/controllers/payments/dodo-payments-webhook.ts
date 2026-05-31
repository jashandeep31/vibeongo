import { dodoPaymentClient } from "./dodo-payments.js";
import { Request, Response } from "express";

const getHeader = (header: string | string[] | undefined) => {
  if (Array.isArray(header)) {
    return header[0];
  }

  return header;
};

export const dodoPaymentsWebhook = async (req: Request, res: Response) => {
  try {
    const rawBody = req.body.toString("utf8");
    const unwrapped = dodoPaymentClient.webhooks.unwrap(rawBody, {
      headers: {
        "webhook-id": getHeader(req.headers["webhook-id"]) ?? "",
        "webhook-signature": getHeader(req.headers["webhook-signature"]) ?? "",
        "webhook-timestamp": getHeader(req.headers["webhook-timestamp"]) ?? "",
      },
    });

    console.log(unwrapped);
    res.status(200).json({ received: true });
  } catch (error) {
    console.error(error);
    res.status(400).json({ message: "Invalid Dodo webhook" });
  }
};
