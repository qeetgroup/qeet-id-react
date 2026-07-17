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
 * useOrganizationList fetches the list of organizations (tenants) the current
 * user belongs to. Multi-org support requires the server SDK — this hook
 * surfaces the user's current tenant from auth state and the /v1/auth/me endpoint.
 * Requires `apiUrl` on <QeetIDProvider> (embedded mode).
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
      const user = await client.currentUser();
      const tenantId = user?.tenantId ?? user?.["tenant_id"];
      if (typeof tenantId === "string") {
        setOrganizationList([{ id: tenantId }]);
      }
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
