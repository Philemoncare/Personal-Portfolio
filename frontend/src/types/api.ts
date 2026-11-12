export interface ListResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface ProjectCategory {
  id: string;
  name: string;
  slug: string;
}

export interface Technology {
  id: string;
  name: string;
  slug: string;
  kind: string;
}

export interface ProjectMedia {
  id: string;
  url: string;
  alt_text: string;
  caption: string | null;
  media_type: "image" | "diagram" | "video";
  sort_order: number;
}

export interface ProjectSummary {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  category: ProjectCategory;
  secondary_categories: ProjectCategory[];
  primary_mode: WorkMode;
  project_status: ProjectStage;
  featured: boolean;
  is_placeholder: boolean;
  role: string | null;
  year: number | null;
  repository_url: string | null;
  live_url: string | null;
  documentation_url: string | null;
  download_url: string | null;
  external_url: string | null;
  cover_image_url: string | null;
  technologies: Technology[];
  sort_order: number;
  published_at: string | null;
}

export interface ProjectLink {
  title: string;
  slug: string;
}

export interface ProjectDetail extends ProjectSummary {
  body: string | null;
  started_on: string | null;
  completed_on: string | null;
  media: ProjectMedia[];
  case_study_slug: string | null;
  related: ProjectSummary[];
  previous: ProjectLink | null;
  next: ProjectLink | null;
}

export interface CaseStudySummary {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  featured: boolean;
  is_placeholder: boolean;
  published_at: string | null;
  project_slug: string | null;
}

export interface CaseStudyDetail extends CaseStudySummary {
  overview: string | null;
  problem: string | null;
  context: string | null;
  goals: string | null;
  idea: string | null;
  research: string | null;
  planning: string | null;
  design: string | null;
  solution: string | null;
  role: string | null;
  architecture: string | null;
  technology: string | null;
  key_features: string | null;
  technical_decisions: string | null;
  challenges: string | null;
  implementation: string | null;
  testing: string | null;
  results: string | null;
  result_type: string | null;
  lessons: string | null;
  future_improvements: string | null;
  hidden_sections: string[];
}

export interface ExperienceEntry {
  id: string;
  organization: string;
  title: string;
  location: string | null;
  description: string | null;
  started_on: string;
  ended_on: string | null;
  is_current: boolean;
}

export interface LeadershipEntry {
  id: string;
  organization: string;
  title: string;
  description: string | null;
  contribution: string | null;
  outcome: string | null;
  started_on: string | null;
  ended_on: string | null;
  url: string | null;
  is_placeholder: boolean;
}

export interface Skill {
  id: string;
  name: string;
  proficiency_label: string | null;
  icon_key: string | null;
}

export interface SkillGroup {
  id: string;
  name: string;
  slug: string;
  skills: Skill[];
}

export interface Certificate {
  id: string;
  name: string;
  issuer: string;
  issued_on: string | null;
  expires_on: string | null;
  credential_url: string | null;
  media_url: string | null;
}

export interface TimelineEntry {
  id: string;
  year: number;
  month: number | null;
  kind: TimelineKind;
  title: string;
  description: string | null;
  is_placeholder: boolean;
}

export interface NowItem {
  id: string;
  label: string;
  title: string;
  description: string | null;
  is_placeholder: boolean;
  updated_at: string;
}

export interface SiteSettings {
  display_name: string;
  role_title: string;
  hero_intro: string | null;
  bio: string | null;
  location: string | null;
  availability: string | null;
  email: string | null;
  github_url: string | null;
  linkedin_url: string | null;
  cv_url: string | null;
  seo_title: string | null;
  seo_description: string | null;
  is_placeholder: boolean;
}

export interface Admin {
  email: string;
  last_login_at: string | null;
}

export interface AdminRecentProject {
  id: string;
  title: string;
  slug: string;
  status: string;
  is_placeholder: boolean;
  updated_at: string;
}

export interface AdminRecentMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  status: string;
  created_at: string;
}

export interface AdminOverview {
  admin: Admin;
  project_counts: Record<string, number>;
  published_projects: number;
  featured_projects: number;
  placeholder_projects: number;
  unread_messages: number;
  total_messages: number;
  leadership_entries: number;
  now_items: number;
  case_studies: number;
  recent_projects: AdminRecentProject[];
  recent_messages: AdminRecentMessage[];
}

export type WorkMode = "build" | "data" | "lead" | "explore";export type ProjectStage =
  | "in_progress"
  | "active"
  | "completed"
  | "archived"
  | "experiment";
export type PublishStatus = "draft" | "published" | "archived";
export type MediaType = "image" | "diagram" | "video";
export type TimelineKind =
  | "education"
  | "project"
  | "leadership"
  | "cloud"
  | "development"
  | "milestone";

export interface ContactPayload {
  name: string;
  email: string;
  subject: string;
  message: string;
  website?: string;
}

export interface ContactReceipt {
  status: string;
  message: string;
}

export interface AdminProject {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  body: string | null;
  category: ProjectCategory;
  secondary_categories: ProjectCategory[];
  technologies: Technology[];
  media: ProjectMedia[];
  primary_mode: WorkMode;
  project_status: ProjectStage;
  status: PublishStatus;
  featured: boolean;
  is_placeholder: boolean;
  role: string | null;
  year: number | null;
  started_on: string | null;
  completed_on: string | null;
  repository_url: string | null;
  live_url: string | null;
  documentation_url: string | null;
  download_url: string | null;
  external_url: string | null;
  cover_image: string | null;
  cover_image_url: string | null;
  sort_order: number;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectMediaInput {
  url: string;
  alt_text: string;
  caption: string | null;
  media_type: MediaType;
  sort_order: number;
}

export interface ProjectInput {
  title: string;
  slug: string | null;
  summary: string | null;
  body: string | null;
  category_id: string;
  secondary_category_ids: string[];
  technology_ids: string[];
  extra_technologies: string[];
  primary_mode: WorkMode;
  project_status: ProjectStage;
  status: PublishStatus;
  featured: boolean;
  role: string | null;
  year: number | null;
  started_on: string | null;
  completed_on: string | null;
  repository_url: string | null;
  live_url: string | null;
  documentation_url: string | null;
  download_url: string | null;
  external_url: string | null;
  cover_image: string | null;
  sort_order: number;
  is_placeholder: boolean;
  media: ProjectMediaInput[];
}

export interface AdminCaseStudy {
  id: string;
  project_id: string | null;
  title: string;
  slug: string;
  summary: string | null;
  overview: string | null;
  problem: string | null;
  context: string | null;
  goals: string | null;
  idea: string | null;
  research: string | null;
  planning: string | null;
  design: string | null;
  solution: string | null;
  role: string | null;
  architecture: string | null;
  technology: string | null;
  key_features: string | null;
  technical_decisions: string | null;
  challenges: string | null;
  implementation: string | null;
  testing: string | null;
  results: string | null;
  result_type: string | null;
  lessons: string | null;
  future_improvements: string | null;
  hidden_sections: string[] | null;
  featured: boolean;
  sort_order: number;
  status: PublishStatus;
  is_placeholder: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminReference {
  categories: ProjectCategory[];
  technologies: Technology[];
  statuses: PublishStatus[];
  stages: ProjectStage[];
  modes: Array<{ value: WorkMode; label: string }>;
  case_study_sections: Array<{ value: CaseStudySectionKey; label: string }>;
  result_types: string[];
}

export type CaseStudySectionKey =
  | "overview"
  | "problem"
  | "context"
  | "goals"
  | "idea"
  | "research"
  | "planning"
  | "design"
  | "solution"
  | "role"
  | "architecture"
  | "technology"
  | "key_features"
  | "technical_decisions"
  | "challenges"
  | "implementation"
  | "testing"
  | "results"
  | "lessons"
  | "future_improvements";

// --- Data Lab ------------------------------------------------------------

export type DataProjectStatus = "draft" | "published" | "archived" | "experiment";
export type DataProjectType =
  | "eda"
  | "sql"
  | "excel"
  | "dashboard"
  | "bi"
  | "statistical"
  | "cleaning"
  | "research"
  | "visualization";
export type DataChartType =
  | "bar"
  | "line"
  | "area"
  | "pie"
  | "donut"
  | "scatter"
  | "histogram"
  | "heatmap"
  | "table"
  | "kpi";
export type DataResourceType =
  | "dataset"
  | "notebook"
  | "sql"
  | "excel"
  | "pdf"
  | "dashboard"
  | "github"
  | "external";

export type DataRow = Record<string, string | number | boolean | null>;

export interface DataCategory {
  id: string;
  name: string;
  slug: string;
}

export interface DataTool {
  id: string;
  name: string;
  slug: string;
  kind: string;
}

export interface DataVisualization {
  id: string;
  chart_type: DataChartType;
  title: string;
  description: string | null;
  data: DataRow[];
  x_axis: string | null;
  y_axis: string | null;
  series: string[];
  display_order: number;
  source_note: string | null;
}

export interface DataInsight {
  id: string;
  title: string | null;
  key_insight: string;
  possible_explanation: string | null;
  recommendation: string | null;
  display_order: number;
}

export interface DataResource {
  id: string;
  title: string;
  resource_type: DataResourceType;
  url: string | null;
  description: string | null;
  display_order: number;
}

export interface DataProjectSummary {
  id: string;
  title: string;
  slug: string;
  short_description: string | null;
  category: DataCategory;
  project_type: DataProjectType;
  status: DataProjectStatus;
  year: number | null;
  featured: boolean;
  is_placeholder: boolean;
  is_demo: boolean;
  cover_image_url: string | null;
  dataset_type: string | null;
  tools: DataTool[];
  hero_visualization: DataVisualization | null;
  published_at: string | null;
  sort_order: number;
}

export interface DataProjectDetail extends DataProjectSummary {
  description: string | null;
  keywords: string | null;
  question: string | null;
  why_it_matters: string | null;
  dataset_name: string | null;
  dataset_source: string | null;
  dataset_description: string | null;
  dataset_rows: number | null;
  dataset_columns: number | null;
  dataset_time_period: string | null;
  dataset_type: string | null;
  dataset_license: string | null;
  dataset_is_public: boolean;
  dataset_note: string | null;
  data_preparation: string | null;
  methodology: string | null;
  analysis: string | null;
  sql_query: string | null;
  sql_result: DataRow[];
  python_snippet: string | null;
  what_the_data_shows: string | null;
  why_the_findings_matter: string | null;
  what_i_would_do_next: string | null;
  key_findings: string | null;
  recommendations: string | null;
  limitations: string | null;
  conclusion: string | null;
  github_url: string | null;
  notebook_url: string | null;
  dashboard_url: string | null;
  seo_title: string | null;
  seo_description: string | null;
  visualizations: DataVisualization[];
  insights: DataInsight[];
  resources: DataResource[];
}

export interface DataVisualizationInput {
  chart_type: DataChartType;
  title: string;
  description: string | null;
  data: DataRow[];
  x_axis: string | null;
  y_axis: string | null;
  series: string[];
  display_order: number;
  source_note: string | null;
}

export interface DataInsightInput {
  title: string | null;
  key_insight: string;
  possible_explanation: string | null;
  recommendation: string | null;
  display_order: number;
}

export interface DataResourceInput {
  title: string;
  resource_type: DataResourceType;
  url: string | null;
  description: string | null;
  display_order: number;
}

export interface DataProjectInput {
  title: string;
  slug: string | null;
  short_description: string | null;
  description: string | null;
  keywords: string | null;
  category_id: string | null;
  extra_category: string | null;
  tool_ids: string[];
  extra_tools: string[];
  project_type: DataProjectType;
  status: DataProjectStatus;
  year: number | null;
  featured: boolean;
  is_placeholder: boolean;
  is_demo: boolean;
  cover_image: string | null;
  question: string | null;
  why_it_matters: string | null;
  dataset_name: string | null;
  dataset_source: string | null;
  dataset_description: string | null;
  dataset_rows: number | null;
  dataset_columns: number | null;
  dataset_time_period: string | null;
  dataset_type: string | null;
  dataset_license: string | null;
  dataset_is_public: boolean;
  dataset_note: string | null;
  data_preparation: string | null;
  methodology: string | null;
  analysis: string | null;
  sql_query: string | null;
  sql_result: DataRow[];
  python_snippet: string | null;
  what_the_data_shows: string | null;
  why_the_findings_matter: string | null;
  what_i_would_do_next: string | null;
  key_findings: string | null;
  recommendations: string | null;
  limitations: string | null;
  conclusion: string | null;
  github_url: string | null;
  notebook_url: string | null;
  dashboard_url: string | null;
  seo_title: string | null;
  seo_description: string | null;
  sort_order: number;
  visualizations: DataVisualizationInput[];
  insights: DataInsightInput[];
  resources: DataResourceInput[];
}

export interface AdminDataProject extends Omit<DataProjectDetail, "hero_visualization"> {
  cover_image: string | null;
  created_at: string;
  updated_at: string;
}

export interface DataReference {
  categories: DataCategory[];
  tools: DataTool[];
  statuses: DataProjectStatus[];
  project_types: Array<{ value: DataProjectType; label: string }>;
  chart_types: DataChartType[];
  resource_types: DataResourceType[];
  featured: DataProjectSummary[];
}
