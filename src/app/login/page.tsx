"use client";
import React, { useState } from "react";
import {
  Button,
  Card,
  CardContent,
  TextField,
  Typography,
} from "@mui/material";
import { redirect } from 'next/navigation';

const Login: React.FC = () => {

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();

    // switch to loading state
    setLoading(true);

    // call the login api
    const response = await fetch("/api/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });
    
    // check success
    if (response.ok) {
      // redirect to dashboard
      redirect("/dashboard");
    } else {
      // check the error
      const data = await response.json();
      setError(data.error);
      setLoading(false);
    }

  }

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
              disabled={loading}
              value={email}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                setEmail(event.target.value);
              }}
            />
            <TextField
              label="Password"
              type="password"
              variant="outlined"
              fullWidth
              className="bg-white"
              disabled={loading}
              value={password}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                setPassword(event.target.value);
              }}
            />
            <p className="text-red-500">{error}</p>
            <Button variant="contained" color="primary" fullWidth onClick={handleLogin} disabled={loading}>
              Sign In
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
