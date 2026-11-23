import {
  ArrowLeft,
  ArrowUpRight,
  Eye,
  FlaskConical,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";

import {
  AdminPanel,
  Checkbox,
  Field,
  Select,
  StatusBadge,
  TextArea,
  TextInput,
} from "@/components/admin/form";
import { MediaField } from "@/components/admin/MediaField";
import { buttonStyles } from "@/components/ui/button";
import { ErrorState, LoadingState } from "@/components/ui/states";
import { useApiResource } from "@/hooks/useApiResource";
import { useApiQuery } from "@/hooks/useApiQuery";
import { adminDataService } from "@/services/adminData.service";
import { listMedia } from "@/services/auth.service";
import type {
  AdminDataProject,
  DataChartType,
  DataProjectInput,
  DataProjectStatus,
  DataProjectType,
  DataReference,
  DataResourceType,
  DataRow,
} from "@/types/api";
import { cn } from "@/utils/cn";
import {
  DATA_CHART_TYPE_LABELS,
  DATA_PROJECT_STATUS_LABELS,
  DATA_PROJECT_TYPE_LABELS,
  DATA_RESOURCE_TYPE_LABELS,
} from "@/utils/data";

interface VisualizationRow {
  chart_type: DataChartType;
  title: string;
  description: string;
  dataText: string;
  x_axis: string;
  y_axis: string;
  series: string;
  source_note: string;
}

interface InsightRow {
  title: string;
  key_insight: string;
  possible_explanation: string;
  recommendation: string;
}

interface ResourceRow {
  title: string;
  resource_type: DataResourceType;
  url: string;
  description: string;
}

interface DataFormState {
  title: string;
  slug: string;
  short_description: string;
  description: string;
  keywords: string;
  category_id: string;
  extra_category: string;
  tool_ids: string[];
  extra_tools: string;
  project_type: DataProjectType;
  status: DataProjectStatus;
  year: string;
  featured: boolean;
  is_placeholder: boolean;
  is_demo: boolean;
  cover_image: string;
  sort_order: string;

  question: string;
  why_it_matters: string;

  dataset_name: string;
  dataset_source: string;
  dataset_description: string;
  dataset_rows: string;
  dataset_columns: string;
  dataset_time_period: string;
  dataset_type: string;
  dataset_license: string;
  dataset_is_public: boolean;
  dataset_note: string;

  data_preparation: string;
  methodology: string;
  analysis: string;
  sql_query: string;
  sql_resultText: string;
  python_snippet: string;

  what_the_data_shows: string;
  why_the_findings_matter: string;
  what_i_would_do_next: string;
  key_findings: string;
  recommendations: string;
  limitations: string;
  conclusion: string;

  github_url: string;
  notebook_url: string;
  dashboard_url: string;
  seo_title: string;
  seo_description: string;

  visualizations: VisualizationRow[];
  insights: InsightRow[];
  resources: ResourceRow[];
}

const CHART_TYPE_OPTIONS = (
  Object.entries(DATA_CHART_TYPE_LABELS) as Array<[DataChartType, string]>
).map(([value, label]) => ({ value, label }));

const PROJECT_TYPE_OPTIONS = (
  Object.entries(DATA_PROJECT_TYPE_LABELS) as Array<[DataProjectType, string]>
).map(([value, label]) => ({ value, label }));

const RESOURCE_TYPE_OPTIONS = (
  Object.entries(DATA_RESOURCE_TYPE_LABELS) as Array<[DataResourceType, string]>
).map(([value, label]) => ({ value, label }));

const STATUS_OPTIONS: Array<{ value: DataProjectStatus; label: string }> = [
  { value: "draft", label: "Draft (private)" },
  { value: "experiment", label: "Experiment (private)" },
  { value: "published", label: "Published (visible on your website)" },
  { value: "archived", label: "Archived (hidden)" },
];

const emptyVisualization: VisualizationRow = {
  chart_type: "bar",
  title: "",
  description: "",
  dataText: "[\n  { \"label\": \"A\", \"value\": 10 }\n]",
  x_axis: "label",
  y_axis: "value",
  series: "",
  source_note: "",
};

const emptyInsight: InsightRow = {
  title: "",
  key_insight: "",
  possible_explanation: "",
  recommendation: "",
};

const emptyResource: ResourceRow = {
  title: "",
  resource_type: "external",
  url: "",
  description: "",
};

function optional(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function fromProject(project: AdminDataProject): DataFormState {
  return {
    title: project.title,
    slug: project.slug,
    short_description: project.short_description ?? "",
    description: project.description ?? "",
    keywords: project.keywords ?? "",
    category_id: project.category.id,
    extra_category: "",
    tool_ids: project.tools.map((tool) => tool.id),
    extra_tools: "",
    project_type: project.project_type,
    status: project.status,
    year: project.year ? String(project.year) : "",
    featured: project.featured,
    is_placeholder: project.is_placeholder,
    is_demo: project.is_demo,
    cover_image: project.cover_image ?? "",
    sort_order: String(project.sort_order),
    question: project.question ?? "",
    why_it_matters: project.why_it_matters ?? "",
    dataset_name: project.dataset_name ?? "",
    dataset_source: project.dataset_source ?? "",
    dataset_description: project.dataset_description ?? "",
    dataset_rows: project.dataset_rows !== null ? String(project.dataset_rows) : "",
    dataset_columns:
      project.dataset_columns !== null ? String(project.dataset_columns) : "",
    dataset_time_period: project.dataset_time_period ?? "",
    dataset_type: project.dataset_type ?? "",
    dataset_license: project.dataset_license ?? "",
    dataset_is_public: project.dataset_is_public,
    dataset_note: project.dataset_note ?? "",
    data_preparation: project.data_preparation ?? "",
    methodology: project.methodology ?? "",
    analysis: project.analysis ?? "",
    sql_query: project.sql_query ?? "",
    sql_resultText: JSON.stringify(project.sql_result ?? [], null, 2),
    python_snippet: project.python_snippet ?? "",
    what_the_data_shows: project.what_the_data_shows ?? "",
    why_the_findings_matter: project.why_the_findings_matter ?? "",
    what_i_would_do_next: project.what_i_would_do_next ?? "",
    key_findings: project.key_findings ?? "",
    recommendations: project.recommendations ?? "",
    limitations: project.limitations ?? "",
    conclusion: project.conclusion ?? "",
    github_url: project.github_url ?? "",
    notebook_url: project.notebook_url ?? "",
    dashboard_url: project.dashboard_url ?? "",
    seo_title: project.seo_title ?? "",
    seo_description: project.seo_description ?? "",
    visualizations: project.visualizations.map((visualization) => ({
      chart_type: visualization.chart_type,
      title: visualization.title,
      description: visualization.description ?? "",
      dataText: JSON.stringify(visualization.data ?? [], null, 2),
      x_axis: visualization.x_axis ?? "",
      y_axis: visualization.y_axis ?? "",
      series: visualization.series.join(", "),
      source_note: visualization.source_note ?? "",
    })),
    insights: project.insights.map((insight) => ({
      title: insight.title ?? "",
      key_insight: insight.key_insight,
      possible_explanation: insight.possible_explanation ?? "",
      recommendation: insight.recommendation ?? "",
    })),
    resources: project.resources.map((resource) => ({
      title: resource.title,
      resource_type: resource.resource_type,
      url: resource.url ?? "",
      description: resource.description ?? "",
    })),
  };
}

function blankForm(categoryId: string): DataFormState {
  return {
    title: "",
    slug: "",
    short_description: "",
    description: "",
    keywords: "",
    category_id: categoryId,
    extra_category: "",
    tool_ids: [],
    extra_tools: "",
    project_type: "eda",
    status: "draft",
    year: String(new Date().getFullYear()),
    featured: false,
    is_placeholder: false,
    is_demo: false,
    cover_image: "",
    sort_order: "100",
    question: "",
    why_it_matters: "",
    dataset_name: "",
    dataset_source: "",
    dataset_description: "",
    dataset_rows: "",
    dataset_columns: "",
    dataset_time_period: "",
    dataset_type: "",
    dataset_license: "",
    dataset_is_public: true,
    dataset_note: "",
    data_preparation: "",
    methodology: "",
    analysis: "",
    sql_query: "",
    sql_resultText: "[]",
    python_snippet: "",
    what_the_data_shows: "",
    why_the_findings_matter: "",
    what_i_would_do_next: "",
    key_findings: "",
    recommendations: "",
    limitations: "",
    conclusion: "",
    github_url: "",
    notebook_url: "",
    dashboard_url: "",
    seo_title: "",
    seo_description: "",
    visualizations: [],
    insights: [],
    resources: [],
  };
}

function parseRows(text: string, label: string): DataRow[] {
  if (!text.trim()) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`${label} is not valid JSON.`);
  }
  if (!Array.isArray(parsed)) {
    throw new Error(`${label} must be a list of rows in JSON format.`);
  }
  return parsed.map((row, index) => {
    if (!row || typeof row !== "object" || Array.isArray(row)) {
      throw new Error(`${label}: row ${index + 1} must be an object.`);
    }
    return row as DataRow;
  });
}

function toPayload(form: DataFormState, status: DataProjectStatus): DataProjectInput {
  return {
    title: form.title.trim(),
    slug: optional(form.slug),
    short_description: optional(form.short_description),
    description: optional(form.description),
    keywords: optional(form.keywords),
    category_id: form.category_id || null,
    extra_category: optional(form.extra_category),
    tool_ids: form.tool_ids,
    extra_tools: form.extra_tools
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
    project_type: form.project_type,
    status,
    year: form.year ? Number(form.year) : null,
    featured: form.featured,
    is_placeholder: form.is_placeholder,
    is_demo: form.is_demo,
    cover_image: optional(form.cover_image),
    sort_order: Number(form.sort_order) || 0,
    question: optional(form.question),
    why_it_matters: optional(form.why_it_matters),
    dataset_name: optional(form.dataset_name),
    dataset_source: optional(form.dataset_source),
    dataset_description: optional(form.dataset_description),
    dataset_rows: form.dataset_rows ? Number(form.dataset_rows) : null,
    dataset_columns: form.dataset_columns ? Number(form.dataset_columns) : null,
    dataset_time_period: optional(form.dataset_time_period),
    dataset_type: optional(form.dataset_type),
    dataset_license: optional(form.dataset_license),
    dataset_is_public: form.dataset_is_public,
    dataset_note: optional(form.dataset_note),
    data_preparation: optional(form.data_preparation),
    methodology: optional(form.methodology),
    analysis: optional(form.analysis),
    sql_query: optional(form.sql_query),
    sql_result: parseRows(form.sql_resultText, "SQL result"),
    python_snippet: optional(form.python_snippet),
    what_the_data_shows: optional(form.what_the_data_shows),
    why_the_findings_matter: optional(form.why_the_findings_matter),
    what_i_would_do_next: optional(form.what_i_would_do_next),
    key_findings: optional(form.key_findings),
    recommendations: optional(form.recommendations),
    limitations: optional(form.limitations),
    conclusion: optional(form.conclusion),
    github_url: optional(form.github_url),
    notebook_url: optional(form.notebook_url),
    dashboard_url: optional(form.dashboard_url),
    seo_title: optional(form.seo_title),
    seo_description: optional(form.seo_description),
    visualizations: form.visualizations.map((visualization) => ({
      chart_type: visualization.chart_type,
      title: visualization.title.trim(),
      description: optional(visualization.description),
      data: parseRows(visualization.dataText, `Chart "${visualization.title}"`),
      x_axis: optional(visualization.x_axis),
      y_axis: optional(visualization.y_axis),
      series: visualization.series
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      display_order: 0,
      source_note: optional(visualization.source_note),
    })),
    insights: form.insights
      .filter((insight) => insight.key_insight.trim())
      .map((insight) => ({
        title: optional(insight.title),
        key_insight: insight.key_insight.trim(),
        possible_explanation: optional(insight.possible_explanation),
        recommendation: optional(insight.recommendation),
        display_order: 0,
      })),
    resources: form.resources
      .filter((resource) => resource.title.trim())
      .map((resource) => ({
        title: resource.title.trim(),
        resource_type: resource.resource_type,
        url: optional(resource.url),
        description: optional(resource.description),
        display_order: 0,
      })),
  };
}

export default function AdminDataEditorPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = !id;
  const navigate = useNavigate();
  const location = useLocation();
  const [notice, setNotice] = useState<string | null>(
    (location.state as { notice?: string } | null)?.notice ?? null,
  );
  const [form, setForm] = useState<DataFormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [newTool, setNewTool] = useState("");
  const [taxonomyBusy, setTaxonomyBusy] = useState(false);

  const reference = useApiResource<DataReference>("/api/v1/admin/data/reference");
  const media = useApiQuery((signal) => listMedia({ limit: 100 }, signal), []);
  const project = useApiResource<AdminDataProject>(
    id ? `/api/v1/admin/data-projects/${id}` : null,
  );

  useEffect(() => {
    if (!isNew) {
      if (project.data) setForm(fromProject(project.data));
      return;
    }
    if (reference.data) {
      setForm(blankForm(reference.data.categories[0]?.id ?? ""));
    }
  }, [isNew, project.data, reference.data]);

  const update = <K extends keyof DataFormState>(key: K, value: DataFormState[K]) => {
    setForm((current) => (current ? { ...current, [key]: value } : current));
  };

  const save = async (mode: "keep" | "draft" | "publish") => {
    if (!form) return;
    if (!form.title.trim()) {
      setNotice("Please add a title.");
      return;
    }
    if (!form.category_id && !form.extra_category.trim()) {
      setNotice("Choose a category or add a new one.");
      return;
    }
    const status: DataProjectStatus =
      mode === "keep" ? form.status : mode === "publish" ? "published" : "draft";

    setSaving(true);
    setNotice(null);
    try {
      const payload = toPayload(form, status);
      if (payload.visualizations.some((item) => !item.title)) {
        throw new Error("Every chart needs a title.");
      }
      if (isNew) {
        const created = await adminDataService.createProject(payload);
        navigate(`/admin/data/${created.id}`, {
          replace: true,
          state: { notice: "Data project added." },
        });
      } else if (id) {
        const updated = await adminDataService.updateProject(id, payload);
        setForm(fromProject(updated));
        setNotice(
          status === "published"
            ? "Data project saved and published."
            : status === "draft"
              ? "Data project saved as a draft."
              : "Data project saved.",
        );
      }
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "We couldn't save this project. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!id || !form) return;
    const confirmed = window.confirm(
      `Delete ${form.title || "this data project"}? Its charts, insights and resources are deleted too. This cannot be undone.`,
    );
    if (!confirmed) return;
    setSaving(true);
    try {
      await adminDataService.deleteProject(id);
      navigate("/admin/data", { replace: true });
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "We couldn't delete this project. Please try again.",
      );
      setSaving(false);
    }
  };

  const addCategory = async () => {
    if (!newCategory.trim()) return;
    setTaxonomyBusy(true);
    setNotice(null);
    try {
      const created = await adminDataService.createCategory({ name: newCategory.trim() });
      setNewCategory("");
      reference.reload();
      if (form) update("category_id", created.id);
      setNotice(`Category "${created.name}" added.`);
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "We couldn't add this category. Please try again.",
      );
    } finally {
      setTaxonomyBusy(false);
    }
  };

  const addTool = async () => {
    if (!newTool.trim()) return;
    setTaxonomyBusy(true);
    setNotice(null);
    try {
      const created = await adminDataService.createTool({ name: newTool.trim() });
      setNewTool("");
      reference.reload();
      if (form) update("tool_ids", [...form.tool_ids, created.id]);
      setNotice(`Tool "${created.name}" added.`);
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "We couldn't add this tool. Please try again.",
      );
    } finally {
      setTaxonomyBusy(false);
    }
  };

  if (!isNew && project.error) {
    return (
      <div className="mt-6">
        {project.error.status === 404 ? (
          <ErrorState message="This data project no longer exists." />
        ) : (
          <ErrorState
            message="We couldn't load this data project. Please try again."
            onRetry={project.reload}
          />
        )}
        <Link to="/admin/data" className={`${buttonStyles("secondary", "sm")} mt-4`}>
          Back to Data Lab
        </Link>
      </div>
    );
  }

  if (reference.error) {
    return (
      <div className="mt-6">
        <ErrorState
          message="We couldn't load the project options. Please try again."
          onRetry={reference.reload}
        />
      </div>
    );
  }

  if ((!isNew && project.loading) || !reference.data || !form) {
    return (
      <div className="mt-6">
        <LoadingState rows={6} label="Loading data project" />
      </div>
    );
  }

  const categories = reference.data.categories;
  const tools = reference.data.tools;

  return (
    <>
      <div className="flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            to="/admin/data"
            className="inline-flex items-center gap-2 font-mono text-[0.56rem] uppercase tracking-[0.14em] text-muted hover:text-paper"
          >
            <ArrowLeft className="size-3" aria-hidden="true" />
            Data Lab
          </Link>
          <h1 className="mt-3 text-3xl font-medium tracking-tight text-paper sm:text-4xl">
            {isNew ? "Add data project" : form.title || "Untitled analysis"}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <StatusBadge status={form.status} />
            <span className="font-mono text-[0.54rem] uppercase tracking-[0.12em] text-muted">
              {isNew ? "Will be saved as a draft" : `/data/${form.slug}`}
            </span>
            {form.is_demo ? (
              <span className="font-mono text-[0.54rem] uppercase tracking-[0.12em] text-signal">
                Sample data
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!isNew && id ? (
            <a
              href={`/admin/data/${id}/preview`}
              target="_blank"
              rel="noreferrer"
              className={buttonStyles("secondary", "sm")}
            >
              <Eye className="size-3.5" aria-hidden="true" />
              Preview
              <ArrowUpRight className="size-3" aria-hidden="true" />
            </a>
          ) : null}
          {!isNew && form.status === "published" ? (
            <a
              href={`/data/${form.slug}`}
              target="_blank"
              rel="noreferrer"
              className={buttonStyles("secondary", "sm")}
            >
              <FlaskConical className="size-3.5" aria-hidden="true" />
              View website
              <ArrowUpRight className="size-3" aria-hidden="true" />
            </a>
          ) : null}
          <button
            type="button"
            onClick={() => save("draft")}
            disabled={saving}
            className={buttonStyles("secondary", "sm")}
          >
            <Save className="size-3.5" aria-hidden="true" />
            Save draft
          </button>
          <button
            type="button"
            onClick={() => save("publish")}
            disabled={saving}
            className={buttonStyles("primary", "sm")}
          >
            {saving ? "Saving..." : "Publish"}
          </button>
        </div>
      </div>

      {notice ? (
        <p
          role="status"
          className="mt-4 border border-line bg-ink-800/60 px-4 py-3 text-sm text-paper-dim"
        >
          {notice}
        </p>
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_19rem] lg:items-start">
        <div className="space-y-6">
          <AdminPanel
            title="Project details"
            description="The title, web address and summary shown on your website."
          >
            <div className="grid gap-5">
              <Field label="Title" htmlFor="title" required>
                <TextInput
                  id="title"
                  value={form.title}
                  onChange={(event) => update("title", event.target.value)}
                  placeholder="Retail sales patterns"
                />
              </Field>
              <Field
                label="Web address"
                htmlFor="slug"
                hint="Leave blank to create one from the title."
              >
                <TextInput
                  id="slug"
                  value={form.slug}
                  onChange={(event) => update("slug", event.target.value)}
                  placeholder="retail-sales-patterns"
                />
              </Field>
              <Field
                label="Short description"
                htmlFor="short"
                hint={`${form.short_description.length} characters. Shown on cards and in search results.`}
              >
                <TextArea
                  id="short"
                  rows={3}
                  value={form.short_description}
                  onChange={(event) => update("short_description", event.target.value)}
                  placeholder="One or two sentences about the question and what the analysis found."
                />
              </Field>
              <Field
                label="Overview"
                htmlFor="description"
                hint="Separate paragraphs with a blank line. Only describe what the analysis actually supports."
              >
                <TextArea
                  id="description"
                  rows={7}
                  value={form.description}
                  onChange={(event) => update("description", event.target.value)}
                />
              </Field>
              <Field
                label="Keywords"
                htmlFor="keywords"
                hint="Separate each keyword with a comma. Used for search, not shown as tags."
              >
                <TextInput
                  id="keywords"
                  value={form.keywords}
                  onChange={(event) => update("keywords", event.target.value)}
                  placeholder="retail, seasonality, category mix"
                />
              </Field>
            </div>
          </AdminPanel>

          <AdminPanel
            title="Category and tools"
            description="Choose the category, the tools you actually used, and the kind of analysis."
          >
            <div className="grid gap-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Category" htmlFor="category" required>
                  <Select
                    id="category"
                    value={form.category_id}
                    onChange={(event) => update("category_id", event.target.value)}
                    options={[
                      { value: "", label: "Choose a category" },
                      ...categories.map((item) => ({
                        value: item.id,
                        label: item.name,
                      })),
                    ]}
                  />
                </Field>
                <Field
                  label="Or add a category"
                  htmlFor="new-category"
                  hint="Created now and selected for this project."
                >
                  <div className="flex gap-2">
                    <TextInput
                      id="new-category"
                      value={newCategory}
                      onChange={(event) => setNewCategory(event.target.value)}
                      placeholder="New category name"
                    />
                    <button
                      type="button"
                      onClick={() => void addCategory()}
                      disabled={taxonomyBusy || !newCategory.trim()}
                      className="shrink-0 border border-line px-3 font-mono text-[0.54rem] uppercase tracking-[0.12em] text-paper-dim transition-colors hover:border-paper hover:text-paper disabled:opacity-40"
                    >
                      Add
                    </button>
                  </div>
                </Field>
              </div>

              <Field
                label="Tools used"
                hint="Select only the tools that were actually used in this analysis."
              >
                <div className="grid gap-2 border border-line bg-ink-950/50 p-4 sm:grid-cols-2 lg:grid-cols-3">
                  {tools.length === 0 ? (
                    <p className="text-sm text-muted sm:col-span-2 lg:col-span-3">
                      No tools yet. Add one below.
                    </p>
                  ) : (
                    tools.map((tool) => {
                      const checked = form.tool_ids.includes(tool.id);
                      return (
                        <Checkbox
                          key={tool.id}
                          label={
                            <span>
                              {tool.name}
                              <span className="ml-2 font-mono text-[0.5rem] uppercase tracking-[0.1em] text-faint">
                                {tool.kind}
                              </span>
                            </span>
                          }
                          checked={checked}
                          onChange={(next) =>
                            update(
                              "tool_ids",
                              next
                                ? [...form.tool_ids, tool.id]
                                : form.tool_ids.filter((entry) => entry !== tool.id),
                            )
                          }
                        />
                      );
                    })
                  )}
                </div>
              </Field>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Add a tool" htmlFor="new-tool" hint="Created now and selected.">
                  <div className="flex gap-2">
                    <TextInput
                      id="new-tool"
                      value={newTool}
                      onChange={(event) => setNewTool(event.target.value)}
                      placeholder="Tool name"
                    />
                    <button
                      type="button"
                      onClick={() => void addTool()}
                      disabled={taxonomyBusy || !newTool.trim()}
                      className="shrink-0 border border-line px-3 font-mono text-[0.54rem] uppercase tracking-[0.12em] text-paper-dim transition-colors hover:border-paper hover:text-paper disabled:opacity-40"
                    >
                      Add
                    </button>
                  </div>
                </Field>
                <Field
                  label="Other tools"
                  htmlFor="extra-tools"
                  hint="Separate each tool with a comma."
                >
                  <TextInput
                    id="extra-tools"
                    value={form.extra_tools}
                    onChange={(event) => update("extra_tools", event.target.value)}
                    placeholder="Jupyter, Power BI"
                  />
                </Field>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Analysis type" htmlFor="project-type">
                  <Select
                    id="project-type"
                    value={form.project_type}
                    onChange={(event) =>
                      update("project_type", event.target.value as DataProjectType)
                    }
                    options={PROJECT_TYPE_OPTIONS}
                  />
                </Field>
                <Field label="Year" htmlFor="year">
                  <TextInput
                    id="year"
                    type="number"
                    min={1900}
                    max={2200}
                    value={form.year}
                    onChange={(event) => update("year", event.target.value)}
                  />
                </Field>
              </div>

              <Field label="Cover image">
                <MediaField
                  value={form.cover_image}
                  onChange={(value) => update("cover_image", value)}
                  assets={media.data?.items ?? []}
                  loading={media.loading}
                  onUploaded={() => media.reload()}
                  folder="data-lab"
                  title={form.title ? `${form.title} cover` : "Data project cover"}
                  altText={form.title ? `${form.title} cover image` : "Data project cover image"}
                  emptyLabel="No cover image uploaded."
                />
              </Field>

              <div className="grid gap-3 sm:grid-cols-2">
                <Checkbox
                  label="Featured in the Data Lab and homepage"
                  checked={form.featured}
                  onChange={(next) => update("featured", next)}
                />
                <Checkbox
                  label="This project uses sample data"
                  checked={form.is_demo}
                  onChange={(next) => update("is_demo", next)}
                  hint="Your website will label the charts and page as sample data."
                />
                <Checkbox
                  label="This analysis is not finished yet"
                  checked={form.is_placeholder}
                  onChange={(next) => update("is_placeholder", next)}
                  hint="Your website will show a note until it is final."
                />
                <Field label="Display order" htmlFor="sort" hint="Lower numbers appear first.">
                  <TextInput
                    id="sort"
                    type="number"
                    value={form.sort_order}
                    onChange={(event) => update("sort_order", event.target.value)}
                  />
                </Field>
              </div>
            </div>
          </AdminPanel>

          <AdminPanel
            title="The question"
            description="What you wanted to find out, and why it mattered."
          >
            <div className="grid gap-5">
              <Field label="The question" htmlFor="question">
                <TextArea
                  id="question"
                  rows={4}
                  value={form.question}
                  onChange={(event) => update("question", event.target.value)}
                />
              </Field>
              <Field label="Why it matters" htmlFor="why">
                <TextArea
                  id="why"
                  rows={4}
                  value={form.why_it_matters}
                  onChange={(event) => update("why_it_matters", event.target.value)}
                />
              </Field>
            </div>
          </AdminPanel>

          <AdminPanel
            title="Dataset"
            description="Describe the dataset plainly. Leave the row and column counts blank if you don't know them."
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Dataset name" htmlFor="dataset-name">
                <TextInput
                  id="dataset-name"
                  value={form.dataset_name}
                  onChange={(event) => update("dataset_name", event.target.value)}
                />
              </Field>
              <Field label="Source" htmlFor="dataset-source" hint="An organisation, a link, or a short note about where it came from.">
                <TextInput
                  id="dataset-source"
                  value={form.dataset_source}
                  onChange={(event) => update("dataset_source", event.target.value)}
                />
              </Field>
              <Field label="Rows" htmlFor="dataset-rows">
                <TextInput
                  id="dataset-rows"
                  type="number"
                  min={0}
                  value={form.dataset_rows}
                  onChange={(event) => update("dataset_rows", event.target.value)}
                />
              </Field>
              <Field label="Columns" htmlFor="dataset-columns">
                <TextInput
                  id="dataset-columns"
                  type="number"
                  min={0}
                  value={form.dataset_columns}
                  onChange={(event) => update("dataset_columns", event.target.value)}
                />
              </Field>
              <Field label="Time period" htmlFor="dataset-period">
                <TextInput
                  id="dataset-period"
                  value={form.dataset_time_period}
                  onChange={(event) => update("dataset_time_period", event.target.value)}
                  placeholder="Jan 2023 to Dec 2024"
                />
              </Field>
              <Field label="Data type" htmlFor="dataset-type">
                <TextInput
                  id="dataset-type"
                  value={form.dataset_type}
                  onChange={(event) => update("dataset_type", event.target.value)}
                  placeholder="CSV, SQL table, Excel workbook"
                />
              </Field>
              <Field label="Licence and usage" htmlFor="dataset-license">
                <TextInput
                  id="dataset-license"
                  value={form.dataset_license}
                  onChange={(event) => update("dataset_license", event.target.value)}
                />
              </Field>
              <div className="flex flex-col justify-end gap-3 pb-1">
                <Checkbox
                  label="Dataset can be shared publicly"
                  checked={form.dataset_is_public}
                  onChange={(next) => update("dataset_is_public", next)}
                  hint="Uncheck for private, licensed or unavailable data."
                />
              </div>
            </div>
            <div className="mt-5 grid gap-5">
              <Field label="Dataset description" htmlFor="dataset-description">
                <TextArea
                  id="dataset-description"
                  rows={4}
                  value={form.dataset_description}
                  onChange={(event) => update("dataset_description", event.target.value)}
                />
              </Field>
              <Field
                label="Dataset note"
                htmlFor="dataset-note"
                hint="Caveats, access limits, or a note that the counts are approximate."
              >
                <TextArea
                  id="dataset-note"
                  rows={3}
                  value={form.dataset_note}
                  onChange={(event) => update("dataset_note", event.target.value)}
                />
              </Field>
            </div>
          </AdminPanel>

          <AdminPanel
            title="How the work was done"
            description="How you cleaned and analysed the data. Do not paste passwords, private connection details or keys."
          >
            <div className="grid gap-5">
              <Field label="Data preparation" htmlFor="preparation">
                <TextArea
                  id="preparation"
                  rows={5}
                  value={form.data_preparation}
                  onChange={(event) => update("data_preparation", event.target.value)}
                />
              </Field>
              <Field label="Method" htmlFor="methodology">
                <TextArea
                  id="methodology"
                  rows={5}
                  value={form.methodology}
                  onChange={(event) => update("methodology", event.target.value)}
                />
              </Field>
              <Field label="Exploratory analysis" htmlFor="analysis">
                <TextArea
                  id="analysis"
                  rows={5}
                  value={form.analysis}
                  onChange={(event) => update("analysis", event.target.value)}
                />
              </Field>
              <Field
                label="SQL query"
                htmlFor="sql-query"
                hint="Shown as text on your website. It is never run there."
              >
                <TextArea
                  id="sql-query"
                  rows={7}
                  value={form.sql_query}
                  onChange={(event) => update("sql_query", event.target.value)}
                  className="font-mono text-[0.78rem]"
                  spellCheck={false}
                />
              </Field>
              <Field
                label="SQL result example"
                htmlFor="sql-result"
                hint="Saved output from the query, written as JSON rows."
              >
                <TextArea
                  id="sql-result"
                  rows={6}
                  value={form.sql_resultText}
                  onChange={(event) => update("sql_resultText", event.target.value)}
                  className="font-mono text-[0.78rem]"
                  spellCheck={false}
                />
              </Field>
              <Field
                label="Python excerpt"
                htmlFor="python"
                hint="A short excerpt that is safe to share. It is highlighted on your website."
              >
                <TextArea
                  id="python"
                  rows={7}
                  value={form.python_snippet}
                  onChange={(event) => update("python_snippet", event.target.value)}
                  className="font-mono text-[0.78rem]"
                  spellCheck={false}
                />
              </Field>
            </div>
          </AdminPanel>

          <AdminPanel
            title="What the analysis shows"
            description="The main parts of the write-up. Keep each part tied to what the data shows."
          >
            <div className="grid gap-5">
              <Field label="What the data shows" htmlFor="shows">
                <TextArea
                  id="shows"
                  rows={4}
                  value={form.what_the_data_shows}
                  onChange={(event) => update("what_the_data_shows", event.target.value)}
                />
              </Field>
              <Field label="Why it matters" htmlFor="matters">
                <TextArea
                  id="matters"
                  rows={4}
                  value={form.why_the_findings_matter}
                  onChange={(event) => update("why_the_findings_matter", event.target.value)}
                />
              </Field>
              <Field label="What I would do next" htmlFor="next">
                <TextArea
                  id="next"
                  rows={4}
                  value={form.what_i_would_do_next}
                  onChange={(event) => update("what_i_would_do_next", event.target.value)}
                />
              </Field>
              <Field label="Key findings" htmlFor="findings">
                <TextArea
                  id="findings"
                  rows={4}
                  value={form.key_findings}
                  onChange={(event) => update("key_findings", event.target.value)}
                />
              </Field>
              <Field label="Recommendations" htmlFor="recommendations">
                <TextArea
                  id="recommendations"
                  rows={4}
                  value={form.recommendations}
                  onChange={(event) => update("recommendations", event.target.value)}
                />
              </Field>
              <Field label="Limitations" htmlFor="limitations">
                <TextArea
                  id="limitations"
                  rows={4}
                  value={form.limitations}
                  onChange={(event) => update("limitations", event.target.value)}
                />
              </Field>
              <Field label="Conclusion" htmlFor="conclusion">
                <TextArea
                  id="conclusion"
                  rows={4}
                  value={form.conclusion}
                  onChange={(event) => update("conclusion", event.target.value)}
                />
              </Field>
            </div>
          </AdminPanel>

          <AdminPanel
            title="Charts"
            description="Each chart is built from data you add below. Add a chart only when you have data to show."
            actions={
              <button
                type="button"
                onClick={() =>
                  update("visualizations", [...form.visualizations, { ...emptyVisualization }])
                }
                className={buttonStyles("secondary", "sm")}
              >
                <Plus className="size-3.5" aria-hidden="true" />
                Add chart
              </button>
            }
          >
            {form.visualizations.length === 0 ? (
              <p className="border border-dashed border-line-strong px-4 py-5 text-sm text-muted">
                No charts yet. Add one when you have data to show.
              </p>
            ) : (
              <div className="space-y-5">
                {form.visualizations.map((visualization, index) => {
                  const columns = (() => {
                    try {
                      const rows = parseRows(visualization.dataText, "Data");
                      return Array.from(
                        new Set(rows.flatMap((row) => Object.keys(row))),
                      );
                    } catch {
                      return [];
                    }
                  })();
                  return (
                    <div key={index} className="border border-line bg-ink-950/40 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-mono text-[0.54rem] uppercase tracking-[0.14em] text-muted">
                          Chart {String(index + 1).padStart(2, "0")}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            update(
                              "visualizations",
                              form.visualizations.filter((_, itemIndex) => itemIndex !== index),
                            )
                          }
                          className="text-muted transition-colors hover:text-signal"
                          aria-label={`Remove chart ${index + 1}`}
                        >
                          <Trash2 className="size-3.5" aria-hidden="true" />
                        </button>
                      </div>

                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <Field label="Title" htmlFor={`viz-title-${index}`} required>
                          <TextInput
                            id={`viz-title-${index}`}
                            value={visualization.title}
                            onChange={(event) =>
                              update(
                                "visualizations",
                                form.visualizations.map((item, itemIndex) =>
                                  itemIndex === index
                                    ? { ...item, title: event.target.value }
                                    : item,
                                ),
                              )
                            }
                          />
                        </Field>
                        <Field label="Chart type" htmlFor={`viz-type-${index}`}>
                          <Select
                            id={`viz-type-${index}`}
                            value={visualization.chart_type}
                            onChange={(event) =>
                              update(
                                "visualizations",
                                form.visualizations.map((item, itemIndex) =>
                                  itemIndex === index
                                    ? {
                                        ...item,
                                        chart_type: event.target.value as DataChartType,
                                      }
                                    : item,
                                ),
                              )
                            }
                            options={CHART_TYPE_OPTIONS}
                          />
                        </Field>
                        <Field label="Description" htmlFor={`viz-desc-${index}`} className="sm:col-span-2">
                          <TextArea
                            id={`viz-desc-${index}`}
                            rows={2}
                            value={visualization.description}
                            onChange={(event) =>
                              update(
                                "visualizations",
                                form.visualizations.map((item, itemIndex) =>
                                  itemIndex === index
                                    ? { ...item, description: event.target.value }
                                    : item,
                                ),
                              )
                            }
                          />
                        </Field>
                        <Field
                          label="Category column"
                          htmlFor={`viz-x-${index}`}
                          hint="The column used for labels or groups."
                        >
                          <TextInput
                            id={`viz-x-${index}`}
                            value={visualization.x_axis}
                            onChange={(event) =>
                              update(
                                "visualizations",
                                form.visualizations.map((item, itemIndex) =>
                                  itemIndex === index
                                    ? { ...item, x_axis: event.target.value }
                                    : item,
                                ),
                              )
                            }
                          />
                        </Field>
                        <Field label="Value column" htmlFor={`viz-y-${index}`}>
                          <TextInput
                            id={`viz-y-${index}`}
                            value={visualization.y_axis}
                            onChange={(event) =>
                              update(
                                "visualizations",
                                form.visualizations.map((item, itemIndex) =>
                                  itemIndex === index
                                    ? { ...item, y_axis: event.target.value }
                                    : item,
                                ),
                              )
                            }
                          />
                        </Field>
                        <Field
                          label="Series columns"
                          htmlFor={`viz-series-${index}`}
                          hint="Separate each column with a comma. Leave blank to use the value column."
                        >
                          <TextInput
                            id={`viz-series-${index}`}
                            value={visualization.series}
                            onChange={(event) =>
                              update(
                                "visualizations",
                                form.visualizations.map((item, itemIndex) =>
                                  itemIndex === index
                                    ? { ...item, series: event.target.value }
                                    : item,
                                ),
                              )
                            }
                          />
                        </Field>
                        <Field label="Source note" htmlFor={`viz-source-${index}`}>
                          <TextInput
                            id={`viz-source-${index}`}
                            value={visualization.source_note}
                            onChange={(event) =>
                              update(
                                "visualizations",
                                form.visualizations.map((item, itemIndex) =>
                                  itemIndex === index
                                    ? { ...item, source_note: event.target.value }
                                    : item,
                                ),
                              )
                            }
                          />
                        </Field>
                      </div>

                      <div className="mt-3">
                        <Field
                          label="Data"
                          htmlFor={`viz-data-${index}`}
                          hint={
                            columns.length > 0
                              ? `Columns found: ${columns.join(", ")}`
                              : "Rows of data in JSON. Column names are found automatically."
                          }
                        >
                          <TextArea
                            id={`viz-data-${index}`}
                            rows={7}
                            value={visualization.dataText}
                            onChange={(event) =>
                              update(
                                "visualizations",
                                form.visualizations.map((item, itemIndex) =>
                                  itemIndex === index
                                    ? { ...item, dataText: event.target.value }
                                    : item,
                                ),
                              )
                            }
                            className={cn("font-mono text-[0.78rem]")}
                            spellCheck={false}
                          />
                        </Field>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </AdminPanel>

          <AdminPanel
            title="Insights"
            description="The key finding, a possible explanation, and what you would recommend. Say when an explanation is only a guess."
            actions={
              <button
                type="button"
                onClick={() => update("insights", [...form.insights, { ...emptyInsight }])}
                className={buttonStyles("secondary", "sm")}
              >
                <Plus className="size-3.5" aria-hidden="true" />
                Add insight
              </button>
            }
          >
            {form.insights.length === 0 ? (
              <p className="border border-dashed border-line-strong px-4 py-5 text-sm text-muted">
                No insights yet. You can also add findings in the Key findings section.
              </p>
            ) : (
              <div className="space-y-5">
                {form.insights.map((insight, index) => (
                  <div key={index} className="border border-line bg-ink-950/40 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-mono text-[0.54rem] uppercase tracking-[0.14em] text-muted">
                        Insight {String(index + 1).padStart(2, "0")}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          update(
                            "insights",
                            form.insights.filter((_, itemIndex) => itemIndex !== index),
                          )
                        }
                        className="text-muted transition-colors hover:text-signal"
                        aria-label={`Remove insight ${index + 1}`}
                      >
                        <Trash2 className="size-3.5" aria-hidden="true" />
                      </button>
                    </div>
                    <div className="mt-3 grid gap-3">
                      <Field label="Title" htmlFor={`insight-title-${index}`}>
                        <TextInput
                          id={`insight-title-${index}`}
                          value={insight.title}
                          onChange={(event) =>
                            update(
                              "insights",
                              form.insights.map((item, itemIndex) =>
                                itemIndex === index
                                  ? { ...item, title: event.target.value }
                                  : item,
                              ),
                            )
                          }
                        />
                      </Field>
                      <Field label="Key insight" htmlFor={`insight-key-${index}`} required>
                        <TextArea
                          id={`insight-key-${index}`}
                          rows={2}
                          value={insight.key_insight}
                          onChange={(event) =>
                            update(
                              "insights",
                              form.insights.map((item, itemIndex) =>
                                itemIndex === index
                                  ? { ...item, key_insight: event.target.value }
                                  : item,
                              ),
                            )
                          }
                        />
                      </Field>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Field
                          label="Possible explanation"
                          htmlFor={`insight-explain-${index}`}
                        >
                          <TextArea
                            id={`insight-explain-${index}`}
                            rows={3}
                            value={insight.possible_explanation}
                            onChange={(event) =>
                              update(
                                "insights",
                                form.insights.map((item, itemIndex) =>
                                  itemIndex === index
                                    ? { ...item, possible_explanation: event.target.value }
                                    : item,
                                ),
                              )
                            }
                          />
                        </Field>
                        <Field label="Recommendation" htmlFor={`insight-rec-${index}`}>
                          <TextArea
                            id={`insight-rec-${index}`}
                            rows={3}
                            value={insight.recommendation}
                            onChange={(event) =>
                              update(
                                "insights",
                                form.insights.map((item, itemIndex) =>
                                  itemIndex === index
                                    ? { ...item, recommendation: event.target.value }
                                    : item,
                                ),
                              )
                            }
                          />
                        </Field>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </AdminPanel>

          <AdminPanel
            title="Resources"
            description="Files, notebooks, reports, dashboards or links that people can actually open."
            actions={
              <button
                type="button"
                onClick={() => update("resources", [...form.resources, { ...emptyResource }])}
                className={buttonStyles("secondary", "sm")}
              >
                <Plus className="size-3.5" aria-hidden="true" />
                Add resource
              </button>
            }
          >
            {form.resources.length === 0 ? (
              <p className="border border-dashed border-line-strong px-4 py-5 text-sm text-muted">
                No resources yet. Leave this empty if nothing can be shared.
              </p>
            ) : (
              <div className="space-y-5">
                {form.resources.map((resource, index) => (
                  <div key={index} className="border border-line bg-ink-950/40 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-mono text-[0.54rem] uppercase tracking-[0.14em] text-muted">
                        Resource {String(index + 1).padStart(2, "0")}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          update(
                            "resources",
                            form.resources.filter((_, itemIndex) => itemIndex !== index),
                          )
                        }
                        className="text-muted transition-colors hover:text-signal"
                        aria-label={`Remove resource ${index + 1}`}
                      >
                        <Trash2 className="size-3.5" aria-hidden="true" />
                      </button>
                    </div>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <Field label="Title" htmlFor={`resource-title-${index}`} required>
                        <TextInput
                          id={`resource-title-${index}`}
                          value={resource.title}
                          onChange={(event) =>
                            update(
                              "resources",
                              form.resources.map((item, itemIndex) =>
                                itemIndex === index
                                  ? { ...item, title: event.target.value }
                                  : item,
                              ),
                            )
                          }
                        />
                      </Field>
                      <Field label="Type" htmlFor={`resource-type-${index}`}>
                        <Select
                          id={`resource-type-${index}`}
                          value={resource.resource_type}
                          onChange={(event) =>
                            update(
                              "resources",
                              form.resources.map((item, itemIndex) =>
                                itemIndex === index
                                  ? {
                                      ...item,
                                      resource_type: event.target.value as DataResourceType,
                                    }
                                  : item,
                              ),
                            )
                          }
                          options={RESOURCE_TYPE_OPTIONS}
                        />
                      </Field>
                      <Field
                        label="Link"
                        htmlFor={`resource-url-${index}`}
                        hint="A full link or a page on your website. Leave blank if it is not public."
                        className="sm:col-span-2"
                      >
                        <TextInput
                          id={`resource-url-${index}`}
                          value={resource.url}
                          onChange={(event) =>
                            update(
                              "resources",
                              form.resources.map((item, itemIndex) =>
                                itemIndex === index
                                  ? { ...item, url: event.target.value }
                                  : item,
                              ),
                            )
                          }
                        />
                      </Field>
                      <Field
                        label="Description"
                        htmlFor={`resource-desc-${index}`}
                        className="sm:col-span-2"
                      >
                        <TextArea
                          id={`resource-desc-${index}`}
                          rows={2}
                          value={resource.description}
                          onChange={(event) =>
                            update(
                              "resources",
                              form.resources.map((item, itemIndex) =>
                                itemIndex === index
                                  ? { ...item, description: event.target.value }
                                  : item,
                              ),
                            )
                          }
                        />
                      </Field>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </AdminPanel>

          <AdminPanel
            title="Links and search"
            description="Repository, notebook and dashboard links, plus optional text for search results and shared links."
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="GitHub repository" htmlFor="github">
                <TextInput
                  id="github"
                  value={form.github_url}
                  onChange={(event) => update("github_url", event.target.value)}
                  placeholder="https://github.com/username/repository"
                />
              </Field>
              <Field label="Notebook" htmlFor="notebook">
                <TextInput
                  id="notebook"
                  value={form.notebook_url}
                  onChange={(event) => update("notebook_url", event.target.value)}
                  placeholder="https://example.com"
                />
              </Field>
              <Field label="Dashboard" htmlFor="dashboard">
                <TextInput
                  id="dashboard"
                  value={form.dashboard_url}
                  onChange={(event) => update("dashboard_url", event.target.value)}
                  placeholder="https://example.com"
                />
              </Field>
              <Field label="Search title" htmlFor="seo-title">
                <TextInput
                  id="seo-title"
                  value={form.seo_title}
                  onChange={(event) => update("seo_title", event.target.value)}
                />
              </Field>
              <Field label="Search description" htmlFor="seo-description" className="sm:col-span-2">
                <TextArea
                  id="seo-description"
                  rows={3}
                  value={form.seo_description}
                  onChange={(event) => update("seo_description", event.target.value)}
                />
              </Field>
            </div>
          </AdminPanel>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-24">
          <AdminPanel title="Publishing">
            <div className="grid gap-4">
              <Field label="Visibility" htmlFor="status">
                <Select
                  id="status"
                  value={form.status}
                  onChange={(event) =>
                    update("status", event.target.value as DataProjectStatus)
                  }
                  options={STATUS_OPTIONS}
                />
              </Field>
              <button
                type="button"
                onClick={() => save("keep")}
                disabled={saving}
                className={buttonStyles("secondary", "md", "w-full")}
              >
                <Save className="size-3.5" aria-hidden="true" />
                {saving ? "Saving..." : "Save changes"}
              </button>
              <button
                type="button"
                onClick={() => save("publish")}
                disabled={saving}
                className={buttonStyles("primary", "md", "w-full")}
              >
                Publish analysis
              </button>
              <p className="text-[0.68rem] leading-relaxed text-faint">
                Only published projects appear in the Data Lab. Draft, experiment and
                archived projects stay private. Saving checks your chart settings and blocks
                anything that looks like a password or key.
              </p>
            </div>
          </AdminPanel>

          <AdminPanel title="At a glance">
            <dl className="space-y-3 text-xs">
              <div className="flex items-center justify-between gap-3">
                <dt className="font-mono text-[0.52rem] uppercase tracking-[0.12em] text-muted">
                  Charts
                </dt>
                <dd className="text-paper-dim">{form.visualizations.length}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="font-mono text-[0.52rem] uppercase tracking-[0.12em] text-muted">
                  Insights
                </dt>
                <dd className="text-paper-dim">{form.insights.length}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="font-mono text-[0.52rem] uppercase tracking-[0.12em] text-muted">
                  Resources
                </dt>
                <dd className="text-paper-dim">{form.resources.length}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="font-mono text-[0.52rem] uppercase tracking-[0.12em] text-muted">
                  Visibility
                </dt>
                <dd className="text-paper-dim">
                  {DATA_PROJECT_STATUS_LABELS[form.status]}
                </dd>
              </div>
              {!isNew ? (
                <div className="flex items-center justify-between gap-3">
                  <dt className="font-mono text-[0.52rem] uppercase tracking-[0.12em] text-muted">
                    Updated
                  </dt>
                  <dd className="text-paper-dim">
                    {project.data?.updated_at
                      ? new Date(project.data.updated_at).toLocaleString()
                      : "Not saved yet"}
                  </dd>
                </div>
              ) : null}
            </dl>
            {!isNew ? (
              <button
                type="button"
                onClick={remove}
                disabled={saving}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 border border-signal/40 px-3 py-2.5 font-mono text-[0.56rem] uppercase tracking-[0.12em] text-signal transition-colors hover:bg-signal hover:text-ink-950 disabled:opacity-40"
              >
                <Trash2 className="size-3.5" aria-hidden="true" />
                Delete project
              </button>
            ) : null}
          </AdminPanel>
        </aside>
      </div>
    </>
  );
}
