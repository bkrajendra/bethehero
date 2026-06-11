import { db } from "../index";
import { auditLog } from "../schema";

export async function writeAuditLog(params: {
  actorAdminId: string;
  action: string;
  targetTable: string;
  targetId: string;
  metadata?: Record<string, unknown>;
}) {
  await db.insert(auditLog).values(params);
}
