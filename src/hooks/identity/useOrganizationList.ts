"use client";

import { useState, useEffect, useCallback } from "react";

import { useQeetIDClient, useQeetIDState } from "../../client/context.js";
import type { Organization } from "../../types/organization.js";

export interface UseOrganizationListReturn {
  isLoaded: boolean;
  organizationList: Organization[];
  error: string | null;
  refresh(): Promise<void>;
}

/**
 * useOrganizationList lists every organization (tenant) the signed-in user
 * belongs to, with names (`client.listOrganizations()`). Without `apiUrl` on
 * <QeetIDProvider> (redirect mode) it knows only the session's tenant, from
 * `initialState.tenantId`.
 *
 *   const { organizationList } = useOrganizationList();
 */
export function useOrganizationList(): UseOrganizationListReturn {
  const client = useQeetIDClient();
  const state = useQeetIDState();
  const [isLoaded, setIsLoaded] = useState(false);
  const [organizationList, setOrganizationList] = useState<Organization[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!client) {
      if (state.isLoaded && state.tenantId) {
        setOrganizationList([{ id: state.tenantId }]);
      }
      setIsLoaded(true);
      return;
    }
    setError(null);
    try {
      setOrganizationList(await client.listOrganizations());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load organizations");
    } finally {
      setIsLoaded(true);
    }
  }, [client, state.isLoaded, state.tenantId]);

  useEffect(() => {
    void load();
  }, [load]);

  return { isLoaded, organizationList, error, refresh: load };
}
