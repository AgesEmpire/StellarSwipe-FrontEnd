import type { Meta, StoryObj } from "@storybook/react";
import { WalletDropdown } from "@/components/WalletDropdown";

const meta: Meta<typeof WalletDropdown> = {
  title: "Wallet/WalletDropdown",
  component: WalletDropdown,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
};

export default meta;
type Story = StoryObj<typeof WalletDropdown>;

export const Default: Story = {};
