import { Check, Copy } from "lucide-react";
import { useState } from "react";

import { cn } from "@/utils/cn";

const PYTHON_KEYWORDS = [
  "import",
  "from",
  "as",
  "def",
  "return",
  "for",
  "in",
  "if",
  "else",
  "elif",
  "while",
  "with",
  "try",
  "except",
  "class",
  "True",
  "False",
  "None",
  "and",
  "or",
  "not",
  "lambda",
];

const SQL_KEYWORDS = [
  "select",
  "from",
  "where",
  "group",
  "by",
  "order",
  "having",
  "join",
  "left",
  "right",
  "inner",
  "outer",
  "on",
  "as",
  "with",
  "case",
  "when",
  "then",
  "else",
  "end",
  "limit",
  "offset",
  "distinct",
  "count",
  "sum",
  "avg",
  "min",
  "max",
  "round",
  "desc",
  "asc",
];

type TokenKind = "plain" | "string" | "comment" | "keyword" | "number" | "function";

function tokenize(code: string, language: "sql" | "python"): Array<{ text: string; kind: TokenKind }> {
  const keywords = language === "sql" ? SQL_KEYWORDS : PYTHON_KEYWORDS;
  const pattern = new RegExp(
    [
      language === "sql" ? "--[^\\n]*" : "#[^\\n]*",
      "/\\*[\\s\\S]*?\\*/",
      "'''(?:[^'\\\\]|\\\\.)*'''",
      '"""(?:[^"\\\\]|\\\\.)*"""',
      "'(?:[^'\\\\]|\\\\.)*'",
      '"(?:[^"\\\\]|\\\\.)*"',
      "\\b\\d+(?:\\.\\d+)?\\b",
      "\\b[A-Za-z_][A-Za-z0-9_]*\\b",
    ].join("|"),
    "g",
  );

  const tokens: Array<{ text: string; kind: TokenKind }> = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(code)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ text: code.slice(lastIndex, match.index), kind: "plain" });
    }
    const text = match[0];
    let kind: TokenKind = "plain";
    if (text.startsWith("--") || text.startsWith("#") || text.startsWith("/*")) {
      kind = "comment";
    } else if (text.startsWith("'") || text.startsWith('"')) {
      kind = "string";
    } else if (/^\d/.test(text)) {
      kind = "number";
    } else if (keywords.includes(text.toLowerCase())) {
      kind = "keyword";
    } else if (code[match.index + text.length] === "(") {
      kind = "function";
    }
    tokens.push({ text, kind });
    lastIndex = match.index + text.length;
  }
  if (lastIndex < code.length) tokens.push({ text: code.slice(lastIndex), kind: "plain" });
  return tokens;
}

const TOKEN_CLASS: Record<TokenKind, string> = {
  plain: "text-paper-dim",
  string: "text-success",
  comment: "text-faint italic",
  keyword: "text-signal-soft",
  number: "text-warning",
  function: "text-paper",
};

export function CodeBlock({
  code,
  language,
  label,
  caption,
  className,
}: {
  code: string;
  language: "sql" | "python";
  label: string;
  caption?: string | null;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const tokens = tokenize(code, language);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <figure className={cn("border border-line bg-ink-950", className)}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
        <div>
          <figcaption className="font-mono text-[0.58rem] uppercase tracking-[0.16em] text-paper-dim">
            {label}
          </figcaption>
          {caption ? (
            <p className="mt-1 text-[0.68rem] leading-relaxed text-faint">{caption}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center gap-1.5 border border-line px-2 py-1 font-mono text-[0.52rem] uppercase tracking-[0.12em] text-muted transition-colors hover:border-paper hover:text-paper"
        >
          {copied ? <Check className="size-3" aria-hidden="true" /> : <Copy className="size-3" aria-hidden="true" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="scrollbar-none overflow-x-auto p-4 text-[0.78rem] leading-[1.7]">
        <code className="font-mono">
          {tokens.map((token, index) => (
            <span key={index} className={TOKEN_CLASS[token.kind]}>
              {token.text}
            </span>
          ))}
        </code>
      </pre>
    </figure>
  );
}
