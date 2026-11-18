import { Checkbox, Field, TextArea, TextInput } from "@/components/admin/form";
import type { ProfileAdmin, ProfileInput } from "@/types/api";

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
}: {
  form: ProfileFormState;
  onChange: (next: ProfileFormState) => void;
  idPrefix?: string;
}) {
  const set = <K extends keyof ProfileFormState,>(key: K, value: ProfileFormState[K]) => {
    onChange({ ...form, [key]: value });
  };
  const id = (name: string) => `${idPrefix}-${name}`;

  return (
    <div className="space-y-8">
      <fieldset className="space-y-4">
        <legend className="font-mono text-[0.56rem] uppercase tracking-[0.16em] text-signal">
          Identity
        </legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" htmlFor={id("name")} required>
            <TextInput
              id={id("name")}
              value={form.name}
              onChange={(event) => set("name", event.target.value)}
              placeholder="Full name as it should appear in records"
            />
          </Field>
          <Field label="Display name" htmlFor={id("display_name")} required>
            <TextInput
              id={id("display_name")}
              value={form.display_name}
              onChange={(event) => set("display_name", event.target.value)}
              placeholder="Short name used in headings"
            />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Professional title" htmlFor={id("professional_title")}>
            <TextInput
              id={id("professional_title")}
              value={form.professional_title}
              onChange={(event) => set("professional_title", event.target.value)}
              placeholder="For example: Full-Stack Developer"
            />
          </Field>
          <Field label="Location" htmlFor={id("location")}>
            <TextInput
              id={id("location")}
              value={form.location}
              onChange={(event) => set("location", event.target.value)}
              placeholder="Only if you want it published"
            />
          </Field>
        </div>
        <Field label="Availability" htmlFor={id("availability")}>
          <TextInput
            id={id("availability")}
            value={form.availability}
            onChange={(event) => set("availability", event.target.value)}
            placeholder="A short, honest availability statement"
          />
        </Field>
      </fieldset>

      <fieldset className="space-y-4 border-t border-line pt-6">
        <legend className="font-mono text-[0.56rem] uppercase tracking-[0.16em] text-signal">
          About narrative
        </legend>
        <Field
          label="Short bio"
          htmlFor={id("short_bio")}
          hint="Used in the hero and as the profile summary. Two or three sentences."
        >
          <TextArea
            id={id("short_bio")}
            rows={3}
            value={form.short_bio}
            onChange={(event) => set("short_bio", event.target.value)}
          />
        </Field>
        <Field
          label="Long story"
          htmlFor={id("long_bio")}
          hint="The longer About narrative. Separate paragraphs with a blank line."
        >
          <TextArea
            id={id("long_bio")}
            rows={7}
            value={form.long_bio}
            onChange={(event) => set("long_bio", event.target.value)}
          />
        </Field>
        <div className="grid gap-4 lg:grid-cols-2">
          <Field label="What I build" htmlFor={id("what_i_build")}>
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
          <Field label="Current direction" htmlFor={id("current_direction")}>
            <TextArea
              id={id("current_direction")}
              rows={4}
              value={form.current_direction}
              onChange={(event) => set("current_direction", event.target.value)}
            />
          </Field>
          <Field
            label="Personal interests"
            htmlFor={id("personal_interests")}
            hint="Only genuine interests. Leave empty to hide the section entirely."
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
          Contact and links
        </legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Public email" htmlFor={id("email")}>
            <TextInput
              id={id("email")}
              type="email"
              value={form.email}
              onChange={(event) => set("email", event.target.value)}
            />
          </Field>
          <Field label="Phone" htmlFor={id("phone")} hint="Optional. Leave empty to keep it private.">
            <TextInput
              id={id("phone")}
              value={form.phone}
              onChange={(event) => set("phone", event.target.value)}
            />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="GitHub URL" htmlFor={id("github_url")}>
            <TextInput
              id={id("github_url")}
              value={form.github_url}
              onChange={(event) => set("github_url", event.target.value)}
              placeholder="https://github.com/…"
            />
          </Field>
          <Field label="LinkedIn URL" htmlFor={id("linkedin_url")}>
            <TextInput
              id={id("linkedin_url")}
              value={form.linkedin_url}
              onChange={(event) => set("linkedin_url", event.target.value)}
              placeholder="https://www.linkedin.com/in/…"
            />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Website URL" htmlFor={id("website_url")}>
            <TextInput
              id={id("website_url")}
              value={form.website_url}
              onChange={(event) => set("website_url", event.target.value)}
            />
          </Field>
          <Field
            label="Profile image"
            htmlFor={id("profile_image")}
            hint="A full URL or a site-relative path starting with /."
          >
            <TextInput
              id={id("profile_image")}
              value={form.profile_image}
              onChange={(event) => set("profile_image", event.target.value)}
            />
          </Field>
        </div>
        <Field
          label="Legacy CV URL"
          htmlFor={id("resume_url")}
          hint="Used only when no managed resume PDF is published."
        >
          <TextInput
            id={id("resume_url")}
            value={form.resume_url}
            onChange={(event) => set("resume_url", event.target.value)}
          />
        </Field>
      </fieldset>

      <div className="border-t border-line pt-5">
        <Checkbox
          checked={form.is_placeholder}
          onChange={(checked) => set("is_placeholder", checked)}
          label="Profile copy is still placeholder content"
          hint="Keep this checked until the biography and direction are confirmed. The public site labels it honestly."
        />
      </div>
    </div>
  );
}
