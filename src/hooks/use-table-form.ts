"use client";

import * as React from "react";
import type { ZodSchema } from "zod";

export function useTableForm<TFormData extends Record<string, unknown>>(
  empty: TFormData,
) {
  const [isAdding, setIsAdding] = React.useState(false);
  const [formData, setFormDataRaw] = React.useState<TFormData>(empty);
  const [formErrors, setFormErrors] = React.useState<Record<string, string>>(
    {},
  );

  const setFormData = (update: Partial<TFormData>) =>
    setFormDataRaw((prev) => ({ ...prev, ...update }));

  const resetForm = () => {
    setFormDataRaw({ ...empty });
    setFormErrors({});
  };

  const openForm = () => setIsAdding(true);
  const closeForm = () => {
    resetForm();
    setIsAdding(false);
  };

  const validateForm = (schema: ZodSchema<TFormData>): boolean => {
    const result = schema.safeParse(formData);
    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        const key = issue.path[0];
        if (key) errors[String(key)] = issue.message;
      });
      setFormErrors(errors);
      return false;
    }
    setFormErrors({});
    return true;
  };

  return {
    isAdding,
    formData,
    formErrors,
    setFormData,
    resetForm,
    openForm,
    closeForm,
    validateForm,
    setFormErrors,
  };
}
