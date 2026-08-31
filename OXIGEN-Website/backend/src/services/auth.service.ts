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
      };

      if (!erpRes.ok) {
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

  async setUserPassword(email: string, newPassword: string): Promise<boolean> {
    try {
      const updateRes = await erpFetch(
        getErpUrl(`/api/resource/User/${encodeURIComponent(email)}`),
        {
          method: "PUT",
          headers: getErpHeaders(),
          body: JSON.stringify({ new_password: newPassword }),
        },
      );
      return updateRes.ok;
    } catch {
      return false;
    }
  },
};
