import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

type FollowUpTask = {
  id: number;
  order_id: number;
  member_id: number | null;
  task_type:
    | "service_follow_up"
    | "review_request"
    | "maintenance_reminder";
  channel: string;
  recipient: string | null;
  attempts: number;
};

type Member = {
  id: number;
  name: string | null;
  email: string | null;
};

const BRAND_NAME = "GTB1N Auto Detailing & Window Film";
const EMAIL_FROM =
  "GTB1N Auto Detailing & Window Film <onboarding@resend.dev>";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function createEmailContent(
  taskType: FollowUpTask["task_type"],
  customerName: string,
  orderId: number,
) {
  const safeName = escapeHtml(customerName);
  const safeBrand = escapeHtml(BRAND_NAME);

  if (taskType === "review_request") {
    return {
      subject: `${BRAND_NAME}｜感谢您的支持`,
      message: `您好 ${customerName}，感谢您选择我们的服务。我们很重视您的体验，欢迎您分享本次服务评价。`,
      html: `
        <h2 style="margin:0 0 16px;color:#facc15;">
          ${safeBrand}
        </h2>

        <p>您好 <strong>${safeName}</strong>，</p>

        <p>
          感谢您选择我们的汽车美容与隔热膜服务。
        </p>

        <p>
          我们非常重视您的服务体验，
          欢迎您分享对本次服务的意见和评价。
        </p>

        <p style="color:#64748b;">
          订单编号：#${orderId}
        </p>

        <p>
          您的支持将帮助我们持续提升服务品质。
        </p>
      `,
    };
  }

  if (taskType === "maintenance_reminder") {
    return {
      subject: `${BRAND_NAME}｜车辆护理提醒`,
      message: `您好 ${customerName}，距离上次服务已有一段时间，建议您检查车辆清洁、漆面和隔热膜状况。`,
      html: `
        <h2 style="margin:0 0 16px;color:#facc15;">
          ${safeBrand}
        </h2>

        <p>您好 <strong>${safeName}</strong>，</p>

        <p>
          距离您上次到店服务已经有一段时间。
        </p>

        <p>
          建议检查车辆外观清洁、漆面保护、
          内饰状况以及 Window Film 隔热膜状态。
        </p>

        <p style="color:#64748b;">
          上次订单编号：#${orderId}
        </p>

        <p>
          需要车辆护理时，欢迎再次预约我们。
        </p>
      `,
    };
  }

  return {
    subject: `${BRAND_NAME}｜服务满意度跟进`,
    message: `您好 ${customerName}，感谢您选择我们的服务。想确认您的车辆服务完成后是否一切满意。`,
    html: `
      <h2 style="margin:0 0 16px;color:#facc15;">
        ${safeBrand}
      </h2>

      <p>您好 <strong>${safeName}</strong>，</p>

      <p>
        感谢您选择我们的汽车美容与 Window Film 服务。
      </p>

      <p>
        想确认车辆服务完成后是否一切满意。
        如有任何问题，请及时联系我们，我们会尽快为您处理。
      </p>

      <p style="color:#64748b;">
        订单编号：#${orderId}
      </p>

      <p>
        感谢您的信任与支持。
      </p>
    `,
  };
}

function createEmailLayout(content: string) {
  return `
    <!doctype html>
    <html lang="zh">
      <head>
        <meta charset="UTF-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0"
        />
      </head>

      <body
        style="
          margin:0;
          padding:24px;
          background:#0f172a;
          font-family:Arial,Helvetica,sans-serif;
          color:#e2e8f0;
        "
      >
        <div
          style="
            max-width:620px;
            margin:0 auto;
            background:#111827;
            border:1px solid #334155;
            border-radius:18px;
            overflow:hidden;
          "
        >
          <div
            style="
              padding:28px;
              background:linear-gradient(135deg,#111827,#1e293b);
            "
          >
            ${content}
          </div>

          <div
            style="
              padding:18px 28px;
              background:#020617;
              color:#94a3b8;
              font-size:12px;
              line-height:1.6;
            "
          >
            此邮件由 ${escapeHtml(BRAND_NAME)} POS
            AI 售后系统自动发送。
          </div>
        </div>
      </body>
    </html>
  `;
}

export default {
 fetch: withSupabase(
  { auth: ["user", "secret:automations"] },
  async (_req, ctx) => {
          // 网页手动调用时，检查当前登录员工的权限。
      // Cron 使用 automations Secret 调用时，不需要员工检查。
      if (ctx.authMode === "user") {
        const authUserId = ctx.userClaims?.id;

        if (!authUserId) {
          return Response.json(
            {
              success: false,
              error: "无法识别当前登录账号",
            },
            { status: 401 },
          );
        }

        const { data: employee, error: employeeError } =
          await ctx.supabaseAdmin
            .from("employees")
            .select(
              "id, full_name, status, role, permissions",
            )
            .eq("auth_user_id", authUserId)
            .maybeSingle();

        if (employeeError) {
          console.error(
            "读取员工权限失败：",
            employeeError,
          );

          return Response.json(
            {
              success: false,
              error: "读取员工权限失败",
            },
            { status: 500 },
          );
        }

        if (!employee) {
          return Response.json(
            {
              success: false,
              error: "当前账号没有关联员工资料",
            },
            { status: 403 },
          );
        }

        const employeeStatus = String(
          employee.status ?? "",
        ).toLowerCase();

        const blockedStatuses = [
          "inactive",
          "disabled",
          "suspended",
          "terminated",
        ];

        if (blockedStatuses.includes(employeeStatus)) {
          return Response.json(
            {
              success: false,
              error: "当前员工账号已停用",
            },
            { status: 403 },
          );
        }

        const employeeRole = String(
          employee.role ?? "",
        ).toLowerCase();

        const permissions = Array.isArray(
          employee.permissions,
        )
          ? employee.permissions.map((permission) =>
              String(permission),
            )
          : [];

        const hasAllowedRole = [
          "owner",
          "admin",
          "manager",
        ].includes(employeeRole);

        const hasAllowedPermission =
          permissions.includes("follow_up_send") ||
          permissions.includes("follow_up_retry");

        if (
          !hasAllowedRole &&
          !hasAllowedPermission
        ) {
          return Response.json(
            {
              success: false,
              error: "你没有处理售后任务的权限",
            },
            { status: 403 },
          );
        }
      }
            // 读取网页传来的操作指令。
      let requestBody: {
        source?: string;
        action?: "process_due" | "retry";
        task_id?: number;
      } = {};

      try {
        const body = await _req.json();

        if (
          body &&
          typeof body === "object"
        ) {
          requestBody = body;
        }
      } catch {
        // Cron 可能发送空 JSON，无法解析时继续正常处理。
        requestBody = {};
      }

      // 只有登录员工可以手动重试失败任务。
      if (requestBody.action === "retry") {
        if (ctx.authMode !== "user") {
          return Response.json(
            {
              success: false,
              error: "重试操作必须由登录员工执行",
            },
            { status: 403 },
          );
        }

        const taskId = Number(requestBody.task_id);

        if (
          !Number.isInteger(taskId) ||
          taskId <= 0
        ) {
          return Response.json(
            {
              success: false,
              error: "无效的售后任务编号",
            },
            { status: 400 },
          );
        }

        const {
          data: failedTask,
          error: failedTaskError,
        } = await ctx.supabaseAdmin
          .from("follow_up_tasks")
          .select(
            "id, status, recipient, task_type",
          )
          .eq("id", taskId)
          .maybeSingle();

        if (failedTaskError) {
          console.error(
            "读取失败任务出错：",
            failedTaskError,
          );

          return Response.json(
            {
              success: false,
              error: "读取失败任务时发生错误",
            },
            { status: 500 },
          );
        }

        if (!failedTask) {
          return Response.json(
            {
              success: false,
              error: "找不到该售后任务",
            },
            { status: 404 },
          );
        }

        if (failedTask.status !== "failed") {
          return Response.json(
            {
              success: false,
              error: "只有发送失败的任务可以重试",
            },
            { status: 409 },
          );
        }

        if (!failedTask.recipient) {
          return Response.json(
            {
              success: false,
              error: "该任务没有收件邮箱，无法重试",
            },
            { status: 400 },
          );
        }

        const retryTime = new Date().toISOString();

        const { error: resetError } =
          await ctx.supabaseAdmin
            .from("follow_up_tasks")
            .update({
              status: "pending",
              scheduled_at: retryTime,
              last_error: null,
              updated_at: retryTime,
            })
            .eq("id", taskId)
            .eq("status", "failed");

        if (resetError) {
          console.error(
            "重置失败任务出错：",
            resetError,
          );

          return Response.json(
            {
              success: false,
              error: "无法重置失败任务",
            },
            { status: 500 },
          );
        }
      }
      const resendApiKey = Deno.env.get("RESEND_API_KEY");

      if (!resendApiKey) {
        return Response.json(
          {
            success: false,
            error: "RESEND_API_KEY is not configured",
          },
          { status: 500 },
        );
      }

      const now = new Date().toISOString();

      const { data: tasks, error: tasksError } =
        await ctx.supabaseAdmin
          .from("follow_up_tasks")
          .select(`
            id,
            order_id,
            member_id,
            task_type,
            channel,
            recipient,
            attempts
          `)
          .eq("status", "pending")
          .eq("channel", "email")
          .lte("scheduled_at", now)
          .order("scheduled_at", { ascending: true })
          .limit(20);

      if (tasksError) {
        return Response.json(
          {
            success: false,
            error: tasksError.message,
          },
          { status: 500 },
        );
      }

      const results: Array<Record<string, unknown>> = [];

      for (const rawTask of tasks ?? []) {
        const task = rawTask as FollowUpTask;

        const { data: lockedTask, error: lockError } =
          await ctx.supabaseAdmin
            .from("follow_up_tasks")
            .update({
              status: "processing",
              attempts: task.attempts + 1,
              last_error: null,
            })
            .eq("id", task.id)
            .eq("status", "pending")
            .select("id")
            .maybeSingle();

        if (lockError || !lockedTask) {
          results.push({
            task_id: task.id,
            success: false,
            skipped: true,
            error: lockError?.message ?? "Task already processing",
          });

          continue;
        }

        try {
          let member: Member | null = null;

          if (task.member_id !== null) {
            const { data: memberData, error: memberError } =
              await ctx.supabaseAdmin
                .from("members")
                .select("id, name, email")
                .eq("id", task.member_id)
                .maybeSingle();

            if (memberError) {
              throw new Error(memberError.message);
            }

            member = memberData as Member | null;
          }

          const recipient =
            task.recipient?.trim() ||
            member?.email?.trim() ||
            "";

          if (!recipient) {
            throw new Error("Customer email is empty");
          }

          const customerName =
            member?.name?.trim() || "尊敬的客户";

          const emailContent = createEmailContent(
            task.task_type,
            customerName,
            task.order_id,
          );

          const resendResponse = await fetch(
            "https://api.resend.com/emails",
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${resendApiKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                from: EMAIL_FROM,
                to: [recipient],
                subject: emailContent.subject,
                html: createEmailLayout(emailContent.html),
              }),
            },
          );

          const resendResult = await resendResponse.json();

          if (!resendResponse.ok) {
            const resendError =
              resendResult?.message ||
              resendResult?.error ||
              "Resend email delivery failed";

            throw new Error(String(resendError));
          }

          const { error: sentUpdateError } =
            await ctx.supabaseAdmin
              .from("follow_up_tasks")
              .update({
                status: "sent",
                recipient,
                subject: emailContent.subject,
                message: emailContent.message,
                sent_at: new Date().toISOString(),
                last_error: null,
              })
              .eq("id", task.id);

          if (sentUpdateError) {
            throw new Error(sentUpdateError.message);
          }

          results.push({
            task_id: task.id,
            success: true,
            recipient,
            resend_id: resendResult?.id ?? null,
          });
        } catch (error) {
          const errorMessage =
            error instanceof Error
              ? error.message
              : "Unknown processing error";

          await ctx.supabaseAdmin
            .from("follow_up_tasks")
            .update({
              status: "failed",
              last_error: errorMessage,
            })
            .eq("id", task.id);

          results.push({
            task_id: task.id,
            success: false,
            error: errorMessage,
          });
        }
      }

      const sentCount = results.filter(
        (item) => item.success === true,
      ).length;

      const failedCount = results.filter(
        (item) =>
          item.success === false &&
          item.skipped !== true,
      ).length;

      return Response.json({
        success: true,
        processed: results.length,
        sent: sentCount,
        failed: failedCount,
        results,
      });
    },
  ),
};