"use client";
import { useState, useEffect } from "react";
import axios from "axios";
import { signOut, useSession } from "next-auth/react";

interface Repo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  owner: string;
  isPrivate: boolean;
}

interface FileContent {
  path: string;
  name: string;
  content: string;
  sha: string;
}

interface Issue {
  number: number;
  title: string;
  labels: { name: string }[];
  state: string;
}

export default function Page() {
  const { data: session, status } = useSession();
  const [repos, setRepos] = useState<Repo[]>([]);
  const [selectedRepoContents, setSelectedRepoContents] = useState<FileContent[]>([]);
  const [selectedRepoIssues, setSelectedRepoIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log(session?.accessToken)
    const fetchRepos = async () => {
      if (status !== "authenticated" || !session?.accessToken) return;

      setLoading(true);
      setError(null);

      try {
        const response = await axios.get<Repo[]>("/api/user/repolist", {
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
          },
        });
        setRepos(response.data);
      } catch (err) {
        setError("Failed to fetch repositories");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchRepos();
  }, [session, status]);

  const handleRepoClick = async (owner: string, repo: string) => {
    if (status !== "authenticated" || !session?.accessToken) return;

    setLoading(true);
    setError(null);

    try {
      const response = await axios.post<{
        message: string;
        files: FileContent[];
        issues: Issue[];
        labels: string[];
      }>("/api/user/get-repo-code", {
        owner,
        repo,
        accessToken: session.accessToken,
      });
      setSelectedRepoContents(response.data.files);
      setSelectedRepoIssues(response.data.issues);
      console.log("Unique Labels from API:", response.data.labels);
    } catch (err) {
      setError("Failed to process repository");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="w-full h-screen flex justify-center items-center">
        <p>Loading session...</p>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div className="w-full h-screen flex justify-center items-center">
        <p>Please sign in with GitHub</p>
      </div>
    );
  }

  return (
    <>
      <div className="w-full min-h-screen flex flex-col justify-center items-center">
        <div className="w-[30%] h-1/4 bg-white/80 rounded-sm flex justify-center items-center">
          <button
            className="my-11 rounded-lg text-black bg-blue-400 w-[90%] text-4xl cursor-pointer py-6"
            onClick={() => {
              signOut({ callbackUrl: "/" });
            }}
          >
            Logout
          </button>
        </div>
        <div className="w-[30%] h-1/4 rounded-sm flex justify-center items-center">
          {session?.user?.email}
        </div>
        <div className="w-full flex justify-center items-center">
          <div className="w-1/2">
            {loading && <p>Loading...</p>}
            {error && <p className="text-red-500">{error}</p>}
            <ul>
              {repos.map((repo) => (
                <li
                  key={repo.id}
                  className="p-4 bg-white/80 rounded-sm my-2 text-black cursor-pointer"
                  onClick={() => handleRepoClick(repo.owner, repo.name)}
                >
                  {repo.full_name} {repo.isPrivate && "(Private)"}
                </li>
              ))}
            </ul>
            {selectedRepoContents.length > 0 && (
              <div className="mt-4">
                <h2 className="text-xl font-bold mb-2 text-white">Repository Contents:</h2>
                <ul className="max-h-64 overflow-y-auto">
                  {selectedRepoContents.map((file) => (
                    <li
                      key={file.sha}
                      className="p-2 bg-gray-100 rounded-sm my-1 text-black"
                    >
                      <p className="font-mono">{file.path}</p>
                      <pre className="text-sm whitespace-pre-wrap break-words">
                        {file.content.substring(0, 100)}
                        {file.content.length > 100 && "..."}
                      </pre>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {selectedRepoIssues.length > 0 && (
              <div className="mt-4">
                <h2 className="text-xl font-bold mb-2 text-white">Repository Issues:</h2>
                <ul className="max-h-64 overflow-y-auto">
                  {selectedRepoIssues.map((issue) => (
                    <li
                      key={issue.number}
                      className="p-2 bg-gray-100 rounded-sm my-1 text-black"
                    >
                      <p>
                        #{issue.number}: {issue.title} ({issue.state})
                      </p>
                      <p className="text-sm">
                        Labels: {issue.labels.map(label => label.name).join(', ') || 'None'}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}