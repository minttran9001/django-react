import { cache } from "react";
import { headers } from "next/headers";

import { PATHNAME_HEADER } from "@/lib/routes";

export const getPathname = cache(async (): Promise<string> => {
  const headersList = await headers();
  return headersList.get(PATHNAME_HEADER) ?? "/";
});
