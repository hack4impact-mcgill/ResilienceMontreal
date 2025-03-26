"use client";
import React from "react";
import { Button, Card, CardContent, Typography } from "@mui/material";

const HomePage: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md shadow-lg border border-gray-200">
          <CardContent className="p-6">
            <Typography variant="h4" className="font-bold text-center">
              Resilience Montreal
            </Typography>
            <Typography variant="body1" className="text-gray-600 text-center mt-2">
              Description.
            </Typography>
            <div className="flex justify-center mt-4">
              <Button
                variant="contained"
                className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-md mr-4"
              >
                Log In
              </Button>
              <Button
                variant="contained"
                className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-md"
              >
                Register
              </Button>
            </div>
          </CardContent>
        </Card>
    </div>
  );
};

export default HomePage;
