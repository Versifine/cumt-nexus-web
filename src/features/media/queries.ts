import { useMutation } from "@tanstack/react-query";

import { uploadImage } from "./api";
import type { UploadImageInput } from "./types";

export function useUploadImageMutation() {
  return useMutation({
    mutationFn: (input: UploadImageInput) => uploadImage(input),
  });
}
