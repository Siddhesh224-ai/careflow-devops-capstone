import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import { PatientForm } from "./PatientForm";

test("validates required patient fields", async () => {
  render(<PatientForm busy={false} onSubmit={vi.fn()} onCancel={vi.fn()} />);
  await userEvent.click(
    screen.getByRole("button", { name: /register patient/i }),
  );
  expect(
    await screen.findByText(/enter the patient’s full name/i),
  ).toBeInTheDocument();
  expect(screen.getByText(/date of birth is required/i)).toBeInTheDocument();
});

test("submits a valid patient", async () => {
  const submit = vi.fn();
  render(<PatientForm busy={false} onSubmit={submit} onCancel={vi.fn()} />);
  await userEvent.type(screen.getByLabelText("Full name"), "Synthetic Patient");
  await userEvent.type(screen.getByLabelText("Date of birth"), "1995-05-20");
  await userEvent.type(
    screen.getByLabelText("Phone number"),
    "+91 90000 00001",
  );
  await userEvent.click(
    screen.getByRole("button", { name: /register patient/i }),
  );
  expect(submit).toHaveBeenCalledWith(
    expect.objectContaining({ full_name: "Synthetic Patient" }),
  );
});
