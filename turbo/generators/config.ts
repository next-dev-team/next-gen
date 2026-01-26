import type { PlopTypes } from "@turbo/gen";
import {
  tronMiniGenerator,
  agentRulesGenerator,
  appScaffoldGenerator,
  electronFloatGenerator,
  universalAgentGenerator,
} from "./generators";

export default function generator(plop: PlopTypes.NodePlopAPI): void {
  tronMiniGenerator(plop);
  agentRulesGenerator(plop);
  appScaffoldGenerator(plop);
  electronFloatGenerator(plop);
  universalAgentGenerator(plop);
}
