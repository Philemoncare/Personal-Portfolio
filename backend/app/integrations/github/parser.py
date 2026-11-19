"""Deterministic README and manifest parsing.

Nothing here invents project facts. Missing information becomes the explicit
sentinel "Not documented in repository." and technology claims always carry the
evidence that produced them.
"""

from __future__ import annotations

import json
import posixpath
import re
from typing import Iterable

from app.schemas.github import (
    CaseStudyDraftOut,
    CategorySuggestionOut,
    DetectedArchitectureLayerOut,
    DetectedTechnologyOut,
    LiveUrlCandidateOut,
    ReadmeSectionOut,
)

NOT_DOCUMENTED = "Not documented in repository."
MAX_SECTION_CHARS = 5_000

HEADING_RE = re.compile(r"^(#{1,6})\s+(.+?)\s*#*\s*$")
BADGE_LINE = re.compile(r"^\s*(\[!\[|<img|<a\b|!\[)")
HTML_COMMENT = re.compile(r"<!--.*?-->", re.DOTALL)
MARKDOWN_LINK = re.compile(r"\[([^\]]+)\]\((https?://[^\s)]+)\)")
BARE_URL = re.compile(r"(?<![\w(\"])(https?://[^\s<>\"')]+)")

SECTION_KEYWORDS: dict[str, tuple[str, ...]] = {
    "overview": ("overview", "about", "introduction", "what is", "description"),
    "problem": ("problem", "motivation", "why", "background", "context"),
    "solution": ("solution", "approach", "how it works"),
    "features": ("feature", "functionality", "what it does", "highlight"),
    "architecture": ("architecture", "project structure", "system design", "structure"),
    "technology": ("tech stack", "technology", "technologies", "built with", "stack", "tools used"),
    "implementation": (
        "installation",
        "install",
        "setup",
        "getting started",
        "quick start",
        "usage",
        "run",
        "development",
    ),
    "challenges": ("challenge", "limitation", "known issue", "trade-off", "tradeoff"),
    "testing": ("testing", "tests", "test"),
    "lessons": ("lesson", "learned"),
    "future_improvements": ("future", "roadmap", "todo", "next step", "improvement"),
    "deployment": ("deployment", "deploy", "hosting"),
    "documentation": ("documentation", "docs"),
    "screenshots": ("screenshot", "preview", "demo", "gallery"),
    "license": ("license",),
}

SECTION_LABELS = {
    "overview": "Overview",
    "problem": "Problem",
    "solution": "Solution",
    "features": "Features",
    "architecture": "Architecture",
    "technology": "Technology",
    "implementation": "Implementation",
    "challenges": "Challenges",
    "testing": "Testing",
    "lessons": "Lessons",
    "future_improvements": "Future improvements",
    "deployment": "Deployment",
    "documentation": "Documentation",
    "screenshots": "Screenshots",
    "license": "License",
}

CASE_STUDY_KEYS = (
    "overview",
    "problem",
    "solution",
    "features",
    "architecture",
    "technology",
    "implementation",
    "challenges",
    "testing",
    "lessons",
    "future_improvements",
)

SECRET_PATTERNS: tuple[tuple[str, re.Pattern[str]], ...] = (
    ("private key", re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY-----")),
    ("AWS access key", re.compile(r"\bAKIA[0-9A-Z]{16}\b")),
    ("GitHub token", re.compile(r"\bgh[pousr]_[A-Za-z0-9]{30,}\b")),
    ("Slack token", re.compile(r"\bxox[baprs]-[A-Za-z0-9-]{10,}\b")),
    ("provider API key", re.compile(r"\bsk-[A-Za-z0-9]{24,}\b")),
    ("Google API key", re.compile(r"\bAIza[0-9A-Za-z\-_]{30,}\b")),
    (
        "assigned credential",
        re.compile(
            r"(?i)\b(api[_-]?key|secret|token|password)\b\s*[:=]\s*[\"']([A-Za-z0-9_\-]{20,})[\"']"
        ),
    ),
    (
        "JWT",
        re.compile(r"\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b"),
    ),
)


def contains_secret(text: str) -> str | None:
    for label, pattern in SECRET_PATTERNS:
        if pattern.search(text):
            return label
    return None


def redact_markdown(text: str) -> str:
    """Remove images, badges, HTML comments, and raw HTML from prose."""

    cleaned = HTML_COMMENT.sub("", text)
    lines: list[str] = []
    for line in cleaned.splitlines():
        stripped = line.strip()
        if BADGE_LINE.match(stripped):
            continue
        if stripped.startswith("</") or stripped.startswith("<img"):
            continue
        lines.append(line.rstrip())
    result = "\n".join(lines)
    result = re.sub(r"\n{3,}", "\n\n", result)
    return result.strip()


def split_sections(markdown: str) -> list[dict[str, object]]:
    raw: list[tuple[int, str, list[str]]] = [(0, "", [])]
    for line in markdown.splitlines():
        match = HEADING_RE.match(line)
        if match:
            raw.append((len(match.group(1)), match.group(2).strip(), []))
        else:
            raw[-1][2].append(line)

    sections: list[dict[str, object]] = []
    for index, (level, title, body) in enumerate(raw):
        if level == 0:
            continue
        collected = list(body)
        cursor = index + 1
        while cursor < len(raw) and not (raw[cursor][0] and raw[cursor][0] <= level):
            child_level, child_title, child_body = raw[cursor]
            if child_level:
                collected.append(f"{'#' * child_level} {child_title}")
            collected.extend(child_body)
            cursor += 1
        content = redact_markdown("\n".join(collected))
        if content:
            sections.append(
                {
                    "level": level,
                    "title": title,
                    "content": content[:MAX_SECTION_CHARS],
                }
            )
    return sections


def _classify_title(title: str) -> str | None:
    lowered = title.lower()
    for key, keywords in SECTION_KEYWORDS.items():
        if any(keyword in lowered for keyword in keywords):
            return key
    return None


def readme_groups(markdown: str) -> dict[str, str]:
    groups: dict[str, list[str]] = {}
    for section in split_sections(markdown):
        key = _classify_title(str(section["title"]))
        if key is None:
            continue
        groups.setdefault(key, []).append(str(section["content"]))
    return {key: "\n\n".join(parts)[:MAX_SECTION_CHARS] for key, parts in groups.items()}


def readme_title(markdown: str, fallback: str) -> str:
    for line in markdown.splitlines():
        match = re.match(r"^#\s+(.+?)\s*$", line)
        if match:
            return match.group(1).strip()
    return fallback


def first_paragraph(markdown: str) -> str | None:
    paragraph: list[str] = []
    for line in markdown.splitlines():
        stripped = line.strip()
        if not stripped:
            if paragraph:
                break
            continue
        if stripped.startswith("#") or BADGE_LINE.match(stripped):
            if paragraph:
                break
            continue
        paragraph.append(stripped)
    if not paragraph:
        return None
    text = " ".join(paragraph)
    text = re.sub(r"\s+", " ", text)
    if text.startswith("[") and "](" in text:
        text = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", text)
    return text[:400].strip() or None


def readme_sections(markdown: str) -> list[ReadmeSectionOut]:
    groups = readme_groups(markdown)
    result: list[ReadmeSectionOut] = []
    for key in (
        "overview",
        "problem",
        "solution",
        "features",
        "architecture",
        "technology",
        "implementation",
        "deployment",
        "testing",
        "challenges",
        "lessons",
        "future_improvements",
        "documentation",
    ):
        content = groups.get(key)
        result.append(
            ReadmeSectionOut(
                key=key,
                label=SECTION_LABELS.get(key, key.replace("_", " ").title()),
                content=content or NOT_DOCUMENTED,
                documented=bool(content),
            )
        )
    return result


def build_case_study(
    groups: dict[str, str],
    technologies: Iterable[DetectedTechnologyOut],
) -> CaseStudyDraftOut:
    technology_section = groups.get("technology")
    if not technology_section:
        names = [tech.name for tech in technologies]
        technology_section = (
            "Detected from repository metadata: " + ", ".join(names) + "."
            if names
            else NOT_DOCUMENTED
        )

    values = {
        "overview": groups.get("overview") or groups.get("solution"),
        "problem": groups.get("problem"),
        "solution": groups.get("solution"),
        "features": groups.get("features"),
        "architecture": groups.get("architecture"),
        "technology": technology_section,
        "implementation": groups.get("implementation"),
        "challenges": groups.get("challenges"),
        "testing": groups.get("testing"),
        "lessons": groups.get("lessons"),
        "future_improvements": groups.get("future_improvements"),
    }
    return CaseStudyDraftOut(
        **{key: value or NOT_DOCUMENTED for key, value in values.items()}
    )


# --- Technology detection -------------------------------------------------

NODE_DEPENDENCIES: dict[str, tuple[str, str]] = {
    "react": ("React", "high"),
    "react-dom": ("React", "high"),
    "next": ("Next.js", "high"),
    "vue": ("Vue", "high"),
    "nuxt": ("Nuxt", "high"),
    "svelte": ("Svelte", "high"),
    "@angular/core": ("Angular", "high"),
    "vite": ("Vite", "high"),
    "typescript": ("TypeScript", "high"),
    "tailwindcss": ("Tailwind CSS", "high"),
    "express": ("Express", "high"),
    "fastify": ("Fastify", "high"),
    "@nestjs/core": ("NestJS", "high"),
    "prisma": ("Prisma", "high"),
    "@prisma/client": ("Prisma", "high"),
    "mongoose": ("MongoDB", "medium"),
    "mongodb": ("MongoDB", "medium"),
    "pg": ("PostgreSQL", "medium"),
    "mysql2": ("MySQL", "medium"),
    "socket.io": ("Socket.IO", "high"),
    "redux": ("Redux", "high"),
    "@reduxjs/toolkit": ("Redux Toolkit", "high"),
    "@tanstack/react-query": ("TanStack Query", "high"),
    "jest": ("Jest", "high"),
    "vitest": ("Vitest", "high"),
    "@playwright/test": ("Playwright", "high"),
    "cypress": ("Cypress", "high"),
    "electron": ("Electron", "high"),
    "react-native": ("React Native", "high"),
    "expo": ("Expo", "high"),
    "axios": ("Axios", "medium"),
    "graphql": ("GraphQL", "high"),
    "apollo-server": ("Apollo Server", "high"),
    "three": ("Three.js", "high"),
}

PYTHON_DEPENDENCIES: dict[str, tuple[str, str]] = {
    "fastapi": ("FastAPI", "high"),
    "django": ("Django", "high"),
    "flask": ("Flask", "high"),
    "sqlalchemy": ("SQLAlchemy", "high"),
    "pydantic": ("Pydantic", "high"),
    "pydantic-settings": ("Pydantic Settings", "high"),
    "psycopg2": ("PostgreSQL", "high"),
    "psycopg2-binary": ("PostgreSQL", "high"),
    "psycopg": ("PostgreSQL", "high"),
    "asyncpg": ("PostgreSQL", "high"),
    "alembic": ("Alembic", "high"),
    "pandas": ("pandas", "high"),
    "numpy": ("NumPy", "high"),
    "scikit-learn": ("scikit-learn", "high"),
    "tensorflow": ("TensorFlow", "high"),
    "torch": ("PyTorch", "high"),
    "streamlit": ("Streamlit", "high"),
    "dash": ("Dash", "high"),
    "jupyter": ("Jupyter", "high"),
    "notebook": ("Jupyter", "high"),
    "celery": ("Celery", "high"),
    "redis": ("Redis", "high"),
    "uvicorn": ("Uvicorn", "high"),
    "gunicorn": ("Gunicorn", "high"),
    "pytest": ("pytest", "high"),
    "httpx": ("HTTPX", "medium"),
    "requests": ("Requests", "medium"),
    "matplotlib": ("Matplotlib", "high"),
    "seaborn": ("Seaborn", "high"),
    "plotly": ("Plotly", "high"),
    "openpyxl": ("openpyxl", "high"),
    "boto3": ("AWS SDK (boto3)", "high"),
    "transformers": ("Transformers", "high"),
    "langchain": ("LangChain", "high"),
    "openai": ("OpenAI API", "high"),
    "jinja2": ("Jinja2", "medium"),
    "starlette": ("Starlette", "high"),
    "beautifulsoup4": ("BeautifulSoup", "medium"),
    "pillow": ("Pillow", "medium"),
}

LANGUAGE_NAMES = {
    "Jupyter Notebook": "Jupyter Notebook",
    "HTML": "HTML",
    "CSS": "CSS",
    "SCSS": "SCSS",
    "Shell": "Shell",
    "Dockerfile": "Docker",
    "PLpgSQL": "PostgreSQL",
    "TSQL": "SQL Server",
    "Vue": "Vue",
    "Svelte": "Svelte",
    "Kotlin": "Kotlin",
    "Swift": "Swift",
    "Dart": "Dart",
    "Ruby": "Ruby",
    "PHP": "PHP",
    "Java": "Java",
    "Go": "Go",
    "Rust": "Rust",
    "C#": "C#",
    "C++": "C++",
    "C": "C",
    "R": "R",
}

CONFIDENCE_RANK = {"high": 3, "medium": 2, "low": 1}


class _TechCollector:
    def __init__(self) -> None:
        self.items: dict[str, DetectedTechnologyOut] = {}

    def add(self, name: str, confidence: str, evidence: str) -> None:
        if not name:
            return
        current = self.items.get(name)
        if current is None:
            self.items[name] = DetectedTechnologyOut(
                name=name, confidence=confidence, evidence=[evidence]
            )
            return
        if evidence not in current.evidence:
            current.evidence.append(evidence)
        if CONFIDENCE_RANK[confidence] > CONFIDENCE_RANK[current.confidence]:
            current.confidence = confidence

    def sorted(self) -> list[DetectedTechnologyOut]:
        return sorted(
            self.items.values(),
            key=lambda item: (-CONFIDENCE_RANK[item.confidence], item.name.lower()),
        )


def _basenames(files: dict[str, str]) -> set[str]:
    return {posixpath.basename(path).lower() for path in files}


def _load_json(files: dict[str, str], name: str) -> dict | None:
    for path, text in files.items():
        if posixpath.basename(path).lower() == name:
            try:
                return json.loads(text)
            except (ValueError, TypeError):
                return None
    return None


def _dependency_names(text: str) -> set[str]:
    names: set[str] = set()
    for raw in text.splitlines():
        line = raw.split("#", 1)[0].strip().strip('"').strip("'").strip(",")
        if not line or line.startswith(("[", "]", "{")):
            continue
        if "=" in line and not any(op in line for op in (">=", "<=", "==", "~=", "!=")):
            line = line.split("=", 1)[0]
        match = re.match(r"^([A-Za-z0-9_.\-]+)", line.strip())
        if match:
            names.add(match.group(1).lower().replace("_", "-"))
    return names


def detect_technologies(
    languages: dict[str, int], files: dict[str, str]
) -> list[DetectedTechnologyOut]:
    collector = _TechCollector()
    total_bytes = sum(languages.values()) or 1

    for language, size in sorted(languages.items(), key=lambda item: -item[1]):
        name = LANGUAGE_NAMES.get(language, language)
        percent = round((size / total_bytes) * 100, 1)
        collector.add(name, "high", f"GitHub language breakdown: {percent}% ({size} bytes)")

    basenames = _basenames(files)

    # Merge every workspace manifest rather than trusting only the first.
    for path, text in files.items():
        if posixpath.basename(path).lower() != "package.json":
            continue
        try:
            manifest = json.loads(text)
        except (ValueError, TypeError):
            continue
        if not isinstance(manifest, dict):
            continue
        for section in ("dependencies", "devDependencies", "peerDependencies"):
            value = manifest.get(section)
            if not isinstance(value, dict):
                continue
            for dependency in value:
                rule = NODE_DEPENDENCIES.get(str(dependency))
                if rule:
                    collector.add(rule[0], rule[1], f"{path} dependency: {dependency}")

    for manifest in ("requirements.txt", "requirements-dev.txt", "pyproject.toml", "pipfile"):
        for path, text in files.items():
            if posixpath.basename(path).lower() != manifest:
                continue
            names = _dependency_names(text)
            for name in names:
                rule = PYTHON_DEPENDENCIES.get(name)
                if rule:
                    collector.add(rule[0], rule[1], f"{posixpath.basename(path)} dependency: {name}")

    composer = _load_json(files, "composer.json")
    if composer:
        requires = composer.get("require") if isinstance(composer, dict) else None
        if isinstance(requires, dict):
            for dependency in requires:
                lowered = dependency.lower()
                if lowered.startswith("laravel/framework"):
                    collector.add("Laravel", "high", "composer.json dependency: laravel/framework")
                elif lowered.startswith("symfony/"):
                    collector.add("Symfony", "high", f"composer.json dependency: {dependency}")
                elif lowered == "php":
                    collector.add("PHP", "high", "composer.json requires PHP")

    pom = next((text for path, text in files.items() if posixpath.basename(path).lower() == "pom.xml"), None)
    if pom:
        if "spring-boot" in pom:
            collector.add("Spring Boot", "high", "pom.xml references spring-boot")
        elif "spring" in pom.lower():
            collector.add("Spring", "medium", "pom.xml references Spring")
        if "<java.version>" in pom:
            collector.add("Java", "high", "pom.xml declares a Java version")

    gradle = next(
        (
            text
            for path, text in files.items()
            if posixpath.basename(path).lower() in {"build.gradle", "build.gradle.kts"}
        ),
        None,
    )
    if gradle:
        lowered = gradle.lower()
        if "org.springframework.boot" in lowered:
            collector.add("Spring Boot", "high", "build.gradle applies the Spring Boot plugin")
        if "com.android.application" in lowered or "android {" in lowered:
            collector.add("Android", "high", "build.gradle applies the Android plugin")
        if "kotlin" in lowered:
            collector.add("Kotlin", "high", "build.gradle uses Kotlin")
        if "jetpack compose" in lowered or "androidx.compose" in lowered:
            collector.add("Jetpack Compose", "high", "build.gradle references Jetpack Compose")

    pubspec = next(
        (text for path, text in files.items() if posixpath.basename(path).lower() == "pubspec.yaml"),
        None,
    )
    if pubspec:
        if re.search(r"(?m)^\s*flutter\s*:", pubspec):
            collector.add("Flutter", "high", "pubspec.yaml declares the Flutter SDK")
        if re.search(r"(?m)^\s*sdk\s*:\s*dart", pubspec):
            collector.add("Dart", "high", "pubspec.yaml declares the Dart SDK")
        for package_name, tech in (("provider", "Provider"), ("riverpod", "Riverpod"), ("bloc", "BLoC")):
            if re.search(rf"(?m)^\s*{package_name}\s*:", pubspec):
                collector.add(tech, "high", f"pubspec.yaml dependency: {package_name}")

    cargo = next(
        (text for path, text in files.items() if posixpath.basename(path).lower() == "cargo.toml"),
        None,
    )
    if cargo:
        lowered = cargo.lower()
        for dependency, tech in (
            ("actix-web", "Actix Web"),
            ("axum", "Axum"),
            ("rocket", "Rocket"),
            ("tokio", "Tokio"),
            ("serde", "Serde"),
            ("diesel", "Diesel"),
            ("sqlx", "SQLx"),
        ):
            if re.search(rf"(?m)^\s*{re.escape(dependency)}\s*=", lowered):
                collector.add(tech, "high", f"Cargo.toml dependency: {dependency}")

    go_mod = next(
        (text for path, text in files.items() if posixpath.basename(path).lower() == "go.mod"),
        None,
    )
    if go_mod:
        for dependency, tech in (
            ("github.com/gin-gonic/gin", "Gin"),
            ("github.com/labstack/echo", "Echo"),
            ("github.com/gofiber/fiber", "Fiber"),
            ("gorm.io/gorm", "GORM"),
        ):
            if dependency in go_mod:
                collector.add(tech, "high", f"go.mod dependency: {dependency}")

    if "dockerfile" in basenames:
        collector.add("Docker", "high", "Dockerfile present")
    if basenames & {"docker-compose.yml", "docker-compose.yaml", "compose.yml", "compose.yaml"}:
        collector.add("Docker Compose", "high", "Compose file present")

    compose_text = next(
        (
            text
            for path, text in files.items()
            if posixpath.basename(path).lower()
            in {"docker-compose.yml", "docker-compose.yaml", "compose.yml", "compose.yaml"}
        ),
        "",
    ).lower()
    if compose_text:
        for token, tech in (
            ("postgres", "PostgreSQL"),
            ("mysql", "MySQL"),
            ("mongo", "MongoDB"),
            ("redis", "Redis"),
            ("rabbitmq", "RabbitMQ"),
            ("nginx", "Nginx"),
        ):
            if token in compose_text:
                collector.add(tech, "medium", "Compose service or image reference")

    if "vercel.json" in basenames:
        collector.add("Vercel", "high", "vercel.json present")
    if "netlify.toml" in basenames:
        collector.add("Netlify", "high", "netlify.toml present")
    if "render.yaml" in basenames:
        collector.add("Render", "high", "render.yaml present")
    if "firebase.json" in basenames:
        collector.add("Firebase", "high", "firebase.json present")
    if "procfile" in basenames:
        collector.add("Heroku", "medium", "Procfile present")

    if any(name.startswith("next.config.") for name in basenames):
        collector.add("Next.js", "high", "next.config file present")
    if any(name.startswith("vite.config.") for name in basenames):
        collector.add("Vite", "high", "vite.config file present")
    if any(name.startswith("tailwind.config.") for name in basenames):
        collector.add("Tailwind CSS", "high", "tailwind.config file present")
    if any(name.startswith("nuxt.config.") for name in basenames):
        collector.add("Nuxt", "high", "nuxt.config file present")
    if "angular.json" in basenames:
        collector.add("Angular", "high", "angular.json present")
    if "manage.py" in basenames:
        collector.add("Django", "medium", "manage.py present")
    if "tsconfig.json" in basenames:
        collector.add("TypeScript", "medium", "tsconfig.json present")

    if "dockerfile" in basenames:
        dockerfile = next(
            (text for path, text in files.items() if posixpath.basename(path).lower() == "dockerfile"),
            "",
        ).lower()
        if re.search(r"(?m)^\s*from\s+node", dockerfile):
            collector.add("Node.js", "medium", "Dockerfile base image is Node.js")
        if re.search(r"(?m)^\s*from\s+python", dockerfile):
            collector.add("Python", "medium", "Dockerfile base image is Python")
        if re.search(r"(?m)^\s*from\s+nginx", dockerfile):
            collector.add("Nginx", "medium", "Dockerfile base image is Nginx")

    return collector.sorted()[:40]


ARCHITECTURE_LAYERS: dict[str, set[str]] = {
    "Frontend": {
        "React",
        "Next.js",
        "Vue",
        "Nuxt",
        "Svelte",
        "Angular",
        "Vite",
        "Tailwind CSS",
        "Redux",
        "Redux Toolkit",
        "TanStack Query",
        "Three.js",
    },
    "Backend": {
        "FastAPI",
        "Django",
        "Flask",
        "Express",
        "Fastify",
        "NestJS",
        "Laravel",
        "Symfony",
        "Spring",
        "Spring Boot",
        "Gin",
        "Echo",
        "Fiber",
        "Actix Web",
        "Axum",
        "Rocket",
        "Starlette",
        "Uvicorn",
        "Gunicorn",
        "Celery",
    },
    "Database": {
        "PostgreSQL",
        "MySQL",
        "MongoDB",
        "Redis",
        "SQLite",
        "SQL Server",
        "Prisma",
        "SQLAlchemy",
        "Alembic",
        "GORM",
        "Diesel",
        "SQLx",
    },
    "Infrastructure": {
        "Docker",
        "Docker Compose",
        "Nginx",
        "Vercel",
        "Netlify",
        "Render",
        "Firebase",
        "Heroku",
        "RabbitMQ",
        "AWS SDK (boto3)",
    },
    "Mobile": {"Flutter", "Dart", "React Native", "Expo", "Kotlin", "Swift", "Android", "Jetpack Compose"},
    "Data and ML": {
        "pandas",
        "NumPy",
        "scikit-learn",
        "TensorFlow",
        "PyTorch",
        "Jupyter Notebook",
        "Streamlit",
        "Dash",
        "Matplotlib",
        "Seaborn",
        "Plotly",
        "LangChain",
        "Transformers",
        "OpenAI API",
    },
}


def detect_architecture(
    technologies: list[DetectedTechnologyOut],
) -> list[DetectedArchitectureLayerOut]:
    names = {tech.name for tech in technologies}
    layers: list[DetectedArchitectureLayerOut] = []
    for layer, members in ARCHITECTURE_LAYERS.items():
        matched = sorted(names & members)
        if not matched:
            continue
        layers.append(
            DetectedArchitectureLayerOut(
                layer=layer,
                technologies=matched,
                evidence=["Detected from repository languages, manifests, and configuration files."],
            )
        )
    return layers


# --- Live URLs ------------------------------------------------------------

DEPLOY_HOSTS = (
    ".vercel.app",
    ".netlify.app",
    ".onrender.com",
    ".render.com",
    ".fly.dev",
    ".herokuapp.com",
    ".railway.app",
    ".streamlit.app",
    ".github.io",
    ".pages.dev",
    ".web.app",
    ".firebaseapp.com",
    ".azurewebsites.net",
    ".cloudfront.net",
    ".amplifyapp.com",
)
LIVE_KEYWORDS = ("live", "demo", "deploy", "website", "app", "preview", "try it")
DOC_KEYWORDS = ("docs", "documentation", "wiki", "guide")


def _clean_url(url: str) -> str:
    return url.rstrip(".,;:)»”\"'")


def extract_links(markdown: str) -> list[tuple[str, str]]:
    links: list[tuple[str, str]] = []
    for match in MARKDOWN_LINK.finditer(markdown):
        links.append((match.group(1).strip(), _clean_url(match.group(2))))
    for match in BARE_URL.finditer(markdown):
        links.append(("", _clean_url(match.group(1))))
    return links


def detect_live_urls(
    *, homepage: str | None, markdown: str | None, repository_url: str
) -> list[LiveUrlCandidateOut]:
    candidates: list[LiveUrlCandidateOut] = []
    seen: set[str] = set()

    def add(url: str, source: str, confidence: str) -> None:
        clean = _clean_url(url)
        if not clean.startswith(("http://", "https://")):
            return
        if clean.lower() in seen:
            return
        seen.add(clean.lower())
        candidates.append(
            LiveUrlCandidateOut(url=clean, source=source, confidence=confidence)
        )

    if homepage and homepage.strip():
        add(homepage.strip(), "GitHub repository homepage", "high")

    if markdown:
        for label, url in extract_links(markdown):
            lowered_url = url.lower()
            lowered_label = label.lower()
            if any(host in lowered_url for host in ("img.shields.io", "github.com", "raw.githubusercontent.com")):
                continue
            if any(host in lowered_url for host in DEPLOY_HOSTS):
                add(url, "README deployment link", "medium")
                continue
            if any(keyword in lowered_label for keyword in LIVE_KEYWORDS) and "github" not in lowered_url:
                add(url, "README link labelled as a live application", "medium")

    candidates.sort(key=lambda item: (item.confidence != "high",))
    return candidates[:6]


def detect_documentation_url(
    markdown: str | None, repository_url: str
) -> str | None:
    if not markdown:
        return None
    for label, url in extract_links(markdown):
        lowered = f"{label} {url}".lower()
        if url.rstrip("/") == repository_url.rstrip("/"):
            continue
        if "github.io" in lowered or "/docs" in lowered or "documentation" in lowered:
            return url
    return None


# --- Category suggestions -------------------------------------------------

CATEGORY_HINTS: tuple[tuple[str, str, str, tuple[str, ...]], ...] = (
    (
        "Mobile",
        "mobile",
        "Mobile frameworks or platform configuration detected.",
        ("Flutter", "Dart", "React Native", "Expo", "Kotlin", "Swift", "Android", "Jetpack Compose"),
    ),
    (
        "Data & Analytics",
        "data-analytics",
        "Data, notebook, or analytics tooling detected.",
        (
            "pandas",
            "NumPy",
            "scikit-learn",
            "Jupyter Notebook",
            "Streamlit",
            "Dash",
            "Matplotlib",
            "Seaborn",
            "Plotly",
            "PyTorch",
            "TensorFlow",
        ),
    ),
    (
        "Cloud & AWS",
        "cloud-aws",
        "Infrastructure or deployment tooling dominates the stack.",
        ("Docker", "Docker Compose", "AWS SDK (boto3)", "Vercel", "Netlify", "Render", "Firebase"),
    ),
    (
        "Web Development",
        "web-development",
        "Web application frameworks detected.",
        (
            "React",
            "Next.js",
            "Vue",
            "Nuxt",
            "Svelte",
            "Angular",
            "FastAPI",
            "Django",
            "Flask",
            "Express",
            "NestJS",
            "Laravel",
            "Spring Boot",
        ),
    ),
    (
        "Academic",
        "academic",
        "Notebook or research-oriented tooling detected.",
        ("Jupyter Notebook", "R", "LaTeX"),
    ),
)

DEFAULT_CATEGORY = CategorySuggestionOut(
    name="Software",
    slug="software",
    reason="General software repository; choose the category that fits the work.",
)


def suggest_categories(
    technologies: list[DetectedTechnologyOut],
    repository_name: str,
    description: str | None,
) -> list[CategorySuggestionOut]:
    names = {tech.name for tech in technologies}
    suggestions: list[CategorySuggestionOut] = []
    for name, slug, reason, members in CATEGORY_HINTS:
        matched = sorted(names & set(members))
        if matched:
            suggestions.append(
                CategorySuggestionOut(
                    name=name,
                    slug=slug,
                    reason=f"{reason} Matched: {', '.join(matched[:6])}.",
                )
            )
    text = f"{repository_name} {description or ''}".lower()
    if any(keyword in text for keyword in ("experiment", "playground", "scratch", "prototype")):
        suggestions.append(
            CategorySuggestionOut(
                name="Experiments",
                slug="experiments",
                reason="Repository name or description suggests an experiment.",
            )
        )
    if not suggestions:
        suggestions.append(DEFAULT_CATEGORY)
    return suggestions[:4]


def repository_name_to_title(name: str) -> str:
    title = name.replace("-", " ").replace("_", " ").strip()
    title = re.sub(r"\s+", " ", title)
    if title and title[0].islower() and title.islower():
        title = title[0].upper() + title[1:]
    return title[:160] or "Untitled project"
