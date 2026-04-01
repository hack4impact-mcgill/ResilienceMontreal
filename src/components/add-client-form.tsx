"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function AddClientForm() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    dateOfBirth: "",
    workerId: "",
    email: "",
    phone: "",
    landlordName: "",
    leaseStart: "",
    leaseEnd: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const addClientMutation = api.clients.addClient.useMutation({
    onSuccess: () => {
      router.push("/clients");
    },
    onError: (error) => {
      setErrors({ submit: error.message });
    },
  });

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = "First name is required";
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = "Last name is required";
    }

    if (!formData.dateOfBirth) {
      newErrors.dateOfBirth = "Date of birth is required";
    }

    if (!formData.workerId) {
      newErrors.workerId = "Worker ID is required";
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Invalid email format";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    addClientMutation.mutate({
      firstName: formData.firstName,
      lastName: formData.lastName,
      dateOfBirth: new Date(formData.dateOfBirth),
      workerId: formData.workerId,
      email: formData.email || null,
      phone: formData.phone || null,
      landlordName: formData.landlordName || null,
      leaseStart: formData.leaseStart ? new Date(formData.leaseStart) : null,
      leaseEnd: formData.leaseEnd ? new Date(formData.leaseEnd) : null,
    });
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Add New Client</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Required Fields Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Required Information</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">
                  First Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => handleChange("firstName", e.target.value)}
                  placeholder="John"
                  className={errors.firstName ? "border-red-500" : ""}
                />
                {errors.firstName && (
                  <p className="text-sm text-red-500">{errors.firstName}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName">
                  Last Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => handleChange("lastName", e.target.value)}
                  placeholder="Doe"
                  className={errors.lastName ? "border-red-500" : ""}
                />
                {errors.lastName && (
                  <p className="text-sm text-red-500">{errors.lastName}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dateOfBirth">
                  Date of Birth <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="dateOfBirth"
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => handleChange("dateOfBirth", e.target.value)}
                  className={errors.dateOfBirth ? "border-red-500" : ""}
                />
                {errors.dateOfBirth && (
                  <p className="text-sm text-red-500">{errors.dateOfBirth}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="workerId">
                  Worker ID <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="workerId"
                  value={formData.workerId}
                  onChange={(e) => handleChange("workerId", e.target.value)}
                  placeholder="1"
                  min="1"
                  className={errors.workerId ? "border-red-500" : ""}
                />
                {errors.workerId && (
                  <p className="text-sm text-red-500">{errors.workerId}</p>
                )}
              </div>
            </div>
          </div>

          {/* Optional Fields Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">
              Contact Information (Optional)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  placeholder="john.doe@example.com"
                  className={errors.email ? "border-red-500" : ""}
                />
                {errors.email && (
                  <p className="text-sm text-red-500">{errors.email}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>
          </div>

          {/* Lease Information Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">
              Lease Information (Optional)
            </h3>

            <div className="space-y-2">
              <Label htmlFor="landlordName">Landlord Name</Label>
              <Input
                id="landlordName"
                value={formData.landlordName}
                onChange={(e) => handleChange("landlordName", e.target.value)}
                placeholder="Jane Smith"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="leaseStart">Lease Start Date</Label>
                <Input
                  id="leaseStart"
                  type="date"
                  value={formData.leaseStart}
                  onChange={(e) => handleChange("leaseStart", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="leaseEnd">Lease End Date</Label>
                <Input
                  id="leaseEnd"
                  type="date"
                  value={formData.leaseEnd}
                  onChange={(e) => handleChange("leaseEnd", e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Error Message */}
          {errors.submit && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{errors.submit}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/clients")}
              disabled={addClientMutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={addClientMutation.isPending}>
              {addClientMutation.isPending ? "Adding Client..." : "Add Client"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
