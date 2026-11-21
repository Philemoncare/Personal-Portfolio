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

export type DeploymentStatus =
  | "not_deployed"
  | "deploying"
  | "live"
  | "failed"
  | "offline";

export type PreviewStatus =
  | "not_discovered"
  | "awaiting_verification"
  | "verified"
  | "generated"
  | "unavailable"
  | "unreachable";

export interface ProjectPreview {
  project_id: string;
  live_url: string | null;
  preview_image: string | null;
  preview_status: PreviewStatus;
  preview_source: string | null;
  preview_source_url: string | null;
  preview_checked_at: string | null;
  preview_error: string | null;
  verified: boolean;
  final_url: string | null;
  message: string | null;
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
  external_project_url: string | null;
  github_url: string | null;
  demo_url: string | null;
  video_url: string | null;
  deployment_provider: string | null;
  deployment_status: DeploymentStatus;
  deployment_url: string | null;
  embed_enabled: boolean;
  last_verified_at: string | null;
  public_visibility: boolean;
  preview_image: string | null;
  preview_status: PreviewStatus;
  preview_source: string | null;
  preview_source_url: string | null;
  preview_checked_at: string | null;
  github_stars: number | null;
  github_forks: number | null;
  github_language: string | null;
  github_open_issues: number | null;
  github_metadata_checked_at: string | null;
  seo_title: string | null;
  seo_description: string | null;
  og_image: string | null;
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
  case_study: CaseStudyDetail | null;
  related: ProjectSummary[];
  previous: ProjectLink | null;
  next: ProjectLink | null;
}

export interface CaseStudySummary {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  cover_image_url: string | null;
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
  slug: string | null;
  location: string | null;
  description: string | null;
  logo_url: string | null;
  started_on: string;
  ended_on: string | null;
  is_current: boolean;
}

export interface LeadershipEntry {
  id: string;
  organization: string;
  title: string;
  slug: string | null;
  description: string | null;
  contribution: string | null;
  outcome: string | null;
  started_on: string | null;
  ended_on: string | null;
  url: string | null;
  image_url: string | null;
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

export interface ArticleSummary {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  cover_image_url: string | null;
  external_url: string | null;
  category: string | null;
  tags: string[] | null;
  featured: boolean;
  published_at: string | null;
}

export interface ArticleDetail extends ArticleSummary {
  body: string | null;
  seo_title: string | null;
  seo_description: string | null;
}

export interface ArticleAdmin extends ArticleDetail {
  sort_order: number;
  status: PublishStatus;
  is_placeholder: boolean;
  created_at: string;
  updated_at: string;
}

export interface ArticleInput {
  title: string;
  slug: string | null;
  excerpt: string | null;
  body: string | null;
  cover_image_url: string | null;
  external_url: string | null;
  category: string | null;
  tags: string[];
  featured: boolean;
  seo_title: string | null;
  seo_description: string | null;
  sort_order: number;
  publish_status: PublishStatus;
  is_placeholder: boolean;
}

export interface ContentLink {
  kind: "project" | "build_lab" | "leadership" | "experience" | "external";
  title: string;
  slug: string | null;
  href: string;
  label: string | null;
}

export type NowCategory =
  | "building"
  | "learning"
  | "exploring"
  | "leading"
  | "reading"
  | "experimenting"
  | "other";
export type NowStatus = "active" | "ongoing" | "paused" | "completed";

export interface NowItem {
  id: string;
  title: string;
  description: string | null;
  category: NowCategory;
  status: NowStatus;
  active: boolean;
  priority: number;
  display_order: number;
  external_url: string | null;
  related_project: ContentLink | null;
  related_build_lab: ContentLink | null;
  related_leadership: ContentLink | null;
  is_placeholder: boolean;
  created_at: string;
  updated_at: string;
}

export type TimelineKind =
  | "education"
  | "project"
  | "experience"
  | "leadership"
  | "certification"
  | "community"
  | "technical"
  | "milestone"
  | "other";

export interface TimelineEntry {
  id: string;
  slug: string | null;
  title: string;
  kind: TimelineKind;
  summary: string | null;
  description: string | null;
  organization: string | null;
  location: string | null;
  start_date: string | null;
  end_date: string | null;
  year: number;
  month: number | null;
  external_url: string | null;
  image_url: string | null;
  featured: boolean;
  display_order: number;
  related_project: ContentLink | null;
  related_experience: ContentLink | null;
  related_leadership: ContentLink | null;
  is_placeholder: boolean;
  published_at: string | null;
}

export interface ResumePublic {
  id: string;
  title: string;
  version_label: string;
  file_size: number;
  download_url: string;
  published_at: string | null;
  updated_at: string;
}

export interface SiteProfile {
  name: string;
  display_name: string;
  professional_title: string | null;
  short_bio: string | null;
  long_bio: string | null;
  what_i_build: string | null;
  how_i_work: string | null;
  current_direction: string | null;
  personal_interests: string | null;
  profile_image: string | null;
  location: string | null;
  email: string | null;
  phone: string | null;
  availability: string | null;
  resume_url: string | null;
  github_url: string | null;
  linkedin_url: string | null;
  website_url: string | null;
  is_placeholder: boolean;
  updated_at: string;
  current_resume: ResumePublic | null;
}

export interface SiteSettings {
  site_name: string;
  site_description: string | null;
  wordmark: string;
  accent: string;
  footer_text: string | null;
  copyright_text: string | null;
  social_image: string | null;
  favicon: string | null;
  display_name: string;
  role_title: string;
  hero_intro: string | null;
  bio: string | null;
  location: string | null;
  availability: string | null;
  email: string | null;
  phone: string | null;
  website_url: string | null;
  github_url: string | null;
  linkedin_url: string | null;
  cv_url: string | null;
  seo_title: string | null;
  seo_description: string | null;
  is_placeholder: boolean;
  updated_at: string;
  contact_delivery: "email_configured" | "stored_only";
  resume_available: boolean;
}

export interface SearchIndexEntry {
  kind:
    | "project"
    | "data_project"
    | "leadership"
    | "experience"
    | "timeline"
    | "article";
  title: string;
  slug: string;
  description: string | null;
  category: string | null;
  url: string;
  updated_at: string | null;
}

export interface Admin {
  id: string;
  email: string;
  phone: string | null;
  full_name: string | null;
  role: "SUPER_ADMIN" | "EDITOR" | "ANALYST" | "VIEWER";
  is_active: boolean;
  must_change_password: boolean;
  last_login_at: string | null;
  password_changed_at: string | null;
  created_at: string;
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

export type WorkMode = "build" | "data" | "lead" | "explore";
export type ProjectStage =
  | "in_progress"
  | "active"
  | "completed"
  | "archived"
  | "experiment";
export type PublishStatus = "draft" | "published" | "archived";
export type MediaType = "image" | "diagram" | "video";

export type ContactInquiryType =
  | "project_collaboration"
  | "data_analytics"
  | "development"
  | "technology_community"
  | "speaking_workshops"
  | "general";

export interface ContactPayload {
  name: string;
  email: string;
  subject: string;
  inquiry_type?: ContactInquiryType | null;
  message: string;
  website?: string;
}

export interface ContactReceipt {
  status: string;
  message: string;
  stored: boolean;
  email_delivery: "configured" | "not_configured";
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
  github_url: string | null;
  demo_url: string | null;
  video_url: string | null;
  external_project_url: string | null;
  deployment_provider: string | null;
  deployment_status: DeploymentStatus;
  deployment_url: string | null;
  embed_enabled: boolean;
  last_verified_at: string | null;
  public_visibility: boolean;
  preview_image: string | null;
  preview_status: PreviewStatus;
  preview_source: string | null;
  preview_source_url: string | null;
  preview_checked_at: string | null;
  preview_error: string | null;
  github_stars: number | null;
  github_forks: number | null;
  github_language: string | null;
  github_open_issues: number | null;
  github_metadata_checked_at: string | null;
  github_repository_id: string | null;
  github_owner: string | null;
  github_repository_name: string | null;
  github_default_branch: string | null;
  github_last_synced_at: string | null;
  github_repository_updated_at: string | null;
  github_visibility: string | null;
  github_is_fork: boolean;
  github_is_archived: boolean;
  github_metadata: Record<string, unknown> | null;
  github_sync_enabled: boolean;
  seo_title: string | null;
  seo_description: string | null;
  og_image: string | null;
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
  github_url: string | null;
  demo_url: string | null;
  video_url: string | null;
  external_project_url: string | null;
  deployment_provider: string | null;
  deployment_status: DeploymentStatus;
  deployment_url: string | null;
  embed_enabled: boolean;
  last_verified_at: string | null;
  public_visibility: boolean;
  seo_title: string | null;
  seo_description: string | null;
  og_image: string | null;
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
  cover_image_url: string | null;
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
  deployment_statuses: Array<{ value: DeploymentStatus; label: string }>;
  deployment_providers: string[];
  media_folders: string[];
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

// --- Identity administration --------------------------------------------

export interface ProfileAdmin extends SiteProfile {
  created_at: string;
}

export interface ResumeAdmin {
  id: string;
  title: string;
  version_label: string;
  original_filename: string;
  mime_type: string;
  file_size: number;
  status: PublishStatus;
  is_current: boolean;
  download_url: string;
  download_count: number;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface NowAdminItem extends NowItem {
  publish_status: PublishStatus;
  related_project_id: string | null;
  related_build_lab_id: string | null;
  related_leadership_id: string | null;
  related_project_title: string | null;
  related_build_lab_title: string | null;
  related_leadership_title: string | null;
}

export interface TimelineAdminEntry extends TimelineEntry {
  publish_status: PublishStatus;
  related_project_id: string | null;
  related_experience_id: string | null;
  related_leadership_id: string | null;
  related_project_title: string | null;
  related_experience_title: string | null;
  related_leadership_title: string | null;
}

export interface SiteSettingsAdmin {
  site_name: string;
  site_description: string | null;
  wordmark: string;
  accent: string;
  footer_text: string | null;
  copyright_text: string | null;
  social_image: string | null;
  favicon: string | null;
  seo_title: string | null;
  seo_description: string | null;
  display_name: string;
  role_title: string;
  hero_intro: string | null;
  bio: string | null;
  location: string | null;
  email: string | null;
  is_placeholder: boolean;
  updated_at: string;
}

export interface LinkedRecord {
  id: string;
  title: string;
  subtitle: string | null;
  slug: string | null;
  status: string;
}

export interface ContentReference {
  projects: LinkedRecord[];
  leadership: LinkedRecord[];
  experience: LinkedRecord[];
  now_categories: Array<{ value: string; label: string }>;
  now_statuses: string[];
  timeline_kinds: Array<{ value: string; label: string }>;
  publish_statuses: string[];
  message_statuses: string[];
  inquiry_types: Array<{ value: string; label: string }>;
}

export interface AdminSettings {
  profile: ProfileAdmin;
  site: SiteSettingsAdmin;
  resume: ResumeAdmin | null;
  email_delivery_configured: boolean;
  notification_email: string | null;
  options: {
    now_categories: Array<{ value: string; label: string }>;
    timeline_kinds: Array<{ value: string; label: string }>;
  };
}

export interface ProfileInput {
  name: string;
  display_name: string;
  professional_title: string | null;
  short_bio: string | null;
  long_bio: string | null;
  what_i_build: string | null;
  how_i_work: string | null;
  current_direction: string | null;
  personal_interests: string | null;
  profile_image: string | null;
  location: string | null;
  email: string | null;
  phone: string | null;
  availability: string | null;
  resume_url: string | null;
  github_url: string | null;
  linkedin_url: string | null;
  website_url: string | null;
  is_placeholder: boolean;
}

export interface SiteSettingsInput {
  site_name: string;
  site_description: string | null;
  wordmark: string;
  accent: string;
  footer_text: string | null;
  copyright_text: string | null;
  social_image: string | null;
  favicon: string | null;
  seo_title: string | null;
  seo_description: string | null;
}

export interface AdminSettingsInput {
  profile: ProfileInput;
  site: SiteSettingsInput;
}

export interface NowInput {
  title: string;
  description: string | null;
  category: NowCategory;
  status: NowStatus;
  active: boolean;
  priority: number;
  display_order: number;
  external_url: string | null;
  related_project_id: string | null;
  related_build_lab_id: string | null;
  related_leadership_id: string | null;
  publish_status: PublishStatus;
  is_placeholder: boolean;
}

export interface TimelineInput {
  title: string;
  slug: string | null;
  kind: TimelineKind;
  summary: string | null;
  description: string | null;
  organization: string | null;
  location: string | null;
  start_date: string | null;
  end_date: string | null;
  external_url: string | null;
  image_url: string | null;
  related_project_id: string | null;
  related_experience_id: string | null;
  related_leadership_id: string | null;
  featured: boolean;
  display_order: number;
  publish_status: PublishStatus;
  is_placeholder: boolean;
}

export interface ResumePatch {
  title?: string;
  version_label?: string;
  is_current?: boolean;
  publish_status?: PublishStatus;
}

export interface ContactMessageAdmin {
  id: string;
  name: string;
  email: string;
  subject: string;
  inquiry_type: string | null;
  message: string;
  status: "new" | "read" | "replied" | "archived" | "spam";
  email_status: "not_configured" | "sent" | "failed";
  created_at: string;
  read_at: string | null;
  replied_at: string | null;
}

export interface AdminMessageList {
  items: ContactMessageAdmin[];
  total: number;
  unread: number;
  spam: number;
  email_delivery_configured: boolean;
  notification_email: string | null;
}

export interface AuthChallenge {
  status: "otp_required";
  message: string | null;
  challenge_id: string;
  phone_masked: string | null;
  expires_in: number;
  dev_otp: string | null;
}

export interface AuthSuccess {
  status: "authenticated";
  admin: Admin;
  message: string | null;
}

export type LoginResponse = AuthChallenge | AuthSuccess;

export interface ForgotPasswordResponse {
  message: string;
  challenge_id: string;
  phone_masked: string | null;
  expires_in: number;
  dev_otp: string | null;
}

export interface AuthSession {
  id: string;
  created_at: string;
  last_used_at: string;
  expires_at: string;
  ip_address: string | null;
  user_agent: string | null;
  is_current: boolean;
}

export interface ActivityEntry {
  id: string;
  event: string;
  status: string;
  identifier: string | null;
  ip_address: string | null;
  detail: string | null;
  created_at: string;
}

export interface ActivityList {
  items: ActivityEntry[];
  total: number;
  limit: number;
  offset: number;
}

export type SmsStatus =
  | "QUEUED"
  | "SENT"
  | "DELIVERED"
  | "FAILED"
  | "EXPIRED"
  | "CANCELLED";

export interface SmsLogEntry {
  id: string;
  user_id: string | null;
  purpose: string;
  recipient_phone: string;
  sender_id: string | null;
  message_type: string;
  provider: string;
  provider_message_id: string | null;
  status: SmsStatus;
  failure_reason: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SmsLogList {
  items: SmsLogEntry[];
  total: number;
  limit: number;
  offset: number;
}

export type SessionStatus = "active" | "revoked" | "expired";

export interface AdminSession extends AuthSession {
  revoked_at: string | null;
  status: SessionStatus;
}

export interface SecurityOverview {
  admin: Admin;
  sessions: AuthSession[];
  recent_events: ActivityEntry[];
  failed_logins_24h: number;
  active_sessions: number;
  password_age_days: number | null;
  successful_logins_24h: number;
  otp_sent_24h: number;
  otp_failures_24h: number;
  otp_success_rate: number | null;
  sms_delivery_24h: Record<SmsStatus, number>;
  sms_success_rate: number | null;
  sms_provider: string;
  revoked_sessions: number;
  password_changes_24h: number;
}

export interface MediaAsset {
  id: string;
  filename: string;
  original_filename: string;
  title: string;
  url: string;
  alt_text: string;
  caption: string | null;
  mime_type: string;
  extension: string;
  size_bytes: number;
  width: number;
  height: number;
  kind: string;
  folder: string;
  checksum: string;
  attached_to_type: string | null;
  attached_to_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface MediaList {
  items: MediaAsset[];
  total: number;
  folders: string[];
}

export interface MediaUsageEntry {
  type: string;
  id: string;
  title: string;
  field: string;
}

export interface MediaUsage {
  count: number;
  entries: MediaUsageEntry[];
}

export interface MediaUpdateInput {
  title?: string;
  alt_text?: string;
  caption?: string | null;
  folder?: string;
  attached_to_type?: string | null;
  attached_to_id?: string | null;
}

export type MediaFolder =
  | "brand"
  | "profile"
  | "projects"
  | "data-lab"
  | "build-lab"
  | "leadership"
  | "experience"
  | "social"
  | "blog"
  | "documents"
  | "ui"
  | "misc"
  | "uncategorised";

// --- CMS: social links and editable pages --------------------------------

export interface SocialLink {
  id: string;
  platform: string;
  label: string;
  url: string;
  handle: string | null;
  sort_order: number;
  is_visible: boolean;
}

export interface SocialLinkAdmin extends SocialLink {
  created_at: string;
  updated_at: string;
}

export interface SocialLinkInput {
  platform: string;
  label: string;
  url: string;
  handle: string | null;
  sort_order: number;
  is_visible: boolean;
}

export interface PageContent {
  page_key: string;
  eyebrow: string | null;
  title: string | null;
  description: string | null;
  intro: string | null;
  hero_image: string | null;
  seo_title: string | null;
  seo_description: string | null;
  og_image: string | null;
  canonical_path: string | null;
  is_published: boolean;
  content: Record<string, unknown> | null;
  updated_at: string;
}

export interface PageContentAdmin extends PageContent {
  id: string;
  created_at: string;
}

export interface PageContentInput {
  eyebrow: string | null;
  title: string | null;
  description: string | null;
  intro: string | null;
  hero_image: string | null;
  seo_title: string | null;
  seo_description: string | null;
  og_image: string | null;
  canonical_path: string | null;
  is_published: boolean;
  content: Record<string, unknown> | null;
}

export interface ExperienceAdmin {
  id: string;
  organization: string;
  title: string;
  slug: string | null;
  location: string | null;
  description: string | null;
  logo_url: string | null;
  started_on: string | null;
  ended_on: string | null;
  is_current: boolean;
  sort_order: number;
  status: string;
  is_placeholder: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExperienceInput {
  organization: string;
  title: string;
  slug: string | null;
  location: string | null;
  description: string | null;
  logo_url: string | null;
  started_on: string | null;
  ended_on: string | null;
  is_current: boolean;
  sort_order: number;
  publish_status: PublishStatus;
  is_placeholder: boolean;
}

export interface LeadershipAdmin {
  id: string;
  organization: string;
  title: string;
  slug: string | null;
  description: string | null;
  contribution: string | null;
  outcome: string | null;
  started_on: string | null;
  ended_on: string | null;
  url: string | null;
  image_url: string | null;
  sort_order: number;
  status: string;
  is_placeholder: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeadershipInput {
  organization: string;
  title: string;
  slug: string | null;
  description: string | null;
  contribution: string | null;
  outcome: string | null;
  started_on: string | null;
  ended_on: string | null;
  url: string | null;
  image_url: string | null;
  sort_order: number;
  publish_status: PublishStatus;
  is_placeholder: boolean;
}

export interface PageKeyOption {
  key: string;
  label: string;
  path: string;
}

// --- GitHub integration ---------------------------------------------------

export interface GitHubConnection {
  connected: boolean;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  account_url: string | null;
  github_account_id: string | null;
  scopes: string[];
  repository_access: string | null;
  private_repository_access: boolean;
  repository_count: number | null;
  connected_at: string | null;
  updated_at: string | null;
  revoked_at: string | null;
}

export interface GitHubRateLimit {
  limit: number | null;
  remaining: number | null;
  reset_at: string | null;
}

export interface GitHubStatus {
  configured: boolean;
  connected: boolean;
  connection: GitHubConnection | null;
  requested_scopes: string[];
  private_access_requested: boolean;
  authorize_url: string | null;
  redirect_uri: string | null;
  account_api_available: boolean | null;
  rate_limit: GitHubRateLimit | null;
  message: string | null;
}

export interface GitHubConnectResult {
  authorize_url: string;
  scopes: string[];
  redirect_uri: string;
  expires_in_minutes: number;
}

export interface GitHubRepository {
  id: string;
  name: string;
  full_name: string;
  description: string | null;
  owner: string;
  owner_avatar_url: string | null;
  private: boolean;
  visibility: string;
  html_url: string;
  homepage: string | null;
  language: string | null;
  languages: Record<string, number>;
  topics: string[];
  stargazers_count: number;
  forks_count: number;
  watchers_count: number;
  open_issues_count: number;
  default_branch: string;
  created_at: string | null;
  updated_at: string | null;
  pushed_at: string | null;
  license: string | null;
  archived: boolean;
  fork: boolean;
  size_kb: number;
  linked_project_id: string | null;
  linked_project_title: string | null;
  linked_project_status: string | null;
  import_state: string;
  sync_available: boolean;
  last_synced_at: string | null;
}

export interface GitHubRepositoryList {
  items: GitHubRepository[];
  total: number;
  page: number;
  per_page: number;
  has_more: boolean;
  truncated: boolean;
  languages: string[];
  rate_limit_remaining: number | null;
  fetched_at: string | null;
  cached: boolean;
}

export interface GitHubTreeEntry {
  name: string;
  path: string;
  type: string;
  size: number | null;
  html_url: string | null;
}

export interface GitHubContents {
  path: string;
  entries: GitHubTreeEntry[];
  truncated: boolean;
  default_branch: string;
}

export interface GitHubReadme {
  path: string | null;
  content: string | null;
  html_url: string | null;
  truncated: boolean;
  available: boolean;
}

export interface GitHubImage {
  path: string;
  name: string;
  markdown: string | null;
  source_url: string;
  preview_url: string;
  mime_type: string | null;
  size_bytes: number | null;
}

export interface GitHubImages {
  items: GitHubImage[];
  readme_path: string | null;
  ignored: Array<{ reference: string; reason: string }>;
}

export interface DetectedTechnology {
  name: string;
  confidence: string;
  evidence: string[];
}

export interface DetectedArchitectureLayer {
  layer: string;
  technologies: string[];
  evidence: string[];
}

export interface LiveUrlCandidate {
  url: string;
  source: string;
  confidence: string;
  source_key: string | null;
}

export interface CategorySuggestion {
  name: string;
  slug: string;
  reason: string;
  category_id: string | null;
}

export interface ReadmeSection {
  key: string;
  label: string;
  content: string;
  documented: boolean;
}

export interface CaseStudyDraft {
  overview: string;
  problem: string;
  solution: string;
  features: string;
  architecture: string;
  technology: string;
  implementation: string;
  challenges: string;
  testing: string;
  lessons: string;
  future_improvements: string;
}

export interface GitHubCommit {
  sha: string;
  message: string | null;
  author: string | null;
  authored_at: string | null;
  html_url: string | null;
}

export interface GitHubActivity {
  default_branch: string;
  pushed_at: string | null;
  updated_at: string | null;
  open_issues_count: number;
  recent_commits: GitHubCommit[];
  commits_available: boolean;
}

export interface RepositoryInspection {
  repository: GitHubRepository;
  structure: GitHubContents;
  inspected_files: string[];
  skipped_files: Array<{ path: string; reason: string }>;
  readme: GitHubReadme;
  readme_sections: ReadmeSection[];
  technologies: DetectedTechnology[];
  architecture: DetectedArchitectureLayer[];
  category_suggestions: CategorySuggestion[];
  live_url_candidates: LiveUrlCandidate[];
  documentation_url: string | null;
  images: GitHubImages;
  activity: GitHubActivity;
  case_study: CaseStudyDraft;
  limitations: string[];
  fetched_at: string;
}

export interface GitHubImportRequest {
  category_id: string | null;
  title: string | null;
  summary: string | null;
  body: string | null;
  use_readme: boolean;
  case_study: boolean;
  live_url: string | null;
  documentation_url: string | null;
  technology_names: string[];
  cover_image_path: string | null;
  gallery_image_paths: string[];
  featured: boolean;
  primary_mode: WorkMode;
  project_status: ProjectStage;
  import_images: boolean;
  generate_preview: boolean;
}

export interface GitHubImportResult {
  project_id: string;
  project_slug: string;
  project_title: string;
  status: string;
  case_study_id: string | null;
  images_imported: number;
  technologies: string[];
  repository_full_name: string;
  message: string;
}

export interface GitHubSyncResult {
  project_id: string;
  repository_full_name: string;
  updated_fields: string[];
  preserved_fields: string[];
  stars: number | null;
  forks: number | null;
  language: string | null;
  open_issues: number | null;
  default_branch: string | null;
  last_synced_at: string;
  message: string;
}

export interface GitHubProjectLink {
  connected: boolean;
  project_id: string;
  repository_id: string | null;
  repository_full_name: string | null;
  repository_url: string | null;
  owner: string | null;
  default_branch: string | null;
  visibility: string | null;
  is_fork: boolean;
  is_archived: boolean;
  sync_enabled: boolean;
  last_synced_at: string | null;
  repository_updated_at: string | null;
  description: string | null;
  homepage: string | null;
  topics: string[];
}

export interface GitHubImportLog {
  id: string;
  project_id: string | null;
  user_id: string | null;
  user_email: string | null;
  repository_id: string;
  repository_full_name: string;
  action: string;
  status: string;
  summary: string | null;
  details: Record<string, unknown> | null;
  error_message: string | null;
  created_at: string;
}

export interface GitHubImportLogList {
  items: GitHubImportLog[];
  total: number;
}
