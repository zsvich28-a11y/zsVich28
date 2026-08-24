import express from "express";
import path from "path";
import fs from "fs/promises";
import { createServer as createViteServer } from "vite";

const DATA_FILE = path.join(process.cwd(), "data.json");

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // Handle high limits for backup/restores if needed
  app.use(express.json({ limit: "20mb" }));

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // GET App Data from HDD
  app.get("/api/data", async (req, res) => {
    try {
      await fs.access(DATA_FILE);
      const content = await fs.readFile(DATA_FILE, "utf-8");
      res.json(JSON.parse(content));
    } catch (error: any) {
      if (error.code === "ENOENT") {
        // File does not exist yet, return empty object
        res.json({});
      } else {
        console.error("Error reading data file:", error);
        res.status(500).json({ error: "Failed to read data from HDD" });
      }
    }
  });

  // POST App Data to HDD (save data securely)
  app.post("/api/data", async (req, res) => {
    try {
      const data = req.body;
      await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
      res.json({ status: "success", savedAt: new Date().toISOString() });
    } catch (error) {
      console.error("Error writing data file:", error);
      res.status(500).json({ error: "Failed to write data to HDD" });
    }
  });

  // GET Server-Side Archives List
  app.get("/api/archives", async (req, res) => {
    try {
      const files = await fs.readdir(process.cwd());
      const archives = [];
      for (const file of files) {
        if (file.startsWith("archive-") && file.endsWith(".json")) {
          const filePath = path.join(process.cwd(), file);
          const stat = await fs.stat(filePath);
          archives.push({
            filename: file,
            createdAt: stat.mtime.toISOString(),
            size: stat.size
          });
        }
      }
      res.json(archives);
    } catch (error) {
      console.error("Error enumerating archives:", error);
      res.status(500).json({ error: "Failed to list archives" });
    }
  });

  // POST Create Server-Side Archive
  app.post("/api/archive/save", async (req, res) => {
    try {
      const { filename, data } = req.body;
      if (!filename || !filename.startsWith("archive-") || !filename.endsWith(".json")) {
        return res.status(400).json({ error: "Invalid archive filename. Must be like archive-2026.json" });
      }
      const filePath = path.join(process.cwd(), filename);
      await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
      res.json({ status: "success", filename, savedAt: new Date().toISOString() });
    } catch (error) {
      console.error("Error saving archive:", error);
      res.status(500).json({ error: "Failed to save archive file" });
    }
  });

  // POST Load Server-Side Archive
  app.post("/api/archive/load", async (req, res) => {
    try {
      const { filename } = req.body;
      if (!filename || !filename.startsWith("archive-") || !filename.endsWith(".json")) {
        return res.status(400).json({ error: "Invalid archive filename" });
      }
      const filePath = path.join(process.cwd(), filename);
      const content = await fs.readFile(filePath, "utf-8");
      res.json(JSON.parse(content));
    } catch (error: any) {
      console.error("Error loading archive:", error);
      if (error.code === "ENOENT") {
        res.status(444).json({ error: "Archive file not found" });
      } else {
        res.status(500).json({ error: "Failed to read archive file" });
      }
    }
  });

  // DELETE Server-Side Archive
  app.delete("/api/archive/:filename", async (req, res) => {
    try {
      const { filename } = req.params;
      if (!filename || !filename.startsWith("archive-") || !filename.endsWith(".json")) {
        return res.status(400).json({ error: "Invalid archive filename" });
      }
      const filePath = path.join(process.cwd(), filename);
      await fs.unlink(filePath);
      res.json({ status: "success" });
    } catch (error) {
      console.error("Error deleting archive:", error);
      res.status(500).json({ error: "Failed to delete archive file" });
    }
  });

  // Serve Vite app in Dev / static files in Prod
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    // Support modern Vite assets as well as general routes fallback
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log(`Persistent data stored on HDD at: ${DATA_FILE}`);
  });
}

startServer();
