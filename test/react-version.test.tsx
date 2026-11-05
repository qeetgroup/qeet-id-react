import { render, screen } from "@testing-library/react";
import { version } from "react";
import { version as domVersion } from "react-dom";
import { describe, expect, it } from "vitest";

describe("the React under test", () => {
  it("is the project's React (react-18 or react-19), rendered by the matching react-dom", () => {
    expect(version.split(".")[0]).toBe(process.env.REACT_MAJOR);
    expect(domVersion).toBe(version);
    render(<p>React {version}</p>);
    expect(screen.getByText(`React ${version}`)).toBeInTheDocument();
  });
});
