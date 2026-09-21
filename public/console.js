var g_ConsoleColors = {
    "Errors": "255, 80, 80",
    "Warnings": "255, 200, 80",
    "Debug": "180, 180, 255",
    // Core VRChat systems
    "[Behaviour]": "255, 230, 180",
    "[API]": "255, 200, 0",
    "[Video Playback]": "0, 200, 255",
    "[TextureManagement]": "255, 255, 0",
    "[AssetBundleDownloadManager]": "0, 255, 150",

    // Avatar / Udon / World systems
    "[Avatar]": "200, 150, 255",
    "[AvatarScalingSettings]": "180, 140, 255",
    "[UdonBehaviour]": "255, 140, 200",

    // AVPro / Media systems
    "[AVProMovieCapture]": "255, 180, 120",
    "[AVProVideo]": "255, 160, 100",

    // Download systems
    "[String Download]": "120, 255, 200",
    "[Image Download]": "120, 255, 230",

    // Purchasing / EOS / Online systems
    "[Purchasing]": "255, 220, 120",
    "[EOSManager]": "120, 200, 255",

    // Camera / Loading / Settings / UI systems
    "[VRC Stacked Camera System]": "200, 255, 200",
    "[LoadingScreenManager]": "255, 200, 200",
    "[SettingsManager]": "200, 255, 255",
    "[DebugUI]": "255, 150, 150",
    "[UserInfoLogger]": "255, 180, 180",
    "[LOADER]": "255, 100, 255",
    "[SteamManager]": "180, 220, 255",
    "[LOCALIZATION]": "255, 255, 180",

    // Misc
    "[GC]": "200, 200, 200",

    // Fallback
    "[General]": "255, 255, 255"
};

var g_ConsoleHeaderOrder = [
    "Combined",
    "Errors",
    "Warnings",
    "Debug",
    "[General]",
    
    "[Behaviour]",
    "[API]",
    "[Video Playback]",
    "[TextureManagement]",
    "[AssetBundleDownloadManager]",

    "[Avatar]",
    "[AvatarScalingSettings]",
    "[UdonBehaviour]",

    "[AVProMovieCapture]",
    "[AVProVideo]",

    "[String Download]",
    "[Image Download]",

    "[Purchasing]",
    "[EOSManager]",

    "[VRC Stacked Camera System]",
    "[LoadingScreenManager]",
    "[SettingsManager]",
    "[DebugUI]",
    "[UserInfoLogger]",
    "[LOADER]",
    "[SteamManager]",
    "[LOCALIZATION]",

    "[GC]"
];

var g_Console = new CConsole();

$(document).ready(
    function ()
    {
        g_Console.OnReady();
    });


function CConsole()
{
    this.m_nInstanceId = 0;
    this.m_bShowLogName = false;
    this.m_bShowDate = true;
    this.m_bEnterKeyDown = false;
    this.m_LogLinks = {};
    this.m_LogConsoles = {};
    this.m_LogLines = {};
    this.m_aCommandHistory = [];
    this.m_nCommandHistoryIdx = -1;
    this.m_sCurrentCommand = "";
    this.m_elTopPanel = null;
    this.m_elBottomPanel = null;
    this.m_observerTopPanel = null;
    this.m_elBottomPanelObserver = null;
    this.m_bAllowConsoleSelectorHiding = false;
}


CConsole.prototype.OnReady = function ()
{
    g_Console.m_elConsoleParent = document.getElementById("console_parent");
    g_Console.m_elShowLogNameCheckbox = document.getElementById("console_show_logname");
    g_Console.m_elShowDateCheckbox = document.getElementById("console_show_date");
    g_Console.m_elFilterText = document.getElementById("filter_text");
    g_Console.m_elConsoleCommand = document.getElementById("console_command");
    g_Console.m_elConsoleSelector = document.getElementById("console_selector");
    g_Console.m_elConsoleSelectorButton = document.getElementById("console_selector_button");
    g_Console.m_elConsoleClearLog = document.getElementById("console_clear_log");
    g_Console.m_elConsoleClearAllLogs = document.getElementById("console_clear_all_logs");
    g_Console.m_elConsoleSelectorButton = document.getElementById("console_selector_button");

    g_Console.m_elConsoleSelectorButton.onclick = function () { g_Console.ShowConsoleSelector() };
    g_Console.m_elConsoleClearLog.onclick = function () { g_Console.ClearLog() };
    g_Console.m_elConsoleClearAllLogs.onclick = function () { g_Console.ClearAllLogs() };
    g_Console.m_elShowLogNameCheckbox.onclick = function () { g_Console.OnToggleShowLogName() };
    g_Console.m_elShowDateCheckbox.onclick = function () { g_Console.OnToggleShowDate() };

    let sShowLogName = localStorage.getItem("showlogname");
    if (sShowLogName != undefined)    
        g_Console.m_bShowLogName = (sShowLogName == "1" ? true : false);
    
    $(g_Console.m_elShowLogNameCheckbox).prop("checked", g_Console.m_bShowLogName);

    let sShowDate = localStorage.getItem("showdate");
    if (sShowDate != undefined)    
        g_Console.m_bShowDate = (sShowDate == "1" ? true : false);
    
    $(g_Console.m_elShowDateCheckbox).prop("checked", g_Console.m_bShowDate);

    window.addEventListener("resize", g_Console.OnResize);

    document.addEventListener("click", g_Console.OnClick)
    window.addEventListener("keydown", g_Console.OnKeyDown);

    g_Console.m_elFilterText.addEventListener("input", g_Console.OnFilterTextChange);

    g_Console.AddLogConsole("Combined");
    g_Console.AddLogConsole("Errors");
    g_Console.AddLogConsole("Warnings");
    g_Console.AddLogConsole("Debug");
    g_Console.SetActiveLog("Combined");

    g_Console.ClearAllLogs();

    fetch("/full-log")
        .then(r => r.json())
        .then(lines =>
        {
            for (const msg of lines)
            {
                g_Console.OnLogMessage(msg);
            }
        });

    g_Console.OpenWebSocketToHost();

    var history = localStorage.getItem("commandHistory");
    if (history)    
        g_Console.m_aCommandHistory = JSON.parse(history);
    
    g_Console.m_elTopPanel = document.getElementById("page_top_panel");
    g_Console.m_elBottomPanel = document.getElementById("page_bottom_panel");

    var observerConfig = { childList: true, subtree: true };
    var onMutation = function (mutationsList, observer) { g_Console.UpdateVerticalMargins(); }.bind(g_Console);

    g_Console.m_observerTopPanel = new MutationObserver(onMutation);
    g_Console.m_elBottomPanelObserver = new MutationObserver(onMutation);

    g_Console.m_observerTopPanel.observe(g_Console.m_elTopPanel, observerConfig);
    g_Console.m_elBottomPanelObserver.observe(g_Console.m_elBottomPanel, observerConfig);

    g_Console.UpdateVerticalMargins();
    g_Console.UpdateBodyClasses();

    g_Console.m_elConsoleCommand.focus();
}

CConsole.prototype.UpdateVerticalMargins = function (mutationsList, observer)
{
    if (g_Console.m_elTopPanel === null || g_Console.m_elBottomPanel === null || g_Console.m_elConsoleParent === null)    
        return;
    

    let nAdditionalPadding = 15;
    g_Console.m_elConsoleParent.style.paddingTop = (nAdditionalPadding + g_Console.m_elTopPanel.clientHeight) + "px";
    g_Console.m_elConsoleParent.style.paddingBottom = (nAdditionalPadding + g_Console.m_elBottomPanel.clientHeight) + "px";
}

CConsole.prototype.OnNewServerInstance = function ()
{
    g_Console.SetActiveLog("Combined");

    g_Console.ClearAllLogs();
    g_Console.OpenWebSocketToHost();
}

CConsole.prototype.OpenWebSocketToHost = function ()
{
    g_Console.m_wsWebSocketToServer = new WebSocket("ws://localhost:3001");
    g_Console.m_wsWebSocketToServer.addEventListener("open", g_Console.OnWebSocketOpen);
    g_Console.m_wsWebSocketToServer.addEventListener("message", g_Console.OnWebSocketMessage);
}

CConsole.prototype.OnWebSocketOpen = function (event)
{
    g_Console.WebSocketSend("console_open");

    window.addEventListener(
        "beforeunload",
        function ()
        {
            g_Console.WebSocketSend("console_close");
        });
}

CConsole.prototype.WebSocketSend = function (sData)
{
    if (g_Console.m_wsWebSocketToServer == undefined)
        return;

    if (g_Console.m_wsWebSocketToServer.readyState != 1)
        return;

    g_Console.m_wsWebSocketToServer.send(sData);
}

CConsole.prototype.OnWebSocketMessage = function (event)
{
    let jsonMessage = JSON.parse(event.data);

    if (!("sType" in jsonMessage))
        return;

    if (jsonMessage["sType"] == "logmessage")    
        g_Console.OnLogMessage(jsonMessage);    
}

CConsole.prototype.AddLogToConsoleSelector = function (sLogName)
{
    if (sLogName in g_Console.m_LogLinks)
        return;

    let nIndex = g_ConsoleHeaderOrder.indexOf(sLogName);
    if (nIndex == -1)
        nIndex = 999999;

    let elNewElement = document.createElement("div");

    $(elNewElement).data("sLogName", sLogName);
    $(elNewElement).data("nIndex", nIndex);

    $(elNewElement).toggleClass("log_link", true);
    elNewElement.style.setProperty("--log_link_color", g_Console.GetLogColor(sLogName));

    elNewElement.addEventListener("click", () =>
    {
        g_Console.SetActiveLog(sLogName);
        g_Console.OnFilterTextChange();
    });

    elNewElement.innerHTML = sLogName;

    g_Console.m_LogLinks[sLogName] = elNewElement;

    let elReferenceNode = undefined;
    for (let i = 0; i < g_Console.m_elConsoleSelector.children.length; i++)
    {
        if (nIndex <= $(g_Console.m_elConsoleSelector.children[i]).data("nIndex"))
        {
            elReferenceNode = g_Console.m_elConsoleSelector.children[i];
            break;
        }
    }
    g_Console.m_elConsoleSelector.insertBefore(elNewElement, elReferenceNode);
}

CConsole.prototype.UpdateLogLinkLabel = function (sLogName)
{
    let elLink = g_Console.m_LogLinks[sLogName];
    elLink.innerHTML = "<span class='label'>" + g_Console.GetLogDisplayName(sLogName) + "</span>";

    if (g_Console.m_LogLines[sLogName])    
        elLink.innerHTML += "<span class='badge'>" + g_Console.m_LogLines[sLogName] + "</span>";
    
}

CConsole.prototype.AddLogConsole = function (sLogName)
{
    if (sLogName in g_Console.m_LogConsoles)
        return;

    g_Console.AddLogToConsoleSelector(sLogName);

    let elNewConsole = document.createElement("div");
    $(elNewConsole).attr("id", "console");
    $(elNewConsole).data("sLogName", sLogName);

    g_Console.m_LogConsoles[sLogName] = elNewConsole;
    g_Console.m_LogLines[sLogName] = 0;
}

CConsole.prototype.AddLogMessageToConsole = function (sLogName, jsonLogMessage)
{
    if (sLogName == undefined)
        return;

    let elConsole = g_Console.m_LogConsoles[sLogName];
    if (elConsole == undefined)
        return;

    let bScrolledToBottom = document.documentElement.scrollHeight - document.documentElement.clientHeight <= document.documentElement.scrollTop + 1;
    let regexDatePrefix = /^[0-9]{4}\.[0-9]{2}\.[0-9]{2}\s[0-9]{2}:[0-9]{2}:[0-9]{2}/;
    let regexHyphenPrefix = / \- /i;
    //let regexSubsystemPrefix = /^\s\-\s\[(.*?)\]/i;
    let regexSubsystemPrefix = /\-\s*\[(.*?)\]/i;
    let elNewElement = document.createElement("div");
    $(elNewElement).toggleClass("row", true);

    let nTimestamp = jsonLogMessage["nTimestamp"];
    $(elNewElement).data("nTimestamp", nTimestamp);

    elNewElement.innerHTML = "<div class='row logname'>" + jsonLogMessage["sLogName"] + "</div>";

    jsonLogMessage["sMessage"] = jsonLogMessage["sMessage"].replace(/</g, "&lt;");
    jsonLogMessage["sMessage"] = jsonLogMessage["sMessage"].replace(/>/g, "&gt;");

    let sSystemName = jsonLogMessage["sLogName"];
    let dateMatches = jsonLogMessage["sMessage"].match(regexDatePrefix);
    if (dateMatches != undefined)
    {
        let sStripped = jsonLogMessage["sMessage"].slice(dateMatches[0].length);
        let systemMatches = sStripped.match(regexSubsystemPrefix);
        if (systemMatches != undefined && systemMatches[1] != undefined)
        {
            let sAlternateName = "[" + systemMatches[1] + "]";
            if (sAlternateName in g_ConsoleColors)            
                sSystemName = sAlternateName;            
        }
    }

    var sMessage = jsonLogMessage["sMessage"];
    sMessage = sMessage.replace(regexDatePrefix, "<span class='row date'>" + "$&" + "</span>");
    sMessage = sMessage.replace(regexHyphenPrefix, "<span class='row hyphen'>" + "$&" + "</span>");
    elNewElement.innerHTML += sMessage;

    let sFilter = g_Console.m_elFilterText.value.toLowerCase();
    if (sFilter.length !== 0 && elNewElement.innerText.toLowerCase().indexOf(sFilter) < 0)    
        elNewElement.classList.add("hidden");    

    if (jsonLogMessage["sLogLevel"] == "warning")    
        $(elNewElement).toggleClass("warning", true);    
    else if (jsonLogMessage["sLogLevel"] == "error")    
        $(elNewElement).toggleClass("error", true);    
    else if (sSystemName in g_ConsoleColors)    
        $(elNewElement).css("color", "rgb(" + g_ConsoleColors[sSystemName] + ")");    

    if (!nTimestamp || (elConsole.children.length == 0) || (nTimestamp >= $(elConsole.children[elConsole.children.length - 1]).data("nTimestamp")))    
        elConsole.appendChild(elNewElement);    
    else if (nTimestamp <= $(elConsole.children[0]).data("nTimestamp"))    
        elConsole.insertBefore(elNewElement, elConsole.children[0]);    
    else
    {
        let elReferenceNode = undefined;
        for (let i = elConsole.children.length - 1; i >= 0; i--)
        {
            if (nTimestamp >= $(elConsole.children[i]).data("nTimestamp"))
            {
                elReferenceNode = elConsole.children[i + 1];
                break;
            }
        }
        elConsole.insertBefore(elNewElement, elReferenceNode);
    }

    if (bScrolledToBottom)    
        document.documentElement.scrollTop = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    

    g_Console.m_LogLines[sLogName]++;
    g_Console.UpdateLogLinkLabel(sLogName);
}

CConsole.prototype.IsActiveLog = function (sLogName)
{
    let elNewActiveLink = g_Console.m_LogLinks[sLogName];
    if (elNewActiveLink == undefined)
        return false;

    let elNewConsole = g_Console.m_LogConsoles[sLogName];
    if (elNewConsole == undefined)
        return false;

    if (g_Console.m_elConsole != elNewConsole)
        return false;

    return true;
}

CConsole.prototype.GetLogDisplayName = function (sLogName)
{
    if (sLogName == "Combined")    
        return "All Logs";
    

    return sLogName;
}

CConsole.prototype.GetLogColor = function (sLogName)
{
    let sLogColor = g_ConsoleColors[sLogName];
    if (sLogColor == undefined)    
        sLogColor = "255, 255, 255";
    

    return sLogColor;
}


CConsole.prototype.SetActiveLog = function (sLogName)
{
    if (g_Console.IsActiveLog(sLogName))
    {
        g_Console.SetScrollToBottom();
        return;
    }

    let elNewActiveLink = g_Console.m_LogLinks[sLogName];
    let elNewConsole = g_Console.m_LogConsoles[sLogName];

    let headerLinks = document.querySelectorAll(".log_link");
    for (let elLink of headerLinks)    
        $(elLink).toggleClass("active", false);
    

    $(elNewActiveLink).toggleClass("active", true);

    if (g_Console.m_elConsole != undefined)    
        g_Console.m_elConsole.remove();
    

    g_Console.m_elConsoleParent.appendChild(elNewConsole);
    g_Console.m_elConsole = elNewConsole;

    g_Console.m_elConsoleSelectorButton.innerHTML = g_Console.GetLogDisplayName(sLogName);
    g_Console.m_elConsoleSelectorButton.style.setProperty("--log_link_color", g_Console.GetLogColor(sLogName));

    let evResize = new Event("resize");
    window.dispatchEvent(evResize);
}


CConsole.prototype.OnLogMessage = function (jsonLogMessage)
{
    if (g_Console.m_elConsole == undefined)
        return;

    if (jsonLogMessage["sMessage"] == undefined)
        return;

    let sLogName = jsonLogMessage["sLogName"];
    if (sLogName == undefined)
        return;

    g_Console.AddLogConsole(sLogName);
    g_Console.AddLogMessageToConsole("Combined", jsonLogMessage);
    if (sLogName != "Combined")    
        g_Console.AddLogMessageToConsole(sLogName, jsonLogMessage);
    if (jsonLogMessage.sLogLevel === "error")    
        g_Console.AddLogMessageToConsole("Errors", jsonLogMessage);    
    else if (jsonLogMessage.sLogLevel === "warning")    
        g_Console.AddLogMessageToConsole("Warnings", jsonLogMessage);    
    else    
        g_Console.AddLogMessageToConsole("Debug", jsonLogMessage);
}


CConsole.prototype.OnResize = function ()
{
    g_Console.UpdateVerticalMargins();
    g_Console.SetScrollToBottom();
}


CConsole.prototype.OnClick = function ()
{
    if (g_Console.m_bAllowConsoleSelectorHiding)    
        g_Console.HideConsoleSelector();
    
}


CConsole.prototype.SetScrollToBottom = function ()
{
    document.documentElement.scrollTop = document.documentElement.scrollHeight - document.documentElement.clientHeight;
}


CConsole.prototype.OnKeyDown = function (event)
{
    if (event.key != "Enter")    
        g_Console.HideConsoleSelector();
    
}

CConsole.prototype.OnFilterTextChange = function (event)
{
    let bScrolledToBottom = document.documentElement.scrollHeight - document.documentElement.clientHeight <= document.documentElement.scrollTop + 1;

    let sFilter = g_Console.m_elFilterText.value.toLowerCase();

    let rows = g_Console.m_elConsole.children;
    for (let i = 0; i < rows.length; i++)
    {
        let row = rows[i];
        if (sFilter.length === 0 || row.innerText.toLowerCase().indexOf(sFilter) >= 0)        
            row.classList.remove("hidden");        
        else        
            row.classList.add("hidden");        
    }

    if (bScrolledToBottom)    
        document.documentElement.scrollTop = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    
}


CConsole.prototype.HideConsoleSelector = function ()
{
    g_Console.m_bAllowConsoleSelectorHiding = false;
    g_Console.m_elConsoleSelector.classList.add("hidden");
}


CConsole.prototype.ShowConsoleSelector = function ()
{
    g_Console.m_elConsoleSelector.classList.remove("hidden");

    let rectBtn = g_Console.m_elConsoleSelectorButton.getBoundingClientRect();
    g_Console.m_elConsoleSelector.style.setProperty("--drop-down-left", rectBtn.x + "px");
    g_Console.m_elConsoleSelector.style.setProperty("--drop-down-top", rectBtn.y + "px");

    setTimeout(() =>
    {
        if (!g_Console.m_elConsoleSelector.classList.contains("hidden"))        
            g_Console.m_bAllowConsoleSelectorHiding = true;
        
    }, 100);
}


CConsole.prototype.ToggleConsoleSelector = function ()
{
    if (g_Console.m_elConsoleSelector.classList.contains("hidden"))    
        g_Console.ShowConsoleSelector();    
    else    
        g_Console.HideConsoleSelector();    
}


CConsole.prototype.ClearAllLogs = function ()
{
    Object.keys(g_Console.m_LogLines).forEach(function (key)
    {
        g_Console.m_LogLines[key] = 0;
        g_Console.UpdateLogLinkLabel(key);
    });

    Object.keys(g_Console.m_LogConsoles).forEach(function (key)
    {
        let elConsole = g_Console.m_LogConsoles[key];
        while (elConsole.firstChild)        
            elConsole.removeChild(elConsole.firstChild);
        
    });
}


CConsole.prototype.ClearLog = function ()
{
    while (g_Console.m_elConsole.firstChild)    
        g_Console.m_elConsole.removeChild(g_Console.m_elConsole.firstChild);
    

    let sLogName = $(g_Console.m_elConsole).data("sLogName");
    g_Console.m_LogLines[sLogName] = 0;
    g_Console.UpdateLogLinkLabel(sLogName);
}


CConsole.prototype.OnToggleShowLogName = function ()
{
    g_Console.m_bShowLogName = $(g_Console.m_elShowLogNameCheckbox).is(":checked");
    localStorage.setItem("showlogname", g_Console.m_bShowLogName ? "1" : "0");

    g_Console.UpdateBodyClasses();
    g_Console.OnFilterTextChange();
}


CConsole.prototype.OnToggleShowDate = function ()
{
    g_Console.m_bShowDate = $(g_Console.m_elShowDateCheckbox).is(":checked");
    localStorage.setItem("showdate", g_Console.m_bShowDate ? "1" : "0");

    g_Console.UpdateBodyClasses();
    g_Console.OnFilterTextChange();
}


CConsole.prototype.UpdateBodyClasses = function ()
{
    let bScrolledToBottom = document.documentElement.scrollHeight - document.documentElement.clientHeight <= document.documentElement.scrollTop + 1;

    document.body.classList = [];

    if (g_Console.m_bShowLogName)    
        document.body.classList.add("show-log-name");    

    if (g_Console.m_bShowDate)    
        document.body.classList.add("show-log-date");    

    if (bScrolledToBottom)    
        document.documentElement.scrollTop = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    
}
