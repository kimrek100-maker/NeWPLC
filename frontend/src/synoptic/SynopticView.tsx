import { useEffect, useMemo, useRef, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  Handle,
  Position,
  type NodeProps,
  type Node,
  type NodeChange,
  type EdgeChange,
  type Connection,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  CircuitBoard,
  Plus,
  Sparkles,
  Undo2,
  Play,
  Square,
  Save,
} from "lucide-react";
import { api, post } from "../api";
import { PlantSymbol } from "./PlantSymbol";
import {
  type Layout,
  type PlantNode,
  type PlantEdge,
  type Channel,
  type Kind,
  type Inspection,
  type Evidence,
  kinds,
  channels,
  manualEvidence,
} from "./types";
import "./synoptic.css";
const provenance = (e: Evidence) =>
  e.origin === "manual"
    ? "Manuale"
    : e.origin === "explicit"
      ? "Fonte citata"
      : "Ipotesi AI";
type Data = {
  plant: PlantNode;
  values: Record<string, unknown>;
  unknown: boolean;
  warning: boolean;
};
function SymbolNode({ data }: NodeProps<Node<Data>>) {
  const { plant: p, values: v, unknown, warning } = data;
  const alarm = v.alarm === true,
    active = v.state === true;
  return (
    <div
      className={
        "plant-node " +
        (alarm ? "alarm" : active ? "running" : "") +
        (warning ? " unresolved" : "")
      }
    >
      <Handle type="target" position={Position.Left} />
      <div className="plant-node-top">
        <span>{kinds[p.kind]}</span>
        <span>
          {alarm
            ? "ALLARME"
            : unknown
              ? "—"
              : active
                ? "ATTIVO"
                : v.state === false
                  ? "INATTIVO"
                  : "LOGICA"}
        </span>
      </div>
      <PlantSymbol kind={p.kind} />
      <strong>{p.label}</strong>
      <code>
        {p.bindings.value?.variable ??
          p.bindings.state?.variable ??
          "Non associato"}
      </code>
      <div className="plant-reading">
        {typeof v.value === "number"
          ? v.value.toLocaleString("it-IT")
          : typeof v.value === "boolean"
            ? String(v.value)
            : "—"}
      </div>
      <small>
        {provenance(p.evidence)}
        {p.evidence.confirmed ? " · confermato" : " · da confermare"}
      </small>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
const nodeTypes = { plant: SymbolNode };
const ariaLabels={
  'node.a11yDescription.default':'Invio o spazio per selezionare. Usa l’ispettore per modificare o rimuovere.',
  'node.a11yDescription.keyboardDisabled':'Invio o spazio per selezionare; usa X/Y nell’ispettore per spostare.',
  'node.a11yDescription.ariaLiveMessage':({x,y}:{direction:string;x:number;y:number})=>`Elemento spostato: X ${x}, Y ${y}`,
  'edge.a11yDescription.default':'Invio o spazio per selezionare la relazione. Usa l’ispettore per modificarla.',
  'controls.ariaLabel':'Controlli del sinottico',
  'controls.zoomIn.ariaLabel':'Ingrandisci', 'controls.zoomOut.ariaLabel':'Riduci',
  'controls.fitView.ariaLabel':'Adatta alla vista', 'handle.ariaLabel':'Punto di collegamento funzionale'
};
export function SynopticView({
  code,
  family,
  layout,
  onChange,
  provider,
  simulation,
  onSimulation,
  onSave,
  saving,
}: {
  code: string;
  family: string;
  layout: Layout;
  onChange: (value: Layout) => void;
  provider: string;
  simulation: any;
  onSimulation: (value: any) => void;
  onSave: () => void;
  saving: boolean;
}) {
  const [selected, setSelected] = useState(""),
    [edgeId, setEdgeId] = useState(""),
    [kind, setKind] = useState<Kind>("motor");
  const [inspection, setInspection] = useState<Inspection | null>(null),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const [working, setWorking] = useState(false),
    [scanning, setScanning] = useState(false),
    [history, setHistory] = useState<Record<string, boolean | number>[]>([]),
    [commands, setCommands] = useState<Record<string, boolean | number>>({});
  const [from, setFrom] = useState(""),
    [to, setTo] = useState(""),
    [undo, setUndo] = useState<Layout | null>(null);
  const request = useRef<AbortController | null>(null),
    alive = useRef(true),
    latest = useRef({ code, family, layout });
  latest.current = { code, family, layout };
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      request.current?.abort();
    };
  }, []);
  useEffect(() => {
    setInspection(null);
    const sameSession = simulation?.origin === "synoptic" && simulation.synoptic_context === JSON.stringify({code,family,layout});
    setHistory(sameSession ? simulation.history_commands : []);
    setCommands(sameSession ? simulation.pending_commands : {});
    const controller = new AbortController();
    const timer = setTimeout(() => postInspect(controller), 400);
    async function postInspect(c: AbortController) {
      try {
        const info = await postWithSignal(
          "/synoptic/inspect",
          { code, family, layout },
          c.signal,
        );
        if (!c.signal.aborted) setInspection(info);
      } catch (e) {
        if (!c.signal.aborted) setError((e as Error).message);
      }
    }
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [code, family, layout]);
  useEffect(() => {
    if (simulation?.origin !== "synoptic") setHistory([]);
  }, [simulation]);
  const selectedNode = layout.nodes.find((n) => n.id === selected),
    selectedEdge = layout.edges.find((e) => e.id === edgeId);
  function change(next: Layout) {
    setUndo(layout);
    onChange(next);
    onSimulation(null);
    setError("");
  }
  function updateNode(patch: Partial<PlantNode>) {
    if (!selectedNode) return;
    change({
      ...layout,
      nodes: layout.nodes.map((n) =>
        n.id === selected ? { ...n, ...patch, manual: true } : n,
      ),
    });
  }
  function updateEdge(patch: Partial<PlantEdge>) {
    if (!selectedEdge) return;
    change({
      ...layout,
      edges: layout.edges.map((e) =>
        e.id === edgeId ? { ...e, ...patch, manual: true } : e,
      ),
    });
  }
  function removeNodes(ids: string[]) {
    change({
      ...layout,
      nodes: layout.nodes.filter((n) => !ids.includes(n.id)),
      edges: layout.edges.filter(
        (e) => !ids.includes(e.source) && !ids.includes(e.target),
      ),
      deleted_node_ids: [...new Set([...layout.deleted_node_ids, ...ids])],
      deleted_edge_ids: [
        ...new Set([
          ...layout.deleted_edge_ids,
          ...layout.edges
            .filter((e) => ids.includes(e.source) || ids.includes(e.target))
            .map((e) => e.id),
        ]),
      ],
    });
    setSelected("");
  }
  function removeEdges(ids: string[]) {
    change({
      ...layout,
      edges: layout.edges.filter((e) => !ids.includes(e.id)),
      deleted_edge_ids: [...new Set([...layout.deleted_edge_ids, ...ids])],
    });
    setEdgeId("");
  }
  function nodeChanges(changes: NodeChange[]) {
    if (working || scanning) return;
    const chosen = changes.find((c) => c.type === "select" && c.selected);
    if (chosen) {
      setSelected(chosen.id);
      setEdgeId("");
    }
    const removed = changes.filter((c) => c.type === "remove").map((c) => c.id);
    if (removed.length) {
      removeNodes(removed);
      return;
    }
    const moves = changes.filter((c) => c.type === "position" && c.position);
    if (moves.length)
      change({
        ...layout,
        nodes: layout.nodes.map((n) => {
          const move = moves.find((c) => c.id === n.id);
          return move && move.type === "position"
            ? {
                ...n,
                position: {
                  x: Math.max(-10000, Math.min(10000, move.position!.x)),
                  y: Math.max(-10000, Math.min(10000, move.position!.y)),
                },
                manual: true,
              }
            : n;
        }),
      });
  }
  function edgeChanges(changes: EdgeChange[]) {
    if (working || scanning) return;
    const chosen = changes.find((c) => c.type === "select" && c.selected);
    if (chosen) {
      setEdgeId(chosen.id);
      setSelected("");
    }
    const ids = changes.filter((c) => c.type === "remove").map((c) => c.id);
    if (ids.length) removeEdges(ids);
  }
  function connect(c: Connection | { source: string; target: string }) {
    if (
      !c.source ||
      !c.target ||
      working ||
      scanning ||
      layout.edges.length >= 160
    )
      return;
    change({
      ...layout,
      edges: [
        ...layout.edges,
        {
          id: crypto.randomUUID(),
          source: c.source,
          target: c.target,
          label: "Relazione funzionale",
          kind: "functional",
          evidence: manualEvidence(),
          manual: true,
        },
      ],
    });
  }
  async function generate() {
    setError("");
    setMessage("");
    setWorking(true);
    const captured = { code, family, layout };
    const controller = new AbortController();
    request.current = controller;
    try {
      const result = await postWithSignal(
        "/synoptic/generate",
        { ...captured, provider },
        controller.signal,
      );
      if (!alive.current) return;
      if (
        latest.current.code !== code ||
        latest.current.family !== family ||
        latest.current.layout !== layout
      ) {
        setError(
          "Il progetto è cambiato: proposta scartata. Rigenera dalla versione corrente.",
        );
        return;
      }
      change(result.layout);
      setInspection(result);
      setMessage(result.message);
    } catch (e) {
      if (alive.current)
        setError(
          (e as Error).name === "AbortError"
            ? "Generazione annullata. Layout precedente conservato."
            : (e as Error).message,
        );
    } finally {
      if (alive.current) setWorking(false);
    }
  }
  async function scan() {
    setScanning(true);
    setError("");
    const captured = latest.current;
    try {
      const result = await post("/synoptic/simulate", {
        code,
        family,
        layout,
        commands,
        history,
      });
      if (
        !alive.current ||
        latest.current.code !== captured.code ||
        latest.current.family !== captured.family ||
        latest.current.layout !== captured.layout
      )
        return;
      setHistory([...history, commands]);
      onSimulation({ ...result, origin: "synoptic", history_commands:[...history,commands], pending_commands:commands, synoptic_context:JSON.stringify({code,family,layout}) });
      setMessage(result.message);
    } catch (e) {
      if (alive.current) setError((e as Error).message);
    } finally {
      if (alive.current) setScanning(false);
    }
  }
  const state = simulation?.scans?.at(-1)?.state ?? simulation?.state;
  const flowNodes = useMemo(
    () =>
      layout.nodes.map((n) => {
        const values: Record<string, unknown> = {};
        for (const [channel, b] of Object.entries(n.bindings)) {
          if (
            inspection?.simulation_supported &&
            b?.confirmed &&
            !inspection?.issues.some(
              (i) => i.node_id === n.id && i.channel === channel,
            ) &&
            state
          )
            values[channel] = state[b.variable.toUpperCase()];
        }
        return {
          id: n.id,
          ariaLabel:n.label,
          zIndex: 2,
          type: "plant",
          position: n.position,
          selected: n.id === selected,
          data: {
            plant: n,
            values,
            unknown: Object.values(values).every(value=>value===undefined),
            warning:
              !n.evidence.confirmed ||
              !!inspection?.issues.some((i) => i.node_id === n.id),
          },
        };
      }),
    [layout, selected, state, inspection],
  );
  const flowEdges = layout.edges.map((e) => ({
    id: e.id,
    zIndex: 0,
    source: e.source,
    target: e.target,
    label: e.label + " · funzionale",
    selected: e.id === edgeId,
    style: {
      stroke: e.evidence.confirmed ? "#82b9ae" : "#e4bd7b",
      strokeDasharray: e.evidence.confirmed ? "" : "6 4",
    },
    type: "smoothstep",
  }));
  function binding(channel: Channel, variable: string) {
    if (!selectedNode) return;
    const bindings = { ...selectedNode.bindings };
    if (variable) bindings[channel] = { ...manualEvidence(), variable };
    else delete bindings[channel];
    updateNode({ bindings });
  }
  return (
    <section className="synoptic" aria-label="Sinottico impianto">
      <div className="synoptic-heading">
        <div>
          <h2>
            <CircuitBoard size={18} /> Sinottico impianto
          </h2>
          <span>Funzionale 2D · nessun collegamento PLC</span>
        </div>
        <div className="synoptic-buttons">
          <button
            className="secondary"
            disabled={working || scanning}
            onClick={generate}
          >
            <Sparkles size={14} />
            {working ? "Generazione…" : "Genera / rigenera AI"}
          </button>
          {working && (
            <button onClick={() => request.current?.abort()}>Annulla</button>
          )}
          <button
            className="primary"
            disabled={saving || working || scanning}
            onClick={onSave}
          >
            <Save size={14} /> Salva revisione
          </button>
        </div>
      </div>
      <div className="synoptic-boundary">
        Relazioni funzionali, non tubazioni o cablaggi. Nessuna simulazione
        fisica, compilazione vendor o attestazione di collaudo.
      </div>
      <div className="synoptic-status" role={error ? "alert" : "status"}>
        {error ||
          message ||
          "Descrivi l’impianto e la lista I/O, poi genera una proposta o aggiungi simboli manualmente."}
      </div>
      <div className="synoptic-workspace">
        <div className="synoptic-stage">
          <div className="synoptic-palette">
            <label>
              Simbolo
              <select
                disabled={working || scanning}
                value={kind}
                onChange={(e) => setKind(e.target.value as Kind)}
              >
                {Object.entries(kinds).map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="secondary"
              disabled={working || scanning || layout.nodes.length >= 80}
              onClick={() => {
                const id = crypto.randomUUID();
                change({
                  ...layout,
                  nodes: [
                    ...layout.nodes,
                    {
                      id,
                      kind,
                      label: kinds[kind],
                      position: {
                        x: 80 + (layout.nodes.length % 4) * 200,
                        y: 70 + Math.floor(layout.nodes.length / 4) * 210,
                      },
                      evidence: manualEvidence(),
                      bindings: {},
                      manual: true,
                    },
                  ],
                });
                setSelected(id);
                setEdgeId("");
              }}
            >
              <Plus size={14} /> Aggiungi
            </button>
            <button
              disabled={!undo || working || scanning}
              onClick={() => {
                if (undo) {
                  onChange(undo);
                  onSimulation(null);
                  setUndo(null);
                }
              }}
            >
              <Undo2 size={14} /> Annulla modifica
            </button>
            <small>{layout.nodes.length}/80 elementi</small>
          </div>
          <div className="synoptic-canvas">
            <ReactFlow
              nodes={flowNodes}
              edges={flowEdges}
              nodeTypes={nodeTypes}
              onNodesChange={(changes) => nodeChanges(changes.toArray())}
              onEdgesChange={(changes) => edgeChanges(changes.toArray())}
              onConnect={connect}
              onNodeClick={(_, n) => {
                setSelected(n.id);
                setEdgeId("");
              }}
              onEdgeClick={(_, e) => {
                setEdgeId(e.id);
                setSelected("");
              }}
              nodesDraggable={!working && !scanning}
              nodesConnectable={!working && !scanning}
              deleteKeyCode={null}
              fitView
              minZoom={0.2}
              maxZoom={2}
              forceColorMode="dark"
              ariaLabelConfig={ariaLabels}
              proOptions={{ hideAttribution: false }}
            >
              <Background gap={22} size={1} />
              <Controls showInteractive={false} />
            </ReactFlow>
            {!layout.nodes.length && (
              <div className="synoptic-empty">
                <CircuitBoard size={36} />
                <h3>Il processo prende forma qui</h3>
                <p>
                  Aggiungi un simbolo o genera dall’ST. Le ipotesi AI saranno
                  evidenziate e da confermare.
                </p>
              </div>
            )}
          </div>
          <div className="synoptic-simulation">
            <div>
              <strong>Banco logico offline</strong>
              <small>
                {inspection?.simulation_supported
                  ? `Scansione ${history.length}/100 · BOOL/INT`
                  : (inspection?.simulation_message ??
                    "Verifica supporto in corso…")}
              </small>
            </div>
            <button
              className="secondary"
              disabled={
                !inspection?.simulation_supported ||
                working ||
                scanning ||
                history.length >= 100
              }
              onClick={scan}
            >
              <Play size={14} /> Esegui scansione
            </button>
            <button
              disabled={working || scanning}
              onClick={() => {
                setHistory([]);
                setCommands({});
                onSimulation(null);
                setMessage("Sessione simulazione azzerata");
              }}
            >
              <Square size={13} /> Azzera
            </button>
          </div>
        </div>
        <aside className="synoptic-inspector">
          <fieldset disabled={working || scanning}>
            <legend>Selezione accessibile</legend>
            <label>
              Elemento
              <select
                aria-label="Elemento del sinottico"
                value={selected}
                onChange={(e) => {
                  setSelected(e.target.value);
                  setEdgeId("");
                }}
              >
                <option value="">Seleziona un elemento</option>
                {layout.nodes.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Relazione
              <select
                aria-label="Relazione del sinottico"
                value={edgeId}
                onChange={(e) => {
                  setEdgeId(e.target.value);
                  setSelected("");
                }}
              >
                <option value="">Seleziona una relazione</option>
                {layout.edges.map((e) => (
                  <option key={e.id} value={e.id}>
                    {layout.nodes.find((n) => n.id === e.source)?.label} →{" "}
                    {layout.nodes.find((n) => n.id === e.target)?.label}
                  </option>
                ))}
              </select>
            </label>
          </fieldset>
          <fieldset disabled={working || scanning}>
            <legend>Contesto impianto</legend>
            <label>
              Descrizione impianto
              <textarea
                className="resize-none"
                value={layout.description}
                maxLength={16000}
                onChange={(e) =>
                  change({ ...layout, description: e.target.value })
                }
              />
            </label>
            <label>
              Lista I/O
              <textarea
                className="resize-none"
                value={layout.io_list}
                maxLength={16000}
                onChange={(e) => change({ ...layout, io_list: e.target.value })}
              />
            </label>
            <small>
              Provider:{" "}
              {provider === "cloud"
                ? "cloud scelto nelle Impostazioni; invia ST, contesto e layout"
                : "Ollama locale"}
            </small>
          </fieldset>
          <fieldset disabled={working || scanning}>
            <legend>
              {selectedNode
                ? "Elemento selezionato"
                : selectedEdge
                  ? "Relazione selezionata"
                  : "Associazioni e layout"}
            </legend>
            {selectedNode ? (
              <>
                <label>
                  Etichetta elemento
                  <input
                    value={selectedNode.label}
                    maxLength={120}
                    onChange={(e) => updateNode({ label: e.target.value })}
                  />
                </label>
                <label>
                  Tipo simbolo
                  <select
                    value={selectedNode.kind}
                    onChange={(e) =>
                      updateNode({ kind: e.target.value as Kind })
                    }
                  >
                    {Object.entries(kinds).map(([id, label]) => (
                      <option value={id} key={id}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="position-fields">
                  {(["x", "y"] as const).map((axis) => (
                    <label key={axis}>
                      Posizione {axis.toUpperCase()}
                      <input
                        type="number"
                        min={-10000}
                        max={10000}
                        value={Math.round(selectedNode.position[axis])}
                        onChange={(e) => {
                          const value = Number(e.target.value);
                          if (
                            Number.isFinite(value) &&
                            Math.abs(value) <= 10000
                          )
                            updateNode({
                              position: {
                                ...selectedNode.position,
                                [axis]: value,
                              },
                            });
                        }}
                      />
                    </label>
                  ))}
                </div>
                <EvidenceControl
                  evidence={selectedNode.evidence}
                  onChange={(evidence) => updateNode({ evidence })}
                />
                {(Object.entries(channels) as [Channel, string][]).map(
                  ([channel, label]) => (
                    <div
                      className="binding-field"
                      data-channel={channel}
                      key={channel}
                    >
                      <label>
                        {label}
                        <select
                          aria-label={label}
                          value={selectedNode.bindings[channel]?.variable ?? ""}
                          onChange={(e) => binding(channel, e.target.value)}
                        >
                          <option value="">Non associato</option>
                          {selectedNode.bindings[channel] &&
                            !inspection?.variables.some(
                              (v) =>
                                v.name ===
                                selectedNode.bindings[channel]?.variable,
                            ) && (
                              <option
                                value={selectedNode.bindings[channel]!.variable}
                              >
                                {selectedNode.bindings[channel]!.variable} · da
                                verificare
                              </option>
                            )}
                          {inspection?.variables.map((v, i) => (
                            <option key={v.name + i} value={v.name}>
                              {v.name} · {v.type}
                              {channel === "command" && !v.command_eligible
                                ? " · non comandabile"
                                : ""}
                            </option>
                          ))}
                        </select>
                      </label>
                      {selectedNode.bindings[channel] && (
                        <EvidenceControl
                          evidence={selectedNode.bindings[channel]!}
                          onChange={(e) =>
                            updateNode({
                              bindings: {
                                ...selectedNode.bindings,
                                [channel]: {
                                  ...e,
                                  variable:
                                    selectedNode.bindings[channel]!.variable,
                                },
                              },
                            })
                          }
                        />
                      )}
                    </div>
                  ),
                )}
                {selectedNode.bindings.command && (
                  <label>
                    Valore comando virtuale
                    {inspection?.variables
                      .find(
                        (v) =>
                          v.name.toUpperCase() ===
                          selectedNode.bindings.command!.variable.toUpperCase(),
                      )
                      ?.type.toUpperCase() === "INT" ? (
                      <input
                        aria-label="Valore comando virtuale"
                        type="number"
                        min={-32768}
                        max={32767}
                        value={Number(commands[selected] ?? 0)}
                        onChange={(e) =>
                          setCommands({
                            ...commands,
                            [selected]: Number(e.target.value),
                          })
                        }
                      />
                    ) : (
                      <select
                        aria-label="Valore comando virtuale"
                        value={String(commands[selected] ?? false)}
                        onChange={(e) =>
                          setCommands({
                            ...commands,
                            [selected]: e.target.value === "true",
                          })
                        }
                      >
                        <option value="false">FALSE</option>
                        <option value="true">TRUE</option>
                      </select>
                    )}
                    <small>
                      Applicato solo con Esegui scansione; confermare
                      l’associazione.
                    </small>
                  </label>
                )}
                {selectedNode.bindings.command && (
                  <button
                    className="secondary"
                    onClick={() => {
                      const variable = inspection?.variables.find(
                        (v) =>
                          v.name.toUpperCase() ===
                          selectedNode.bindings.command!.variable.toUpperCase(),
                      );
                      setCommands({
                        ...commands,
                        [selected]:
                          variable?.type.toUpperCase() === "INT"
                            ? Number(commands[selected] ?? 0)
                            : Boolean(commands[selected] ?? false),
                      });
                      setMessage(
                        "Comando preparato: esegui una scansione per applicarlo",
                      );
                    }}
                  >
                    Prepara comando virtuale
                  </button>
                )}
                <button
                  className="synoptic-remove"
                  onClick={() => removeNodes([selected])}
                >
                  Rimuovi elemento (annullabile)
                </button>
              </>
            ) : selectedEdge ? (
              <>
                <label>
                  Etichetta relazione
                  <input
                    maxLength={120}
                    value={selectedEdge.label}
                    onChange={(e) => updateEdge({ label: e.target.value })}
                  />
                </label>
                <p className="hint">
                  Riferimento funzionale: non definisce trasferimenti fisici o
                  logica.
                </p>
                <EvidenceControl
                  evidence={selectedEdge.evidence}
                  onChange={(evidence) => updateEdge({ evidence })}
                />
                <button
                  className="synoptic-remove"
                  onClick={() => removeEdges([edgeId])}
                >
                  Rimuovi relazione (annullabile)
                </button>
              </>
            ) : (
              <p className="hint">
                Seleziona un simbolo o una relazione. Usa X/Y per spostare senza
                trascinare. Ogni modifica manuale protegge l’intero elemento
                alla rigenerazione.
              </p>
            )}
          </fieldset>
          <fieldset disabled={working || scanning}>
            <legend>Collega elementi</legend>
            <label>
              Origine
              <select
                aria-label="Origine"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              >
                <option value="">Seleziona</option>
                {layout.nodes.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Destinazione
              <select
                aria-label="Destinazione"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              >
                <option value="">Seleziona</option>
                {layout.nodes.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="secondary"
              disabled={
                !layout.nodes.some((n) => n.id === from) ||
                !layout.nodes.some((n) => n.id === to) ||
                layout.edges.length >= 160
              }
              onClick={() => connect({ source: from, target: to })}
            >
              Aggiungi relazione funzionale
            </button>
          </fieldset>
          <details className="synoptic-diagnostics" open>
            <summary>
              Associazioni da verificare ({inspection?.issues.length ?? 0})
            </summary>
            {inspection?.issues.map((i, index) => (
              <p key={index}>
                {layout.nodes.find((n) => n.id === i.node_id)?.label ??
                  "Progetto"}
                {i.channel ? " / " + channels[i.channel] : ""}: {i.message}
              </p>
            ))}
          </details>
        </aside>
      </div>
    </section>
  );
}
function EvidenceControl({
  evidence: e,
  onChange,
}: {
  evidence: Evidence;
  onChange: (value: Evidence) => void;
}) {
  return (
    <div className={"evidence " + (!e.confirmed ? "unconfirmed" : "")}>
      <span>
        {provenance(e)} · {e.source}
      </span>
      {e.quote && <blockquote>{e.quote}</blockquote>}
      <label>
        <input
          type="checkbox"
          checked={e.confirmed}
          onChange={(event) =>
            onChange({ ...e, confirmed: event.target.checked })
          }
        />{" "}
        {e.confirmed ? "Confermato dall’utente" : "Da confermare"}
      </label>
    </div>
  );
}
async function postWithSignal(
  path: string,
  body: unknown,
  signal: AbortSignal,
) {
  return api(path, { method: "POST", body: JSON.stringify(body), signal });
}
