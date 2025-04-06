// app/api/user/repolist/route.ts
import { NextResponse } from 'next/server';
import axios from 'axios';

interface Repo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  owner: string;
  isPrivate: boolean;
}

interface ErrorResponse {
  error: string;
}

export async function GET(req: Request) {
  try {
    const accessToken = req.headers.get('Authorization')?.split(' ')[1];

    if (!accessToken) {
      return NextResponse.json(
        { error: 'No access token provided' },
        { status: 401 }
      );
    }

    const response = await axios.get('https://api.github.com/user/repos', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    const repos: any[] = response.data;
    const repoList: Repo[] = repos.map(repo => ({
      id: repo.id,
      name: repo.name,
      full_name: repo.full_name,
      description: repo.description,
      owner: repo.owner.login,
      isPrivate: repo.private,
    }));

    return NextResponse.json(repoList, { status: 200 });
  } catch (error) {
    console.error('Error fetching repos:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}