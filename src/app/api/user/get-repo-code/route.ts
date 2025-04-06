// app/api/user/get-repo-code/route.ts
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
  body: string;
  labels: { name: string }[];
  state: string;
  media?: { type: 'image' | 'video'; url: string }[];
}

interface PullRequest {
  number: number;
  title: string;
  body: string;
  state: string;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  merged_at: string | null;
  user: { login: string };
  commits: number;
  additions: number;
  deletions: number;
  changed_files: number;
  html_url: string;
  head: { ref: string; repo: { full_name: string } };
  issues: Issue[]; // Issues solved by this PR
}

interface Commit {
  commit: {
    message: string;
  };
}

interface RequestBody {
  owner: string;
  repo: string;
  accessToken: string;
}

interface ErrorResponse {
  error: string;
}

// Define directories
const INPUTS_DIR = path.join(process.cwd(), 'inputs');

// Function to extract media URLs from Markdown body
function extractMediaFromBody(body: string): { type: 'image' | 'video'; url: string }[] {
  const media: { type: 'image' | 'video'; url: string }[] = [];
  const imageRegex = /!\[.*?\]\((https?:\/\/[^\s)]+\.(?:png|jpg|jpeg|gif|svg))\)/gi;
  const imageUrlRegex = /(https?:\/\/[^\s]+\.(?:png|jpg|jpeg|gif|svg))/gi;
  const videoUrlRegex = /(https?:\/\/(?:www\.)?(?:youtube\.com|youtu\.be|vimeo\.com)\/[^\s]+)/gi;

  let match;
  while ((match = imageRegex.exec(body)) !== null) media.push({ type: 'image', url: match[1] });
  while ((match = imageUrlRegex.exec(body)) !== null) {
    if (!media.some(m => m.url === match[1])) media.push({ type: 'image', url: match[1] });
  }
  while ((match = videoUrlRegex.exec(body)) !== null) {
    if (!media.some(m => m.url === match[1])) media.push({ type: 'video', url: match[1] });
  }

  return media;
}

// Function to extract issue numbers from text (PR body, title, or commit message)
function extractIssueNumbers(text: string): number[] {
  const keywordRegex = /(?:fixe?s?|close?s?|resolve?s?)\s*#(\d+)/gi;
  const standaloneRegex = /#(\d+)/gi; // Matches standalone #X references
  const issueNumbers: number[] = [];

  console.log(`Parsing text for issues: ${text?.substring(0, 200)}...`); // Log first 200 chars

  // Check for keyword-based references
  let match;
  while ((match = keywordRegex.exec(text || '')) !== null) {
    const issueNum = parseInt(match[1], 10);
    console.log(`Found keyword-based issue reference: #${issueNum}`);
    issueNumbers.push(issueNum);
  }

  // Check for standalone #X references
  keywordRegex.lastIndex = 0; // Reset lastIndex
  while ((match = standaloneRegex.exec(text || '')) !== null) {
    const issueNum = parseInt(match[1], 10);
    console.log(`Found standalone issue reference: #${issueNum}`);
    issueNumbers.push(issueNum);
  }

  console.log(`Extracted ${issueNumbers.length} issue numbers: ${issueNumbers.join(', ')}`);
  return [...new Set(issueNumbers)]; // Remove duplicates
}

// Function to fetch repository contents recursively
async function fetchRepoContents(
  owner: string,
  repo: string,
  branch: string,
  accessToken: string,
  targetDir: string
): Promise<FileContent[]> {
  const files: FileContent[] = [];

  const fetchContents = async (pathPrefix: string = ''): Promise<void> => {
    const url = `https://api.github.com/repos/${owner}/${repo}/contents${pathPrefix}?ref=${branch}`;
    console.log(`Attempting to fetch: ${url}`);
    try {
      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });

      const contents: any[] = response.data;

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
            content: fileData.content ? Buffer.from(fileData.content, 'base64').toString('utf-8') : '',
            sha: item.sha,
          };

          files.push(fileContent);

          const filePath = path.join(targetDir, item.path);
          await fs.mkdir(path.dirname(filePath), { recursive: true });
          await fs.writeFile(filePath, fileContent.content, 'utf-8');
        } else if (item.type === 'dir') {
          await fetchContents(`/${item.path}`);
        }
      }
    } catch (error) {
      console.error(`Failed to fetch contents from ${url}:`, error.response?.data || error.message);
      throw error;
    }
  };

  await fetchContents();
  return files;
}

// Function to fetch all PRs and their associated issues
async function fetchAllPRsAndIssues(owner: string, repo: string, accessToken: string): Promise<PullRequest[]> {
  const prs: PullRequest[] = [];
  let page = 1;
  const perPage = 100;

  while (true) {
    const response = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/pulls`,
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

    const fetchedPRs: any[] = response.data;
    if (fetchedPRs.length === 0) break;

    for (const pr of fetchedPRs) {
      const issueNumbersFromBody = extractIssueNumbers(pr.body || '');
      const issueNumbersFromTitle = extractIssueNumbers(pr.title || '');
      let allIssueNumbers: number[] = [...issueNumbersFromBody, ...issueNumbersFromTitle];

      // Fetch commits for this PR to check commit messages
      try {
        const commitsResponse = await axios.get(
          `https://api.github.com/repos/${owner}/${repo}/pulls/${pr.number}/commits`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              Accept: 'application/vnd.github.v3+json',
            },
          }
        );
        const commits: Commit[] = commitsResponse.data;
        for (const commit of commits) {
          const issueNumbersFromCommit = extractIssueNumbers(commit.commit.message);
          allIssueNumbers = [...new Set([...allIssueNumbers, ...issueNumbersFromCommit])];
        }
        console.log(`PR #${pr.number} has ${allIssueNumbers.length} total issue references from body, title, and commits: ${allIssueNumbers.join(', ')}`);
      } catch (error) {
        console.error(`Failed to fetch commits for PR #${pr.number}:`, error.response?.data || error.message);
      }

      const issues: Issue[] = [];

      for (const issueNumber of allIssueNumbers) {
        try {
          const issueResponse = await axios.get(
            `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}`,
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
                Accept: 'application/vnd.github.v3+json',
              },
            }
          );
          const issue = issueResponse.data;
          const media = extractMediaFromBody(issue.body || '');
          issues.push({
            number: issue.number,
            title: issue.title,
            body: issue.body || '',
            labels: issue.labels.map((label: any) => ({ name: label.name })),
            state: issue.state,
            media,
          });
          console.log(`Successfully fetched issue #${issueNumber} for PR #${pr.number}`);
        } catch (error) {
          console.error(`Failed to fetch issue #${issueNumber} for PR #${pr.number}:`, error.response?.data || error.message);
        }
      }

      prs.push({
        number: pr.number,
        title: pr.title,
        body: pr.body || '',
        state: pr.state,
        created_at: pr.created_at,
        updated_at: pr.updated_at,
        closed_at: pr.closed_at,
        merged_at: pr.merged_at,
        user: { login: pr.user.login },
        commits: pr.commits,
        additions: pr.additions,
        deletions: pr.deletions,
        changed_files: pr.changed_files,
        html_url: pr.html_url,
        head: { ref: pr.head.ref, repo: { full_name: pr.head.repo.full_name } },
        issues,
      });
    }

    page++;
  }

  return prs;
}

export async function POST(req: Request) {
  try {
    const body: RequestBody = await req.json();
    const { owner, repo, accessToken } = body;
    console.log("--------------------",repo)

    if (!accessToken) {
      return NextResponse.json({ error: 'No access token provided' }, { status: 401 });
    }

    if (!owner || !repo) {
      return NextResponse.json({ error: 'Owner and repo are required' }, { status: 400 });
    }

    // Create base directories
    const repoDir = path.join(INPUTS_DIR, repo);
    await fs.mkdir(repoDir, { recursive: true });
    const originalDir = path.join(repoDir, 'original');
    await fs.mkdir(originalDir, { recursive: true });
    const prsDir = path.join(repoDir, 'PRS');
    await fs.mkdir(prsDir, { recursive: true });

    // Fetch the default branch
    let defaultBranch = 'main';
    try {
      const repoInfo = await axios.get(
        `https://api.github.com/repos/${owner}/${repo}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/vnd.github.v3+json',
          },
        }
      );
      defaultBranch = repoInfo.data.default_branch;
      console.log(`Default branch for ${owner}/${repo}: ${defaultBranch}`);
    } catch (error) {
      console.error(`Failed to fetch default branch for ${owner}/${repo}, using 'main':`, error);
    }

    // Fetch and copy the original repository contents
    const repoContents = await fetchRepoContents(owner, repo, defaultBranch, accessToken, originalDir);

    // Fetch all PRs and their associated issues
    const prs = await fetchAllPRsAndIssues(owner, repo, accessToken);

    // Process each PR
    for (const pr of prs) {
      const prDir = path.join(prsDir, `PR${pr.number}`);
      await fs.mkdir(prDir, { recursive: true });

      // Write issue Markdown files
      if (pr.issues.length > 0) {
        console.log(`Writing ${pr.issues.length} issue files for PR #${pr.number}`);
        for (const issue of pr.issues) {
          const issueFile = path.join(prDir, `ISSUE${issue.number}.md`);
          const issueContent = `# Issue #${issue.number}: ${issue.title}\n\n${issue.body}`;
          await fs.writeFile(issueFile, issueContent, 'utf-8');
          console.log(`Created ${issueFile}`);
        }
      } else {
        console.log(`No issues found for PR #${pr.number}. PR body: ${pr.body?.substring(0, 200)}...`);
      }

      // Copy PR codebase
      const codeDir = path.join(prDir, 'code');
      await fs.mkdir(codeDir, { recursive: true });
      const [prOwner, prRepo] = pr.head.repo.full_name.split('/');
      const prBranch = pr.head.ref;

      console.log(`Processing PR #${pr.number} from ${prOwner}/${prRepo}, branch: ${prBranch}`);
      try {
        await fetchRepoContents(prOwner, prRepo, prBranch, accessToken, codeDir);
      } catch (error) {
        console.error(`Skipping PR #${pr.number} code fetch due to error in ${prOwner}/${prRepo} at ${prBranch}`);
      }
    }

    // Log PRs and their issues
    console.log(`Repository: ${owner}/${repo}`);
    console.log(`Total PRs: ${prs.length}`);
    prs.forEach(pr => {
      console.log(`PR #${pr.number}: ${pr.title} (${pr.state})`);
      console.log(`Description:\n${pr.body}`);
      console.log('Issues Solved:');
      pr.issues.forEach(issue => {
        console.log(`- Issue #${issue.number}: ${issue.title} (${issue.state})`);
        console.log(`  Description:\n${issue.body}`);
        if (issue.media) {
          console.log('  Media:');
          issue.media.forEach(m => console.log(`    - ${m.type}: ${m.url}`));
        }
      });
      console.log('PR Details:');
      console.log(JSON.stringify(pr, null, 2));
      console.log('---');
    });

    const uniqueLabels = Array.from(
      new Set(prs.flatMap(pr => pr.issues.flatMap(issue => issue.labels.map(label => label.name))))
    );
    console.log(`Unique Labels (${uniqueLabels.length}):`, uniqueLabels);

    const redirectUrl = `/sandbox/${repo}`;
    return NextResponse.redirect(new URL(redirectUrl, req.url));
  } catch (error) {
    console.error('Error fetching or cloning repo contents:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}