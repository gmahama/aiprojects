import { render } from "@testing-library/react";
import OrganizationsPage from "@/app/organizations/page";

describe("Organizations Page", () => {
  it("renders without crashing", () => {
    const { container } = render(<OrganizationsPage />);
    expect(container.firstChild).toBeTruthy();
  });
});
