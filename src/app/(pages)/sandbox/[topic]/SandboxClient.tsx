// app/sandbox/[topic]/SandboxClient.tsx
"use client";

import axios from "axios";
import { useEffect, useState } from "react";

export default function SandboxClient({ topic }: { topic: string }) {
  const [url, setUrl] = useState("");
  const [showComponent, setShowComponent] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowComponent(true);
    }, 10000); // 10 seconds

    return () => clearTimeout(timer); // cleanup
  }, []);

  useEffect(() => {
    if (!showComponent) return;

    const getData = async () => {
      try {
        const res = await axios.post("/api/run/sandbox", { topic: "1m1busar" });
        setUrl(res.data.url);
      } catch (error) {
        console.error("Error fetching sandbox URL:", error);
      }
    };

    getData();
  }, [showComponent, topic]);

  if (!showComponent) {
    return <p className="text-lg font-medium">Preparing environment...</p>;
  }

  return (
    <div>
      <h1 className="text-xl font-bold">Sandbox for: {topic}</h1>
      {url ? (
        <iframe src={url} className="w-full h-[90vh] border" />
      ) : (
        <p>Spinning up container for {topic}...</p>
      )}
    </div>
  );
}
