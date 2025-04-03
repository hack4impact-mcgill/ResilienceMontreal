"use client";
import React from "react";
import { Button, Card, CardContent, Typography } from "@mui/material";
import type { User } from "@/lib/auth";
import { redirect } from "next/navigation";

interface Props {
  user: User;
}

const Dashboard: React.FC<Props> = ({ user }: Props) => {

  const handleLogout = async () => {
    // call the logout api
    await fetch("/api/logout", { method: "POST" });
    redirect("/");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <Card className="w-full max-w-md shadow-lg">
        <CardContent className="p-6">
          <Typography
            variant="h4"
            className="text-center text-gray-800 font-bold"
          >
            Dashboard
          </Typography>
          <Typography variant="body1" className="text-center text-gray-600 mt-4">
            Welcome, {user.name}!
          </Typography>
          <div className="flex justify-center space-x-4 mt-6">
            <Button variant="contained" color="primary" onClick={handleLogout}>
              Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
