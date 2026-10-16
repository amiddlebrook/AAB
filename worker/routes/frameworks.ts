import { Hono } from 'hono';
import type { Env } from '../index';
export const frameworkRoutes = new Hono<{ Bindings: Env }>();
const key = (fw: string, id: string) => fw + '::' + id;
const decode = (fw: string, id: string) => id.startsWith(fw + '::') ? id.slice(fw.length + 2) : id;
function readJson(v: unknown) { try { return typeof v === 'string' ? JSON.parse(v) : (v || {}); } catch { return {}; } }
function graph(f: any, nodes: any[], edges: any[]) {
 return { id:f.id,name:f.name,description:f.description,
  nodes:nodes.map(n=>({id:decode(f.id,n.id),type:n.type,position:{x:n.position_x,y:n.position_y},data:{label:n.label,config:readJson(n.config),customCode:n.custom_code||''}})),
  edges:edges.map(e=>({id:decode(f.id,e.id),source:decode(f.id,e.source_id),target:decode(f.id,e.target_id),type:e.edge_type,label:e.label})),
  metrics:{totalRuns:f.total_runs||0,successRate:f.success_rate||0,avgLatency:(f.avg_latency||0)/1000}};
}
async function byId(db:D1Database,id:string) {
 const f=await db.prepare(`SELECT f.*,
 (SELECT COUNT(*) FROM test_results WHERE framework_id=f.id) total_runs,
 (SELECT AVG(CAST(success AS REAL)) FROM test_results WHERE framework_id=f.id) success_rate,
 (SELECT AVG(latency_ms) FROM test_results WHERE framework_id=f.id) avg_latency
 FROM frameworks f WHERE f.id=?`).bind(id).first();
 if(!f)return null;
 const [nodes,edges]=await db.batch([db.prepare('SELECT * FROM nodes WHERE framework_id=?').bind(id),
 db.prepare('SELECT * FROM edges WHERE framework_id=?').bind(id)]);
 return graph(f,nodes.results,edges.results);
}
function valid(body:any) {
 if(!body||typeof body.name!=='string'||!body.name.trim()||body.name.length>120) return 'Name must be 1-120 characters.';
 if(!Array.isArray(body.nodes)||!Array.isArray(body.edges)||body.nodes.length>32||body.edges.length>80) return 'At most 32 nodes and 80 edges.';
 const ids=new Set<string>();
 for(const n of body.nodes){if(typeof n.id!=='string'||!n.id||n.id.length>100||ids.has(n.id)) return 'Node IDs must be unique strings under 100 characters.';ids.add(n.id);}
 const eids=new Set<string>();
 for(const e of body.edges){if(typeof e.id!=='string'||!e.id||eids.has(e.id)||!ids.has(e.source)||!ids.has(e.target))return 'Invalid or duplicate edge IDs.';eids.add(e.id);}
 return null;
}
function inserts(db:D1Database,fw:string,body:any):D1PreparedStatement[]{
 const out:D1PreparedStatement[]=[];
 for(const n of body.nodes)out.push(db.prepare(`INSERT INTO nodes
 (id,framework_id,type,position_x,position_y,label,config,custom_code) VALUES(?,?,?,?,?,?,?,?)`)
 .bind(key(fw,n.id),fw,String(n.type||'processor'),Number(n.position?.x)||0,Number(n.position?.y)||0,
 String(n.data?.label||n.type||'Node').slice(0,120),JSON.stringify(n.data?.config||{}),n.data?.customCode||null));
 for(const e of body.edges)out.push(db.prepare(`INSERT INTO edges
 (id,framework_id,source_id,target_id,edge_type,label) VALUES(?,?,?,?,?,?)`)
 .bind(key(fw,e.id),fw,key(fw,e.source),key(fw,e.target),String(e.type||'smoothstep'),e.label||null));
 return out;
}
frameworkRoutes.get('/',async c=>{
 const {results}=await c.env.DB.prepare('SELECT id FROM frameworks ORDER BY updated_at DESC LIMIT 100').all();
 return c.json((await Promise.all(results.map((f:any)=>byId(c.env.DB,f.id)))).filter(Boolean));
});
frameworkRoutes.get('/:id',async c=>{const v=await byId(c.env.DB,c.req.param('id'));return v?c.json(v):c.json({error:'Framework not found'},404);});
frameworkRoutes.post('/',async c=>{
 const body=await c.req.json().catch(()=>null);const error=valid(body);if(error)return c.json({error},400);
 const id=crypto.randomUUID();
 await c.env.DB.batch([c.env.DB.prepare('INSERT INTO frameworks(id,name,description) VALUES(?,?,?)')
 .bind(id,body.name.trim(),String(body.description||'').slice(0,2000)),...inserts(c.env.DB,id,body)]);
 return c.json(await byId(c.env.DB,id),201);
});
frameworkRoutes.put('/:id',async c=>{
 const id=c.req.param('id'),body=await c.req.json().catch(()=>null);
 const error=valid(body);if(error)return c.json({error},400);
 if(!await c.env.DB.prepare('SELECT id FROM frameworks WHERE id=?').bind(id).first())return c.json({error:'Not found'},404);
 await c.env.DB.batch([
 c.env.DB.prepare("UPDATE frameworks SET name=?,description=?,updated_at=datetime('now') WHERE id=?").bind(body.name.trim(),String(body.description||'').slice(0,2000),id),
 c.env.DB.prepare('DELETE FROM edges WHERE framework_id=?').bind(id),
 c.env.DB.prepare('DELETE FROM nodes WHERE framework_id=?').bind(id),
 ...inserts(c.env.DB,id,body)]);
 return c.json(await byId(c.env.DB,id));
});
frameworkRoutes.delete('/:id',async c=>{
 const id=c.req.param('id');
 const rows=await c.env.DB.prepare('SELECT id FROM test_results WHERE framework_id=?').bind(id).all();
 const commands:D1PreparedStatement[]=rows.results.map((r:any)=>c.env.DB.prepare('DELETE FROM execution_logs WHERE result_id=?').bind(r.id));
 commands.push(c.env.DB.prepare('DELETE FROM test_results WHERE framework_id=?').bind(id),
 c.env.DB.prepare('DELETE FROM edges WHERE framework_id=?').bind(id),
 c.env.DB.prepare('DELETE FROM nodes WHERE framework_id=?').bind(id),
 c.env.DB.prepare('DELETE FROM frameworks WHERE id=?').bind(id));
 await c.env.DB.batch(commands);return c.body(null,204);
});
