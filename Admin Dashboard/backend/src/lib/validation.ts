/**
 * Shared Zod schemas for request validation.
 * Ensures consistent validation across all endpoints.
 */

import { z } from "zod";
import type { Request, Response, NextFunction } from "express";
import type { ZodSchema } from "zod";

export const emailSchema = z.string().email("Invalid email address.").max(255);

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .regex(/[a-z]/, "Password must include a lowercase letter.")
  .regex(/[A-Z]/, "Password must include an uppercase letter.")
  .regex(/\d/, "Password must include a number.");

export const loginSchema = z.object({
  usr: emailSchema,
  pwd: z.string().min(1, "Password is required."),
});

export const signupSchema = z.object({
  email: emailSchema,
  first_name: z.string().max(140).optional(),
  last_name: z.string().max(140).optional(),
  mobile_no: z.string().max(20).optional(),
  full_name: z.string().min(1, "Full name or first name is required.").max(255).optional(),
  company_name: z.string().max(255).optional(),
});

export const setPasswordSchema = z.object({
  token: z.string().min(1, "Token is required."),
  email: emailSchema,
  password: passwordSchema,
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token is required."),
  email: emailSchema,
  password: passwordSchema,
});

export const changePasswordSchema = z.object({
  old_password: z.string().min(1, "Current password is required."),
  new_password: passwordSchema,
});

export const profileUpdateSchema = z.object({
  email: emailSchema,
  full_name: z.string().max(255).optional(),
  first_name: z.string().max(140).optional(),
  last_name: z.string().max(140).optional(),
  mobile_no: z.string().max(20).optional(),
  phone: z.string().max(20).optional(),
  gender: z.enum(["Male", "Female", "Other", "", "male", "female", "other"]).optional(),
  birth_date: z.string().max(20).optional(),
});

export const addressCreateSchema = z.object({
  address_title: z.string().max(255).optional(),
  address_type: z.string().max(100).default("Shipping"),
  address_line1: z.string().min(1, "Address line 1 is required.").max(255),
  address_line2: z.string().max(255).optional(),
  city: z.string().min(1, "City is required.").max(140),
  state: z.string().max(140).optional(),
  country: z.string().min(1, "Country is required.").max(140).default("Pakistan"),
  pincode: z.string().max(20).optional(),
  phone: z.string().max(20).optional(),
});

export const orderItemSchema = z.object({
  item_code: z.string().min(1),
  item_name: z.string().optional(),
  qty: z.number().int().min(1, "Quantity must be at least 1.").max(100, "Maximum 100 units per item."),
});

export const placeOrderSchema = z.object({
  items: z.array(orderItemSchema).min(1, "At least one item is required."),
  delivery_date: z.string().optional(),
  addressName: z.string().optional(),
  shippingAddress: z
    .object({
      address_line1: z.string().min(1).max(255),
      address_line2: z.string().max(255).optional(),
      city: z.string().min(1).max(140),
      state: z.string().max(140).optional(),
      country: z.string().min(1).max(140),
      pincode: z.string().max(20).optional(),
      phone: z.string().max(20).optional(),
    })
    .optional(),
  setAsDefault: z.boolean().optional(),
});

export const contactSchema = z.object({
  name: z.string().min(1, "Name is required.").max(255),
  email: emailSchema,
  phone: z.string().min(1, "Phone is required.").max(20),
  message: z.string().min(1, "Message is required.").max(2000),
});

// ── Admin: Create Item ────────────────────────────────────────────────────────
export const createItemSchema = z.object({
  item_name: z.string().min(1, "Item name is required.").max(255),
  item_group: z.string().min(1, "Item group is required.").max(255),
  stock_uom: z.string().min(1, "Unit of measure is required.").max(255),
  description: z.string().max(5000).optional(),
  standard_rate: z.number().min(0).optional(),
  stock_qty: z.number().int().min(0).optional(),
  image: z.string().optional(),
  imageUrl: z.string().optional(),
  sku: z.string().max(255).optional(),
  item_code: z.string().max(255).optional(),
  // Website Item fields
  publish: z.boolean().optional(),
  website_warehouse: z.string().max(255).optional(),
  short_description: z.string().max(1000).optional(),
});

// ── Admin: Settings Update ───────────────────────────────────────────────────
export const settingsUpdateSchema = z.object({
  organization: z
    .object({
      company_name: z.string().max(255).optional(),
      website_url: z.string().max(500).optional(),
      support_email: z.string().email().max(255).optional(),
    })
    .optional(),
  preferences: z
    .object({
      language: z.string().max(10).optional(),
      time_zone: z.string().max(50).optional(),
      date_format: z.string().max(20).optional(),
      currency: z.string().max(10).optional(),
      country: z.string().max(100).optional(),
      number_format: z.string().max(20).optional(),
    })
    .optional(),
  notifications: z
    .object({
      email: z.boolean().optional(),
      push: z.boolean().optional(),
      marketing: z.boolean().optional(),
    })
    .optional(),
});

/**
 * Wraps Zod validation as Express middleware.
 * Returns 400 with structured errors on failure.
 */
export function validate<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const firstError = result.error.issues[0];
      res.status(400).json({
        success: false,
        error: result.error.message,
        ...(process.env.NODE_ENV !== "production" && { details: result.error.format() }),
      });
      return;
    }
    req.body = result.data;
    next();
  };
}
