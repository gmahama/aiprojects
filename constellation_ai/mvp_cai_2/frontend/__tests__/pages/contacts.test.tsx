import { render } from "@testing-library/react";
import ContactsPage from "@/app/contacts/page";

describe("Contacts Page", () => {
  it("renders without crashing", () => {
    const { container } = render(<ContactsPage />);
    expect(container.firstChild).toBeTruthy();
  });
});
