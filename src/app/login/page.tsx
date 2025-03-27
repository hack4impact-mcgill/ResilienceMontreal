"use client";
import React from "react";
import {
  Button,
  Card,
  CardContent,
  TextField,
  Typography,
} from "@mui/material";

const Login: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <Card className="w-full max-w-md shadow-lg">
        <CardContent className="p-6">
          <Typography
            variant="h4"
            className="text-center text-gray-800 font-bold mb-4"
          >
            Login
          </Typography>
          <form className="space-y-4">
            <TextField
              label="Email"
              variant="outlined"
              fullWidth
              className="bg-white"
            />
            <TextField
              label="Password"
              type="password"
              variant="outlined"
              fullWidth
              className="bg-white"
            />
            <Button variant="contained" color="primary" fullWidth>
              Sign In
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
