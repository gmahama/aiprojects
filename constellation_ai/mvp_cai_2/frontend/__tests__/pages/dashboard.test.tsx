import { render } from "@testing-library/react";
import DashboardPage from "@/app/page";

describe("Dashboard Page", () => {
  it("renders without crashing", () => {
    const { container } = render(<DashboardPage />);
    expect(container.firstChild).toBeTruthy();
  });
});
