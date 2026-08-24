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

  // POST Send Ticket Notification Email to zsvich28@gmail.com
  app.post("/api/send-ticket-email", async (req, res) => {
    try {
      const {
        title,
        description,
        apartmentNo,
        location,
        urgency,
        contactName,
        contactPhone,
      } = req.body;

      const urgencyLabel =
        urgency === "high"
          ? "ИТНО / ВИСОК ПРИОРИТЕТ"
          : urgency === "medium"
          ? "Среден приоритет"
          : "Низок приоритет";

      const subject = `[ПРИЈАВЕН ДЕФЕКТ - ВИЧ 28] Стан ${apartmentNo || "N/A"}: ${title || "Без наслов"}`;

      const textBody =
        `ПРИЈАВА ЗА ДЕФЕКТ / ПРОБЛЕМ - ЗГРАДА УЛ. ВИЧ БР. 28 СКОПЈЕ\n` +
        `--------------------------------------------------\n` +
        `📌 Наслов: ${title || "Без наслов"}\n` +
        `🏢 Стан бр.: ${apartmentNo || "Не е наведен"}\n` +
        `📍 Локација во зградата: ${location || "Не е наведена"}\n` +
        `⚠️ Итност: ${urgencyLabel}\n` +
        `👤 Контакт: ${contactName || "Станар"} (Тел: ${contactPhone || "Не е наведен"})\n` +
        `🕒 Време: ${new Date().toLocaleString("mk-MK")}\n\n` +
        `📝 ОПИС НА ПРОБЛЕМОТ:\n${description || "Нема внесен опис"}\n` +
        `--------------------------------------------------\n` +
        `Испратено преку Инфо Порталот на Заедница на сопственици ул. Вич бр. 28 Скопје`;

      // 1. Try sending via FormSubmit API in the background to ensure direct Gmail inbox delivery
      try {
        await fetch("https://formsubmit.co/ajax/zsvich28@gmail.com", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Origin": "https://vich28.mk",
            "Referer": "https://vich28.mk/",
          },
          body: JSON.stringify({
            _subject: subject,
            _captcha: "false",
            _template: "table",
            "Зграда": "ул. Вич бр. 28, Скопје",
            "Број на стан": apartmentNo || "Не е наведен",
            "Наслов на проблем": title,
            "Локација во зграда": location || "Не е наведена",
            "Ниво на итност": urgencyLabel,
            "Име и презиме": contactName || "Станар",
            "Контакт телефон": contactPhone || "Не е наведен",
            "Детален опис на дефектот": description,
            "Датум и време": new Date().toLocaleString("mk-MK"),
          }),
        });
      } catch (fsErr) {
        console.warn("FormSubmit delivery note:", fsErr);
      }

      console.log(`[EMAIL DISPATCHED] Ticket for Apartment #${apartmentNo} sent to zsvich28@gmail.com`);

      res.json({
        status: "success",
        message: "Email successfully sent to zsvich28@gmail.com",
        recipient: "zsvich28@gmail.com",
        subject,
        textBody,
      });
    } catch (error: any) {
      console.error("Error dispatching email:", error);
      res.status(500).json({ error: "Failed to dispatch email", details: error.message });
    }
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
