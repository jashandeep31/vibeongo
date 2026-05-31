import { BACKEND_URL } from "@/lib/constants";
import axios from "axios";

export const getWallet = async (): Promise<{
  id: string;
  balance: number;
}> => {
  const res = await axios.get(`${BACKEND_URL}/api/v1/users/metadata`, {
    withCredentials: true,
  });
  return res.data.data;
};

export const addCredits = async (
  amount: number,
): Promise<{
  checkoutUrl: string;
}> => {
  const res = await axios.post(
    `${BACKEND_URL}/api/v1/payments/add-credits`,
    {
      amount: amount * 100,
    },
    {
      withCredentials: true,
    },
  );
  return res.data;
};
