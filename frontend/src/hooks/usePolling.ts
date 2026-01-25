/**
 * Hook for polling job status.
 */

import { useQuery } from "@tanstack/react-query";
import { getJob } from "@/services/api";
import type { Job } from "@/types";

interface UseJobPollingOptions {
  enabled?: boolean;
  refetchInterval?: number;
}

export function useJobPolling(
  jobId: string | null,
  options: UseJobPollingOptions = {}
) {
  const { enabled = true, refetchInterval = 2000 } = options;

  return useQuery({
    queryKey: ["job", jobId],
    queryFn: () => getJob(jobId!),
    enabled: enabled && !!jobId,
    refetchInterval: (query) => {
      const job = query.state.data as Job | undefined;
      // Stop polling when job is done
      if (job?.status === "completed" || job?.status === "failed" || job?.status === "cancelled") {
        return false;
      }
      return refetchInterval;
    },
  });
}
