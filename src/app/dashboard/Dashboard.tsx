"use client";
import React from "react";

const Dashboard: React.FC = () => {
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
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
