import { getIdentityData } from "actions/getIdentityData";
import { useReplicache } from "src/replicache";
import useSWR from "swr";

export function useIdentityData() {
  let { permission_token } = useReplicache();
  return useSWR(`identity`, () =>
    getIdentityData(
      permission_token.permission_token_rights.map((pr) => pr.entity_set),
    ),
  );
}
