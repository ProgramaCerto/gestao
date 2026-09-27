export function parseMarkdown(md: string): string {
  if (!md) return "";
  let html = md;

  // Unescape standard template patterns
  html = html.replace(/\\`/g, "`");

  // Remove standalone project tags from standard paragraph text output
  html = html.replace(/\[\s*(abir|abrir)\s+projeto\s*\]/gi, "");
  html = html.replace(/\[\s*(finalizar|enviar)\s+projeto\s*\]/gi, "");

  // Convert standard Markdown Images and Links first
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="max-w-full h-auto rounded-xl my-4 border border-zinc-200 shadow-sm" />');
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline font-medium">$1</a>');

  const codeBlocks: string[] = [];

  // Helper to build auto-executing / auto-rendering iframe container (no pre boxes, no run buttons)
  const renderAutoExecBlock = (rawCode: string) => {
    let cleaned = rawCode.trim();
    if (cleaned.startsWith("[")) cleaned = cleaned.slice(1).trim();
    if (cleaned.endsWith("]")) cleaned = cleaned.slice(0, -1).trim();
    cleaned = cleaned.replace(/^```[a-z0-9]*\n?/i, "").replace(/\n?```$/i, "").trim();

    const hasHtml = /<[a-z][\s\S]*>/i.test(cleaned);

    let fullDoc = "";
    if (hasHtml) {
      fullDoc = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { margin: 0; padding: 12px; font-family: system-ui, -apple-system, sans-serif; color: #18181b; background: transparent; }
    img { max-width: 100%; height: auto; border-radius: 12px; display: block; }
  </style>
</head>
<body>
  ${cleaned}
</body>
</html>`;
    } else {
      fullDoc = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { margin: 0; padding: 12px; font-family: monospace; font-size: 13px; color: #10b981; background: #09090b; border-radius: 12px; }
    .log-line { padding: 4px 0; border-bottom: 1px solid #18181b; word-break: break-all; }
    .log-err { color: #f87171; }
  </style>
</head>
<body>
  <div id="output"></div>
  <script>
    (function() {
      const out = document.getElementById('output');
      function print(msg, isErr) {
        const div = document.createElement('div');
        div.className = 'log-line' + (isErr ? ' log-err' : '');
        div.textContent = typeof msg === 'object' ? JSON.stringify(msg, null, 2) : String(msg);
        out.appendChild(div);
      }
      const origLog = console.log;
      console.log = function(...args) {
        origLog.apply(console, args);
        print(args.join(' '));
      };
      const origErr = console.error;
      console.error = function(...args) {
        origErr.apply(console, args);
        print(args.join(' '), true);
      };
      try {
        ${cleaned}
      } catch(e) {
        print('Erro: ' + (e.message || e), true);
      }
    })();
  </script>
</body>
</html>`;
    }

    const srcdocAttr = fullDoc
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;");

    return `<div class="my-6 rounded-2xl border border-zinc-200 overflow-hidden shadow-xs bg-white">
  <iframe
    srcdoc="${srcdocAttr}"
    class="w-full min-h-[140px] border-0 bg-transparent block"
    sandbox="allow-scripts allow-same-origin"
    onload="try { this.style.height = Math.max(120, (this.contentWindow.document.body.scrollHeight + 24)) + 'px'; } catch(e) {}"
  ></iframe>
</div>`;
  };

  // 1. Match code blocks that are wrapped in [ ... ] or contain [ ... ]
  html = html.replace(/(?:\[\s*\n*)?```([a-z0-9]*)\n([\s\S]*?)\n```(?:\s*\n*\])?/g, (match, lang, code) => {
    const trimmedMatch = match.trim();
    const outerMatch = trimmedMatch.startsWith("[") && trimmedMatch.endsWith("]");
    const innerMatch = code.trim().startsWith("[") && code.trim().endsWith("]");

    if (outerMatch || innerMatch) {
      const placeholder = `___CODE_BLOCK_${codeBlocks.length}___`;
      codeBlocks.push(renderAutoExecBlock(code));
      return placeholder;
    }

    // Normal static code block (reading mode)
    const escapedCode = code.trim()
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    const placeholder = `___CODE_BLOCK_${codeBlocks.length}___`;
    codeBlocks.push(`
      <div class="code-block-wrapper my-5 rounded-2xl overflow-hidden border border-zinc-800 bg-[#0d1117] shadow-md code-copyable select-text">
        <div class="flex items-center justify-between px-4 py-2 bg-zinc-900/90 border-b border-zinc-800 select-none">
          <span class="text-[11px] font-mono font-bold uppercase tracking-wider text-blue-400">${lang || "código"}</span>
          <button type="button" onclick="(function(btn){const code = btn.closest('.code-block-wrapper').querySelector('code').innerText; navigator.clipboard.writeText(code); btn.innerText='Copiado!'; setTimeout(()=>btn.innerText='Copiar código', 2000);})(this)" class="px-2.5 py-1 text-[11px] font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg transition-colors cursor-pointer">
            Copiar código
          </button>
        </div>
        <pre class="p-4 m-0 overflow-x-auto font-mono text-sm text-zinc-100 bg-transparent code-copyable select-text"><code class="font-mono text-sm text-zinc-100 language-${lang || "typescript"} code-copyable select-text">${escapedCode}</code></pre>
      </div>
    `);
    return placeholder;
  });

  // 2. Match any remaining standalone [ ... ] blocks (e.g. [ <img src="..." /> ])
  html = html.replace(/\[\s*\n([\s\S]*?)\n\s*\]/g, (match, innerContent) => {
    // Make sure it's not a placeholder
    if (innerContent.includes("___CODE_BLOCK_")) return match;
    const placeholder = `___CODE_BLOCK_${codeBlocks.length}___`;
    codeBlocks.push(renderAutoExecBlock(innerContent));
    return placeholder;
  });

  // Inline code strings
  const inlineCodes: string[] = [];
  html = html.replace(/`([^`\n]+)`/g, (_, code) => {
    const escaped = code.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const placeholder = `___INLINE_CODE_${inlineCodes.length}___`;
    inlineCodes.push(`<code class='bg-zinc-100 dark:bg-zinc-800 font-mono px-1.5 py-0.5 rounded text-blue-600 dark:text-blue-400 text-sm border border-zinc-200 dark:border-zinc-700'>${escaped}</code>`);
    return placeholder;
  });

  // Parse Markdown Tables (| col1 | col2 |)
  const tableRegex = /^\|(.+)\|\s*\n\|([-:\s|]+)\|\s*\n((?:\|.+\|\s*\n?)+)/gm;
  html = html.replace(tableRegex, (match, headerLine, alignLine, bodyLines) => {
    const headers = headerLine.split("|").map((h: string) => h.trim()).filter((h: string) => h.length > 0);
    const rows = bodyLines.trim().split("\n").map((rowStr: string) => {
      return rowStr.split("|").map((c: string) => c.trim()).filter((c: string, idx: number, arr: string[]) => idx > 0 && idx < arr.length - 1);
    });

    let tableHtml = `<div class="overflow-x-auto my-6 rounded-xl border border-zinc-200 shadow-sm bg-white text-zinc-900">
      <table class="min-w-full divide-y divide-zinc-200 text-sm text-left">
        <thead class="bg-zinc-100 font-bold text-zinc-800 uppercase tracking-wider text-xs">
          <tr>`;
    headers.forEach((h: string) => {
      tableHtml += `<th class="px-4 py-3 border-b border-zinc-200 font-extrabold">${h}</th>`;
    });
    tableHtml += `</tr></thead><tbody class="divide-y divide-zinc-200 bg-white">`;

    rows.forEach((row: string[]) => {
      tableHtml += `<tr class="hover:bg-zinc-50 transition-colors">`;
      row.forEach((cell: string) => {
        tableHtml += `<cell class="px-4 py-3 text-zinc-700">${cell}</cell>`.replace("<cell", "<td").replace("</cell>", "</td>");
      });
      tableHtml += `</tr>`;
    });

    tableHtml += `</tbody></table></div>`;
    return tableHtml;
  });

  // Restore blockquotes specifically
  html = html.replace(/^>\s+(.+)$/gm, "<blockquote class='border-l-4 border-blue-600 pl-4 py-2 italic text-zinc-700 my-4 bg-blue-50/50 rounded-r-lg'>$1</blockquote>");

  // Bold items
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong class='font-semibold text-zinc-900'>$1</strong>");

  // Handle Headers
  html = html.replace(/^###\s+(.+)$/gm, "<h3 class='text-lg font-bold text-zinc-900 mt-6 mb-2 font-display'>$1</h3>");
  html = html.replace(/^##\s+(.+)$/gm, "<h2 class='text-xl font-bold text-zinc-900 mt-8 mb-3 border-b border-zinc-200 pb-2 font-display'>$1</h2>");
  html = html.replace(/^#\s+(.+)$/gm, "<h1 class='text-2xl font-extrabold text-zinc-900 mt-8 mb-4 font-display'>$1</h1>");

  // Dividers
  html = html.replace(/^---$/gm, "<hr class='my-6 border-zinc-200' />");

  // Process list blocks correctly
  let inList = false;
  const lines = html.split("\n");
  const processedLines = lines.map(line => {
    const trimmed = line.trim();
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      const content = trimmed.substring(2);
      let res = "";
      if (!inList) {
        inList = true;
        res += "<ul class='list-disc pl-5 my-4 space-y-1.5 text-zinc-700'>";
      }
      res += `<li>${content}</li>`;
      return res;
    } else {
      let res = "";
      if (inList) {
        inList = false;
        res += "</ul>";
      }
      return res + line;
    }
  });
  if (inList) {
    processedLines.push("</ul>");
  }
  html = processedLines.join("\n");

  // Format general paragraphs cleanly, avoiding nesting around block HTML tags
  const blockTags = [
    "<h1", "<h2", "<h3", "<ul", "<li", "<pre", "<blockquote", "<hr", "</ul",
    "<table", "<div", "<script", "<iframe", "<style", "<thead", "<tbody", "<tr"
  ];
  html = html.split("\n\n").map(block => {
    const trimmed = block.trim();
    if (!trimmed) return "";
    const startsWithTag = blockTags.some(tag => trimmed.toLowerCase().startsWith(tag));
    if (startsWithTag) return block;
    return `<p class="leading-relaxed mb-4 text-zinc-700">${block}</p>`;
  }).join("\n\n");

  // Restore Code Blocks and Inline Codes
  codeBlocks.forEach((codeHtml, idx) => {
    html = html.replace(`___CODE_BLOCK_${idx}___`, codeHtml);
  });
  inlineCodes.forEach((inlineHtml, idx) => {
    html = html.replace(`___INLINE_CODE_${idx}___`, inlineHtml);
  });

  return html;
}

export function slugify(text: string): string {
  if (!text) return "";
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove accents
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "") // remove special characters
    .replace(/\s+/g, "-") // replace spaces with dash
    .replace(/-+/g, "-"); // remove duplicate dashes
}

export function slugifyCourse(title: string): string {
  return slugify(title) || "curso";
}

export function slugifyLesson(title: string): string {
  return slugify(title) || "aula";
}


