import { createInstance } from "@/services/instance-servies";
import { useMutation } from "@tanstack/react-query";

export const useCreateInstance = () =>
  useMutation({
    mutationFn: createInstance,
  });
