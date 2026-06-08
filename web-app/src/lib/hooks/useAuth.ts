import { useGetMeQuery } from "@/lib/api/authApi";

export function useAuth() {
  const { data, isLoading, isFetching, refetch } = useGetMeQuery(undefined, {
    refetchOnMountOrArgChange: false,
  });

  return {
    user: data?.user ?? null,
    isLoading,
    isFetching,
    isAuthenticated: Boolean(data?.user),
    refetch,
  };
}
