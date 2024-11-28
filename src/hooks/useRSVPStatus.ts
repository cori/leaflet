import { getPhoneRSVPToEventState } from "actions/get_phone_rsvp_to_event_state";
import useSWR from "swr";

export function usePhoneRSVPState(entity: string) {
  const { data, error, mutate } = useSWR(`phone-rsvp-${entity}`, () =>
    getPhoneRSVPToEventState(entity),
  );

  return {
    rsvpStatus: data,
    error,
    mutateRSVPState: mutate,
  };
}
