// src/app/api/run/[topic]/route.ts
import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { exec } from "child_process";
import * as net from "net";

const INPUTS_DIR = path.join(process.cwd(), "inputs");

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close();
      resolve(true);
    });
    server.listen(port);
  });
}

async function findAvailablePort(basePort: number): Promise<number> {
  let port = basePort;
  while (!(await isPortAvailable(port))) {
    port++;
    if (port > basePort + 100) throw new Error("No available ports in range");
  }
  return port;
}

async function getContainerPort(topic: string): Promise<number | null> {
  const containerName = `sandbox-${topic}`;
  const command = `docker ps --filter "name=${containerName}" --format "{{.Ports}}"`;
  try {
    const { stdout } = await execPromise(command);
    const match = stdout.match(/0.0.0.0:(\d+)->3000\/tcp/);
    return match ? parseInt(match[1], 10) : null;
  } catch (err) {
    console.error(`Error checking container:`, err);
    return null;
  }
}

function execPromise(command: string, cwd?: string): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    exec(command, { cwd }, (error, stdout, stderr) => {
      if (error) return reject(new Error(stderr));
      resolve({ stdout, stderr });
    });
  });
}

async function buildDockerImage(topic: string, repoDir: string): Promise<string> {
  const imageName = `sandbox-${topic}`;
  await execPromise(`docker build -t ${imageName} .`, repoDir);
  return imageName;
}

async function runDockerContainer(topic: string, imageName: string, port: number): Promise<void> {
  const containerName = `sandbox-${topic}`;
  const runCommand = `docker run -d -p ${port}:3000 --name ${containerName} ${imageName}`;
  await execPromise(runCommand);

  const { stdout } = await execPromise(`docker ps --filter "name=${containerName}" --format "{{.Names}}"`);
  if (!stdout.includes(containerName)) throw new Error(`Container ${containerName} is not running`);
}

export async function POST(req: Request) {
  const { topic } = await req.json();
  const repoDir = path.join(INPUTS_DIR, topic, "original");

  try {
    await fs.access(repoDir);
  } catch {
    return NextResponse.json({ error: `Repository not found` }, { status: 404 });
  }

  const existingPort = await getContainerPort(topic);
  if (existingPort) {
    return NextResponse.json({ url: `http://localhost:${existingPort}` }, { status: 200 });
  }

  const dockerfilePath = path.join(repoDir, "Dockerfile");
  try {
    await fs.access(dockerfilePath);
  } catch {
    const dockerfile = `
     FROM node:20
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]

    `;
    await fs.writeFile(dockerfilePath, dockerfile, "utf-8");
  }

  try {
    const imageName = await buildDockerImage(topic, repoDir);
    const port = await findAvailablePort(3000);
    await runDockerContainer(topic, imageName, port);
    return NextResponse.json({ url: `http://localhost:${port}` }, { status: 200 });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
