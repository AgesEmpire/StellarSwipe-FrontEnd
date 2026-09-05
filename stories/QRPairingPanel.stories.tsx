import type { Meta, StoryObj } from "@storybook/react";
import { QRPairingPanel } from "@/components/QRPairingPanel";

const meta: Meta<typeof QRPairingPanel> = {
  title: "Wallet/QRPairingPanel",
  component: QRPairingPanel,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
};

export default meta;
type Story = StoryObj<typeof QRPairingPanel>;

export const Default: Story = {};
