import { render, screen } from "@testing-library/react";
import App from "./App";

test("renders the multi-llm dashboard", () => {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      json: async () => ({ models: [] }),
    })
  );

  render(<App />);
  expect(
    screen.getByRole("heading", { name: /multi-llm response summarization/i })
  ).toBeInTheDocument();
});
