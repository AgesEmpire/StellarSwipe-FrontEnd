import type { Meta, StoryObj } from "@storybook/react";
import { CSVImportModal } from "@/components/CSVImportModal";

const meta: Meta<typeof CSVImportModal> = {
  title: "Data/CSVImportModal",
  component: CSVImportModal,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
};

export default meta;
type Story = StoryObj<typeof CSVImportModal>;

export const Default: Story = {};
