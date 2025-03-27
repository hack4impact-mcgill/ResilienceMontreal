"use client";
import React from "react";
import { Button, Card, CardContent, Typography } from "@mui/material";

const HomePage: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <Card className="w-full max-w-md shadow-lg">
        <CardContent className="p-6">
          <Typography
            variant="h4"
            className="text-center text-gray-800 font-bold"
          >
            Resilience Montreal
          </Typography>
          <Typography
            variant="body1"
            className="text-center text-gray-600 mt-2"
          >
            Welcome to Resilience Montreal. Please log in or register to
            continue.
          </Typography>
          <div className="flex justify-center space-x-4 mt-6">
            <Button variant="contained" color="primary">
              Log In
            </Button>
            <Button variant="contained" color="secondary">
              Register
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default HomePage;
