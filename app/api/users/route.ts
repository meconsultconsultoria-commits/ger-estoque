import { asc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { userClients, users } from "../../../db/schema";
import { hashPassword, isAdmin } from "../../auth";
import { getD1 } from "../../d1";

export async function GET(){if(!await isAdmin())return Response.json({error:"Acesso restrito"},{status:403});return Response.json(await getDb().select({id:users.id,name:users.name,email:users.email,role:users.role,active:users.active,createdAt:users.createdAt}).from(users).orderBy(asc(users.role),asc(users.name)))}
export async function POST(req:Request){if(!await isAdmin())return Response.json({error:"Acesso restrito"},{status:403});const b=await req.json() as {name?:string;email?:string;role?:string;password?:string;clientId?:number};const name=b.name?.trim(),email=b.email?.trim().toLowerCase(),password=String(b.password??""),clientId=Number(b.clientId);const role:"admin"|"operator"=b.role==="admin"?"admin":"operator";if(!name||!email||!/^\S+@\S+\.\S+$/.test(email))return Response.json({error:"Nome e e-mail são obrigatórios."},{status:400});if(password.length<8)return Response.json({error:"A senha deve ter ao menos 8 caracteres."},{status:400});try{const [row]=await getDb().insert(users).values({name,email,passwordHash:await hashPassword(password),role,active:true,createdAt:new Date().toISOString()}).returning();if(role==="operator"&&Number.isInteger(clientId)&&clientId>0)await getDb().insert(userClients).values({userId:row.id,clientId,createdAt:new Date().toISOString()})}catch{return Response.json({error:"Este e-mail já está cadastrado."},{status:409})}return Response.json({ok:true},{status:201})}
export async function PATCH(req:Request){
 const admin=await isAdmin();if(!admin)return Response.json({error:"Acesso restrito"},{status:403});
 const b=await req.json() as {id?:number;active?:boolean;name?:string;email?:string;role?:string;password?:string};const id=Number(b.id);
 if(!Number.isInteger(id)||id<=0)return Response.json({error:"Usuário inválido."},{status:400});
 const [current]=await getDb().select().from(users).where(eq(users.id,id)).limit(1);if(!current)return Response.json({error:"Usuário não encontrado."},{status:404});
 if(id===admin.id&&b.active===false)return Response.json({error:"Você não pode bloquear sua própria conta."},{status:400});
 if(id===admin.id&&b.role&&b.role!=="admin")return Response.json({error:"Você não pode remover seu próprio perfil de administrador."},{status:400});
 const changes:Partial<typeof users.$inferInsert>={};
 if(b.active!==undefined)changes.active=!!b.active;
 if(b.name!==undefined){const name=b.name.trim();if(!name)return Response.json({error:"Informe o nome do usuário."},{status:400});changes.name=name}
 if(b.email!==undefined){const email=b.email.trim().toLowerCase();if(!/^\S+@\S+\.\S+$/.test(email))return Response.json({error:"Informe um e-mail válido."},{status:400});changes.email=email}
 if(b.role!==undefined)changes.role=b.role==="admin"?"admin":"operator";
 const password=String(b.password??"");if(password){if(password.length<8)return Response.json({error:"A nova senha deve ter ao menos 8 caracteres."},{status:400});changes.passwordHash=await hashPassword(password)}
 try{await getDb().update(users).set(changes).where(eq(users.id,id))}catch{return Response.json({error:"Este e-mail já está cadastrado."},{status:409})}
 if(password||b.active===false)await getD1().prepare("DELETE FROM sessions WHERE user_id = ?").bind(id).run();
 return Response.json({ok:true,sessionRevoked:!!password});
}
