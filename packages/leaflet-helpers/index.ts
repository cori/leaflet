import { Attributes, Fact } from "../../src/replicache/attributes";
export type { Attributes, Fact } from "../../src/replicache/attributes";

export function db(facts: Fact<keyof typeof Attributes>[]) {
  return {
    getAttributeOfEntity<A extends keyof typeof Attributes>(
      entity: string,
      attribute: A,
    ) {
      return facts.filter(
        (f) => f.attribute === attribute && f.entity === entity,
      ) as Fact<A>[];
    },
  };
}
