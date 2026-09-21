import express from "express";
import { WebSocketServer } from "ws";
import chokidar from "chokidar";
import fs from "fs";
import open from "open";

const app = express();
const PORT = 3000;

// Serve frontend files
app.use(express.static("public"));

// Start server
app.listen(PORT, () => 
{
    console.log(`Log Viewer running at http://localhost:${PORT}`);
    open(`http://localhost:${PORT}`);
});

app.get("/full-log", (req, res) =>
{
    updateLatestLog();

    const data = fs.readFileSync(latestLog, "utf8");
    const lines = data.split("\n");

    let buffer = [];
    let entries = [];

    for (const raw of lines)
    {
        const line = raw.trimEnd();
        if (!line) continue;

        // Detect VRChat timestamp (allow leading spaces)
        const isNewEntry = /^\s*\d{4}\.\d{2}\.\d{2}\s\d{2}:\d{2}:\d{2}\s/.test(line);

        if (isNewEntry)
        {
            // Flush previous entry
            if (buffer.length > 0)
            {
                entries.push(buffer.join("\n"));
                buffer = [];
            }

            buffer.push(line);
        }
        else        
            buffer.push(raw);
        
    }

    if (buffer.length > 0)    
        entries.push(buffer.join("\n"));
    

    // Convert grouped entries into SteamVR-style JSON
    const jsonLines = entries.map(entry =>
    {
        const firstLine = entry.split("\n")[0];

        return {
            sType: "logmessage",
            sLogName: extractSubsystem(firstLine),
            sLogLevel: extractLevel(firstLine),
            sMessage: entry,
            nTimestamp: Date.now()
        };
    });


    res.json(jsonLines);
});

// WebSocket for live logs
const wss = new WebSocketServer({ port: 3001 });

function extractSubsystem(line)
{
    if (!line) return "[General]";

    // FIX 1: Strip out hidden carriage returns (\r) from line endings safely
    let clean = line.replace(/\r/g, "");

    // Remove Unity HTML rich-text tags like <b>, <color...>, <i>, <size>
    clean = clean.replace(/<[^>]+>/g, "");

    // Match ONLY:  -  [Subsystem]
    let match = clean.match(/-\s*\[([^\]]+)\]/);
    if (match && match[1])
    {
        let name = match[1].trim();

        // Ignore numeric subsystems like, [1], [2]
        if (/^\d+$/.test(name))
            return "[General]";

        return `[${ name }]`;
    }

    // Fallback if no specific bracket pattern found directly after hyphen
    return "[General]";
}

function extractLevel(line)
{
    if (!line) return "debug";

    // FIX 2: Sanitize carriage return before checking level position
    const clean = line.replace(/\r/g, "");
    const match = clean.match(/^\s*\d{4}\.\d{2}\.\d{2}\s\d{2}:\d{2}:\d{2}\s(\w+)/);

    if (!match) return "debug";

    const severity = match[1].toLowerCase();

    if (severity === "error")
        return "error";
    if (severity === "warning")
        return "warning";

    return "debug";
}


// Watch VRChat logs
const logDir = `${process.env.LOCALAPPDATA}Low/VRChat/VRChat`;

let latestLog = null;

// Find newest log file
function updateLatestLog() 
{
    const files = fs.readdirSync(logDir)
        .filter(f => f.startsWith("output_log_"))
        .map(f => `${logDir}/${f}`)
        .sort((a, b) => fs.statSync(b).mtime - fs.statSync(a).mtime);

    latestLog = files[0];
}

updateLatestLog();

let lastSize = 0;

function sendLog(fullMessage)
{
    const firstLine = fullMessage.split("\n")[0];

    const json =
    {
        sType: "logmessage",
        sLogName: extractSubsystem(firstLine),
        sLogLevel: extractLevel(firstLine),
        sMessage: fullMessage,
        nTimestamp: Date.now()
    };

    wss.clients.forEach(c => c.send(JSON.stringify(json)));
}

let currentFile = ""; 

chokidar.watch(logDir).on("change", () =>
{
    updateLatestLog();

    if (currentFile !== latestLog)
    {
        currentFile = latestLog;
        lastSize = 0; // NEW FILE → reset offset
    }

    const stats = fs.statSync(latestLog);

    const stream = fs.createReadStream(latestLog, {
        start: lastSize,
        end: stats.size,
        encoding: "utf8"
    });

    let buffer = "";

    stream.on("data", chunk =>
    {
        const lines = chunk.split("\n");

        for (const raw of lines)
        {
            const line = raw.trimEnd();
            if (!line) continue;

            // Match VRChat timestamp (allow leading spaces)
            const isNewEntry = /^\s*\d{4}\.\d{2}\.\d{2}\s\d{2}:\d{2}:\d{2}\s/.test(line);

            if (isNewEntry)
            {
                if (buffer.length > 0)
                {
                    sendLog(buffer);
                    buffer = "";
                }

                buffer = line;
            }
            else            
                buffer += "\n" + raw;
            
        }
    });

    stream.on("end", () =>
    {
        if (buffer.length > 0) 
            sendLog(buffer);
    });

    lastSize = stats.size;
});
