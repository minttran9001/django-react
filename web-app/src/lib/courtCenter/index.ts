import axios from "axios";

import { ACCESS_TOKEN_COOKIE } from "../auth/constants";
import { formatApiDate } from "../dates";
import { env } from "../env";
import { cookies } from "next/headers";

export const prefetchPublicCourtCenter = async (id: string) => {
  try {
    const response = await axios.get(
      `${env.NEXT_PUBLIC_API_URL}/api/court-centers/${id}`,
      {
        params: { date: formatApiDate(new Date()) },
      },
    );
    return response.data;
  } catch (error) {
    console.error(error);
    return null;
  }
};

/** Owner-only prefetch for edit flows. */
export const prefetchMyCourtCenter = async (id: string) => {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
    if (!accessToken) throw new Error("No access token found");
    const response = await axios.get(
      `${env.NEXT_PUBLIC_API_URL}/api/court-centers/mine/${id}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    return response.data;
  } catch (error) {
    console.error(error);
    return null;
  }
};
