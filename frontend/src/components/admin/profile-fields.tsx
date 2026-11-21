import { Checkbox, Field, TextArea, TextInput } from "@/components/admin/form";
import { MediaField } from "@/components/admin/MediaField";
import type { MediaAsset, ProfileAdmin, ProfileInput } from "@/types/api";

export interface ProfileFormState {
  name: string;
  display_name: string;
  professional_title: string;
  short_bio: string;
  long_bio: string;
  what_i_build: string;
  how_i_work: string;
  current_direction: string;
  personal_interests: string;
  profile_image: string;
  location: string;
  email: string;
  phone: string;
  availability: string;
  resume_url: string;
  github_url: string;
  linkedin_url: string;
  website_url: string;
  is_placeholder: boolean;
}

export function profileToForm(profile: ProfileAdmin): ProfileFormState {
  return {
    name: profile.name,
    display_name: profile.display_name,
    professional_title: profile.professional_title ?? "",
    short_bio: profile.short_bio ?? "",
    long_bio: profile.long_bio ?? "",
    what_i_build: profile.what_i_build ?? "",
    how_i_work: profile.how_i_work ?? "",
    current_direction: profile.current_direction ?? "",
    personal_interests: profile.personal_interests ?? "",
    profile_image: profile.profile_image ?? "",
    location: profile.location ?? "",
    email: profile.email ?? "",
    phone: profile.phone ?? "",
    availability: profile.availability ?? "",
    resume_url: profile.resume_url ?? "",
    github_url: profile.github_url ?? "",
    linkedin_url: profile.linkedin_url ?? "",
    website_url: profile.website_url ?? "",
    is_placeholder: profile.is_placeholder,
  };
}

function optional(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function formToProfileInput(form: ProfileFormState): ProfileInput {
  return {
    name: form.name.trim(),
    display_name: form.display_name.trim(),
    professional_title: optional(form.professional_title),
    short_bio: optional(form.short_bio),
    long_bio: optional(form.long_bio),
    what_i_build: optional(form.what_i_build),
    how_i_work: optional(form.how_i_work),
    current_direction: optional(form.current_direction),
    personal_interests: optional(form.personal_interests),
    profile_image: optional(form.profile_image),
    location: optional(form.location),
    email: optional(form.email),
    phone: optional(form.phone),
    availability: optional(form.availability),
    resume_url: optional(form.resume_url),
    github_url: optional(form.github_url),
    linkedin_url: optional(form.linkedin_url),
    website_url: optional(form.website_url),
    is_placeholder: form.is_placeholder,
  };
}

export function ProfileFields({
  form,
  onChange,
  idPrefix = "profile",
  mediaAssets = [],
  mediaLoading = false,
  onMediaUploaded,
}: {
  form: ProfileFormState;
  onChange: (next: ProfileFormState) => void;
  idPrefix?: string;
  mediaAssets?: MediaAsset[];
  mediaLoading?: boolean;
  onMediaUploaded?: (asset: MediaAsset) => void;
}) {
  const set = <K extends keyof ProfileFormState,>(key: K, value: ProfileFormState[K]) => {
    onChange({ ...form, [key]: value });
  };
  const id = (name: string) => `${idPrefix}-${name}`;

  return (
    <div className="space-y-8">
      <fieldset className="space-y-4">
        <legend className="font-mono text-[0.56rem] uppercase tracking-[0.16em] text-signal">
          Name and role
        </legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" htmlFor={id("name")} required>
            <TextInput
              id={id("name")}
              value={form.name}
              onChange={(event) => set("name", event.target.value)}
              placeholder="Enter your full name"
            />
          </Field>
          <Field label="Display name" htmlFor={id("display_name")} required>
            <TextInput
              id={id("display_name")}
              value={form.display_name}
              onChange={(event) => set("display_name", event.target.value)}
              placeholder="The name shown on your website"
            />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Professional title" htmlFor={id("professional_title")}>
            <TextInput
              id={id("professional_title")}
              value={form.professional_title}
              onChange={(event) => set("professional_title", event.target.value)}
              placeholder="Enter your main professional title"
            />
          </Field>
          <Field label="Location" htmlFor={id("location")}>
            <TextInput
              id={id("location")}
              value={form.location}
              onChange={(event) => set("location", event.target.value)}
              placeholder="Where you are based"
            />
          </Field>
        </div>
        <Field
          label="Availability"
          htmlFor={id("availability")}
          hint="Say whether you are available for work or collaboration."
        >
          <TextInput
            id={id("availability")}
            value={form.availability}
            onChange={(event) => set("availability", event.target.value)}
            placeholder="For example: Open to new projects"
          />
        </Field>
      </fieldset>

      <fieldset className="space-y-4 border-t border-line pt-6">
        <legend className="font-mono text-[0.56rem] uppercase tracking-[0.16em] text-signal">
          About you
        </legend>
        <Field
          label="Short bio"
          htmlFor={id("short_bio")}
          hint="A short introduction shown on your homepage and profile. Two or three sentences is enough."
        >
          <TextArea
            id={id("short_bio")}
            rows={3}
            value={form.short_bio}
            onChange={(event) => set("short_bio", event.target.value)}
          />
        </Field>
        <Field
          label="About you"
          htmlFor={id("long_bio")}
          hint="Tell visitors a little more about your background, work and interests. Leave a blank line between paragraphs."
        >
          <TextArea
            id={id("long_bio")}
            rows={7}
            value={form.long_bio}
            onChange={(event) => set("long_bio", event.target.value)}
          />
        </Field>
        <div className="grid gap-4 lg:grid-cols-2">
          <Field label="What I do" htmlFor={id("what_i_build")}>
            <TextArea
              id={id("what_i_build")}
              rows={5}
              value={form.what_i_build}
              onChange={(event) => set("what_i_build", event.target.value)}
            />
          </Field>
          <Field label="How I work" htmlFor={id("how_i_work")}>
            <TextArea
              id={id("how_i_work")}
              rows={5}
              value={form.how_i_work}
              onChange={(event) => set("how_i_work", event.target.value)}
            />
          </Field>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Field label="What I'm working on" htmlFor={id("current_direction")}>
            <TextArea
              id={id("current_direction")}
              rows={4}
              value={form.current_direction}
              onChange={(event) => set("current_direction", event.target.value)}
            />
          </Field>
          <Field
            label="Interests"
            htmlFor={id("personal_interests")}
            hint="Only include genuine interests. Leave empty to hide this section."
          >
            <TextArea
              id={id("personal_interests")}
              rows={4}
              value={form.personal_interests}
              onChange={(event) => set("personal_interests", event.target.value)}
            />
          </Field>
        </div>
      </fieldset>

      <fieldset className="space-y-4 border-t border-line pt-6">
        <legend className="font-mono text-[0.56rem] uppercase tracking-[0.16em] text-signal">
          Contact details
        </legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Email address" htmlFor={id("email")}>
            <TextInput
              id={id("email")}
              type="email"
              value={form.email}
              onChange={(event) => set("email", event.target.value)}
              placeholder="Enter your email address"
            />
          </Field>
          <Field label="Phone number" htmlFor={id("phone")} hint="Optional. Leave empty to keep it private.">
            <TextInput
              id={id("phone")}
              value={form.phone}
              onChange={(event) => set("phone", event.target.value)}
              placeholder="Enter your phone number"
            />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="GitHub profile" htmlFor={id("github_url")}>
            <TextInput
              id={id("github_url")}
              value={form.github_url}
              onChange={(event) => set("github_url", event.target.value)}
              placeholder="https://github.com/username"
            />
          </Field>
          <Field label="LinkedIn profile" htmlFor={id("linkedin_url")}>
            <TextInput
              id={id("linkedin_url")}
              value={form.linkedin_url}
              onChange={(event) => set("linkedin_url", event.target.value)}
              placeholder="https://www.linkedin.com/in/username"
            />
          </Field>
        </div>
        <Field label="Personal website" htmlFor={id("website_url")}>
          <TextInput
            id={id("website_url")}
            value={form.website_url}
            onChange={(event) => set("website_url", event.target.value)}
            placeholder="https://example.com"
          />
        </Field>
        <div className="grid gap-5">
          <Field
            label="Profile photo"
            hint="Upload a clear photo of yourself. It appears on your homepage and profile."
          >
            <MediaField
              value={form.profile_image}
              onChange={(value) => set("profile_image", value)}
              assets={mediaAssets}
              loading={mediaLoading}
              onUploaded={onMediaUploaded}
              folder="profile"
              altText={form.name ? `${form.name} profile photo` : "Profile photo"}
              title="Profile photo"
              emptyLabel="No profile photo uploaded."
            />
          </Field>
        </div>
      </fieldset>

      <div className="border-t border-line pt-5">
        <Checkbox
          checked={form.is_placeholder}
          onChange={(checked) => set("is_placeholder", checked)}
          label="This profile is not finished yet"
          hint="Leave this checked until your biography is ready. Your website will show a note instead of treating it as final."
        />
      </div>
    </div>
  );
}
