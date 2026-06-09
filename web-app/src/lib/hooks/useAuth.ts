import { useGetMeQuery } from "@/lib/api/authApi";
import { useInitialUser } from "@/providers/InitialUserContext";

export function useAuth() {
  const initialUser = useInitialUser();
  const { data, isLoading, isFetching, refetch } = useGetMeQuery(undefined, {
    refetchOnMountOrArgChange: false,
  });

  const user = data?.user ?? initialUser;

  return {
    user,
    isLoading: isLoading && data === undefined,
    isFetching,
    isAuthenticated: Boolean(user),
    refetch,
  };
}
