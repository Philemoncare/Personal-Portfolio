import { useApiQuery } from "@/hooks/useApiQuery";
import { leadershipService } from "@/services/leadership.service";
import { nowService } from "@/services/now.service";
import { projectsService } from "@/services/projects.service";
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

export function useNowItems() {
  return useApiQuery((signal) => nowService.getCurrentItems(signal), []);
}

export function useTimelineEntries() {
  return useApiQuery((signal) => timelineService.getEntries(signal), []);
}

export function useLeadershipEntries() {
  return useApiQuery((signal) => leadershipService.getEntries(signal), []);
}
