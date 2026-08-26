import { desc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { audits, movements, scheduledLoads } from "../../../db/schema";
import { getCurrentUser } from "../../auth";

type MovementInput = { date?: unknown; type?: unknown; qty?: unknown; doc?: unknown; vehicle?: unknown; reason?: unknown; scheduledLoadId?: unknown };
const movementEffect=(item:{type:string;qty:number;adjustmentDelta?:number|null})=>item.type==="Saída"?-item.qty:item.type==="Ajuste"&&item.adjustmentDelta!==null&&item.adjustmentDelta!==undefined?item.adjustmentDelta:item.qty;

export async function GET(){const u=await getCurrentUser();if(!u)return Response.json({error:"Acesso negado"},{status:403});return Response.json(await getDb().select().from(movements).orderBy(desc(movements.id)).limit(500))}
export async function POST(req:Request){
 const u=await getCurrentUser();if(!u)return Response.json({error:"Acesso negado"},{status:403});
 const b=await req.json() as MovementInput;const type=String(b.type) as "Entrada"|"Saída"|"Ajuste";const qty=Math.round(Number(b.qty)*1000);const scheduledLoadId=b.scheduledLoadId?Number(b.scheduledLoadId):null;
 if(!Number.isFinite(qty)||qty<0||(type!=="Ajuste"&&qty===0))return Response.json({error:"Quantidade inválida."},{status:400});
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
 const all=await getDb().select().from(movements);const stock=all.reduce((s,x)=>s+movementEffect(x),0),adjustmentDelta=type==="Ajuste"?qty-stock:null;const next=type==="Ajuste"?qty:stock+(type==="Saída"?-qty:qty);
 if(next<0||next>120000)return Response.json({error:next<0?"Saída superior ao estoque.":"Capacidade de 120 t excedida."},{status:400});
 try{
  const [row]=await getDb().insert(movements).values({date:String(b.date),type,qty,doc:String(b.doc),vehicle:String(b.vehicle).toUpperCase(),owner:u.name,ownerEmail:u.email,reason:b.reason?String(b.reason):null,adjustmentDelta,scheduledLoadId,createdAt:new Date().toISOString()}).returning();
  await getDb().insert(audits).values({action:"INCLUSÃO",entity:"MOVIMENTAÇÃO",entityId:row.id,details:JSON.stringify({type,qty:b.qty,adjustmentDelta:adjustmentDelta===null?null:adjustmentDelta/1000,doc:b.doc,scheduledLoadId}),userEmail:u.email,createdAt:new Date().toISOString()});return Response.json(row,{status:201});
 }catch(error){
  if(scheduledLoadId&&String(error).includes("UNIQUE"))return Response.json({error:"Esta programação já possui uma entrada registrada."},{status:409});
  throw error;
 }
}

export async function DELETE(req:Request){
 const u=await getCurrentUser();if(!u)return Response.json({error:"Acesso negado"},{status:403});
 if(u.role!=="admin")return Response.json({error:"A exclusão é exclusiva do administrador."},{status:403});
 const {id}=await req.json() as {id?:unknown};const movementId=Number(id);
 if(!Number.isInteger(movementId)||movementId<=0)return Response.json({error:"Lançamento inválido."},{status:400});
 const [row]=await getDb().select().from(movements).where(eq(movements.id,movementId)).limit(1);
 if(!row)return Response.json({error:"Lançamento não encontrado."},{status:404});
 const all=await getDb().select().from(movements),stock=all.reduce((sum,item)=>sum+movementEffect(item),0),resultingStock=stock-movementEffect(row);
 if(resultingStock<0||resultingStock>120000)return Response.json({error:resultingStock<0?"A exclusão deixaria o estoque negativo.":"A exclusão faria o estoque exceder 120 t."},{status:409});
 await getDb().delete(movements).where(eq(movements.id,movementId));
 await getDb().insert(audits).values({action:"EXCLUSÃO",entity:"MOVIMENTAÇÃO",entityId:row.id,details:JSON.stringify({date:row.date,type:row.type,qty:row.qty/1000,adjustmentDelta:row.adjustmentDelta===null?null:row.adjustmentDelta/1000,doc:row.doc,vehicle:row.vehicle,owner:row.owner,scheduledLoadId:row.scheduledLoadId}),userEmail:u.email,createdAt:new Date().toISOString()});
 return Response.json({ok:true});
}
