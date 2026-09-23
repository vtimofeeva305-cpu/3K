export const isLeader = (member) => ["rop", "superadmin"].includes(member?.role);

export class AccessError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export async function hashToken(token) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function createAccessRepository(getSql) {
  return {
    async member(userId) {
      const sql = await getSql();
      const [member] = await sql`select user_id as id, display_name as name, role, working
        from three_k.members where user_id = ${userId}`;
      return member || null;
    },
    async team() {
      const sql = await getSql();
      return sql`select user_id as id, display_name as name, role, working
        from three_k.members order by created_at, user_id`;
    },
    async invitations() {
      const sql = await getSql();
      return sql`select id, created_at, expires_at, used_at, revoked_at
        from three_k.invitations order by created_at desc limit 100`;
    },
    async createInvitation(actor) {
      const token = Array.from(crypto.getRandomValues(new Uint8Array(32)),
        (byte) => byte.toString(16).padStart(2, "0")).join("");
      const hash = await hashToken(token);
      const sql = await getSql();
      const [invitation] = await sql`insert into three_k.invitations(token_hash, created_by)
        values (${hash}, ${actor.id}) returning id, expires_at`;
      return { ...invitation, token };
    },
    async accept(user, token) {
      if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token)) {
        throw new AccessError(422, "Некорректная ссылка приглашения");
      }
      const hash = await hashToken(token);
      const sql = await getSql();
      return sql.begin(async (tx) => {
        // Serialize acceptance by identity and by invitation, including concurrent links.
        await tx`select id from auth.users where id = ${user.id} for update`;
        const [identity] = await tx`select provider_id, identity_data->>'name' as name
          from auth.identities where user_id = ${user.id}
          and provider = 'custom:three-k-telegram'`;
        if (!identity) throw new AccessError(403, "Войдите через Telegram");
        const [existing] = await tx`select user_id from three_k.members where user_id = ${user.id}`;
        if (existing) throw new AccessError(409, "Вы уже участник команды");
        const [invite] = await tx`select id from three_k.invitations
          where token_hash = ${hash} and used_at is null and revoked_at is null
          and expires_at > now() for update`;
        if (!invite) throw new AccessError(410, "Приглашение использовано, отозвано или истекло");
        const [member] = await tx`insert into three_k.members(user_id, telegram_subject, display_name, role)
          values (${user.id}, ${identity.provider_id}, ${identity.name || "Сотрудник"}, 'manager')
          returning user_id as id, display_name as name, role, working`;
        await tx`update three_k.invitations set used_at = now(), used_by = ${user.id}
          where id = ${invite.id}`;
        return member;
      });
    },
    async revoke(id) {
      const sql = await getSql();
      const [row] = await sql`update three_k.invitations set revoked_at = now()
        where id = ${id} and used_at is null and revoked_at is null returning id`;
      if (!row) throw new AccessError(409, "Приглашение уже недоступно");
      return row;
    },
    async role(id, role) {
      if (!["manager", "rop"].includes(role)) throw new AccessError(422, "Недопустимая роль");
      const sql = await getSql();
      const [row] = await sql`update three_k.members set role = ${role}
        where user_id = ${id} and role <> 'superadmin'
        returning user_id as id, display_name as name, role, working`;
      if (!row) throw new AccessError(409, "Нельзя изменить эту учётную запись");
      return row;
    },
    async workday(id, working) {
      if (typeof working !== "boolean") throw new AccessError(422, "Некорректный статус дня");
      const sql = await getSql();
      const [row] = await sql`update three_k.members set working = ${working}
        where user_id = ${id} returning user_id as id, display_name as name, role, working`;
      if (!row) throw new AccessError(404, "Сотрудник не найден");
      return row;
    },
    async rules() {
      const sql = await getSql();
      const rows = await sql`select source, member_id from three_k.assignment_rules`;
      return Object.fromEntries(rows.map((row) => [row.source, row.member_id]));
    },
    async setRule(source, memberId) {
      if (!["avito", "landing", "phone"].includes(source)) throw new AccessError(422, "Неизвестный источник");
      const sql = await getSql();
      const [row] = await sql`insert into three_k.assignment_rules(source, member_id)
        select ${source}, user_id from three_k.members where user_id = ${memberId} and working
        on conflict(source) do update set member_id = excluded.member_id returning source, member_id`;
      if (!row) throw new AccessError(422, "Сотрудник должен начать рабочий день");
      return row;
    },
  };
}

export async function accessRoute(access, user, member, method, path, payload) {
  if (method === "GET" && path === "/me") return { member };
  if (method === "POST" && path === "/invitations/accept") return access.accept(user, payload?.token);
  if (!member) throw new AccessError(403, "Доступ только по приглашению руководителя");
  if (path.startsWith("/reports/") && !isLeader(member)) throw new AccessError(403, "Дашборд доступен только РОПу");
  if (method === "GET" && ["/team", "/managers"].includes(path)) return access.team();
  if (method === "GET" && path === "/assignment-rules") return access.rules();
  if (path === "/invitations" || path.startsWith("/invitations/") || (method === "POST" && path === "/assignment-rules")) {
    if (!isLeader(member)) throw new AccessError(403, "Недостаточно прав");
    if (path === "/invitations" && method === "GET") return access.invitations();
    if (path === "/invitations" && method === "POST") return access.createInvitation(member);
    if (path === "/assignment-rules" && method === "POST") return access.setRule(payload?.source, payload?.memberId);
    const revoke = path.match(/^\/invitations\/([0-9a-f-]{36})\/revoke$/i);
    if (revoke && method === "POST") return access.revoke(revoke[1]);
  }
  const target = path.match(/^\/team\/([0-9a-f-]{36})\/(role|workday)$/i);
  if (target && method === "POST") {
    if (target[2] === "role") {
      if (member.role !== "superadmin") throw new AccessError(403, "Роли назначает суперадминистратор");
      return access.role(target[1], payload?.role);
    }
    if (target[1] !== member.id && !isLeader(member)) throw new AccessError(403, "Можно менять только свой рабочий день");
    return access.workday(target[1], payload?.working);
  }
  return undefined;
}
