import { useApiQuery } from "@/hooks/useApiQuery";
import { experienceService } from "@/services/experience.service";
import { leadershipService } from "@/services/leadership.service";
import { nowService } from "@/services/now.service";
import { profileService } from "@/services/profile.service";
import { projectsService } from "@/services/projects.service";
import { resumeService } from "@/services/resume.service";
import { timelineService } from "@/services/timeline.service";

export function useFeaturedProjects(limit = 4) {
  return useApiQuery(
    (signal) => projectsService.getFeatured(limit, signal),
    [limit],
  );
}

export function useAllProjects() {
  return useApiQuery(
    (signal) => projectsService.list({ limit: 100 }, signal),
    [],
  );
}

export function useProfile() {
  return useApiQuery((signal) => profileService.get(signal), []);
}

export function useNowItems() {
  return useApiQuery((signal) => nowService.getCurrentItems(signal), []);
}

export function useTimelineEntries() {
  return useApiQuery((signal) => timelineService.getEntries(signal), []);
}

export function useLeadershipEntries() {
  return useApiQuery((signal) => leadershipService.getEntries(signal), []);
}

export function useExperienceEntries() {
  return useApiQuery((signal) => experienceService.getEntries(signal), []);
}

export function useCurrentResume() {
  return useApiQuery((signal) => resumeService.getCurrent(signal), []);
}
