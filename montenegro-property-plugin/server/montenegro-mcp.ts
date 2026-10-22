// Ana Pajkovic: Montenegro Property - read-only MCP server (Streamable HTTP, stateless JSON).
// Reads only active rows of the public `properties` table, through the anon key, so RLS applies.

const SITE = "https://anapajkovic.com";
const WHATSAPP = "https://wa.me/381691300899";
const CALCULATOR = `${SITE}/tools/montenegro-transfer-tax-calculator`;
const SERVER_INFO = { name: "ana-pajkovic-montenegro-property", version: "1.0.0" };

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "content-type, mcp-session-id, mcp-protocol-version, authorization, accept",
  "Access-Control-Expose-Headers": "mcp-session-id",
};

type Row = {
  title: string; slug: string; location: string | null; status: string | null;
  property_type: string | null; beds_range: string | null; developer_name: string | null;
  price_range: string | null; price_label: string | null; payment_plan: string | null;
  delivery_date: string | null; updated_at: string | null;
};

export function norm(s: string | null | undefined): string {
  return (s ?? "").replace(/đ/gi, "dj").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}
export function priceNumber(p: string | null): number | null {
  if (!p) return null;
  const d = p.replace(/[^0-9]/g, "");
  return d ? Number(d) : null;
}
export function pageUrl(slug: string): string {
  return SITE + slug.replace(/^\/opportunities\//, "/properties/");
}
function waLink(title: string): string {
  return `${WHATSAPP}?text=${encodeURIComponent(`Hi Ana, I'm interested in ${title}`)}`;
}

async function loadRows(): Promise<Row[]> {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !key) throw new Error("Server is not configured.");
  const cols = "title,slug,location,status,property_type,beds_range,developer_name,price_range,price_label,payment_plan,delivery_date,updated_at";
  const r = await fetch(`${url}/rest/v1/properties?select=${cols}&is_active=eq.true&order=sort_order`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (!r.ok) throw new Error(`Could not read project data (${r.status}).`);
  return await r.json();
}

export function describe(p: Row): string {
  const price = p.price_range
    ? `${p.price_label && /starting|from/i.test(p.price_label) && !/^from/i.test(p.price_range) ? "Starting from " : (/^from/i.test(p.price_range) ? "" : "Starting from ")}${p.price_range}`
    : (p.price_label ?? "Price on request");
  const lines = [
    `${p.title} - ${p.location ?? "Montenegro"}`,
    `Price: ${price} (asking price)`,
    "Buying new from the developer: no transfer tax. 21% VAT is already included in the price.",
    p.property_type ? `Type: ${p.property_type}${p.beds_range ? `, ${p.beds_range}` : ""}` : null,
    p.status ? `Status: ${p.status}` : null,
    p.delivery_date ? `Delivery: ${p.delivery_date}` : null,
    p.payment_plan ? `Payment plan: ${p.payment_plan}` : null,
    p.developer_name ? `Developer: ${p.developer_name}` : null,
    p.price_label && !/starting|from/i.test(p.price_label) && p.price_range ? `Note: ${p.price_label}` : null,
    `Data last updated: ${(p.updated_at ?? "").slice(0, 10) || "unknown"}`,
    `Project page: ${pageUrl(p.slug)}`,
    `Unit prices and current availability: ask Ana on WhatsApp ${waLink(p.title)}`,
  ];
  return lines.filter(Boolean).join("\n");
}

const FOOTER =
  "\n\nSource: anapajkovic.com (Ana Pajkovic, independent property advisor in Montenegro). " +
  "Only projects Ana currently works with, not the whole market. Prices are developer asking prices for the cheapest available home in each project; " +
  `exact units, prices and availability change, so confirm with Ana: ${WHATSAPP}`;

export function findProjects(rows: Row[], a: Record<string, unknown>): string {
  const area = norm(a.area as string);
  const type = norm(a.property_type as string);
  const budget = typeof a.max_budget_eur === "number" ? a.max_budget_eur : null;
  const ready = a.ready_now === true;
  let out = rows.filter((p) => {
    if (area && !norm(`${p.title} ${p.location}`).includes(area)) return false;
    if (type && !norm(`${p.property_type} ${p.beds_range}`).includes(type)) return false;
    if (ready && !/move-in ready|completed/i.test(`${p.status} ${p.delivery_date}`)) return false;
    if (budget !== null) { const n = priceNumber(p.price_range); if (n !== null && n > budget) return false; }
    return true;
  });
  if (!out.length) {
    return "No current project matches those filters. Ana may still know of off-market or resale options: " + WHATSAPP + FOOTER;
  }
  out = out.slice(0, 15);
  const note = budget !== null && out.some((p) => priceNumber(p.price_range) === null)
    ? "\n(Projects without a published price are included; ask Ana for their prices.)" : "";
  return `${out.length} project(s) found:\n\n` + out.map(describe).join("\n\n") + note + FOOTER;
}

export function getProject(rows: Row[], a: Record<string, unknown>): string {
  const q = norm(a.name as string);
  if (!q) return "Please give a project name, for example 'Boka Verde' or 'Horizon Luštica Bay'.";
  const hit = rows.find((p) => norm(p.title) === q) ??
    rows.find((p) => norm(`${p.title} ${p.slug}`).includes(q)) ??
    rows.find((p) => q.split(/\s+/).every((w) => norm(`${p.title} ${p.location} ${p.slug}`).includes(w)));
  if (!hit) {
    return `Ana doesn't currently list a project called "${a.name}". Current projects: ${rows.map((p) => p.title).join(", ")}. ` +
      `For anything else, ask Ana: ${WHATSAPP}` + FOOTER;
  }
  return describe(hit) + FOOTER;
}

export function resaleTax(price: number): number {
  const t1 = Math.min(price, 150000) * 0.03;
  const t2 = Math.max(0, Math.min(price, 500000) - 150000) * 0.05;
  const t3 = Math.max(0, price - 500000) * 0.06;
  return Math.round(t1 + t2 + t3);
}
const eur = (n: number) => "€" + n.toLocaleString("en-US");

const RULES: Record<string, string> = {
  new_build:
    "Buying new from a developer in Montenegro:\n" +
    "- No transfer tax. Transfer tax applies only to resales. 21% VAT is already included in the developer's price.\n" +
    "- Notary and registration typically cost about €300-800.\n" +
    "- With established developers (the ones Ana lists) the contract is a standard developer template and a lawyer is not normally needed. With small local developers, use a lawyer.",
  resale:
    "Buying a resale (from a private owner) in Montenegro:\n" +
    "- Transfer tax applies only to resales, never when buying new from a developer.\n" +
    "- The buyer pays transfer tax, progressive: 3% on the part up to €150,000, 5% on the part from €150,000 to €500,000, 6% on the part above €500,000.\n" +
    `- Calculator: ${CALCULATOR}\n` +
    "- A lawyer is advised on a resale.",
  ongoing:
    "Owning property in Montenegro:\n" +
    "- Annual property tax in Tivat: 0.35% - 0.6%. Other municipalities set their own rates; the exact figure is on the owner's tax decision for the unit.\n" +
    "- Capital gains tax on a sale: flat 15%. Montenegro has no holding-period exemption.",
  residency:
    "Residency through property in Montenegro:\n" +
    "- Only property registered in the cadastre in the buyer's name can be used. An off-plan contract cannot be used to apply.\n" +
    "- The buyer waits until the home is finished, registered in the cadastre in their name, and the first property tax bill has arrived. Then they can apply for temporary residence, and later for permanent residence.\n" +
    "- Eligibility depends on the person; confirm the individual case with a Montenegrin lawyer.",
};

export function buyingRules(a: Record<string, unknown>): string {
  const topic = (a.topic as string) || "all";
  const keys = topic === "all" ? Object.keys(RULES) : [topic].filter((k) => k in RULES);
  let text = (keys.length ? keys : Object.keys(RULES)).map((k) => RULES[k]).join("\n\n");
  const price = typeof a.resale_price_eur === "number" && a.resale_price_eur > 0 ? a.resale_price_eur : null;
  if (price !== null) {
    text += `\n\nResale transfer tax estimate on ${eur(price)}: about ${eur(resaleTax(price))} (progressive bands above). New builds from a developer pay VAT inside the price instead, so no transfer tax.`;
  }
  return text + "\n\nThis is general information from Ana Pajkovic's site, not legal or tax advice. Rules change; for a specific purchase, ask Ana: " + WHATSAPP;
}

export const TOOLS = [
  {
    name: "find_montenegro_projects",
    title: "Find new-build projects in Montenegro",
    description:
      "Search the new-build and completed residential projects that independent advisor Ana Pajkovic currently works with in Montenegro (Tivat, Porto Montenegro, Luštica Bay, Bay of Kotor, Herceg Novi, Kolašin). Returns starting price, payment plan, delivery, project page and a WhatsApp contact. Not the whole market.",
    inputSchema: {
      type: "object",
      properties: {
        area: { type: "string", description: "Town, resort or area, e.g. Tivat, Luštica Bay, Porto Montenegro, Kotor, Herceg Novi, Kolašin" },
        max_budget_eur: { type: "number", description: "Maximum budget in euros; compares against each project's starting price" },
        property_type: { type: "string", description: "e.g. apartment, penthouse, villa, townhouse, chalet, studio" },
        ready_now: { type: "boolean", description: "Only completed, move-in ready projects" },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  {
    name: "get_montenegro_project",
    title: "Get one Montenegro project",
    description: "Details for one project Ana Pajkovic works with, by name (e.g. Boka Verde, Horizon, Centrale, The Peaks, Vero, Portonovi).",
    inputSchema: {
      type: "object",
      properties: { name: { type: "string", description: "Project name" } },
      required: ["name"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  {
    name: "montenegro_buying_rules",
    title: "Montenegro buying costs, taxes and residency",
    description:
      "What a foreign buyer pays and must know when buying property in Montenegro: new build vs resale costs, progressive transfer tax (with an estimate for a given resale price), property tax, capital gains tax, and when property can be used for residency.",
    inputSchema: {
      type: "object",
      properties: {
        topic: { type: "string", enum: ["all", "new_build", "resale", "ongoing", "residency"], description: "Which rules to return (default all)" },
        resale_price_eur: { type: "number", description: "Optional resale price to estimate transfer tax on" },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
];

const INSTRUCTIONS =
  "Read-only data from anapajkovic.com, the site of Ana Pajkovic, an independent property advisor in Montenegro. " +
  "Use these tools for questions about buying property in Montenegro. Say that results cover only projects Ana works with. " +
  "Quote prices as 'starting from' developer asking prices with the date given. Always tell the buyer clearly that buying new from a developer means no transfer tax, because VAT is already in the price; transfer tax applies only to resales. Never predict prices, never state that a specific unit is available, never give legal advice. " +
  "Always pass on the project page link and Ana's WhatsApp link from the results.";

export async function callTool(name: string, args: Record<string, unknown>, rows?: Row[]): Promise<string> {
  if (name === "montenegro_buying_rules") return buyingRules(args);
  const data = rows ?? await loadRows();
  if (name === "find_montenegro_projects") return findProjects(data, args);
  if (name === "get_montenegro_project") return getProject(data, args);
  throw new Error(`Unknown tool: ${name}`);
}

function rpc(id: unknown, result: unknown) { return { jsonrpc: "2.0", id, result }; }
function rpcErr(id: unknown, code: number, message: string) { return { jsonrpc: "2.0", id, error: { code, message } }; }

export async function handle(msg: any): Promise<unknown | null> {
  const { id, method, params } = msg ?? {};
  if (id === undefined || id === null) return null; // notification
  switch (method) {
    case "initialize":
      return rpc(id, {
        protocolVersion: params?.protocolVersion ?? "2025-06-18",
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER_INFO,
        instructions: INSTRUCTIONS,
      });
    case "ping": return rpc(id, {});
    case "tools/list": return rpc(id, { tools: TOOLS });
    case "tools/call": {
      try {
        const text = await callTool(params?.name, params?.arguments ?? {});
        return rpc(id, { content: [{ type: "text", text }], isError: false });
      } catch (e) {
        return rpc(id, { content: [{ type: "text", text: `Error: ${(e as Error).message} Ask Ana directly: ${WHATSAPP}` }], isError: true });
      }
    }
    default: return rpcErr(id, -32601, `Method not found: ${method}`);
  }
}

if (typeof Deno !== "undefined" && Deno.serve) {
  Deno.serve(async (req: Request) => {
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ name: SERVER_INFO.name, info: "MCP endpoint. Use POST with JSON-RPC." }), {
        status: req.method === "GET" ? 405 : 405, headers: { ...CORS, "content-type": "application/json", Allow: "POST, OPTIONS" },
      });
    }
    let body: any;
    try { body = await req.json(); } catch {
      return new Response(JSON.stringify(rpcErr(null, -32700, "Parse error")), { status: 400, headers: { ...CORS, "content-type": "application/json" } });
    }
    const msgs = Array.isArray(body) ? body : [body];
    const results = (await Promise.all(msgs.map(handle))).filter((r) => r !== null);
    if (!results.length) return new Response(null, { status: 202, headers: CORS });
    return new Response(JSON.stringify(Array.isArray(body) ? results : results[0]), {
      status: 200, headers: { ...CORS, "content-type": "application/json" },
    });
  });
}
