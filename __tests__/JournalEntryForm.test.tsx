/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { JournalEntryForm } from "@/components/JournalEntryForm";

const storeState = {
  addTransaction: jest.fn(),
  removeTransaction: jest.fn(),
  updateTransaction: jest.fn(),
  markPending: jest.fn(),
  markFailed: jest.fn(),
  clearPending: jest.fn(),
  clearFailed: jest.fn(),
};

jest.mock("@/store/useTransactionStore", () => ({
  useTransactionStore: { getState: () => storeState },
}));

jest.mock("@/lib/journalApi", () => ({
  createJournalEntry: jest.fn(),
  updateJournalEntry: jest.fn(),
}));

jest.mock("@/lib/toast", () => ({
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() },
}));

jest.mock("@/hooks/useSubmitGuard", () => ({
  useSubmitGuard: () => ({
    isSubmitting: false,
    hasError: false,
    errorMessage: null,
    guard: (fn: () => Promise<unknown>) => fn(),
    clearError: jest.fn(),
    submitButtonProps: {
      disabled: false,
      "aria-disabled": false,
      "aria-busy": false,
    },
  }),
}));

jest.mock("@/hooks/useUnsavedChanges", () => ({
  useUnsavedChanges: () => ({
    markSaved: jest.fn(),
    forceNavigate: jest.fn(),
    confirmNavigation: () => true,
  }),
}));

import { toast } from "@/lib/toast";
import { createJournalEntry } from "@/lib/journalApi";

async function openForm() {
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: /add manual entry/i }));
  return user;
}

describe("JournalEntryForm – inline validation (issue #646)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows a field error on blur before the user submits", async () => {
    render(<JournalEntryForm />);
    const user = await openForm();

    const amount = screen.getByLabelText(/amount/i);
    await user.click(amount);
    await user.tab(); // blur with empty value

    expect(
      screen.getByText(/amount must be a positive number/i)
    ).toBeInTheDocument();
  });

  it("clears the field error once the user fixes the value", async () => {
    render(<JournalEntryForm />);
    const user = await openForm();

    const amount = screen.getByLabelText(/amount/i);
    await user.type(amount, "0"); // 0 is invalid for amount
    await user.tab();
    expect(
      screen.getByText(/amount must be a positive number/i)
    ).toBeInTheDocument();

    await user.type(amount, "5"); // now "05" → valid
    await user.tab();
    expect(
      screen.queryByText(/amount must be a positive number/i)
    ).not.toBeInTheDocument();
  });

  it("blocks submit and highlights required fields when invalid", async () => {
    render(<JournalEntryForm />);
    const user = await openForm();

    await user.click(screen.getByRole("button", { name: /save entry/i }));

    expect(createJournalEntry).not.toHaveBeenCalled();
    expect(
      screen.getByText(/asset pair is required/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/amount must be a positive number/i)
    ).toBeInTheDocument();
  });

  it("shows a 'ready to save' hint once the form is valid", async () => {
    render(<JournalEntryForm />);
    const user = await openForm();

    await user.type(screen.getByLabelText(/asset pair/i), "XLM/USDC");
    await user.type(screen.getByLabelText(/amount/i), "10");
    await user.type(screen.getByLabelText(/price/i), "1");
    await user.type(screen.getByLabelText(/token/i), "XLM");
    await user.type(screen.getByLabelText(/fee/i), "0");

    expect(screen.getByRole("status")).toHaveTextContent(
      /ready to save/i
    );
  });

  it("submits a valid form and confirms the entry via success toast", async () => {
    (createJournalEntry as jest.Mock).mockResolvedValue({ id: "server-1" });

    render(<JournalEntryForm />);
    const user = await openForm();

    await user.type(screen.getByLabelText(/asset pair/i), "XLM/USDC");
    await user.type(screen.getByLabelText(/amount/i), "10");
    await user.type(screen.getByLabelText(/price/i), "1");
    await user.type(screen.getByLabelText(/token/i), "XLM");
    await user.type(screen.getByLabelText(/fee/i), "0");

    await user.click(screen.getByRole("button", { name: /save entry/i }));

    expect(createJournalEntry).toHaveBeenCalledTimes(1);
    expect(toast.success).toHaveBeenCalledWith(
      "Transaction added to journal",
      expect.anything()
    );
  });
});
