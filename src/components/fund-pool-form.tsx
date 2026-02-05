"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface FundPoolFormProps {
  fundPool?: {
    id: number;
    category: string;
  };
  onSubmit: (data: { category: string }) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function FundPoolForm({ fundPool, onSubmit, onCancel, isLoading }: FundPoolFormProps) {
  const [category, setCategory] = useState(fundPool?.category ?? "");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedCategory = category.trim();
    if (!trimmedCategory) {
      setError("Category name is required");
      return;
    }

    setError("");
    setIsSubmitting(true);
    
    try {
      await onSubmit({ category: trimmedCategory });
    } catch (err) {
      setError("Failed to save fund pool");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="category">Category Name</Label>
        <Input
          id="category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="Enter category name"
          disabled={isSubmitting || isLoading}
        />
        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}
      </div>

      <div className="flex justify-end space-x-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting || isLoading}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting || isLoading}>
          {isSubmitting ? "Saving..." : fundPool ? "Update" : "Create"}
        </Button>
      </div>
    </form>
  );
}