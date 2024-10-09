"use client";

import { useEffect, useState } from "react";
import { getHomeDocs, HomeDoc } from "./storage";
import useSWR from "swr";
import { ReplicacheProvider } from "src/replicache";
import { LeafletPreview } from "./LeafletPreview";

export function LeafletList() {
  let { data: leaflets } = useSWR("leaflets", () => getHomeDocs(), {
    fallbackData: [],
  });

  return (
    <div className="homeLeafletGrid grow w-full h-full overflow-y-scroll no-scrollbar  ">
      <div className="grid auto-rows-max md:grid-cols-4 sm:grid-cols-3 grid-cols-2 gap-y-8 gap-x-4 sm:gap-6 grow pt-3 pb-28 sm:pt-6 sm:pb-12 sm:pl-6">
        {leaflets
          .sort((a, b) => (a.added_at > b.added_at ? -1 : 1))
          .filter((d) => !d.hidden)
          .map(({ token: leaflet }) => (
            <ReplicacheProvider
              key={leaflet.id}
              rootEntity={leaflet.root_entity}
              token={leaflet}
              name={leaflet.root_entity}
              initialFacts={[]}
            >
              <LeafletPreview
                token={leaflet}
                leaflet_id={leaflet.root_entity}
              />
            </ReplicacheProvider>
          ))}
      </div>
    </div>
  );
}
