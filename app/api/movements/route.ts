import { desc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { audits, movements, scheduledLoads } from "../../../db/schema";
import { getCurrentUser } from "../../auth";

type MovementInput = { date?: unknown; type?: unknown; qty?: unknown; doc?: unknown; vehicle?: unknown; reason?: unknown; scheduledLoadId?: unknown };

export async function GET(){const u=await getCurrentUser();if(!u)return Response.json({error:"Acesso negado"},{status:403});return Response.json(await getDb().select().from(movements).orderBy(desc(movements.id)).limit(500))}
export async function POST(req:Request){
 const u=await getCurrentUser();if(!u)return Response.json({error:"Acesso negado"},{status:403});
 const b=await req.json() as MovementInput;const type=String(b.type) as "Entrada"|"Saída"|"Ajuste";const qty=Math.round(Number(b.qty)*1000);const scheduledLoadId=b.scheduledLoadId?Number(b.scheduledLoadId):null;
 if(!qty||qty<=0)return Response.json({error:"Quantidade inválida."},{status:400});
 if(!["Entrada","Saída","Ajuste"].includes(type))return Response.json({error:"Tipo de movimentação inválido."},{status:400});
 if(scheduledLoadId){
  const [load]=await getDb().select().from(scheduledLoads).where(eq(scheduledLoads.id,scheduledLoadId)).limit(1);
  if(!load)return Response.json({error:"Programação não encontrada."},{status:404});
  if(load.status!=="Recebida")return Response.json({error:"A programação precisa estar como Recebida."},{status:400});
  if(type!=="Entrada")return Response.json({error:"Uma programação recebida só pode gerar uma entrada."},{status:400});
  if(load.qty!==qty||load.doc!==String(b.doc)||load.vehicle!==String(b.vehicle).toUpperCase())return Response.json({error:"Os dados da entrada não correspondem à programação."},{status:400});
 }
 if(type==="Ajuste"&&u.role!=="admin")return Response.json({error:"Ajustes são exclusivos do administrador."},{status:403});
 if(type==="Ajuste"&&!String(b.reason||"").trim())return Response.json({error:"Informe a justificativa do ajuste."},{status:400});
 const all=await getDb().select().from(movements);const stock=all.reduce((s,x)=>s+(x.type==="Saída"?-x.qty:x.qty),0);const next=stock+(type==="Saída"?-qty:qty);
 if(next<0||next>120000)return Response.json({error:next<0?"Saída superior ao estoque.":"Capacidade de 120 t excedida."},{status:400});
 try{
  const [row]=await getDb().insert(movements).values({date:String(b.date),type,qty,doc:String(b.doc),vehicle:String(b.vehicle).toUpperCase(),owner:u.name,ownerEmail:u.email,reason:b.reason?String(b.reason):null,scheduledLoadId,createdAt:new Date().toISOString()}).returning();
  await getDb().insert(audits).values({action:"INCLUSÃO",entity:"MOVIMENTAÇÃO",entityId:row.id,details:JSON.stringify({type,qty:b.qty,doc:b.doc,scheduledLoadId}),userEmail:u.email,createdAt:new Date().toISOString()});return Response.json(row,{status:201});
 }catch(error){
  if(scheduledLoadId&&String(error).includes("UNIQUE"))return Response.json({error:"Esta programação já possui uma entrada registrada."},{status:409});
  throw error;
 }
}
