import type { Meta, StoryObj } from "@storybook/react";
import { CommandPalette } from "@/components/CommandPalette";

const meta: Meta<typeof CommandPalette> = {
  title: "Navigation/CommandPalette",
  component: CommandPalette,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Keyboard-driven command palette for quick navigation. Trigger with Cmd/Ctrl+K.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof CommandPalette>;

export const Default: Story = {};
