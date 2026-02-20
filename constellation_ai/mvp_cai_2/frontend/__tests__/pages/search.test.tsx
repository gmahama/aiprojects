import { render } from "@testing-library/react";
import SearchPage from "@/app/search/page";

describe("Search Page", () => {
  it("renders without crashing", () => {
    const { container } = render(<SearchPage />);
    expect(container.firstChild).toBeTruthy();
  });
});
