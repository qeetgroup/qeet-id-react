import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QeetIDProvider } from "../../src/client/provider.js";
import { useUser } from "../../src/hooks/identity/useUser.js";
import { CreateOrganization } from "../../src/widgets/CreateOrganization.js";
import { OrganizationSwitcher } from "../../src/widgets/OrganizationSwitcher.js";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

// Answers each request by method and path, so parallel calls don't depend on order.
function routeFetch(routes: Record<string, () => Response>) {
  const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
  fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
    const u = new URL(url);
    const answer = routes[`${init?.method ?? "GET"} ${u.pathname}`];
    if (!answer) throw new Error(`unexpected request ${init?.method} ${u.pathname}`);
    return answer();
  });
  return fetchMock;
}

const twoOrganizations = () =>
  jsonResponse(200, {
    items: [
      { id: "t1", name: "Acme", slug: "acme", roles: ["owner"], last_used_at: null },
      { id: "t2", name: "Globex", slug: "globex", roles: ["member"], last_used_at: null },
    ],
    next_cursor: "",
  });

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
  document.cookie = "qe_csrf=tok_csrf_seeded";
});
afterEach(() => {
  vi.unstubAllGlobals();
  document.cookie = "qe_csrf=; expires=Thu, 01 Jan 1970 00:00:00 UTC";
});

describe("<OrganizationSwitcher/>", () => {
  it("lists every organization by name and switches to the one picked", async () => {
    const fetchMock = routeFetch({
      "GET /v1/me/organizations": twoOrganizations,
      "POST /v1/auth/switch-tenant": () => jsonResponse(200, { tenant_id: "t2" }),
    });
    const onOrganizationChange = vi.fn();
    render(
      <QeetIDProvider apiUrl="https://api.id.qeet.in" initialState={{ isAuthenticated: true, userId: "u1", tenantId: "t1" }}>
        <OrganizationSwitcher onOrganizationChange={onOrganizationChange} />
      </QeetIDProvider>,
    );

    fireEvent.click(await screen.findByRole("button", { name: /Acme/ }));
    const options = screen.getAllByRole("option");
    expect(options.map((o) => o.textContent)).toEqual(["Acme", "Globex"]);
    fireEvent.click(screen.getByRole("button", { name: "Globex" }));

    await waitFor(() => expect(onOrganizationChange).toHaveBeenCalledWith("t2"));
    const switchCall = fetchMock.mock.calls.find(([url]) => String(url).endsWith("/v1/auth/switch-tenant"));
    expect(JSON.parse(switchCall?.[1].body as string)).toEqual({ tenant_id: "t2" });
  });

  it("shows a failed switch instead of reporting a change", async () => {
    routeFetch({
      "GET /v1/me/organizations": twoOrganizations,
      "POST /v1/auth/switch-tenant": () => jsonResponse(401, { error: { code: "unauthorized", message: "Please sign in to continue." } }),
    });
    const onOrganizationChange = vi.fn();
    render(
      <QeetIDProvider apiUrl="https://api.id.qeet.in" initialState={{ isAuthenticated: true, userId: "u1", tenantId: "t1" }}>
        <OrganizationSwitcher onOrganizationChange={onOrganizationChange} />
      </QeetIDProvider>,
    );

    fireEvent.click(await screen.findByRole("button", { name: /Acme/ }));
    fireEvent.click(screen.getByRole("button", { name: "Globex" }));

    expect((await screen.findByRole("alert")).textContent).toBe("Please sign in to continue.");
    expect(onOrganizationChange).not.toHaveBeenCalled();
  });
});

describe("<CreateOrganization/>", () => {
  it("hands the trimmed name to onCreate, then reports success", async () => {
    const onCreate = vi.fn().mockResolvedValue(undefined);
    const onSuccess = vi.fn();
    render(<CreateOrganization onCreate={onCreate} onSuccess={onSuccess} />);

    fireEvent.change(screen.getByLabelText("Organization name"), { target: { value: "  Initech  " } });
    fireEvent.click(screen.getByRole("button", { name: "Create organization" }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith("Initech"));
    expect(onCreate).toHaveBeenCalledWith("Initech");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("shows the error onCreate throws and reports no success", async () => {
    const onSuccess = vi.fn();
    render(<CreateOrganization onCreate={() => Promise.reject(new Error("That slug is taken"))} onSuccess={onSuccess} />);

    fireEvent.change(screen.getByLabelText("Organization name"), { target: { value: "Initech" } });
    fireEvent.click(screen.getByRole("button", { name: "Create organization" }));

    expect(await screen.findByText("That slug is taken")).toBeTruthy();
    expect(onSuccess).not.toHaveBeenCalled();
  });
});

describe("useUser in embedded mode", () => {
  function Probe() {
    const { isLoaded, isAuthenticated, user } = useUser();
    if (!isLoaded) return <span>loading</span>;
    return (
      <span>
        {String(isAuthenticated)} {user?.displayName} {user?.email}
      </span>
    );
  }

  it("reads the profile from the API", async () => {
    routeFetch({
      "GET /v1/auth/me": () => jsonResponse(200, { user_id: "u1", tenant_id: "t1", session_id: null, actor: "user", scopes: null }),
      "GET /v1/me": () => jsonResponse(200, { id: "u1", tenant_id: "t1", email: "ada@example.com", display_name: "Ada Lovelace", status: "active" }),
    });
    render(
      <QeetIDProvider apiUrl="https://api.id.qeet.in">
        <Probe />
      </QeetIDProvider>,
    );

    expect(screen.getByText("loading")).toBeTruthy();
    expect(await screen.findByText("true Ada Lovelace ada@example.com")).toBeTruthy();
  });

  it("reports signed out when there is no session", async () => {
    const unauthorized = () => jsonResponse(401, { error: { code: "unauthorized", message: "no session" } });
    routeFetch({ "GET /v1/auth/me": unauthorized, "GET /v1/me": unauthorized });
    render(
      <QeetIDProvider apiUrl="https://api.id.qeet.in" initialState={{ isAuthenticated: true, user: { email: "stale@example.com" } }}>
        <Probe />
      </QeetIDProvider>,
    );

    expect(await screen.findByText(/^false/)).toBeTruthy();
  });
});
