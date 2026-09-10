import { erpFetch, getErpUrl, getErpHeaders, parseErpError } from "../lib/erpnext-client.js";
import { logger } from "../lib/logger.js";

/**
 * Result returned by the signup flow.
 */
export interface SignupResult {
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * Result returned by the login flow.
 */
export interface LoginResult {
  success: boolean;
  cookie?: string;
  message?: string;
  error?: string;
}

/**
 * AuthService — encapsulates all Frappe authentication operations.
 *
 * Every method returns a plain object so controllers can decide how to
 * serialise the response (HTTP status, headers, JSON shape) without
 * the service layer knowing about Express.
 */
export const authService = {
  // ── Login ──────────────────────────────────────────────────────────────────

  async login(usr: string, pwd: string): Promise<LoginResult> {
    try {
      const erpRes = await erpFetch(getErpUrl("/api/method/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usr, pwd }),
      });

      const data = (await erpRes.json()) as {
        message?: string;
        full_name?: string;
        exception?: unknown;
        _server_messages?: unknown;
      };

      if (!erpRes.ok) {
        logger.warn(
          {
            status: erpRes.status,
            message: data?.message,
            exception:
              typeof data?.exception === "string"
                ? data.exception.split("\n").slice(0, 3).join(" | ")
                : undefined,
            serverMessages: data?._server_messages,
          },
          "[authService.login] ERPNext rejected login attempt",
        );
        return { success: false, error: "Invalid email or password." };
      }

      const setCookie = erpRes.headers.get("set-cookie") ?? undefined;

      return { success: true, message: data.message, cookie: setCookie };
    } catch (err) {
      logger.error({ err }, "[authService.login]");
      return { success: false, error: "Internal server error." };
    }
  },

  // ── Logout ─────────────────────────────────────────────────────────────────

  async logout(cookieHeader?: string): Promise<void> {
    try {
      await erpFetch(getErpUrl("/api/method/logout"), {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Cookie: cookieHeader ?? "",
        },
      });
    } catch (err) {
      logger.warn({ err }, "[authService.logout] session destroy failed (non-fatal)");
    }
  },

  // ── Session / Current User ─────────────────────────────────────────────────

  async getLoggedInEmail(cookieHeader?: string): Promise<string | null> {
    try {
      const erpRes = await erpFetch(
        getErpUrl("/api/method/frappe.auth.get_logged_user"),
        {
          headers: {
            "Content-Type": "application/json",
            Cookie: cookieHeader ?? "",
          },
        },
      );

      const data = (await erpRes.json()) as { message?: string };
      const email = data.message;

      if (!email || email === "Guest") return null;
      return email;
    } catch (err) {
      logger.error({ err }, "[authService.getLoggedInEmail]");
      return null;
    }
  },

  async getUserFullName(email: string): Promise<string | undefined> {
    try {
      const userRes = await erpFetch(
        getErpUrl(
          `/api/resource/User/${encodeURIComponent(email)}?fields=${encodeURIComponent(JSON.stringify(["full_name"]))}`,
        ),
        { headers: getErpHeaders() },
      );
      if (userRes.ok) {
        const userData = (await userRes.json()) as {
          data?: { full_name?: string };
        };
        return userData.data?.full_name;
      }
    } catch {
      // non-fatal
    }
    return undefined;
  },

  // ── User Type Check ────────────────────────────────────────────────────────

  async getUserType(email: string): Promise<"System User" | "Website User" | null> {
    try {
      const userRes = await erpFetch(
        getErpUrl(
          `/api/resource/User/${encodeURIComponent(email)}?fields=${encodeURIComponent(JSON.stringify(["user_type"]))}`,
        ),
        { headers: getErpHeaders() },
      );
      if (userRes.ok) {
        const userData = (await userRes.json()) as {
          data?: { user_type?: string };
        };
        const userType = userData.data?.user_type;
        if (userType === "System User" || userType === "Website User") {
          return userType;
        }
      }
      return null;
    } catch (err) {
      logger.error({ err }, "[authService.getUserType]");
      return null;
    }
  },

  // ── Signup ─────────────────────────────────────────────────────────────────

  async userExists(email: string): Promise<boolean> {
    try {
      const res = await erpFetch(
        getErpUrl(`/api/resource/User/${encodeURIComponent(email)}`),
        { headers: getErpHeaders() },
      );
      return res.ok;
    } catch {
      return false;
    }
  },

  async createUser(
    email: string,
    firstName: string,
    lastName?: string,
    mobileNo?: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const payload: Record<string, unknown> = {
        email,
        first_name: firstName,
        ...(lastName ? { last_name: lastName } : {}),
        ...(mobileNo ? { mobile_no: mobileNo } : {}),
        send_welcome_email: 0,
        user_type: "Website User",
        roles: [{ role: "Customer" }],
        source: "OXIGEN Website",
      };

      const createRes = await erpFetch(getErpUrl("/api/resource/User"), {
        method: "POST",
        headers: getErpHeaders(),
        body: JSON.stringify(payload),
      });

      if (!createRes.ok) {
        const errData = (await createRes.json().catch(() => ({}))) as {
          _server_messages?: string;
        };
        return {
          success: false,
          error: parseErpError(errData) || "Failed to create user.",
        };
      }

      logger.info({ email }, "[authService.createUser] User created");
      return { success: true };
    } catch (err) {
      logger.error({ err }, "[authService.createUser]");
      return { success: false, error: "Internal server error." };
    }
  },

  async deleteUser(email: string): Promise<void> {
    try {
      await erpFetch(
        getErpUrl(`/api/resource/User/${encodeURIComponent(email)}`),
        { method: "DELETE", headers: getErpHeaders() },
      );
    } catch {
      // best-effort cleanup
    }
  },

  // ── Password management ────────────────────────────────────────────────────

  async isValidPassword(password: string): Promise<boolean> {
    return (
      password.length >= 8 &&
      /[a-z]/.test(password) &&
      /[A-Z]/.test(password) &&
      /\d/.test(password)
    );
  },

  async setUserPassword(
    email: string,
    newPassword: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const updateRes = await erpFetch(
        getErpUrl(`/api/resource/User/${encodeURIComponent(email)}`),
        {
          method: "PUT",
          headers: getErpHeaders(),
          body: JSON.stringify({ new_password: newPassword }),
        },
      );

      if (!updateRes.ok) {
        const errData = (await updateRes.json().catch(() => ({}))) as { _server_messages?: unknown };
        logger.warn(
          { email, status: updateRes.status, serverMessages: errData._server_messages },
          "[authService.setUserPassword] ERPNext rejected password save",
        );
        return { success: false, error: "Could not save the password on the server." };
      }

      // Self-verify: confirm the password really took effect by logging in with it.
      // An OK PUT can silently fail to persist the hash on some ERPNext builds.
      const verification = await this.login(email, newPassword);
      if (!verification.success) {
        logger.warn(
          { email },
          "[authService.setUserPassword] Password save returned OK but login self-verify failed",
        );
        return { success: false, error: "Password was not applied by the server." };
      }

      return { success: true };
    } catch (err) {
      logger.error({ err }, "[authService.setUserPassword]");
      return { success: false, error: "Internal server error." };
    }
  },
};
