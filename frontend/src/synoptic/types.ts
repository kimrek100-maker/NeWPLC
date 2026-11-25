export type Kind =
  | "motor"
  | "pump"
  | "valve"
  | "tank"
  | "sensor"
  | "button"
  | "lamp"
  | "numeric";
export type Channel = "state" | "value" | "alarm" | "command";
export type Evidence = {
  origin: "explicit" | "hypothesis" | "manual";
  source: "st" | "io" | "description" | "manual";
  quote: string;
  confirmed: boolean;
};
export type Binding = Evidence & { variable: string };
export type PlantNode = {
  id: string;
  kind: Kind;
  label: string;
  position: { x: number; y: number };
  evidence: Evidence;
  bindings: Partial<Record<Channel, Binding>>;
  manual: boolean;
};
export type PlantEdge = {
  id: string;
  source: string;
  target: string;
  label: string;
  kind: "functional";
  evidence: Evidence;
  manual: boolean;
};
export type Layout = {
  version: 1;
  nodes: PlantNode[];
  edges: PlantEdge[];
  deleted_node_ids: string[];
  deleted_edge_ids: string[];
  description: string;
  io_list: string;
  source_hash: string;
};
export type Inspection = {
  variables: {
    name: string;
    type: string;
    kind: string;
    assigned: boolean;
    command_eligible: boolean;
  }[];
  issues: { node_id?: string; channel?: Channel; message: string }[];
  simulation_supported: boolean;
  simulation_message: string;
};
export const emptyLayout = (): Layout => ({
  version: 1,
  nodes: [],
  edges: [],
  deleted_node_ids: [],
  deleted_edge_ids: [],
  description: "",
  io_list: "",
  source_hash: "",
});
export const manualEvidence = (): Evidence => ({
  origin: "manual",
  source: "manual",
  quote: "",
  confirmed: true,
});
export const kinds: Record<Kind, string> = {
  motor: "Motore",
  pump: "Pompa",
  valve: "Valvola",
  tank: "Serbatoio",
  sensor: "Sensore",
  button: "Pulsante",
  lamp: "Spia",
  numeric: "Indicatore numerico",
};
export const channels: Record<Channel, string> = {
  state: "Stato BOOL",
  value: "Valore BOOL/INT",
  alarm: "Allarme BOOL",
  command: "Comando virtuale",
};
