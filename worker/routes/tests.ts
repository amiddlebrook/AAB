import { Hono } from 'hono';
import type { Env } from '../index';
import { executeFramework } from '../lib/executor';
export const testRoutes = new Hono<{ Bindings: Env }>();
testRoutes.post('/:frameworkId/run',async c=>{
 const id=c.req.param('frameworkId');
 const body=await c.req.json().catch(()=>({})) as any;
 if(typeof body.testInput!=='string'||body.testInput.length>8000)return c.json({error:'testInput must be a string of up to 8000 characters.'},400);
 const f=await c.env.DB.prepare('SELECT * FROM frameworks WHERE id=?').bind(id).first();
 if(!f)return c.json({error:'Framework not found'},404);
 const [n,e]=await c.env.DB.batch([c.env.DB.prepare('SELECT * FROM nodes WHERE framework_id=?').bind(id),
 c.env.DB.prepare('SELECT * FROM edges WHERE framework_id=?').bind(id)]);
 const decode=(v:string)=>v.startsWith(id+'::')?v.slice(id.length+2):v;
 const nodes=n.results.map((v:any)=>({...v,id:decode(v.id)}));
 const edges=e.results.map((v:any)=>({...v,id:decode(v.id),source_id:decode(v.source_id),target_id:decode(v.target_id)}));
 const start=Date.now();
 const result=await executeFramework({id,name:f.name as string,nodes,edges},body.testInput,c.env);
 const ms=Date.now()-start,resultId=crypto.randomUUID();
 const commands:D1PreparedStatement[]=[c.env.DB.prepare(`INSERT INTO test_results
 (id,framework_id,test_input,status,success,latency_ms,total_tokens,total_cost,output,node_timings,node_outputs)
 VALUES(?,?,?,?,?,?,?,?,?,?,?)`).bind(resultId,id,body.testInput,result.status,result.success?1:0,ms,result.totalTokens,0,result.output,
 JSON.stringify(result.nodeTimings),JSON.stringify(result.nodeOutputs))];
 for(const l of result.logs) commands.push(c.env.DB.prepare(`INSERT INTO execution_logs
 (id,result_id,node_id,input,output,model,tokens,latency_ms,error) VALUES(?,?,?,?,?,?,?,?,?)`)
 .bind(crypto.randomUUID(),resultId,l.nodeId,l.input,l.output,l.model??null,l.tokens??0,l.latencyMs,l.error??null));
 await c.env.DB.batch(commands);
 return c.json({id:resultId,frameworkId:id,timestamp:new Date().toISOString(),testInput:body.testInput,latency:ms/1000,...result});
});
testRoutes.get('/:frameworkId/results',async c=>{
 const {results}=await c.env.DB.prepare('SELECT * FROM test_results WHERE framework_id=? ORDER BY created_at DESC LIMIT 50').bind(c.req.param('frameworkId')).all();
 return c.json(results.map((r:any)=>({id:r.id,frameworkId:r.framework_id,timestamp:r.created_at,testInput:r.test_input,
 status:r.status,success:r.success===1,latency:r.latency_ms/1000,totalTokens:r.total_tokens,totalCost:r.total_cost,
 output:r.output,nodeTimings:JSON.parse(r.node_timings||'{}'),nodeOutputs:JSON.parse(r.node_outputs||'{}')})));
});
testRoutes.get('/result/:resultId',async c=>{
 const result=await c.env.DB.prepare('SELECT * FROM test_results WHERE id=?').bind(c.req.param('resultId')).first();
 if(!result)return c.json({error:'Result not found'},404);
 const logs=await c.env.DB.prepare('SELECT * FROM execution_logs WHERE result_id=? ORDER BY created_at').bind(c.req.param('resultId')).all();
 return c.json({...result,logs:logs.results});
});
