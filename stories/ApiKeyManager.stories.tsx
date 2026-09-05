import type { Meta, StoryObj } from "@storybook/react";
import { ApiKeyManager } from "@/components/ApiKeyManager";

const meta: Meta<typeof ApiKeyManager> = {
  title: "Settings/ApiKeyManager",
  component: ApiKeyManager,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
  },
};

export default meta;
type Story = StoryObj<typeof ApiKeyManager>;

export const Default: Story = {};
