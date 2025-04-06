// app/api/user/get-repo-issues/route.ts
import { NextResponse } from 'next/server';
import axios from 'axios';

interface Issue {
  number: number;
  title: string;
  labels: { name: string }[];
  state: string;
}

interface RequestBody {
  owner: string;
  repo: string;
  accessToken: string;
}

interface ErrorResponse {
  error: string;
}

export async function POST(req: Request) {
  try {
    const body: RequestBody = await req.json();
    const { owner, repo, accessToken } = body;

    if (!accessToken) {
      return NextResponse.json(
        { error: 'No access token provided' },
        { status: 401 }
      );
    }

    if (!owner || !repo) {
      return NextResponse.json(
        { error: 'Owner and repo are required' },
        { status: 400 }
      );
    }

    const issues: Issue[] = [];
    let page = 1;
    const perPage = 100; // GitHub API max per page

    // Fetch issues with pagination
    while (true) {
      const response = await axios.get(
        `https://api.github.com/repos/${owner}/${repo}/issues`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/vnd.github.v3+json',
          },
          params: {
            state: 'all', // Fetch open and closed issues
            per_page: perPage,
            page: page,
          },
        }
      );

      const fetchedIssues: any[] = response.data;
      if (fetchedIssues.length === 0) break; // No more issues to fetch

      issues.push(
        ...fetchedIssues.map(issue => ({
          number: issue.number,
          title: issue.title,
          labels: issue.labels.map((label: any) => ({ name: label.name })),
          state: issue.state,
        }))
      );

      page++;
    }

    // Log issues and labels
    console.log(`Repository: ${owner}/${repo}`);
    console.log(`Total Issues: ${issues.length}`);
    issues.forEach(issue => {
      console.log(`Issue #${issue.number}: ${issue.title} (${issue.state})`);
      console.log(`Labels: ${issue.labels.map(label => label.name).join(', ') || 'None'}`);
      console.log('---');
    });

    // Aggregate unique labels
    const uniqueLabels = Array.from(
      new Set(issues.flatMap(issue => issue.labels.map(label => label.name)))
    );
    console.log(`Unique Labels (${uniqueLabels.length}):`, uniqueLabels);

    return NextResponse.json(
      { message: 'Issues and labels fetched successfully', issues, labels: uniqueLabels },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching repo issues:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}