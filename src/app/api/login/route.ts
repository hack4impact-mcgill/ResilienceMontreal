import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { NextApiRequest, NextApiResponse } from 'next';
import { serialize } from 'cookie';

export async function POST(request: Request, response: NextResponse) {
  try {
    const { email, password } = await request.json();

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return response.status(401).json(
        { error: "Invalid credentials" },
        { status: 401 },
      );
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return response.status(401).json(
        { error: "Invalid credentials" },
        { status: 401 },
      );
    }

    const accessToken = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET as string,
      { expiresIn: "15m" },
    );

    const refreshToken = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET as string,
      { expiresIn: "7d" },
    );

    await prisma.user.update({
      where: { id: user.id },
      data: { refresh_token: refreshToken },
    });

    // save the cookie to the browser
    const cookie = serialize('session', encryptedSessionData, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7, // One week
      path: '/',
    })

    response.setHeader('Set-Cookie', cookie)

    return response.status(200).json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    console.error("Login error:", error);
    return response.status(500).json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
