import axios from "axios";
import { cache } from "react";

const NECESSARY_ENTITIES = [
  {
    entity: "sports",
    endpoint: "getSports",
    apiId: "courtCenterApi",
  },
];

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export const prefetchNecessaryData = cache(async () => {
  const necessaryData = await Promise.all(
    NECESSARY_ENTITIES.map(async ({ entity, endpoint, apiId }) => {
      const { data } = await axios.get(`${API_URL}/api/${entity}`);
      return {
        entity,
        endpoint,
        data,
        apiId,
      };
    }),
  );
  return necessaryData;
});
