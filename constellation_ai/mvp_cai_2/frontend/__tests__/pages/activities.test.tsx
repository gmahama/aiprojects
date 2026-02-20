import { render } from "@testing-library/react";
import ActivitiesPage from "@/app/activities/page";

describe("Activities Page", () => {
  it("renders without crashing", () => {
    const { container } = render(<ActivitiesPage />);
    expect(container.firstChild).toBeTruthy();
  });
});
