# Issue #1: this shit ant hot no future

i dont know what the fuck i am talking about


![Image](https://github.com/user-attachments/assets/662d541d-498b-471f-ab44-f9954a87afc1)

`// app/api/user/get-repo-code/route.ts
import { NextResponse } from 'next/server';
import axios from 'axios';
import { promises as fs } from 'fs';
import path from 'path';

interface FileContent {
  path: string;
  name: string;
  content: string;
  sha: string;
}

interface Issue {
  number: number;
  title: string;
  body: string; // Full description of the issue
  labels: { name: string }[];
  state: string;
  media?: { type: 'image' | 'video'; url: string }[]; // Optional media extracted from body
}

interface RequestBody {
  owner: string;
  repo: string;
  accessToken: string;
}

interface ErrorResponse {
  error: string;
}

// Define the inputs directory in the root of the project
const INPUTS_DIR = path.join(process.cwd(), 'inputs');

// Function to extract media URLs from Markdown body
function extractMediaFromBody(body: string): { type: 'image' | 'video'; url: string }[] {
  const media: { type: 'image' | 'video'; url: string }[] = [];
  
  // Regex for Markdown images: ![alt text](url)
  const imageRegex = /!\[.*?\]\((https?:\/\/[^\s)]+\.(?:png|jpg|jpeg|gif|svg))\)/gi;
  let match;
  while ((match = imageRegex.exec(body)) !== null) {
    media.push({ type: 'image', url: match[1] });
  }

  // Regex for direct image URLs
  const imageUrlRegex = /(https?:\/\/[^\s]+\.(?:png|jpg|jpeg|gif|svg))/gi;
  while ((match = imageUrlRegex.exec(body)) !== null) {
    if (!media.some(m => m.url === match[1])) {
      media.push({ type: 'image', url: match[1] });
    }
  }

  // Regex for video URLs (e.g., YouTube, Vimeo - simplified)
  const videoUrlRegex = /(https?:\/\/(?:www\.)?(?:youtube\.com|youtu\.be|vimeo\.com)\/[^\s]+)/gi;
  while ((match = videoUrlRegex.exec(body)) !== null) {
    if (!media.some(m => m.url === match[1])) {
      media.push({ type: 'video', url: match[1] });
    }
  }

  return media;
}

// Reusable function to fetch issues and labels
async function fetchRepoIssues(owner: string, repo: string, accessToken: string): Promise<Issue[]> {
  const issues: Issue[] = [];
  let page = 1;
  const perPage = 100;

  while (true) {
    const response = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/issues`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
        params: {
          state: 'all',
          per_page: perPage,
          page: page,
        },
      }
    );

    const fetchedIssues: any[] = response.data;
    if (fetchedIssues.length === 0) break;

    issues.push(
      ...fetchedIssues.map(issue => {
        const media = extractMediaFromBody(issue.body || '');
        return {
          number: issue.number,
          title: issue.title,
          body: issue.body || '', // Include full description
          labels: issue.labels.map((label: any) => ({ name: label.name })),
          state: issue.state,
          media: media.length > 0 ? media : undefined, // Include media if present
        };
      })
    );

    page++;
  }

  return issues;
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

    // Create the inputs directory if it doesn't exist
    await fs.mkdir(INPUTS_DIR, { recursive: true });

    // Create a folder named after the repo inside inputs
    const repoDir = path.join(INPUTS_DIR, repo);
    await fs.mkdir(repoDir, { recursive: true });

    const fetchContents = async (pathPrefix: string = ''): Promise<FileContent[]> => {
      const response = await axios.get(
        `https://api.github.com/repos/${owner}/${repo}/contents${pathPrefix}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/vnd.github.v3+json',
          },
        }
      );

      const contents: any[] = response.data;
      const files: FileContent[] = [];

      for (const item of contents) {
        if (item.type === 'file') {
          const contentResponse = await axios.get(item.url, {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              Accept: 'application/vnd.github.v3+json',
            },
          });
          const fileData: any = contentResponse.data;

          const fileContent: FileContent = {
            path: item.path,
            name: item.name,
            content: fileData.content
              ? Buffer.from(fileData.content, 'base64').toString('utf-8')
              : '',
            sha: item.sha,
          };

          files.push(fileContent);

          // Write the file to the local filesystem
          const filePath = path.join(repoDir, item.path);
          await fs.mkdir(path.dirname(filePath), { recursive: true });
          await fs.writeFile(filePath, fileContent.content, 'utf-8');
        } else if (item.type === 'dir') {
          const subFiles = await fetchContents(`/${item.path}`);
          files.push(...subFiles);
        }
      }

      return files;
    };

    const repoContents = await fetchContents();

    // Fetch issues and labels
    const repoIssues = await fetchRepoIssues(owner, repo, accessToken);

    // Log issues with full details
    console.log(`Repository: ${owner}/${repo}`);
    console.log(`Total Issues: ${repoIssues.length}`);
    repoIssues.forEach(issue => {
      console.log(`Issue #${issue.number}: ${issue.title} (${issue.state})`);
      console.log(`Description:\n${issue.body}`);
      console.log(`Labels: ${issue.labels.map(label => label.name).join(', ') || 'None'}`);
      if (issue.media) {
        console.log('Media:');
        issue.media.forEach(m => console.log(`- ${m.type}: ${m.url}`));
      }
      console.log('---');
    });

    const uniqueLabels = Array.from(
      new Set(repoIssues.flatMap(issue => issue.labels.map(label => label.name)))
    );
    console.log(`Unique Labels (${uniqueLabels.length}):`, uniqueLabels);

    return NextResponse.json(
      {
        message: 'Repository code cloned and issues fetched successfully',
        files: repoContents,
        issues: repoIssues,
        labels: uniqueLabels,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching or cloning repo contents:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}`